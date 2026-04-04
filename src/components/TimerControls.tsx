import React from 'react';
import { Play, Pause, RotateCcw, Settings, Volume2, VolumeX, Headphones, HeadphoneOff } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface TimerControlsProps {
  isActive: boolean;
  isFinished: boolean;
  sfxEnabled: boolean;
  musicEnabled: boolean;
  onToggle: () => void;
  onReset: () => void;
  onOpenSettings: () => void;
  onToggleSfx: () => void;
  onToggleMusic: () => void;
}

export const TimerControls: React.FC<TimerControlsProps> = ({
  isActive,
  isFinished,
  sfxEnabled,
  musicEnabled,
  onToggle,
  onReset,
  onOpenSettings,
  onToggleSfx,
  onToggleMusic,
}) => {
  return (
    <div className="mt-20 max-md:landscape:mt-6 md:mt-40 lg:mt-24 flex flex-col items-center gap-8 max-md:landscape:gap-4 w-full">
      <div className="flex items-center justify-center gap-6 max-md:landscape:gap-4 md:gap-8">
        <button
          onClick={onReset}
          className="group flex h-8 w-8 max-md:landscape:h-7 max-md:landscape:w-7 md:h-16 md:w-16 items-center justify-center rounded-full bg-white/10 backdrop-blur-md transition-all hover:bg-white/20 active:scale-95"
          title="Reset"
        >
          <RotateCcw className="h-4 w-4 max-md:landscape:h-3.5 max-md:landscape:w-3.5 md:h-8 md:w-8 text-white/80 group-hover:text-white" />
        </button>

        <button
          onClick={onToggle}
          className={cn(
            "flex h-24 w-24 max-md:landscape:h-18 max-md:landscape:w-18 items-center justify-center rounded-full transition-all active:scale-90 shadow-2xl",
            isActive 
              ? "bg-red-500 hover:bg-red-600 shadow-red-500/20" 
              : "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20"
          )}
        >
          {isActive ? (
            <Pause className="h-12 w-12 max-md:landscape:h-9 max-md:landscape:w-9 fill-white text-white" />
          ) : (
            <Play className="ml-2 max-md:landscape:ml-1.5 h-12 w-12 max-md:landscape:h-9 max-md:landscape:w-9 fill-white text-white" />
          )}
        </button>

        <button
          onClick={onOpenSettings}
          className="group flex h-8 w-8 max-md:landscape:h-7 max-md:landscape:w-7 md:h-16 md:w-16 items-center justify-center rounded-full bg-white/10 backdrop-blur-md transition-all hover:bg-white/20 active:scale-95"
          title="Settings"
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
          Clock Sound
        </button>

        <button
          onClick={onToggleMusic}
          className={cn(
            "flex items-center gap-2 max-md:landscape:gap-1.5 px-4 max-md:landscape:px-3 py-2 max-md:landscape:py-1.5 rounded-full text-[10px] max-md:landscape:text-[9px] uppercase tracking-widest font-bold transition-all border backdrop-blur-sm",
            musicEnabled ? "border-white/40 bg-white/5 text-white/90" : "border-blue-500/50 bg-blue-500/10 text-blue-400"
          )}
        >
          {musicEnabled ? <Headphones className="h-3.5 w-3.5" /> : <HeadphoneOff className="h-3.5 w-3.5" />}
          Music
        </button>
      </div>

      {isFinished && (
        <motion.p 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-2xl max-md:landscape:text-lg font-medium text-emerald-400"
        >
          Time's up! Great job.
        </motion.p>
      )}
    </div>
  );
};
