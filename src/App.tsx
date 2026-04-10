import React, { useState, useRef } from 'react';
import { useTimer } from './hooks/useTimer';
import { soundManager, TickType, AlarmType } from './lib/sounds';
import { TimerDisplay } from './components/TimerDisplay';
import { TimerControls } from './components/TimerControls';
import { SettingsModal } from './components/SettingsModal';
import type {AccessState} from './lib/access';
import type {CommercialActivationResult} from './components/AuthPanel';
import {clearStoredBackgroundImage, resolveBackgroundImage, storeBackgroundImage} from './lib/background-image';
import {isDurationAllowed, isFeatureEnabled} from './lib/partial-unlock-core';
import {useLocale} from './lib/locale';
import {
  addStudySegment,
  loadAndSyncStudyRecord,
  type StudyRecord,
} from './lib/study-record';

const DURATIONS = [90, 70, 60, 45, 30, 25, 15, 5];
const DEFAULT_IMAGE = "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=1920";
const DEFAULT_FREE_DURATION = 25;
const STUDY_RECORD_GATE_MS = 5000;

type WakeLockSentinelLike = {
  released: boolean;
  release: () => Promise<void>;
  addEventListener?: (type: 'release', listener: () => void) => void;
};

type NavigatorWithWakeLock = Navigator & {
  wakeLock?: {
    request: (type: 'screen') => Promise<WakeLockSentinelLike>;
  };
};

type BgMusicAudioSnapshot = {
  src: string;
  paused: boolean;
  muted: boolean;
  volume: number;
  currentTime: number;
  readyState: number;
  networkState: number;
  error: string | null;
};

declare global {
  interface Window {
    __vpBgMusicDebug?: {
      getSnapshot: () => BgMusicAudioSnapshot | null;
      getState: () => {
        isActive: boolean;
        musicEnabled: boolean;
        bgMusicUrl: string | null;
        bgMusicName: string | null;
        isMusicPlaying: boolean;
      };
    };
  }
}

interface AppProps {
  accessState: AccessState;
  onSaveLicenseToken: (token: string) => Promise<void>;
  onClearLicenseToken: () => Promise<void>;
  onRefreshAccess: () => Promise<void>;
  onActivateCommercialLicenseKey: (licenseKey: string) => Promise<CommercialActivationResult>;
}

export default function App({
  accessState,
  onSaveLicenseToken,
  onClearLicenseToken,
  onRefreshAccess,
  onActivateCommercialLicenseKey,
}: AppProps) {
  const {messages} = useLocale();
  const quickStatsCopy = messages.quickStats;
  const [duration, setDuration] = useState(25);
  const [bgImage, setBgImage] = useState(() => resolveBackgroundImage(DEFAULT_IMAGE));
  const [bgVideoUrl, setBgVideoUrl] = useState<string | null>(null);
  const [bgVideoName, setBgVideoName] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [tickType, setTickType] = useState<TickType>('classic');
  const [alarmType, setAlarmType] = useState<AlarmType>('classic');
  const [bgMusicUrl, setBgMusicUrl] = useState<string | null>(null);
  const [bgMusicName, setBgMusicName] = useState<string | null>(null);
  const [sfxEnabled, setSfxEnabled] = useState(true);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [screenWakeLockEnabled, setScreenWakeLockEnabled] = useState(false);
  const [screenWakeLockRequested, setScreenWakeLockRequested] = useState(false);
  const [isQuickStatsOpen, setIsQuickStatsOpen] = useState(false);
  const [studyRecord, setStudyRecord] = useState<StudyRecord>(() => loadAndSyncStudyRecord());
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const musicInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const wakeLockSentinelRef = useRef<WakeLockSentinelLike | null>(null);
  const bgVideoUrlRef = useRef<string | null>(null);
  const bgMusicUrlRef = useRef<string | null>(null);
  const quickStatsWrapperRef = useRef<HTMLDivElement | null>(null);
  const studyPendingStartAtRef = useRef<number | null>(null);
  const studyEffectiveStartAtRef = useRef<number | null>(null);
  const studyGateTimerRef = useRef<number | null>(null);
  const studyHasEffectivePhaseRef = useRef(false);

  const effectiveSfxEnabled = sfxEnabled && !isMusicPlaying;
  const { isActive, isFinished, toggle, reset, formatTime } = useTimer(duration, { soundEnabled: effectiveSfxEnabled });
  const wakeLockSupported =
    typeof navigator !== 'undefined' && 'wakeLock' in (navigator as NavigatorWithWakeLock);
  const canUseMusic = isFeatureEnabled('music', accessState);
  const canUseBackgroundFeatures = isFeatureEnabled('backgroundFeatures', accessState);
  const formatStudyDuration = React.useCallback((seconds: number) => {
    const safe = Math.max(0, Math.floor(seconds));
    const hours = Math.floor(safe / 3600);
    const minutes = Math.floor((safe % 3600) / 60);
    const secs = safe % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }, []);

  const clearStudyGateTimer = React.useCallback(() => {
    if (studyGateTimerRef.current !== null) {
      window.clearTimeout(studyGateTimerRef.current);
      studyGateTimerRef.current = null;
    }
  }, []);

  const resetStudySessionTracking = React.useCallback(() => {
    clearStudyGateTimer();
    studyPendingStartAtRef.current = null;
    studyEffectiveStartAtRef.current = null;
    studyHasEffectivePhaseRef.current = false;
  }, [clearStudyGateTimer]);

  const flushStudySegment = React.useCallback(() => {
    const nowMs = Date.now();
    const pendingStartAt = studyPendingStartAtRef.current;

    if (
      studyEffectiveStartAtRef.current === null &&
      pendingStartAt !== null &&
      nowMs - pendingStartAt >= STUDY_RECORD_GATE_MS
    ) {
      studyEffectiveStartAtRef.current = pendingStartAt + STUDY_RECORD_GATE_MS;
    }

    const effectiveStartAt = studyEffectiveStartAtRef.current;
    if (effectiveStartAt !== null && nowMs > effectiveStartAt) {
      const updated = addStudySegment(effectiveStartAt, nowMs, nowMs);
      setStudyRecord(updated);
      studyHasEffectivePhaseRef.current = true;
    } else {
      setStudyRecord(loadAndSyncStudyRecord(nowMs));
    }

    studyEffectiveStartAtRef.current = null;
    studyPendingStartAtRef.current = null;
  }, []);
  const getBgMusicAudioSnapshot = React.useCallback((): BgMusicAudioSnapshot | null => {
    const audio = audioRef.current;
    if (!audio) {
      return null;
    }

    return {
      src: audio.currentSrc || audio.src || '',
      paused: audio.paused,
      muted: audio.muted,
      volume: audio.volume,
      currentTime: audio.currentTime,
      readyState: audio.readyState,
      networkState: audio.networkState,
      error: audio.error ? `${audio.error.code}:${audio.error.message || ''}` : null,
    };
  }, []);

  const logBgMusic = React.useCallback(
    (label: string, extra: Record<string, unknown> = {}) => {
      console.info('[bg-music]', label, {
        ...extra,
        state: {
          isActive,
          musicEnabled,
          bgMusicUrl,
          bgMusicName,
          isMusicPlaying,
        },
        audio: getBgMusicAudioSnapshot(),
      });
    },
    [bgMusicName, bgMusicUrl, getBgMusicAudioSnapshot, isActive, isMusicPlaying, musicEnabled],
  );

  React.useEffect(() => {
    window.__vpBgMusicDebug = {
      getSnapshot: getBgMusicAudioSnapshot,
      getState: () => ({
        isActive,
        musicEnabled,
        bgMusicUrl,
        bgMusicName,
        isMusicPlaying,
      }),
    };

    return () => {
      delete window.__vpBgMusicDebug;
    };
  }, [bgMusicName, bgMusicUrl, getBgMusicAudioSnapshot, isActive, isMusicPlaying, musicEnabled]);

  const attemptPlayBackgroundMusic = React.useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || !musicEnabled || !bgMusicUrl) {
      logBgMusic('play:skipped', {
        reason: !audio ? 'audio_missing' : !musicEnabled ? 'music_disabled' : 'missing_bgMusicUrl',
      });
      return false;
    }

    logBgMusic('play:attempt');
    try {
      await audio.play();
      setIsMusicPlaying(true);
      logBgMusic('play:success');
      return true;
    } catch {
      setIsMusicPlaying(false);
      logBgMusic('play:rejected');
      return false;
    }
  }, [bgMusicUrl, logBgMusic, musicEnabled]);

  React.useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    if (isActive && bgMusicUrl && musicEnabled) {
      void attemptPlayBackgroundMusic();
      return;
    }

    audio.pause();
    setIsMusicPlaying(false);
  }, [attemptPlayBackgroundMusic, bgMusicUrl, isActive, musicEnabled]);

  React.useEffect(() => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    const handlePlay = () => {
      setIsMusicPlaying(true);
      logBgMusic('event:play');
    };
    const handlePause = () => {
      setIsMusicPlaying(false);
      logBgMusic('event:pause');
    };
    const handleEnded = () => {
      setIsMusicPlaying(false);
      logBgMusic('event:ended');
    };

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [logBgMusic]);

  React.useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    if (!bgMusicUrl) {
      const currentSrc = audio.getAttribute('src');
      if (currentSrc) {
        logBgMusic('src:cleared');
        audio.pause();
        audio.removeAttribute('src');
        audio.load();
        setIsMusicPlaying(false);
      }
      return;
    }

    const currentSrc = audio.getAttribute('src');
    if (currentSrc === bgMusicUrl) {
      return;
    }

    audio.pause();
    audio.currentTime = 0;
    audio.muted = false;
    audio.volume = 1;
    audio.src = bgMusicUrl;
    logBgMusic('src:set', { nextSrc: bgMusicUrl });
    audio.load();
  }, [bgMusicUrl, logBgMusic]);

  React.useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    const handleCanPlay = () => {
      logBgMusic('event:canplay');
      if (!isActive || !musicEnabled || !bgMusicUrl) {
        return;
      }

      if (audio.paused) {
        void attemptPlayBackgroundMusic();
      }
    };

    const handleLoadedData = () => {
      logBgMusic('event:loadeddata');
      if (!isActive || !musicEnabled || !bgMusicUrl) {
        return;
      }

      if (audio.paused) {
        void attemptPlayBackgroundMusic();
      }
    };

    const handleError = () => {
      setIsMusicPlaying(false);
      logBgMusic('event:error');
    };

    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('loadeddata', handleLoadedData);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('loadeddata', handleLoadedData);
      audio.removeEventListener('error', handleError);
    };
  }, [attemptPlayBackgroundMusic, bgMusicUrl, isActive, logBgMusic, musicEnabled]);

  React.useEffect(() => {
    if (!isQuickStatsOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const wrapper = quickStatsWrapperRef.current;
      if (!wrapper) {
        return;
      }

      if (!wrapper.contains(event.target as Node)) {
        setIsQuickStatsOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [isQuickStatsOpen]);

  React.useEffect(() => {
    const synced = loadAndSyncStudyRecord();
    setStudyRecord(synced);
  }, []);

  React.useEffect(() => {
    if (!isActive) {
      clearStudyGateTimer();
      flushStudySegment();
      return;
    }

    const startedAt = Date.now();
    if (studyHasEffectivePhaseRef.current) {
      studyPendingStartAtRef.current = null;
      studyEffectiveStartAtRef.current = startedAt;
      clearStudyGateTimer();
      return;
    }

    studyPendingStartAtRef.current = startedAt;
    studyEffectiveStartAtRef.current = null;
    clearStudyGateTimer();
    studyGateTimerRef.current = window.setTimeout(() => {
      const pending = studyPendingStartAtRef.current;
      if (pending !== null) {
        studyEffectiveStartAtRef.current = pending + STUDY_RECORD_GATE_MS;
        studyHasEffectivePhaseRef.current = true;
      }
      studyGateTimerRef.current = null;
    }, STUDY_RECORD_GATE_MS);

    return () => {
      clearStudyGateTimer();
    };
  }, [clearStudyGateTimer, flushStudySegment, isActive]);

  React.useEffect(() => {
    const handlePageHide = () => {
      flushStudySegment();
    };

    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('beforeunload', handlePageHide);

    return () => {
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('beforeunload', handlePageHide);
    };
  }, [flushStudySegment]);

  React.useEffect(() => {
    if (!canUseMusic) {
      setMusicEnabled(false);
    }
  }, [canUseMusic]);

  React.useEffect(() => {
    if (canUseBackgroundFeatures) {
      setBgImage(resolveBackgroundImage(DEFAULT_IMAGE));
      return;
    }

    if (bgVideoUrlRef.current) {
      URL.revokeObjectURL(bgVideoUrlRef.current);
      bgVideoUrlRef.current = null;
    }
    setBgVideoUrl(null);
    setBgVideoName(null);
    setBgImage(DEFAULT_IMAGE);
  }, [canUseBackgroundFeatures]);

  React.useEffect(() => {
    if (accessState.isPremium) {
      return;
    }

    if (!isDurationAllowed(duration, accessState)) {
      setDuration(DEFAULT_FREE_DURATION);
      reset(DEFAULT_FREE_DURATION);
    }
  }, [accessState, duration, reset]);

  const releaseWakeLock = React.useCallback(async () => {
    const sentinel = wakeLockSentinelRef.current;
    wakeLockSentinelRef.current = null;
    setScreenWakeLockEnabled(false);

    if (!sentinel) {
      return;
    }

    try {
      await sentinel.release();
    } catch {
      // Ignore release failures so UI never breaks.
    }
  }, []);

  const requestWakeLock = React.useCallback(async () => {
    if (!wakeLockSupported || document.visibilityState !== 'visible') {
      return false;
    }

    wakeLockSentinelRef.current = null;
    setScreenWakeLockEnabled(false);

    try {
      const sentinel = await (navigator as NavigatorWithWakeLock).wakeLock!.request('screen');
      wakeLockSentinelRef.current = sentinel;
      setScreenWakeLockEnabled(!sentinel.released);
      sentinel.addEventListener?.('release', () => {
        wakeLockSentinelRef.current = null;
        setScreenWakeLockEnabled(false);
      });
      return true;
    } catch {
      wakeLockSentinelRef.current = null;
      setScreenWakeLockEnabled(false);
      return false;
    }
  }, [wakeLockSupported]);

  React.useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setScreenWakeLockEnabled(false);
        return;
      }

      if (screenWakeLockRequested && !wakeLockSentinelRef.current) {
        void requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [requestWakeLock, screenWakeLockRequested]);

  React.useEffect(() => {
    return () => {
      void releaseWakeLock();
    };
  }, [releaseWakeLock]);

  React.useEffect(() => {
    return () => {
      if (bgVideoUrlRef.current) {
        URL.revokeObjectURL(bgVideoUrlRef.current);
        bgVideoUrlRef.current = null;
      }
    };
  }, []);

  const handleToggleScreenWakeLock = React.useCallback(async () => {
    if (screenWakeLockRequested || screenWakeLockEnabled) {
      setScreenWakeLockRequested(false);
      await releaseWakeLock();
      return;
    }

    if (!wakeLockSupported) {
      setScreenWakeLockRequested(false);
      setScreenWakeLockEnabled(false);
      return;
    }

    setScreenWakeLockRequested(true);
    const acquired = await requestWakeLock();

    if (!acquired) {
      setScreenWakeLockRequested(false);
    }
  }, [
    releaseWakeLock,
    requestWakeLock,
    screenWakeLockEnabled,
    screenWakeLockRequested,
    wakeLockSupported,
  ]);

  const handleReset = () => {
    resetStudySessionTracking();
    reset(duration);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canUseBackgroundFeatures) {
      return;
    }

    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const result = typeof reader.result === 'string' ? reader.result : null;
        if (!result) {
          return;
        }

        if (bgVideoUrlRef.current) {
          URL.revokeObjectURL(bgVideoUrlRef.current);
          bgVideoUrlRef.current = null;
        }
        setBgVideoUrl(null);
        setBgVideoName(null);
        setBgImage(result);
        try {
          storeBackgroundImage(result);
        } catch {
          // Keep the in-session preview even when persistence fails.
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleMusicUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canUseMusic) {
      return;
    }

    const file = e.target.files?.[0];
    if (file) {
      if (bgMusicUrlRef.current) {
        URL.revokeObjectURL(bgMusicUrlRef.current);
        bgMusicUrlRef.current = null;
      }

      const url = URL.createObjectURL(file);
      bgMusicUrlRef.current = url;
      setBgMusicUrl(url);
      setBgMusicName(file.name);
      logBgMusic('upload:music-selected', {
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        objectUrl: url,
      });

      if (isActive && musicEnabled) {
        void attemptPlayBackgroundMusic();
      }
    }
  };

  const handleClearImageBackground = () => {
    if (bgVideoUrlRef.current) {
      URL.revokeObjectURL(bgVideoUrlRef.current);
      bgVideoUrlRef.current = null;
    }
    setBgVideoUrl(null);
    setBgVideoName(null);
    setBgImage(DEFAULT_IMAGE);
    clearStoredBackgroundImage();
  };

  const handleClearDynamicBackground = () => {
    if (bgVideoUrlRef.current) {
      URL.revokeObjectURL(bgVideoUrlRef.current);
      bgVideoUrlRef.current = null;
    }
    setBgVideoUrl(null);
    setBgVideoName(null);
  };

  const handleClearMusic = () => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }

    if (bgMusicUrlRef.current) {
      URL.revokeObjectURL(bgMusicUrlRef.current);
      bgMusicUrlRef.current = null;
    }

    setBgMusicUrl(null);
    setBgMusicName(null);
    setIsMusicPlaying(false);
  };

  const handleToggleMusic = () => {
    if (!canUseMusic) {
      return;
    }

    const nextEnabled = !musicEnabled;
    logBgMusic('music:toggle', { nextEnabled });
    setMusicEnabled(nextEnabled);
  };

  const handleToggleTimer = () => {
    const shouldBecomeActive = !isActive;
    logBgMusic('timer:toggle', { shouldBecomeActive });
    toggle();

    if (shouldBecomeActive && bgMusicUrl && musicEnabled) {
      void attemptPlayBackgroundMusic();
    }
  };

  React.useEffect(() => {
    return () => {
      if (bgMusicUrlRef.current) {
        URL.revokeObjectURL(bgMusicUrlRef.current);
        bgMusicUrlRef.current = null;
      }
    };
  }, []);

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canUseBackgroundFeatures) {
      return;
    }

    const file = e.target.files?.[0];
    if (!file) {
      return;
    }

    const allowedTypes = new Set(['video/mp4', 'video/webm']);
    const maxFileSizeBytes = 25 * 1024 * 1024;

    if (!allowedTypes.has(file.type) || file.size > maxFileSizeBytes) {
      return;
    }

    if (bgVideoUrlRef.current) {
      URL.revokeObjectURL(bgVideoUrlRef.current);
      bgVideoUrlRef.current = null;
    }

    const nextUrl = URL.createObjectURL(file);
    bgVideoUrlRef.current = nextUrl;
    setBgVideoUrl(nextUrl);
    setBgVideoName(file.name);
  };

  const handleVideoBackgroundError = () => {
    if (bgVideoUrlRef.current) {
      URL.revokeObjectURL(bgVideoUrlRef.current);
      bgVideoUrlRef.current = null;
    }

    setBgVideoUrl(null);
    setBgVideoName(null);
  };

  const handleTickTypeChange = (type: TickType) => {
    setTickType(type);
    soundManager.setTickType(type);
    soundManager.playTick();
  };

  const handleAlarmTypeChange = (type: AlarmType) => {
    setAlarmType(type);
    soundManager.setAlarmType(type);
    soundManager.playAlarm(10);
  };

  const handleDurationChange = (d: number) => {
    if (!isDurationAllowed(d, accessState)) {
      return;
    }

    resetStudySessionTracking();
    setDuration(d);
    reset(d);
    setShowSettings(false);
  };

  const { minutes, seconds } = formatTime();
  const formattedToday = formatStudyDuration(studyRecord.todaySeconds);
  const formattedTotal = formatStudyDuration(studyRecord.totalSeconds);

  return (
    <div className="relative min-h-screen h-dvh w-full overflow-hidden bg-black font-sans text-white">
      {/* Background Image with Overlay */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-all duration-700 ease-in-out"
        style={{ backgroundImage: `url(${bgImage})` }}
      />
      {bgVideoUrl && (
        <video
          key={bgVideoUrl}
          className="absolute inset-0 h-full w-full object-cover"
          src={bgVideoUrl}
          autoPlay
          muted
          loop
          playsInline
          onError={handleVideoBackgroundError}
        />
      )}
      <div className="absolute inset-0 bg-black/40" />

      {/* Main Content */}
      <main className="relative z-10 flex h-full w-full flex-col items-center justify-between py-12 max-md:landscape:py-4 px-8 max-md:landscape:px-4 overflow-y-auto">
        <div
          ref={quickStatsWrapperRef}
          className="pointer-events-auto absolute right-4 top-4 z-20 max-md:landscape:right-3 max-md:landscape:top-3"
          onMouseLeave={() => setIsQuickStatsOpen(false)}
        >
          <button
            type="button"
            onClick={() => setIsQuickStatsOpen((open) => !open)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/[0.12] text-lg shadow-md shadow-black/25 backdrop-blur-xl transition hover:bg-white/[0.18] active:scale-[0.98]"
            aria-label={quickStatsCopy.title}
            aria-expanded={isQuickStatsOpen}
          >
            🍅
          </button>
          {isQuickStatsOpen && (
            <div className="mt-2 w-44 rounded-2xl border border-white/20 bg-white/[0.10] p-3 text-left shadow-2xl shadow-black/35 backdrop-blur-xl">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/75">
                {quickStatsCopy.title}
              </p>
              <div className="space-y-1.5 text-xs text-white/85">
                <div className="flex items-center justify-between gap-3">
                  <span>{quickStatsCopy.today}</span>
                  <span className="text-white/65 tabular-nums">{formattedToday}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>{quickStatsCopy.streak}</span>
                  <span className="text-white/65 tabular-nums">{studyRecord.streakDays}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>{quickStatsCopy.total}</span>
                  <span className="text-white/65 tabular-nums">{formattedTotal}</span>
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="flex-grow flex flex-col items-center justify-start pt-8 max-md:landscape:pt-2 md:justify-center md:pt-0 w-full max-w-5xl mx-auto">
          <TimerDisplay 
            minutes={minutes} 
            seconds={seconds} 
            isActive={isActive} 
          />

          <TimerControls 
            isActive={isActive}
            isFinished={isFinished}
            sfxEnabled={sfxEnabled}
            musicEnabled={musicEnabled}
            canUseMusic={canUseMusic}
            onToggle={handleToggleTimer}
            onReset={handleReset}
            onOpenSettings={() => setShowSettings(true)}
            onToggleSfx={() => setSfxEnabled(!sfxEnabled)}
            screenWakeLockEnabled={screenWakeLockEnabled}
            wakeLockSupported={wakeLockSupported}
            onToggleScreenWakeLock={() => {
              void handleToggleScreenWakeLock();
            }}
            onToggleMusic={handleToggleMusic}
          />
        </div>

        {/* Footer Branding */}
        <div className="mt-12 max-md:landscape:mt-4 text-center pointer-events-none flex-shrink-0">
          <p className="text-white/30 text-[10px] tracking-[0.4em] uppercase font-medium">Visual Pomodoro</p>
          <p className="text-white/30 text-[8px] tracking-[0.2em] uppercase mt-1">Focus Flow</p>
        </div>
      </main>

      {/* Settings Modal */}
      <SettingsModal 
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        duration={duration}
        durations={DURATIONS}
        onDurationChange={handleDurationChange}
          onImageUpload={handleImageUpload}
          onClearImageBackground={handleClearImageBackground}
          fileInputRef={fileInputRef}
          onVideoUpload={handleVideoUpload}
          onClearDynamicBackground={handleClearDynamicBackground}
          videoInputRef={videoInputRef}
          bgVideoName={bgVideoName}
          tickType={tickType}
        onTickTypeChange={handleTickTypeChange}
        alarmType={alarmType}
        onAlarmTypeChange={handleAlarmTypeChange}
        bgMusicName={bgMusicName}
        onMusicUpload={handleMusicUpload}
        onClearMusic={handleClearMusic}
        musicInputRef={musicInputRef}
        accessState={accessState}
        onSaveLicenseToken={onSaveLicenseToken}
        onClearLicenseToken={onClearLicenseToken}
        onRefreshAccess={onRefreshAccess}
        onActivateCommercialLicenseKey={onActivateCommercialLicenseKey}
      />


      {/* Hidden Audio Element for Music */}
      <audio ref={audioRef} loop preload="auto" />
    </div>
  );
}
