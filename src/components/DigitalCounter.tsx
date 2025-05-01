import React from 'react';

interface DigitalCounterProps {
  value: number;
  label: string;
  size: 'small' | 'medium' | 'large';
  animate?: boolean;
}

const DigitalCounter: React.FC<DigitalCounterProps> = ({
  value,
  label,
  size,
  animate = false
}) => {
  const sizeClasses = {
    small: 'text-2xl',
    medium: 'text-3xl md:text-4xl',
    large: 'text-5xl md:text-6xl'
  };
  
  return (
    <div className={`text-center ${animate ? 'pulse' : ''}`}>
      <div className={`digital-font ${sizeClasses[size]} text-white neon-text`}>
        {value}
      </div>
      <div className="text-sm text-gray-300 mt-1">
        {label}
      </div>
    </div>
  );
};

export default DigitalCounter;