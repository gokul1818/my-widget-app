import React, { useState, useEffect, useRef } from 'react';
import { formatTimer } from '../utils/formatters';
import { timerPresets } from '../utils/mockData';
import { syncWidgetStateToNative } from '../utils/nativeWidgetSync';

export const TIMER_PRESETS = timerPresets;

/**
 * Mobile-Friendly & Responsive Simple Timer Component
 *
 * @param {Object} props
 * @param {string} [props.title='Session Timer'] - Display label for timer
 * @param {number} [props.initialSeconds=0] - Initial elapsed or countdown time
 * @param {boolean} [props.autoStart=false] - Whether timer begins running on mount
 * @param {Function} [props.onComplete] - Callback triggered when countdown hits 0
 * @param {string} [props.className=''] - Custom styling hook
 */
export function Timer({
  title = 'Session Timer',
  initialSeconds = 0,
  autoStart = false,
  onComplete,
  className = '',
}) {
  const [activePreset, setActivePreset] = useState(TIMER_PRESETS[0]);
  const [seconds, setSeconds] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(autoStart);
  const [isCompleted, setIsCompleted] = useState(false);
  const intervalRef = useRef(null);

  // Clear timer interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Sync state to Native Home Screen Widget storage
  useEffect(() => {
    syncWidgetStateToNative({
      seconds,
      isRunning,
      mode: activePreset.mode,
    });
  }, [seconds, isRunning, activePreset.mode]);

  // Timer interval driver
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setSeconds((prev) => {
          if (activePreset.mode === 'countdown') {
            if (prev <= 1) {
              clearInterval(intervalRef.current);
              setIsRunning(false);
              setIsCompleted(true);
              if (onComplete) onComplete();
              return 0;
            }
            return prev - 1;
          } else {
            return prev + 1;
          }
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, activePreset.mode, onComplete]);

  const handleToggle = () => {
    if (isCompleted && activePreset.mode === 'countdown') {
      setSeconds(activePreset.seconds);
      setIsCompleted(false);
      setIsRunning(true);
      return;
    }
    setIsRunning((prev) => !prev);
  };

  const handleReset = () => {
    setIsRunning(false);
    setIsCompleted(false);
    setSeconds(activePreset.mode === 'countdown' ? activePreset.seconds : 0);
  };

  const handleSelectPreset = (preset) => {
    setIsRunning(false);
    setIsCompleted(false);
    setActivePreset(preset);
    setSeconds(preset.mode === 'countdown' ? preset.seconds : 0);
  };

  // Progress percentage for countdown mode
  const progressPercent =
    activePreset.mode === 'countdown' && activePreset.seconds > 0
      ? Math.max(0, Math.min(100, ((activePreset.seconds - seconds) / activePreset.seconds) * 100))
      : 0;

  return (
    <div
      className={`widget-timer-card ${className}`}
      role="region"
      aria-label={`${title} control`}
    >
      <div className="widget-timer-header">
        <div className="widget-timer-title-group">
          <svg
            className="widget-timer-icon"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span className="widget-timer-title">{title}</span>
        </div>

        {/* Live Status Badge */}
        <span
          className={`widget-timer-status-badge ${
            isCompleted ? 'completed' : isRunning ? 'running' : 'paused'
          }`}
        >
          <span className="widget-timer-status-dot" aria-hidden="true" />
          {isCompleted ? "Time's Up!" : isRunning ? 'Running' : 'Paused'}
        </span>
      </div>

      {/* Preset Pills */}
      <div className="widget-timer-presets" role="tablist" aria-label="Timer presets">
        {TIMER_PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            role="tab"
            aria-selected={activePreset.label === preset.label}
            className={`widget-timer-preset-btn ${
              activePreset.label === preset.label ? 'active' : ''
            }`}
            onClick={() => handleSelectPreset(preset)}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Digital Timer Display */}
      <div className="widget-timer-display-area">
        <div
          className={`widget-timer-digits ${isRunning ? 'is-active' : ''} ${
            isCompleted ? 'is-completed' : ''
          }`}
          aria-live="polite"
          aria-atomic="true"
        >
          {formatTimer(seconds)}
        </div>
        <div className="widget-timer-mode-label">
          {activePreset.mode === 'countdown' ? 'Countdown' : 'Elapsed Time'}
        </div>
      </div>

      {/* Countdown Progress Bar */}
      {activePreset.mode === 'countdown' && (
        <div
          className="widget-timer-progress-track"
          role="progressbar"
          aria-valuenow={Math.round(progressPercent)}
          aria-valuemin="0"
          aria-valuemax="100"
          aria-label="Timer countdown progress"
        >
          <div
            className="widget-timer-progress-fill"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}

      {/* Touch-Friendly Action Buttons (>= 44x44px touch targets) */}
      <div className="widget-timer-controls">
        <button
          type="button"
          className={`widget-timer-btn widget-timer-btn-primary ${
            isRunning ? 'pause' : 'start'
          }`}
          onClick={handleToggle}
          aria-label={isRunning ? 'Pause timer' : 'Start timer'}
        >
          {isRunning ? (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
              <span>Pause</span>
            </>
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              <span>
                {isCompleted
                  ? 'Restart'
                  : seconds > 0 && activePreset.mode === 'countup'
                  ? 'Resume'
                  : 'Start'}
              </span>
            </>
          )}
        </button>

        <button
          type="button"
          className="widget-timer-btn widget-timer-btn-secondary"
          onClick={handleReset}
          aria-label="Reset timer"
          disabled={!isRunning && seconds === (activePreset.mode === 'countdown' ? activePreset.seconds : 0)}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
          <span>Reset</span>
        </button>
      </div>
    </div>
  );
}

export default Timer;
