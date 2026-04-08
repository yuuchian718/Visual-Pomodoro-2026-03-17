import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface TimerDisplayProps {
  minutes: string;
  seconds: string;
  isActive: boolean;
}

export const TimerDisplay: React.FC<TimerDisplayProps> = ({ minutes, seconds, isActive }) => {
  const minuteDigits = minutes.length;
  const minuteSize =
    minuteDigits >= 3
      ? 'clamp(4.75rem, min(22vw, 18dvh), 12.5rem)'
      : 'clamp(5.5rem, min(26vw, 21dvh), 16rem)';
  const colonSize =
    minuteDigits >= 3
      ? 'clamp(2.5rem, min(11vw, 9dvh), 6.5rem)'
      : 'clamp(3rem, min(14vw, 11dvh), 8rem)';
  const secondSize =
    minuteDigits >= 3
      ? 'clamp(4rem, min(18vw, 15dvh), 10rem)'
      : 'clamp(4.5rem, min(21vw, 17dvh), 12rem)';
  const gap = minuteDigits >= 3 ? 'clamp(0.2rem, 0.9vw, 0.7rem)' : 'clamp(0.25rem, 1vw, 0.9rem)';
  const colonOffset = minuteDigits >= 3 ? '0.28em' : '0.3em';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative flex h-[50dvh] w-full items-center justify-center max-md:landscape:h-[34dvh] md:h-auto"
    >
      <div className="flex h-full w-full items-center justify-center px-2 md:px-4">
        <div
          className="inline-flex max-w-full items-center justify-center whitespace-nowrap px-2"
          style={{ gap }}
        >
          <h1
            className={cn(
              'font-black leading-none tracking-tighter text-white select-none transition-opacity duration-300 animate-glow',
              isActive ? 'opacity-100' : 'opacity-80',
            )}
            style={{
              fontSize: minuteSize,
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
            className="font-black leading-none text-white/40 select-none"
            style={{
              fontSize: colonSize,
              transform: `translateY(${colonOffset})`,
            }}
          >
            :
          </span>

          <h1
            className="font-black leading-none tracking-tighter animate-glow select-none transition-opacity duration-300 text-black/40"
            style={{
              fontSize: secondSize,
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
      </div>
    </motion.div>
  );
};
