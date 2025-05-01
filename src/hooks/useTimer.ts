import { useState, useCallback, useEffect, useRef } from 'react';

export const useTimer = (
  duration: number,
  onTimeUp: () => void
) => {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [isActive, setIsActive] = useState(false);
  const timerRef = useRef<number | null>(null);
  
  const startTimer = useCallback(() => {
    setTimeLeft(duration);
    setIsActive(true);
  }, [duration]);
  
  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsActive(false);
  }, []);
  
  useEffect(() => {
    if (isActive) {
      // Using requestAnimationFrame for smoother countdown
      const startTime = Date.now();
      
      const updateTimer = () => {
        const elapsed = (Date.now() - startTime) / 1000;
        const newTimeLeft = Math.max(0, duration - elapsed);
        
        setTimeLeft(newTimeLeft);
        
        if (newTimeLeft <= 0) {
          stopTimer();
          onTimeUp();
        } else {
          timerRef.current = requestAnimationFrame(updateTimer);
        }
      };
      
      timerRef.current = requestAnimationFrame(updateTimer);
    }
    
    return () => {
      if (timerRef.current) {
        cancelAnimationFrame(timerRef.current);
      }
    };
  }, [isActive, duration, stopTimer, onTimeUp]);
  
  return {
    timeLeft,
    startTimer,
    stopTimer,
    isActive
  };
};