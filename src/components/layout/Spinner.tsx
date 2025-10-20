import React from 'react';
import './Spinner.css';

type SpinnerProps = {
  size?: number; // px
  speedMs?: number; // rotation duration
  ariaLabel?: string;
  className?: string;
};

export default function Spinner({
  size = 48,
  speedMs = 1000,
  ariaLabel = 'Loading',
  className,
}: SpinnerProps) {
  const style: React.CSSProperties = {
    width: size,
    height: size,
    animationDuration: `${speedMs}ms`,
  };

  return (
    <div className={`spinner ${className ?? ''}`} role="status" aria-label={ariaLabel}>
      <img src="/smiley.svg" alt="" style={style} className="spinner__img" />
    </div>
  );
}
