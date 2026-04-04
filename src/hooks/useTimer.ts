import { useState, useEffect, useCallback, useRef } from 'react';
import { soundManager } from '../lib/sounds';

export function useTimer(initialMinutes: number, options: { soundEnabled?: boolean } = {}) {
  const { soundEnabled = true } = options;
  const [timeLeft, setTimeLeft] = useState(initialMinutes * 60);
  const [isActive, setIsActive] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const targetEndAtRef = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const syncTimeLeft = useCallback(() => {
    if (targetEndAtRef.current === null) {
      return;
    }

    setTimeLeft(prev => {
      const next = Math.max(0, Math.ceil((targetEndAtRef.current! - Date.now()) / 1000));

      if (next > 0 && next < prev && soundEnabled) {
        if (next <= 10) {
          soundManager.playAlarm(next);
        } else {
          soundManager.playTick();
        }
      } else if (next === 0 && prev !== 0) {
        if (soundEnabled) {
          soundManager.playFinish();
        }
        targetEndAtRef.current = null;
        setIsActive(false);
        setIsFinished(true);
        clearTimer();
      }

      return next;
    });
  }, [clearTimer, soundEnabled]);

  const settlePausedTimeLeft = useCallback(() => {
    if (targetEndAtRef.current === null) {
      return;
    }

    const next = Math.max(0, Math.ceil((targetEndAtRef.current - Date.now()) / 1000));
    setTimeLeft(next);

    if (next === 0) {
      if (soundEnabled) {
        soundManager.playFinish();
      }
      setIsFinished(true);
    }
  }, [soundEnabled]);

  const reset = useCallback((minutes: number) => {
    setIsActive(false);
    setIsFinished(false);
    setTimeLeft(minutes * 60);
    targetEndAtRef.current = null;
    clearTimer();
  }, [clearTimer]);

  const toggle = useCallback(() => {
    if (isActive) {
      settlePausedTimeLeft();
      targetEndAtRef.current = null;
      setIsActive(false);
      clearTimer();
      return;
    }

    if (timeLeft <= 0) {
      return;
    }

    targetEndAtRef.current = Date.now() + timeLeft * 1000;
    setIsFinished(false);
    setIsActive(true);
  }, [clearTimer, isActive, settlePausedTimeLeft, timeLeft]);

  useEffect(() => {
    if (!isActive || timeLeft <= 0 || targetEndAtRef.current === null) {
      clearTimer();
      return;
    }

    syncTimeLeft();
    timerRef.current = setInterval(syncTimeLeft, 1000);

    return clearTimer;
  }, [clearTimer, isActive, syncTimeLeft, timeLeft]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        syncTimeLeft();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [syncTimeLeft]);

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
