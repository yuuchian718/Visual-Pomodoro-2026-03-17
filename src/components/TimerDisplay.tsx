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
      className="relative flex h-[50dvh] w-full items-center justify-center max-md:landscape:h-[38dvh] md:h-auto"
    >
      <div
        className={cn(
          'relative flex max-w-full items-center justify-center gap-1 px-2 md:gap-4',
        )}
      >
        <h1
          className={cn(
            'font-black leading-none tracking-tighter text-white select-none transition-opacity duration-300 animate-glow',
            hasThreeDigitMinutes
              ? 'text-[clamp(7.8rem,25vw,22rem)] max-md:landscape:text-[clamp(6.4rem,18vw,15rem)] md:text-[clamp(9.5rem,26vw,28rem)]'
              : 'text-[clamp(10.5rem,38vw,30rem)] max-md:landscape:text-[clamp(8rem,24vw,18rem)] md:text-[clamp(12rem,28vw,32rem)]',
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
            'font-black leading-none text-white/40 select-none self-center',
            hasThreeDigitMinutes
              ? 'text-[clamp(4.2rem,13vw,8.5rem)] max-md:landscape:text-[clamp(3.2rem,9vw,6rem)] md:text-[clamp(4.8rem,13vw,9rem)]'
              : 'text-[clamp(5.8rem,20vw,12rem)] max-md:landscape:text-[clamp(4.2rem,12vw,7.5rem)] md:text-[clamp(5.5rem,15vw,10rem)]',
          )}
        >
          :
        </span>

        <h1
          className={cn(
            'font-black leading-none tracking-tighter animate-glow select-none transition-opacity duration-300 text-black/40',
            hasThreeDigitMinutes
              ? 'text-[clamp(7.2rem,21vw,18rem)] max-md:landscape:text-[clamp(5.5rem,15vw,11rem)] md:text-[clamp(8rem,22vw,20rem)]'
              : 'text-[clamp(9.2rem,32vw,24rem)] max-md:landscape:text-[clamp(6.8rem,20vw,14rem)] md:text-[clamp(10rem,24vw,24rem)]',
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
