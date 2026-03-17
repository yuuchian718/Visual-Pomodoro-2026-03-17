import { useState, useEffect, useCallback, useRef } from 'react';
import { soundManager } from '../lib/sounds';

export function useTimer(initialMinutes: number, options: { soundEnabled?: boolean } = {}) {
  const { soundEnabled = true } = options;
  const [timeLeft, setTimeLeft] = useState(initialMinutes * 60);
  const [isActive, setIsActive] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const reset = useCallback((minutes: number) => {
    setIsActive(false);
    setIsFinished(false);
    setTimeLeft(minutes * 60);
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const toggle = useCallback(() => {
    setIsActive(prev => !prev);
  }, []);

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          const next = prev - 1;
          
          // Sound logic
          if (next > 0) {
            if (soundEnabled) {
              if (next <= 10) {
                soundManager.playAlarm(next);
              } else {
                soundManager.playTick();
              }
            }
          } else if (next === 0) {
            if (soundEnabled) {
              soundManager.playFinish();
            }
            setIsActive(false);
            setIsFinished(true);
          }
          
          return next;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, timeLeft, soundEnabled]);

  const formatTimeParts = () => {
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    return {
      minutes: mins.toString().padStart(2, '0'),
      seconds: secs.toString().padStart(2, '0')
    };
  };

  return {
    timeLeft,
    isActive,
    isFinished,
    toggle,
    reset,
    formatTime: formatTimeParts,
    progress: (timeLeft / (initialMinutes * 60)) * 100
  };
}
