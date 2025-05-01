import { useState, useCallback, useEffect, useRef } from 'react';

export const useTimer = (
  duration: number,
  onTimeUp: () => void
) => {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [isActive, setIsActive] = useState(false);
  const timerRef = useRef<number | null>(null);
  
  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      cancelAnimationFrame(timerRef.current);
      timerRef.current = null;
    }
    setIsActive(false);
  }, []);
  
  const startTimer = useCallback(() => {
    setTimeLeft(duration);
    setIsActive(true);
    // Reset start time when timer is started
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
  }, [duration, stopTimer, onTimeUp]);
  
  useEffect(() => {
    // Cleanup function to cancel animation frame when component unmounts
    return () => {
      if (timerRef.current) {
        cancelAnimationFrame(timerRef.current);
      }
    };
  }, []);
  
  return {
    timeLeft,
    startTimer,
    stopTimer,
    isActive
  };
};