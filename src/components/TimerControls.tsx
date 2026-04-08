import React from 'react';
import { Play, Pause, RotateCcw, Settings, Volume2, VolumeX, Headphones, HeadphoneOff, Smartphone } from 'lucide-react';
import { motion } from 'motion/react';
import {useLocale} from '../lib/locale';
import { cn } from '../lib/utils';

interface TimerControlsProps {
  isActive: boolean;
  isFinished: boolean;
  sfxEnabled: boolean;
  musicEnabled: boolean;
  canUseMusic: boolean;
  screenWakeLockEnabled: boolean;
  wakeLockSupported: boolean;
  onToggle: () => void;
  onReset: () => void;
  onOpenSettings: () => void;
  onToggleSfx: () => void;
  onToggleScreenWakeLock: () => void;
  onToggleMusic: () => void;
}

export const TimerControls: React.FC<TimerControlsProps> = ({
  isActive,
  isFinished,
  sfxEnabled,
  musicEnabled,
  canUseMusic,
  screenWakeLockEnabled,
  wakeLockSupported,
  onToggle,
  onReset,
  onOpenSettings,
  onToggleSfx,
  onToggleScreenWakeLock,
  onToggleMusic,
}) => {
  const {messages} = useLocale();
  const copy = messages.timerControls;

  return (
    <div className="mt-20 max-md:landscape:mt-6 md:mt-40 lg:mt-24 flex flex-col items-center gap-8 max-md:landscape:gap-4 w-full">
      <div className="flex items-center justify-center gap-6 max-md:landscape:gap-4 md:gap-8">
        <button
          onClick={onReset}
          className="group flex h-8 w-8 max-md:landscape:h-7 max-md:landscape:w-7 md:h-16 md:w-16 items-center justify-center rounded-full bg-white/10 backdrop-blur-md transition-all hover:bg-white/20 active:scale-95"
          title={copy.resetTitle}
        >
          <RotateCcw className="h-4 w-4 max-md:landscape:h-3.5 max-md:landscape:w-3.5 md:h-8 md:w-8 text-white/80 group-hover:text-white" />
        </button>

        <button
          onClick={onToggle}
          className={cn(
            "relative flex h-24 w-24 max-md:landscape:h-18 max-md:landscape:w-18 items-center justify-center overflow-hidden rounded-full transition-all duration-200 active:scale-[0.96]",
            isActive 
              ? "border-zinc-300/10 bg-[radial-gradient(circle_at_38%_30%,rgba(255,255,255,0.1),rgba(255,255,255,0.015)_34%,transparent_56%),linear-gradient(180deg,#ef4444_0%,#dc2626_62%,#b91c1c_100%)] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06),0_10px_18px_rgba(0,0,0,0.18)] hover:shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06),0_12px_20px_rgba(0,0,0,0.2)]"
              : "border-zinc-300/10 bg-[radial-gradient(circle_at_38%_30%,rgba(255,255,255,0.11),rgba(255,255,255,0.015)_34%,transparent_56%),linear-gradient(180deg,#34d399_0%,#10b981_62%,#059669_100%)] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06),0_10px_18px_rgba(0,0,0,0.18)] hover:shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06),0_12px_20px_rgba(0,0,0,0.2)]"
          )}
        >
          <span className="pointer-events-none absolute left-1/2 top-[5px] h-[7px] w-[2px] -translate-x-1/2 rounded-full bg-emerald-950/30" />
          <span className="pointer-events-none absolute left-[calc(50%-7px)] top-[8px] h-[5px] w-[9px] rotate-[-28deg] rounded-full bg-emerald-950/16" />
          <span className="pointer-events-none absolute left-[calc(50%-2px)] top-[8px] h-[5px] w-[9px] rotate-[28deg] rounded-full bg-emerald-950/16" />
          <span className="pointer-events-none absolute inset-0 rounded-full shadow-[inset_0_-6px_9px_rgba(0,0,0,0.13)]" />
          {isActive ? (
            <Pause className="relative z-10 h-12 w-12 max-md:landscape:h-9 max-md:landscape:w-9 fill-white text-white" />
          ) : (
            <Play className="relative z-10 ml-2 max-md:landscape:ml-1.5 h-11 w-11 max-md:landscape:h-[2.1rem] max-md:landscape:w-[2.1rem] fill-white text-white" />
          )}
        </button>

        <button
          onClick={onOpenSettings}
          className="group flex h-8 w-8 max-md:landscape:h-7 max-md:landscape:w-7 md:h-16 md:w-16 items-center justify-center rounded-full bg-white/10 backdrop-blur-md transition-all hover:bg-white/20 active:scale-95"
          title={copy.settingsTitle}
        >
          <Settings className="h-4 w-4 max-md:landscape:h-3.5 max-md:landscape:w-3.5 md:h-8 md:w-8 text-white/80 group-hover:text-white" />
        </button>
      </div>

      {/* Subtle Secondary Toggles */}
      <div className="flex items-center justify-center gap-4 max-md:landscape:gap-2 opacity-70 hover:opacity-100 transition-opacity duration-500">
        <button
          onClick={onToggleSfx}
          className={cn(
            "flex items-center gap-2 max-md:landscape:gap-1.5 px-4 max-md:landscape:px-3 py-2 max-md:landscape:py-1.5 rounded-full text-[10px] max-md:landscape:text-[9px] uppercase tracking-widest font-bold transition-all border backdrop-blur-sm",
            sfxEnabled ? "border-white/40 bg-white/5 text-white/90" : "border-red-500/50 bg-red-500/10 text-red-400"
          )}
        >
          {sfxEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
          {copy.clockSound}
        </button>

        <button
          onClick={onToggleScreenWakeLock}
          disabled={!wakeLockSupported}
          className={cn(
            "flex items-center gap-2 max-md:landscape:gap-1.5 px-4 max-md:landscape:px-3 py-2 max-md:landscape:py-1.5 rounded-full text-[10px] max-md:landscape:text-[9px] uppercase tracking-widest font-bold transition-all border backdrop-blur-sm",
            screenWakeLockEnabled
              ? "border-amber-300/60 bg-amber-200/12 text-amber-100"
              : wakeLockSupported
                ? "border-white/55 bg-white/10 text-white"
                : "border-white/20 bg-white/5 text-white/40"
          )}
          title={wakeLockSupported ? copy.keepScreenOnTitle : copy.wakeLockUnsupportedTitle}
        >
          <Smartphone className="h-3.5 w-3.5" />
          {copy.screenOn}
        </button>

        <button
          onClick={onToggleMusic}
          title={canUseMusic ? copy.toggleMusicTitle : copy.musicPremiumTitle}
          className={cn(
            "flex items-center gap-2 max-md:landscape:gap-1.5 px-4 max-md:landscape:px-3 py-2 max-md:landscape:py-1.5 rounded-full text-[10px] max-md:landscape:text-[9px] uppercase tracking-widest font-bold transition-all border backdrop-blur-sm",
            musicEnabled
              ? "border-white/40 bg-white/5 text-white/90"
              : "border-blue-500/50 bg-blue-500/10 text-blue-400"
          )}
        >
          {musicEnabled ? <Headphones className="h-3.5 w-3.5" /> : <HeadphoneOff className="h-3.5 w-3.5" />}
          {copy.music}
        </button>
      </div>

      {isFinished && (
        <motion.p 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-2xl max-md:landscape:text-lg font-medium text-emerald-400"
        >
          {copy.timerFinished}
        </motion.p>
      )}
    </div>
  );
};
