import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface TimerDisplayProps {
  minutes: string;
  seconds: string;
  isActive: boolean;
}

const BASE_MINUTES_SIZE = 320;
const BASE_COLON_SIZE = 168;
const BASE_SECONDS_SIZE = 268;
const BASE_COLON_OFFSET = 52;
const BASE_GAP = 18;

export const TimerDisplay: React.FC<TimerDisplayProps> = ({ minutes, seconds, isActive }) => {
  const frameRef = React.useRef<HTMLDivElement | null>(null);
  const contentRef = React.useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = React.useState(1);

  React.useLayoutEffect(() => {
    const frame = frameRef.current;
    const content = contentRef.current;

    if (!frame || !content || typeof ResizeObserver === 'undefined') {
      return;
    }

    let rafId = 0;

    const updateScale = () => {
      cancelAnimationFrame(rafId);
      rafId = window.requestAnimationFrame(() => {
        const frameRect = frame.getBoundingClientRect();
        const contentRect = content.getBoundingClientRect();

        if (frameRect.width === 0 || frameRect.height === 0 || contentRect.width === 0 || contentRect.height === 0) {
          setScale(1);
          return;
        }

        const widthScale = (frameRect.width * 0.94) / contentRect.width;
        const heightScale = (frameRect.height * 0.92) / contentRect.height;
        const nextScale = Math.min(widthScale, heightScale, 1);

        setScale(Number.isFinite(nextScale) && nextScale > 0 ? nextScale : 1);
      });
    };

    updateScale();

    const observer = new ResizeObserver(() => {
      updateScale();
    });

    observer.observe(frame);
    observer.observe(content);

    return () => {
      cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  }, [minutes, seconds]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative flex w-full h-[50dvh] max-md:landscape:h-[34dvh] md:h-auto items-center justify-center"
    >
      <div
        ref={frameRef}
        className="relative flex h-full w-full items-center justify-center px-2 md:px-4"
      >
        <div
          style={{ transform: `scale(${scale})` }}
          className="origin-center transition-transform duration-200 ease-out will-change-transform"
        >
          <div
            ref={contentRef}
            className="inline-flex items-center justify-center"
            style={{ gap: `${BASE_GAP}px` }}
          >
            <h1
              className={cn(
                'font-black leading-none tracking-tighter text-white select-none transition-opacity duration-300 animate-glow',
                isActive ? 'opacity-100' : 'opacity-80',
              )}
              style={{
                fontSize: `${BASE_MINUTES_SIZE}px`,
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
              className="font-black text-white/40 select-none"
              style={{
                fontSize: `${BASE_COLON_SIZE}px`,
                transform: `translateY(${BASE_COLON_OFFSET}px)`,
              }}
            >
              :
            </span>

            <h1
              className="font-black leading-none tracking-tighter animate-glow select-none transition-opacity duration-300 text-black/40"
              style={{
                fontSize: `${BASE_SECONDS_SIZE}px`,
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
      </div>
    </motion.div>
  );
};
