import React from 'react';

interface DigitalCounterProps {
  value: number;
  label: string;
  size: 'small' | 'medium' | 'large';
  fontColor?: string;
  animate?: boolean;
}

const DigitalCounter: React.FC<DigitalCounterProps> = ({
  value,
  label,
  size,
  fontColor = 'text-white',
  animate = false
}) => {
  const sizeClasses = {
    small: 'text-2xl',
    medium: 'text-6xl',
    large: 'text-8xl'
  };

  const labelSizeClasses = {
    small: 'text-xs',
    medium: 'text-sm',
    large: 'text-base'
  };
  
  return (
    <div className={`text-center ${animate ? 'pulse' : ''}`}>
      <div className={`digital-font ${sizeClasses[size]} ${fontColor} neon-text tracking-wider`}>
        {value}
      </div>
      <div className={`${labelSizeClasses[size]} text-gray-300 mt-2 font-semibold tracking-wide`}>
        {label}
      </div>
    </div>
  );
};

export default DigitalCounter;