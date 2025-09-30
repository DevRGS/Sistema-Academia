import React from 'react';

const Timer = ({ elapsedTime }: { elapsedTime: number }) => {
  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  return (
    <div className="text-2xl font-semibold font-mono">
      {formatTime(elapsedTime)}
    </div>
  );
};

export default Timer;