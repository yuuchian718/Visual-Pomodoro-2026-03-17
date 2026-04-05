import React, { useState, useRef } from 'react';
import { useTimer } from './hooks/useTimer';
import { soundManager, TickType, AlarmType } from './lib/sounds';
import { TimerDisplay } from './components/TimerDisplay';
import { TimerControls } from './components/TimerControls';
import { SettingsModal } from './components/SettingsModal';
import type {AccessState} from './lib/access';
import type {CommercialActivationResult} from './components/AuthPanel';
import {resolveBackgroundImage, storeBackgroundImage} from './lib/background-image';
import {isDurationAllowed, isFeatureEnabled} from '../../koto-licensing-modules/modules/partial-unlock-foundation/core';

const DURATIONS = [90, 70, 60, 45, 30, 25, 15, 5];
const DEFAULT_IMAGE = "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=1920";
const DEFAULT_FREE_DURATION = 25;

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
  const [duration, setDuration] = useState(25);
  const [bgImage, setBgImage] = useState(() => resolveBackgroundImage(DEFAULT_IMAGE));
  const [showSettings, setShowSettings] = useState(false);
  const [tickType, setTickType] = useState<TickType>('classic');
  const [alarmType, setAlarmType] = useState<AlarmType>('classic');
  const [bgMusicUrl, setBgMusicUrl] = useState<string | null>(null);
  const [bgMusicName, setBgMusicName] = useState<string | null>(null);
  const [sfxEnabled, setSfxEnabled] = useState(true);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [screenWakeLockEnabled, setScreenWakeLockEnabled] = useState(false);
  const [screenWakeLockRequested, setScreenWakeLockRequested] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const musicInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const wakeLockSentinelRef = useRef<WakeLockSentinelLike | null>(null);

  const { isActive, isFinished, toggle, reset, formatTime } = useTimer(duration, { soundEnabled: sfxEnabled });
  const wakeLockSupported =
    typeof navigator !== 'undefined' && 'wakeLock' in (navigator as NavigatorWithWakeLock);
  const canUseMusic = isFeatureEnabled('music', accessState);
  const canUseBackgroundFeatures = isFeatureEnabled('backgroundFeatures', accessState);

  React.useEffect(() => {
    if (audioRef.current) {
      if (isActive && bgMusicUrl && musicEnabled) {
        audioRef.current.play().catch(() => {}); // Silent catch for production
      } else {
        audioRef.current.pause();
      }
    }
  }, [isActive, bgMusicUrl, musicEnabled]);

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

        storeBackgroundImage(result);
        setBgImage(result);
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
      const url = URL.createObjectURL(file);
      setBgMusicUrl(url);
      setBgMusicName(file.name);
    }
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

    setDuration(d);
    reset(d);
    setShowSettings(false);
  };

  const { minutes, seconds } = formatTime();

  return (
    <div className="relative h-screen w-full overflow-hidden bg-black font-sans text-white">
      {/* Background Image with Overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center transition-all duration-700 ease-in-out"
        style={{ backgroundImage: `url(${bgImage})` }}
      >
        <div className="absolute inset-0 bg-black/40" />
      </div>

      {/* Main Content */}
      <main className="relative z-10 flex h-full w-full flex-col items-center justify-between py-12 max-md:landscape:py-4 px-8 max-md:landscape:px-4 overflow-y-auto">
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
            onToggle={toggle}
            onReset={handleReset}
            onOpenSettings={() => setShowSettings(true)}
            onToggleSfx={() => setSfxEnabled(!sfxEnabled)}
            screenWakeLockEnabled={screenWakeLockEnabled}
            wakeLockSupported={wakeLockSupported}
            onToggleScreenWakeLock={() => {
              void handleToggleScreenWakeLock();
            }}
            onToggleMusic={() => {
              if (!canUseMusic) {
                return;
              }
              setMusicEnabled(!musicEnabled);
            }}
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
        fileInputRef={fileInputRef}
        tickType={tickType}
        onTickTypeChange={handleTickTypeChange}
        alarmType={alarmType}
        onAlarmTypeChange={handleAlarmTypeChange}
        bgMusicName={bgMusicName}
        onMusicUpload={handleMusicUpload}
        musicInputRef={musicInputRef}
        accessState={accessState}
        onSaveLicenseToken={onSaveLicenseToken}
        onClearLicenseToken={onClearLicenseToken}
        onRefreshAccess={onRefreshAccess}
        onActivateCommercialLicenseKey={onActivateCommercialLicenseKey}
      />


      {/* Hidden Audio Element for Music */}
      {bgMusicUrl && (
        <audio ref={audioRef} src={bgMusicUrl} loop />
      )}
    </div>
  );
}
