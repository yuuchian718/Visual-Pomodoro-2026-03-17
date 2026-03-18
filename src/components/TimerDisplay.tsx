import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface TimerDisplayProps {
  minutes: string;
  seconds: string;
  isActive: boolean;
}

export const TimerDisplay: React.FC<TimerDisplayProps> = ({ minutes, seconds, isActive }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative flex w-full h-[50vh] md:h-auto items-center justify-center"
    >
      <div className="relative flex items-baseline gap-2 md:gap-4">
        {/* Minutes: Protruding 3D Effect */}
        <h1 
          className={cn(
            "text-[38vw] md:text-[28vw] font-black leading-none tracking-tighter text-white",
            "select-none transition-all duration-300 animate-glow",
            isActive ? "opacity-100" : "opacity-80"
          )}
          style={{
            textShadow: `
              0 1px 0 #ccc,
              0 2px 0 #c9c9c9,
              0 3px 0 #bbb,
              0 4px 0 #b9b9b9,
              0 5px 0 #aaa,
              0 6px 1px rgba(0,0,0,.1),
              0 0 5px rgba(0,0,0,.1),
              0 1px 3px rgba(0,0,0,.3),
              0 3px 5px rgba(0,0,0,.2),
              0 5px 10px rgba(0,0,0,.25),
              0 10px 10px rgba(0,0,0,.2),
              0 20px 20px rgba(0,0,0,.15)
            `
          }}
        >
          {minutes}
        </h1>

        {/* Colon */}
        <span className="text-[20vw] md:text-[15vw] font-black text-white/40 mb-[8vw] md:mb-[4vw]">:</span>

        {/* Seconds: Recessed 3D Effect */}
        <h1 
          className={cn(
            "text-[32vw] md:text-[24vw] font-black leading-none tracking-tighter animate-glow",
            "select-none transition-all duration-300",
            "text-black/40"
          )}
          style={{
            textShadow: `
              -1px -1px 1px rgba(0,0,0,0.8),
              1px 1px 1px rgba(255,255,255,0.2),
              0px 0px 20px rgba(0,0,0,0.3)
            `
          }}
        >
          {seconds}
        </h1>
      </div>
    </motion.div>
  );
};
