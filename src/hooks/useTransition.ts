import { useState, useCallback, useRef, useEffect } from 'react';

export interface TransitionConfig {
  enabled: boolean;
  duration: number;
  type: 'fade' | 'slide' | 'scale' | 'none';
  easing: 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'linear';
}

export interface TransitionSettings {
  gameStart: TransitionConfig;
  gameEnd: TransitionConfig;
  stateChange: TransitionConfig;
  pushToStart: TransitionConfig;
}

const DEFAULT_TRANSITION_SETTINGS: TransitionSettings = {
  gameStart: {
    enabled: true,
    duration: 500,
    type: 'fade',
    easing: 'ease-in-out'
  },
  gameEnd: {
    enabled: true,
    duration: 500,
    type: 'fade',
    easing: 'ease-in-out'
  },
  stateChange: {
    enabled: true,
    duration: 300,
    type: 'fade',
    easing: 'ease-in-out'
  },
  pushToStart: {
    enabled: true,
    duration: 300,
    type: 'fade',
    easing: 'ease-in-out'
  }
};
export const useTransition = (initialSettings?: Partial<TransitionSettings>) => {
  const [settings, setSettings] = useState<TransitionSettings>({
    ...DEFAULT_TRANSITION_SETTINGS,
    ...initialSettings
  });
  
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionPhase, setTransitionPhase] = useState<'idle' | 'out' | 'in'>('idle');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  
  const executeTransition = useCallback(
    (
      transitionType: keyof TransitionSettings,
      callback?: () => void,
      onComplete?: () => void
    ): Promise<void> => {
      return new Promise((resolve) => {
        const config = settings[transitionType];
        
        // If transitions are disabled, execute immediately
        if (!config.enabled) {
          if (callback) callback();
          if (onComplete) onComplete();
          resolve();
          return;
        }
        
        // Start transition out
        setIsTransitioning(true);
        setTransitionPhase('out');
        
        // Clear any existing timeout
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        
        // Execute callback at the midpoint of transition
        timeoutRef.current = setTimeout(() => {
          if (callback) callback();
          setTransitionPhase('in');
          
          // Complete transition
          timeoutRef.current = setTimeout(() => {
            setIsTransitioning(false);
            setTransitionPhase('idle');
            if (onComplete) onComplete();
            resolve();
          }, config.duration);
        }, config.duration);
      });
    },
    [settings]
  );  
  const getTransitionStyles = useCallback(
    (transitionType: keyof TransitionSettings) => {
      const config = settings[transitionType];
      
      if (!config.enabled) {
        return {};
      }
      
      const baseStyles = {
        transition: `all ${config.duration}ms ${config.easing}`,
      };
      
      const phaseStyles = (() => {
        if (transitionPhase === 'idle') {
          return {};
        }
        
        const isOut = transitionPhase === 'out';
        
        switch (config.type) {
          case 'fade':
            return { opacity: isOut ? 0 : 1 };
          case 'slide':
            return { transform: `translateX(${isOut ? '-100%' : '0'})` };
          case 'scale':
            return { transform: `scale(${isOut ? 0.8 : 1})`, opacity: isOut ? 0 : 1 };
          default:
            return {};
        }
      })();
      
      return { ...baseStyles, ...phaseStyles };
    },
    [settings, transitionPhase]
  );
  
  const getTransitionClasses = useCallback(
    (transitionType: keyof TransitionSettings) => {
      const config = settings[transitionType];
      
      if (!config.enabled) {
        return '';
      }
      
      const baseClass = 'state-transition';
      const typeClass = `transition-${config.type}`;
      const phaseClass = transitionPhase !== 'idle' ? `transition-${transitionPhase}` : '';
      
      return [baseClass, typeClass, phaseClass].filter(Boolean).join(' ');
    },
    [settings, transitionPhase]
  );  
  const updateSettings = useCallback((newSettings: Partial<TransitionSettings>) => {
    setSettings(prev => ({
      ...prev,
      ...newSettings
    }));
  }, []);
  
  const disableAllTransitions = useCallback(() => {
    setSettings(prev => {
      const newSettings = { ...prev };
      Object.keys(newSettings).forEach(key => {
        (newSettings as any)[key].enabled = false;
      });
      return newSettings;
    });
  }, []);
  
  const enableAllTransitions = useCallback(() => {
    setSettings(prev => {
      const newSettings = { ...prev };
      Object.keys(newSettings).forEach(key => {
        (newSettings as any)[key].enabled = true;
      });
      return newSettings;
    });
  }, []);
  
  const resetToDefaults = useCallback(() => {
    setSettings(DEFAULT_TRANSITION_SETTINGS);
  }, []);
  
  return {
    settings,
    isTransitioning,
    transitionPhase,
    executeTransition,
    getTransitionStyles,
    getTransitionClasses,
    updateSettings,
    disableAllTransitions,
    enableAllTransitions,
    resetToDefaults
  };
};