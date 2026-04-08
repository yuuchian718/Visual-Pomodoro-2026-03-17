import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface TimerDisplayProps {
  minutes: string;
  seconds: string;
  isActive: boolean;
}

export const TimerDisplay: React.FC<TimerDisplayProps> = ({ minutes, seconds, isActive }) => {
  const hasThreeDigitMinutes = minutes.length >= 3;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative flex w-full h-[50dvh] max-md:landscape:h-[34dvh] md:h-auto items-center justify-center"
    >
      <div
        className={cn(
          'relative flex max-w-full items-baseline justify-center gap-1 px-2 md:gap-4',
          hasThreeDigitMinutes && 'max-md:landscape:items-center',
        )}
      >
        <h1
          className={cn(
            'font-black leading-none tracking-tighter text-white select-none transition-opacity duration-300 animate-glow',
            hasThreeDigitMinutes
              ? 'text-[25vw] max-md:landscape:text-[18vw] md:text-[26vw]'
              : 'text-[38vw] max-md:landscape:text-[24vw] md:text-[28vw]',
            isActive ? 'opacity-100' : 'opacity-80',
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
            `,
          }}
        >
          {minutes}
        </h1>

        <span
          className={cn(
            'font-black leading-none text-white/40 select-none',
            hasThreeDigitMinutes
              ? 'text-[13vw] mb-[4vw] max-md:landscape:text-[9vw] max-md:landscape:mb-0 md:text-[13vw] md:mb-[3vw]'
              : 'text-[20vw] mb-[8vw] max-md:landscape:text-[12vw] max-md:landscape:mb-[3vw] md:text-[15vw] md:mb-[4vw]',
          )}
        >
          :
        </span>

        <h1
          className={cn(
            'font-black leading-none tracking-tighter animate-glow select-none transition-opacity duration-300 text-black/40',
            hasThreeDigitMinutes
              ? 'text-[21vw] max-md:landscape:text-[15vw] md:text-[22vw]'
              : 'text-[32vw] max-md:landscape:text-[20vw] md:text-[24vw]',
          )}
          style={{
            textShadow: `
              -1px -1px 1px rgba(0,0,0,0.8),
              1px 1px 1px rgba(255,255,255,0.2),
              0px 0px 20px rgba(0,0,0,0.3)
            `,
          }}
        >
          {seconds}
        </h1>
      </div>
    </motion.div>
  );
};
