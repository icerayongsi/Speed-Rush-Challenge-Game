import React, { useEffect, useState } from 'react';

interface DigitalCounterProps {
  value: number;
  label: string;
  size: 'small' | 'medium' | 'large' | 'total';
  CustomStyle?: string;
  animate?: boolean;
  transitionEffect?: 'none' | 'fade' | 'scale' | 'bounce';
}

const DigitalCounter: React.FC<DigitalCounterProps> = ({
  value,
  label,
  size,
  CustomStyle: fontColor = 'text-white',
  animate = false,
  transitionEffect = 'none'
}) => {
  const [prevValue, setPrevValue] = useState(value);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  useEffect(() => {
    if (value !== prevValue) {
      setIsTransitioning(true);
      const timer = setTimeout(() => {
        setIsTransitioning(false);
        setPrevValue(value);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [value, prevValue]);
  
  const sizeClasses = {
    small: 'text-2xl',
    medium: 'text-[6rem]',
    large: 'text-[10rem]',
    total: 'text-[8rem]'
  };

  const labelSizeClasses = {
    small: 'text-xs',
    medium: 'text-sm',
    large: 'text-base',
    total: 'text-base'
  };
  
  const getTransitionClass = () => {
    if (transitionEffect === 'none') return '';
    if (transitionEffect === 'fade') return 'opacity-0';
    if (transitionEffect === 'scale') return 'scale-90';
    if (transitionEffect === 'bounce') return 'translate-y-2';
    return '';
  };
  
  // Format number with commas as thousands separators
  const formatNumber = (num: number): string => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };
  
  return (
    <div className={`text-center ${animate ? 'pulse' : ''}`}>
      <div 
        className={`digital-font ${sizeClasses[size]} ${fontColor} tracking-wider transition-all duration-300 ${isTransitioning ? getTransitionClass() : ''}`}
      >
        {formatNumber(value)}
      </div>
      <div className={`${labelSizeClasses[size]} text-gray-300 mt-2 font-semibold tracking-wide`}>
        {label}
      </div>
    </div>
  );
};

export default DigitalCounter;