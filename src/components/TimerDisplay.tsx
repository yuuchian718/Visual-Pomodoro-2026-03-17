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
  const [viewportSize, setViewportSize] = React.useState(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  }));

  React.useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    let rafId = 0;

    const syncViewportSize = () => {
      cancelAnimationFrame(rafId);
      rafId = window.requestAnimationFrame(() => {
        const viewport = window.visualViewport;
        setViewportSize({
          width: viewport?.width ?? window.innerWidth,
          height: viewport?.height ?? window.innerHeight,
        });
      });
    };

    syncViewportSize();

    const viewport = window.visualViewport;
    viewport?.addEventListener('resize', syncViewportSize);

    return () => {
      cancelAnimationFrame(rafId);
      viewport?.removeEventListener('resize', syncViewportSize);
    };
  }, []);

  const isLandscape = viewportSize.width > viewportSize.height;
  const threeDigitLandscapeScale = hasThreeDigitMinutes && isLandscape;
  const landscapeWidth = viewportSize.width || 0;
  const landscapeHeight = viewportSize.height || 0;
  const minutesLandscapeSize = Math.max(72, Math.min(landscapeWidth * 0.14, landscapeHeight * 0.42, 128));
  const colonLandscapeSize = Math.max(36, Math.min(landscapeWidth * 0.07, landscapeHeight * 0.21, 72));
  const colonLandscapeOffset = Math.max(8, Math.min(landscapeWidth * 0.015, landscapeHeight * 0.08, 24));
  const secondsLandscapeSize = Math.max(60, Math.min(landscapeWidth * 0.11, landscapeHeight * 0.34, 108));

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative flex w-full h-[50dvh] max-md:landscape:h-[34dvh] md:h-auto items-center justify-center"
    >
      <div
        className={cn(
          "relative flex max-w-full justify-center px-2 md:gap-4",
          threeDigitLandscapeScale ? "items-center gap-2" : "items-baseline gap-1",
        )}
      >
        {/* Minutes: Protruding 3D Effect */}
        <h1 
          className={cn(
            hasThreeDigitMinutes
              ? "text-[25vw] max-md:landscape:text-[25vw] md:text-[26vw]"
              : "text-[38vw] max-md:landscape:text-[24vw] md:text-[28vw]",
            "font-black leading-none tracking-tighter text-white",
            "select-none transition-all duration-300 animate-glow",
            isActive ? "opacity-100" : "opacity-80"
          )}
          style={{
            ...(threeDigitLandscapeScale ? {fontSize: `${minutesLandscapeSize}px`} : null),
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
        <span
          className={cn(
            hasThreeDigitMinutes
              ? "text-[13vw] mb-[4vw] max-md:landscape:text-[13vw] max-md:landscape:mb-[4vw] md:text-[13vw] md:mb-[3vw]"
              : "text-[20vw] mb-[8vw] max-md:landscape:text-[12vw] max-md:landscape:mb-[3vw] md:text-[15vw] md:mb-[4vw]",
            "font-black text-white/40",
          )}
          style={threeDigitLandscapeScale ? {
            fontSize: `${colonLandscapeSize}px`,
            marginBottom: 0,
            alignSelf: 'center',
          } : undefined}
        >
          :
        </span>

        {/* Seconds: Recessed 3D Effect */}
        <h1 
          className={cn(
            hasThreeDigitMinutes
              ? "text-[21vw] max-md:landscape:text-[21vw] md:text-[22vw]"
              : "text-[32vw] max-md:landscape:text-[20vw] md:text-[24vw]",
            "font-black leading-none tracking-tighter animate-glow",
            "select-none transition-all duration-300",
            "text-black/40"
          )}
          style={{
            ...(threeDigitLandscapeScale ? {fontSize: `${secondsLandscapeSize}px`} : null),
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
