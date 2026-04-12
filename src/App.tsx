import React, { useState, useRef } from 'react';
import { useTimer } from './hooks/useTimer';
import { soundManager, TickType, AlarmType } from './lib/sounds';
import { TimerDisplay } from './components/TimerDisplay';
import { TimerControls } from './components/TimerControls';
import { SettingsModal } from './components/SettingsModal';
import {TomatoScatterLayer} from './components/TomatoScatterLayer';
import {TomatoTrayLayer} from './components/TomatoTrayLayer';
import {TomatoTrayExpandedLayer} from './components/TomatoTrayExpandedLayer';
import type {AccessState} from './lib/access';
import type {CommercialActivationResult} from './components/AuthPanel';
import {clearStoredBackgroundImage, resolveBackgroundImage, storeBackgroundImage} from './lib/background-image';
import {isDurationAllowed, isFeatureEnabled} from './lib/partial-unlock-core';
import {useLocale} from './lib/locale';
import {
  addStudySegment,
  loadAndSyncStudyRecord,
  resetStudyRecord,
  type StudyRecord,
} from './lib/study-record';
import {
  appendTomatoHarvestEntry,
  clearTrayFullTomatoes,
  clearSeededTomatoHarvestTestData,
  createTomatoHarvestEntry,
  loadTomatoHarvestState,
  moveFullScatterTomatoesToTray,
  moveScatterFullTomatoToTrayById,
  removeAllIncompleteTomatoes,
  removeTomatoHarvestEntry,
  SCATTER_VISIBLE_CAP,
  seedTomatoHarvestTestData,
  type TomatoHarvestEntry,
  updateTomatoCustomPosition,
} from './lib/tomato-harvest';

const DURATIONS = [90, 70, 60, 45, 30, 25, 15, 5];
const DEFAULT_IMAGE = "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=1920";
const DEFAULT_FREE_DURATION = 25;
const STUDY_RECORD_GATE_MS = 5000;
const TOMATO_MIN_EFFECTIVE_SECONDS = 5;
const TRAY_COLLAPSED_STORAGE_KEY = 'visual-pomodoro-tray-collapsed-v1';
const TOMATO_TRAY_GHOST_MS = 190;
const TOMATO_SIZE_PX: Record<TomatoHarvestEntry['sizeTier'], number> = {
  XS: 34,
  S: 40,
  M: 46,
  L: 52,
  XL: 58,
  XXL: 64,
};

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

type TomatoTrayGhost = {
  id: string;
  startXLocal: number;
  startYLocal: number;
  targetXLocal: number;
  targetYLocal: number;
  sizePx: number;
  animate: boolean;
};

type PendingTrayStore = {
  id: string;
  startXLocal: number;
  startYLocal: number;
  fallbackTargetXLocal: number;
  fallbackTargetYLocal: number;
  sizePx: number;
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
  const settingsCopy = messages.settingsModal;
  const [duration, setDuration] = useState(25);
  const [bgImage, setBgImage] = useState(() => resolveBackgroundImage(DEFAULT_IMAGE));
  const [bgVideoUrl, setBgVideoUrl] = useState<string | null>(null);
  const [bgVideoName, setBgVideoName] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [tickType, setTickType] = useState<TickType>('classic');
  const [alarmType, setAlarmType] = useState<AlarmType>('classic');
  const [bgMusicUrl, setBgMusicUrl] = useState<string | null>(null);
  const [bgMusicName, setBgMusicName] = useState<string | null>(null);
  const [bgVideoPlaybackNotice, setBgVideoPlaybackNotice] = useState<string | null>(null);
  const [sfxEnabled, setSfxEnabled] = useState(true);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [screenWakeLockEnabled, setScreenWakeLockEnabled] = useState(false);
  const [screenWakeLockRequested, setScreenWakeLockRequested] = useState(false);
  const [isQuickStatsOpen, setIsQuickStatsOpen] = useState(false);
  const [isTrayExpanded, setIsTrayExpanded] = useState(false);
  const [studyRecord, setStudyRecord] = useState<StudyRecord>(() => loadAndSyncStudyRecord());
  const [scatterTomatoes, setScatterTomatoes] = useState<TomatoHarvestEntry[]>(() =>
    loadTomatoHarvestState().entries.filter((entry) => entry.location === 'SCATTER'),
  );
  const [trayTomatoes, setTrayTomatoes] = useState<TomatoHarvestEntry[]>(() =>
    loadTomatoHarvestState().entries.filter((entry) => entry.location === 'TRAY' && entry.damageTier === 'FULL'),
  );
  const [isTrayCollapsed, setIsTrayCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    return window.localStorage.getItem(TRAY_COLLAPSED_STORAGE_KEY) === '1';
  });
  const [trayGhost, setTrayGhost] = useState<TomatoTrayGhost | null>(null);
  const [pendingTrayStore, setPendingTrayStore] = useState<PendingTrayStore | null>(null);
  const [, setViewportSyncTick] = useState(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const musicInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const bgVideoRef = useRef<HTMLVideoElement | null>(null);
  const wakeLockSentinelRef = useRef<WakeLockSentinelLike | null>(null);
  const bgVideoUrlRef = useRef<string | null>(null);
  const bgMusicUrlRef = useRef<string | null>(null);
  const quickStatsWrapperRef = useRef<HTMLDivElement | null>(null);
  const trayLayerRef = useRef<HTMLDivElement | null>(null);
  const trayGhostTimerRef = useRef<number | null>(null);
  const bgVideoNoticeTimerRef = useRef<number | null>(null);
  const bgVideoResumeRetryTimerRef = useRef<number | null>(null);
  const bgVideoResumeInFlightRef = useRef(false);
  const bgMusicUserPausedRef = useRef(false);
  const bgVideoUserPausedRef = useRef(false);
  const suppressMusicPauseIntentRef = useRef(false);
  const bgVideoLifecyclePausePendingRef = useRef(false);
  const studyPendingStartAtRef = useRef<number | null>(null);
  const studyEffectiveStartAtRef = useRef<number | null>(null);
  const studyGateTimerRef = useRef<number | null>(null);
  const studyHasEffectivePhaseRef = useRef(false);
  const tomatoSessionTargetMinutesRef = useRef<number | null>(null);
  const tomatoSessionActualSecondsRef = useRef(0);

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

  const syncTomatoViews = React.useCallback((entries: TomatoHarvestEntry[]) => {
    setScatterTomatoes(entries.filter((entry) => entry.location === 'SCATTER'));
    setTrayTomatoes(entries.filter((entry) => entry.location === 'TRAY' && entry.damageTier === 'FULL'));
  }, []);

  const showBgVideoNotice = React.useCallback((message: string) => {
    setBgVideoPlaybackNotice(message);
    if (bgVideoNoticeTimerRef.current !== null) {
      window.clearTimeout(bgVideoNoticeTimerRef.current);
    }
    bgVideoNoticeTimerRef.current = window.setTimeout(() => {
      setBgVideoPlaybackNotice(null);
      bgVideoNoticeTimerRef.current = null;
    }, 2200);
  }, []);

  React.useEffect(() => {
    return () => {
      if (trayGhostTimerRef.current !== null) {
        window.clearTimeout(trayGhostTimerRef.current);
        trayGhostTimerRef.current = null;
      }
      if (bgVideoNoticeTimerRef.current !== null) {
        window.clearTimeout(bgVideoNoticeTimerRef.current);
        bgVideoNoticeTimerRef.current = null;
      }
      if (bgVideoResumeRetryTimerRef.current !== null) {
        window.clearTimeout(bgVideoResumeRetryTimerRef.current);
        bgVideoResumeRetryTimerRef.current = null;
      }
    };
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

  const resetTomatoSessionTracking = React.useCallback(() => {
    tomatoSessionTargetMinutesRef.current = null;
    tomatoSessionActualSecondsRef.current = 0;
  }, []);

  const flushStudySegment = React.useCallback(() => {
    let flushedSeconds = 0;
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
      flushedSeconds = Math.max(0, Math.floor((nowMs - effectiveStartAt) / 1000));
      const updated = addStudySegment(effectiveStartAt, nowMs, nowMs);
      setStudyRecord(updated);
      studyHasEffectivePhaseRef.current = true;
      tomatoSessionActualSecondsRef.current += flushedSeconds;
    } else {
      setStudyRecord(loadAndSyncStudyRecord(nowMs));
    }

    studyEffectiveStartAtRef.current = null;
    studyPendingStartAtRef.current = null;
    return flushedSeconds;
  }, []);

  const finalizeTomatoSession = React.useCallback(
    (reason: 'COMPLETED' | 'ENDED') => {
      flushStudySegment();

      const targetMinutes = tomatoSessionTargetMinutesRef.current;
      const actualSeconds = tomatoSessionActualSecondsRef.current;
      if (targetMinutes === null || actualSeconds < TOMATO_MIN_EFFECTIVE_SECONDS) {
        resetTomatoSessionTracking();
        return;
      }

      const entry = createTomatoHarvestEntry({
        targetMinutes,
        actualSeconds,
        createdAt: Date.now(),
      });

      if (reason === 'COMPLETED') {
        entry.damageTier = 'FULL';
      } else if (entry.damageTier === 'FULL') {
        entry.damageTier = 'LIGHT';
      }

      const next = appendTomatoHarvestEntry(entry);
      syncTomatoViews(next.entries);
      resetTomatoSessionTracking();
    },
    [flushStudySegment, resetTomatoSessionTracking, syncTomatoViews],
  );
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

  const pauseBackgroundMusicSilently = React.useCallback(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }
    suppressMusicPauseIntentRef.current = true;
    audio.pause();
    window.setTimeout(() => {
      suppressMusicPauseIntentRef.current = false;
    }, 0);
  }, []);

  React.useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    if (isActive && bgMusicUrl && musicEnabled && !bgMusicUserPausedRef.current) {
      void attemptPlayBackgroundMusic();
      return;
    }

    pauseBackgroundMusicSilently();
    setIsMusicPlaying(false);
  }, [attemptPlayBackgroundMusic, bgMusicUrl, isActive, musicEnabled, pauseBackgroundMusicSilently]);

  React.useEffect(() => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    const handlePlay = () => {
      setIsMusicPlaying(true);
      bgMusicUserPausedRef.current = false;
      logBgMusic('event:play');
    };
    const handlePause = () => {
      setIsMusicPlaying(false);
      if (!suppressMusicPauseIntentRef.current && isActive && musicEnabled && bgMusicUrl) {
        bgMusicUserPausedRef.current = true;
      }
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
  }, [bgMusicUrl, isActive, logBgMusic, musicEnabled]);

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
      if (!isActive || !musicEnabled || !bgMusicUrl || bgMusicUserPausedRef.current) {
        return;
      }

      if (audio.paused) {
        void attemptPlayBackgroundMusic();
      }
    };

    const handleLoadedData = () => {
      logBgMusic('event:loadeddata');
      if (!isActive || !musicEnabled || !bgMusicUrl || bgMusicUserPausedRef.current) {
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
    let rafId: number | null = null;
    const triggerViewportSync = () => {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
      rafId = window.requestAnimationFrame(() => {
        setViewportSyncTick((prev) => (prev + 1) % 1000000);
      });
    };

    const viewport = window.visualViewport;
    if (viewport) {
      viewport.addEventListener('resize', triggerViewportSync);
    } else {
      window.addEventListener('resize', triggerViewportSync);
    }

    return () => {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
      if (viewport) {
        viewport.removeEventListener('resize', triggerViewportSync);
      } else {
        window.removeEventListener('resize', triggerViewportSync);
      }
    };
  }, []);

  React.useEffect(() => {
    const synced = loadAndSyncStudyRecord();
    setStudyRecord(synced);
    const harvest = loadTomatoHarvestState();
    syncTomatoViews(harvest.entries);
  }, [syncTomatoViews]);

  React.useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      window.localStorage.setItem(TRAY_COLLAPSED_STORAGE_KEY, isTrayCollapsed ? '1' : '0');
    } catch {
      // Keep UI behavior stable even if storage write fails.
    }
  }, [isTrayCollapsed]);

  React.useEffect(() => {
    if (!isActive) {
      clearStudyGateTimer();
      flushStudySegment();
      return;
    }

    if (tomatoSessionTargetMinutesRef.current === null) {
      tomatoSessionTargetMinutesRef.current = duration;
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
    if (!isFinished) {
      return;
    }

    finalizeTomatoSession('COMPLETED');
  }, [finalizeTomatoSession, isFinished]);

  React.useEffect(() => {
    const handlePageHide = () => {
      finalizeTomatoSession('ENDED');
    };

    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('beforeunload', handlePageHide);

    return () => {
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('beforeunload', handlePageHide);
    };
  }, [finalizeTomatoSession]);

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
      finalizeTomatoSession('ENDED');
      resetStudySessionTracking();
      resetTomatoSessionTracking();
      setDuration(DEFAULT_FREE_DURATION);
      reset(DEFAULT_FREE_DURATION);
    }
  }, [accessState, duration, finalizeTomatoSession, reset, resetStudySessionTracking, resetTomatoSessionTracking]);

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
    finalizeTomatoSession('ENDED');
    resetStudySessionTracking();
    resetTomatoSessionTracking();
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
      bgMusicUserPausedRef.current = false;
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
      pauseBackgroundMusicSilently();
      audio.currentTime = 0;
    }

    if (bgMusicUrlRef.current) {
      URL.revokeObjectURL(bgMusicUrlRef.current);
      bgMusicUrlRef.current = null;
    }

    setBgMusicUrl(null);
    setBgMusicName(null);
    setIsMusicPlaying(false);
    bgMusicUserPausedRef.current = false;
  };

  const handleToggleMusic = () => {
    if (!canUseMusic) {
      return;
    }

    const nextEnabled = !musicEnabled;
    logBgMusic('music:toggle', { nextEnabled });
    setMusicEnabled(nextEnabled);
    if (nextEnabled) {
      bgMusicUserPausedRef.current = false;
    }
  };

  const handleToggleTimer = () => {
    const shouldBecomeActive = !isActive;
    logBgMusic('timer:toggle', { shouldBecomeActive });
    toggle();

    if (shouldBecomeActive && bgMusicUrl && musicEnabled) {
      bgMusicUserPausedRef.current = false;
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
      showBgVideoNotice(settingsCopy.videoBackgroundUnsupported);
      return;
    }

    if (bgVideoUrlRef.current) {
      URL.revokeObjectURL(bgVideoUrlRef.current);
      bgVideoUrlRef.current = null;
    }

    const nextUrl = URL.createObjectURL(file);
    bgVideoUrlRef.current = nextUrl;
    bgVideoUserPausedRef.current = false;
    setBgVideoUrl(nextUrl);
    setBgVideoName(file.name);
  };

  const handleVideoBackgroundError = () => {
    showBgVideoNotice(settingsCopy.videoBackgroundPlayFailed);
    if (bgVideoUrlRef.current) {
      URL.revokeObjectURL(bgVideoUrlRef.current);
      bgVideoUrlRef.current = null;
    }

    setBgVideoUrl(null);
    setBgVideoName(null);
    bgVideoUserPausedRef.current = false;
  };

  React.useEffect(() => {
    const video = bgVideoRef.current;
    if (!video || !bgVideoUrl) {
      return;
    }

    let cancelled = false;

    const tryPlay = async () => {
      if (cancelled) {
        return;
      }
      try {
        video.load();
        await video.play();
      } catch {
        if (!cancelled) {
          showBgVideoNotice(settingsCopy.videoBackgroundPlayFailed);
        }
      }
    };

    const retryIfPaused = () => {
      if (!video.paused || cancelled) {
        return;
      }
      void video.play().catch(() => {
        if (!cancelled) {
          showBgVideoNotice(settingsCopy.videoBackgroundPlayFailed);
        }
      });
    };

    video.addEventListener('loadeddata', retryIfPaused);
    video.addEventListener('canplay', retryIfPaused);
    void tryPlay();

    return () => {
      cancelled = true;
      video.removeEventListener('loadeddata', retryIfPaused);
      video.removeEventListener('canplay', retryIfPaused);
    };
  }, [bgVideoUrl, settingsCopy.videoBackgroundPlayFailed, showBgVideoNotice]);

  const attemptResumeBackgroundVideo = React.useCallback(
    async (allowRetry: boolean) => {
      const video = bgVideoRef.current;
      if (!video || !bgVideoUrl) {
        return;
      }
      if (!isActive) {
        return;
      }
      if (bgVideoUserPausedRef.current) {
        return;
      }
      if (!(video.paused || video.ended)) {
        return;
      }
      if (bgVideoResumeInFlightRef.current) {
        return;
      }

      const checkVideoAdvancing = async () => {
        const t0 = video.currentTime;
        await new Promise((resolve) => window.setTimeout(resolve, 360));
        return !video.paused && video.currentTime > t0 + 0.03;
      };

      bgVideoResumeInFlightRef.current = true;
      try {
        try {
          await video.play();
        } catch {
          // Fall through to conditional reload+replay when media is not ready.
        }

        if (video.paused && video.readyState < 2) {
          video.load();
        }

        try {
          await video.play();
        } catch {
          // Keep going to unified retry handling below.
        }

        if (!video.paused) {
          const advanced = await checkVideoAdvancing();
          if (advanced) {
            return;
          }

          // play() may resolve on mobile while frames stay frozen; force one hard restart.
          video.load();
          try {
            await video.play();
            const advancedAfterReload = await checkVideoAdvancing();
            if (advancedAfterReload) {
              return;
            }
          } catch {
            // Keep going to unified retry handling below.
          }
        }

        if (allowRetry && bgVideoResumeRetryTimerRef.current === null) {
          bgVideoResumeRetryTimerRef.current = window.setTimeout(() => {
            bgVideoResumeRetryTimerRef.current = null;
            void attemptResumeBackgroundVideo(false);
          }, 320);
          return;
        }
        showBgVideoNotice(settingsCopy.videoBackgroundPlayFailed);
      } finally {
        bgVideoResumeInFlightRef.current = false;
      }
    },
    [bgVideoUrl, isActive, settingsCopy.videoBackgroundPlayFailed, showBgVideoNotice],
  );

  React.useEffect(() => {
    if (!bgVideoUrl) {
      return;
    }

    const video = bgVideoRef.current;
    if (!video) {
      return;
    }

    const handleVideoPlay = () => {
      bgVideoUserPausedRef.current = false;
    };
    const handleVideoPause = () => {
      if (bgVideoLifecyclePausePendingRef.current) {
        bgVideoLifecyclePausePendingRef.current = false;
        return;
      }
      if (isActive) {
        bgVideoUserPausedRef.current = true;
      }
    };

    video.addEventListener('play', handleVideoPlay);
    video.addEventListener('pause', handleVideoPause);

    return () => {
      video.removeEventListener('play', handleVideoPlay);
      video.removeEventListener('pause', handleVideoPause);
    };
  }, [bgVideoUrl, isActive]);

  const attemptResumeMediaAfterForeground = React.useCallback(async () => {
    if (document.visibilityState !== 'visible') {
      return;
    }

    if (bgMusicUrl && musicEnabled && isActive && !bgMusicUserPausedRef.current) {
      const audio = audioRef.current;
      if (audio && audio.paused) {
        void attemptPlayBackgroundMusic();
      }
    }

    void attemptResumeBackgroundVideo(true);
  }, [attemptPlayBackgroundMusic, attemptResumeBackgroundVideo, bgMusicUrl, isActive, musicEnabled]);

  React.useEffect(() => {
    if (!isActive || !bgVideoUrl) {
      return;
    }
    if (document.visibilityState !== 'visible') {
      return;
    }
    const video = bgVideoRef.current;
    if (!video || !video.paused) {
      return;
    }
    void attemptResumeBackgroundVideo(true);
  }, [attemptResumeBackgroundVideo, bgVideoUrl, isActive]);

  React.useEffect(() => {
    const handleVisibilityChange = () => {
      const video = bgVideoRef.current;
      if (!video) {
        return;
      }
      if (document.visibilityState === 'hidden') {
        bgVideoLifecyclePausePendingRef.current = true;
        video.pause();
        return;
      }
      void attemptResumeMediaAfterForeground();
    };
    const handlePageShow = () => {
      void attemptResumeMediaAfterForeground();
    };
    const handleFocus = () => {
      void attemptResumeMediaAfterForeground();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pageshow', handlePageShow);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('focus', handleFocus);
    };
  }, [attemptResumeMediaAfterForeground]);

  React.useEffect(() => {
    bgVideoResumeInFlightRef.current = false;
    bgVideoLifecyclePausePendingRef.current = false;
    if (bgVideoResumeRetryTimerRef.current !== null) {
      window.clearTimeout(bgVideoResumeRetryTimerRef.current);
      bgVideoResumeRetryTimerRef.current = null;
    }
  }, [bgVideoUrl]);

  React.useEffect(() => {
    const mediaSession = typeof navigator !== 'undefined' ? navigator.mediaSession : undefined;
    if (!mediaSession) {
      return;
    }

    const clearActionHandlers = () => {
      try {
        mediaSession.setActionHandler('play', null);
      } catch {
        // Some environments may not support all action handlers.
      }
      try {
        mediaSession.setActionHandler('pause', null);
      } catch {
        // Some environments may not support all action handlers.
      }
    };

    if (!isActive || !musicEnabled || !bgMusicUrl) {
      mediaSession.playbackState = 'none';
      clearActionHandlers();
      return;
    }

    mediaSession.playbackState = isMusicPlaying ? 'playing' : 'paused';
    try {
      mediaSession.setActionHandler('play', () => {
        bgMusicUserPausedRef.current = false;
        void attemptPlayBackgroundMusic();
      });
    } catch {
      // Ignore unsupported action handlers.
    }
    try {
      mediaSession.setActionHandler('pause', () => {
        bgMusicUserPausedRef.current = true;
        pauseBackgroundMusicSilently();
        setIsMusicPlaying(false);
      });
    } catch {
      // Ignore unsupported action handlers.
    }

    return () => {
      clearActionHandlers();
    };
  }, [
    attemptPlayBackgroundMusic,
    bgMusicUrl,
    isActive,
    isMusicPlaying,
    musicEnabled,
    pauseBackgroundMusicSilently,
  ]);

  React.useEffect(() => {
    const video = bgVideoRef.current;
    if (!video) {
      return;
    }
    if (!isActive && !video.paused) {
      bgVideoLifecyclePausePendingRef.current = true;
      video.pause();
    }
  }, [isActive, bgVideoUrl]);

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

    finalizeTomatoSession('ENDED');
    resetStudySessionTracking();
    resetTomatoSessionTracking();
    setDuration(d);
    reset(d);
    setShowSettings(false);
  };

  const { minutes, seconds } = formatTime();
  const formattedToday = formatStudyDuration(studyRecord.todaySeconds);
  const formattedTotal = formatStudyDuration(studyRecord.totalSeconds);
  const storableFullCount = React.useMemo(
    () => scatterTomatoes.filter((entry) => entry.damageTier === 'FULL').length,
    [scatterTomatoes],
  );
  const scatterTotalDataCount = scatterTomatoes.length;
  const trayStoredCount = trayTomatoes.length;
  const tomatoTotalCount = scatterTomatoes.length + trayTomatoes.length;
  const scatterShownCount = Math.min(scatterTomatoes.length, SCATTER_VISIBLE_CAP);
  const trayShownCount = Math.min(trayTomatoes.length, 16);
  const isDev = import.meta.env.DEV;
  const handleTomatoPositionCommit = React.useCallback((id: string, position: {xPct: number; yPct: number}) => {
    const next = updateTomatoCustomPosition(id, position);
    syncTomatoViews(next.entries);
  }, [syncTomatoViews]);
  const handleTomatoDelete = React.useCallback((id: string) => {
    const next = removeTomatoHarvestEntry(id);
    syncTomatoViews(next.entries);
  }, [syncTomatoViews]);
  const handleTomatoDeleteAllIncomplete = React.useCallback(() => {
    const next = removeAllIncompleteTomatoes();
    syncTomatoViews(next.entries);
  }, [syncTomatoViews]);
  const handleStoreFullTomatoes = React.useCallback(() => {
    const next = moveFullScatterTomatoesToTray();
    syncTomatoViews(next.entries);
  }, [syncTomatoViews]);
  const handleStoreSingleTomatoToTray = React.useCallback((id: string) => {
    const next = moveScatterFullTomatoToTrayById(id);
    syncTomatoViews(next.entries);
  }, [syncTomatoViews]);
  const canStoreToTrayAtPoint = React.useCallback(
    (clientX: number, clientY: number) => {
      if (isTrayCollapsed) {
        return false;
      }
      const trayEl = trayLayerRef.current;
      if (!trayEl) {
        return false;
      }
      const rect = trayEl.getBoundingClientRect();
      return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
    },
    [isTrayCollapsed],
  );
  const handleStoreSingleTomatoToTrayWithGhost = React.useCallback(
    (id: string, pointer: {clientX: number; clientY: number}) => {
      if (trayGhostTimerRef.current !== null) {
        window.clearTimeout(trayGhostTimerRef.current);
        trayGhostTimerRef.current = null;
      }

      const trayEl = trayLayerRef.current;
      if (!trayEl) {
        handleStoreSingleTomatoToTray(id);
        return;
      }

      const rect = trayEl.getBoundingClientRect();
      const entry = scatterTomatoes.find((item) => item.id === id);
      const startXLocal = pointer.clientX - rect.left;
      const startYLocal = pointer.clientY - rect.top;
      const safeLeftLocal = rect.width * 0.25;
      const safeRightLocal = rect.width * 0.75;
      setPendingTrayStore({
        id,
        startXLocal,
        startYLocal,
        fallbackTargetXLocal: Math.min(safeRightLocal, Math.max(safeLeftLocal, startXLocal)),
        fallbackTargetYLocal: rect.height * 0.72,
        sizePx: entry ? TOMATO_SIZE_PX[entry.sizeTier] : TOMATO_SIZE_PX.M,
      });
    },
    [handleStoreSingleTomatoToTray, scatterTomatoes],
  );
  const handleIncomingStoreTargetResolved = React.useCallback(
    (target: {id: string; xLocal: number; yLocal: number} | null) => {
      const pending = pendingTrayStore;
      if (!pending) {
        return;
      }

      if (target && target.id !== pending.id) {
        return;
      }

      const targetXLocal = target?.xLocal ?? pending.fallbackTargetXLocal;
      const targetYLocal = target?.yLocal ?? pending.fallbackTargetYLocal;

      setTrayGhost({
        id: pending.id,
        startXLocal: pending.startXLocal,
        startYLocal: pending.startYLocal,
        targetXLocal,
        targetYLocal,
        sizePx: pending.sizePx,
        animate: false,
      });
      setPendingTrayStore(null);

      requestAnimationFrame(() => {
        setTrayGhost((current) => (current && current.id === pending.id ? {...current, animate: true} : current));
      });

      trayGhostTimerRef.current = window.setTimeout(() => {
        handleStoreSingleTomatoToTray(pending.id);
        setTrayGhost((current) => (current && current.id === pending.id ? null : current));
        trayGhostTimerRef.current = null;
      }, TOMATO_TRAY_GHOST_MS);
    },
    [handleStoreSingleTomatoToTray, pendingTrayStore],
  );
  const handleSeedTestTomatoes = React.useCallback(() => {
    const next = seedTomatoHarvestTestData();
    syncTomatoViews(next.entries);
  }, [syncTomatoViews]);
  const handleClearSeededTomatoes = React.useCallback(() => {
    const next = clearSeededTomatoHarvestTestData();
    syncTomatoViews(next.entries);
  }, [syncTomatoViews]);
  const handleClearTrayFullTomatoes = React.useCallback(() => {
    const next = clearTrayFullTomatoes();
    syncTomatoViews(next.entries);
  }, [syncTomatoViews]);
  const handleResetAccumulatedTime = React.useCallback(() => {
    const reset = resetStudyRecord();
    setStudyRecord(reset);
  }, []);

  return (
    <div className="relative min-h-screen h-dvh w-full overflow-hidden bg-black font-sans text-white">
      {/* Background Image with Overlay */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-all duration-700 ease-in-out"
        style={{ backgroundImage: `url(${bgImage})` }}
      />
      {bgVideoUrl && isActive && (
        <video
          ref={bgVideoRef}
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
      {bgVideoPlaybackNotice && (
        <div className="pointer-events-none absolute left-1/2 top-4 z-30 -translate-x-1/2 rounded-xl border border-white/18 bg-black/55 px-3 py-2 text-xs text-white/90 shadow-lg shadow-black/35 backdrop-blur-md">
          {bgVideoPlaybackNotice}
        </div>
      )}

      {/* Main Content */}
      <main className="relative z-10 flex h-full w-full flex-col items-center justify-between py-12 max-md:landscape:py-4 px-8 max-md:landscape:px-4 overflow-y-auto">
        <TomatoScatterLayer
          entries={scatterTomatoes}
          onPositionCommit={handleTomatoPositionCommit}
          onDelete={handleTomatoDelete}
          onDeleteAllIncomplete={handleTomatoDeleteAllIncomplete}
          onStoreToTray={handleStoreSingleTomatoToTrayWithGhost}
          canStoreToTrayAtPoint={canStoreToTrayAtPoint}
        />
        {!isTrayCollapsed && (
          <TomatoTrayLayer
            entries={trayTomatoes}
            containerRef={trayLayerRef}
            incomingGhost={trayGhost}
            incomingStorePreviewId={pendingTrayStore?.id ?? null}
            onIncomingStoreTargetResolved={handleIncomingStoreTargetResolved}
          />
        )}
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
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className="h-[36px] w-[36px] text-white/90"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="13" r="6.5" />
              <path d="M12 13V10.2" />
              <path d="M12 13h2.8" />
              <path d="M6.6 4.8L8.8 6.4" />
              <path d="M17.4 4.8l-2.2 1.6" />
              <path d="M9.4 3.8h5.2" />
            </svg>
          </button>
          {isQuickStatsOpen && (
            <div className="mt-2 w-52 rounded-2xl border border-white/20 bg-white/[0.10] p-3 text-left shadow-2xl shadow-black/35 backdrop-blur-xl">
              <p className="mb-2 text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-white/75">
                {quickStatsCopy.title}
              </p>
              <div className="rounded-lg border border-white/12 bg-black/15 px-2 py-1.5">
                <p className="mb-1 text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-white/70">
                  {quickStatsCopy.timeRecordTitle}
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
                <button
                  type="button"
                  onClick={handleResetAccumulatedTime}
                  className="mt-2 w-full rounded-md border border-white/12 bg-white/[0.04] px-2 py-1 text-[10px] font-medium text-white/72 transition hover:bg-white/[0.10]"
                >
                  {quickStatsCopy.resetAccumulatedTime}
                </button>
              </div>
              <div className="mt-2 rounded-lg border border-white/12 bg-black/20 px-2 py-1.5 text-[10px] text-white/75">
                <p className="mb-1 text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-white/70">
                  {quickStatsCopy.tomatoResultTitle}
                </p>
                <div className="flex items-center justify-between gap-2">
                  <span>{quickStatsCopy.scatterFullData}</span>
                  <span className="tabular-nums">{storableFullCount}</span>
                </div>
                <div className="mt-0.5 flex items-center justify-between gap-2">
                  <span>{quickStatsCopy.scatterTotalData}</span>
                  <span className="tabular-nums">{scatterTotalDataCount}</span>
                </div>
                <div className="mt-0.5 flex items-center justify-between gap-2">
                  <span>{quickStatsCopy.trayStored}</span>
                  <span className="tabular-nums">{trayStoredCount}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleStoreFullTomatoes}
                disabled={storableFullCount === 0}
                className="mt-3 w-full rounded-lg border border-white/18 bg-white/[0.10] px-2.5 py-1.5 text-[11px] font-medium text-white/90 transition hover:bg-white/[0.16] disabled:cursor-not-allowed disabled:opacity-45"
              >
                {quickStatsCopy.storeScatterFull} ({storableFullCount})
              </button>
              {trayTomatoes.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsTrayCollapsed((prev) => !prev)}
                  className="mt-2 w-full rounded-lg border border-white/14 bg-white/[0.06] px-2.5 py-1.5 text-[11px] font-medium text-white/80 transition hover:bg-white/[0.12]"
                >
                  {isTrayCollapsed ? quickStatsCopy.showTray : quickStatsCopy.hideTray}
                </button>
              )}
              {trayTomatoes.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsTrayExpanded(true)}
                  className="mt-2 w-full rounded-lg border border-white/14 bg-white/[0.06] px-2.5 py-1.5 text-[11px] font-medium text-white/80 transition hover:bg-white/[0.12]"
                >
                  {quickStatsCopy.viewAllStoredTomatoes}
                </button>
              )}
              {isDev && (
                <>
                  <div className="mt-2 rounded-lg border border-white/12 bg-black/25 px-2 py-1.5 text-[10px] text-white/75">
                    <p className="mb-1 text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-white/70">
                      {quickStatsCopy.debugTitle}
                    </p>
                    <div className="flex items-center justify-between gap-2">
                      <span>{quickStatsCopy.totalData}</span>
                      <span className="tabular-nums">{tomatoTotalCount}</span>
                    </div>
                    <div className="mt-0.5 flex items-center justify-between gap-2">
                      <span>{quickStatsCopy.scatterDataShown}</span>
                      <span className="tabular-nums">
                        {scatterTomatoes.length} / {scatterShownCount}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center justify-between gap-2">
                      <span>{quickStatsCopy.trayDataShown}</span>
                      <span className="tabular-nums">
                        {trayTomatoes.length} / {trayShownCount}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleSeedTestTomatoes}
                    className="mt-2 w-full rounded-lg border border-amber-200/30 bg-amber-100/10 px-2.5 py-1.5 text-[11px] font-medium text-amber-100/95 transition hover:bg-amber-100/18"
                  >
                    {quickStatsCopy.seedTestTomatoes}
                  </button>
                  <button
                    type="button"
                    onClick={handleClearSeededTomatoes}
                    className="mt-2 w-full rounded-lg border border-white/12 bg-white/[0.05] px-2.5 py-1.5 text-[11px] font-medium text-white/70 transition hover:bg-white/[0.1]"
                  >
                    {quickStatsCopy.clearTestTomatoes}
                  </button>
                </>
              )}
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
      {isTrayExpanded && (
        <TomatoTrayExpandedLayer
          entries={trayTomatoes}
          title={quickStatsCopy.storedTomatoesTitle}
          closeLabel={quickStatsCopy.close}
          countLabel={quickStatsCopy.trayStored}
          totalDurationLabel={quickStatsCopy.storedTomatoesTotalDuration}
          clearLabel={quickStatsCopy.clearTomatoResults}
          clearConfirmLabel={quickStatsCopy.clearTomatoResultsConfirm}
          onClose={() => setIsTrayExpanded(false)}
          onDelete={handleTomatoDelete}
          onClearAll={handleClearTrayFullTomatoes}
        />
      )}
    </div>
  );
}
