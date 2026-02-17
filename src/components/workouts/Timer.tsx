import React from 'react';

type TimerProps = {
  elapsedTime: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
};

const Timer = ({ elapsedTime, size = 'md' }: TimerProps) => {
  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) {
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-2xl',
    lg: 'text-4xl',
    xl: 'text-6xl',
  };

  return (
    <div className={`${sizeClasses[size]} font-semibold font-mono`}>
      {formatTime(elapsedTime)}
    </div>
  );
};

export default Timer;