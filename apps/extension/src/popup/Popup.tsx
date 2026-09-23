import React, { useEffect, useState } from 'react';
import { storageService } from '../storage/chromeStorage';
import { ActiveTimerState, INITIAL_TIMER_STATE } from '@focusflow/shared';
import './popup.css';

export const Popup: React.FC = () => {
  const [timerState, setTimerState] = useState<ActiveTimerState>(INITIAL_TIMER_STATE);
  const [todayFocusMinutes, setTodayFocusMinutes] = useState<number>(0);

  useEffect(() => {
    // 1. Initial storage hydration
    storageService.initialize().then((state) => {
      setTimerState(state.activeTimer);

      // Compute today's focus minutes
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const startTimestamp = startOfDay.getTime();

      const todaySessions = state.sessions.filter(
        (s) => s.completed && s.endTime >= startTimestamp
      );
      const totalSecs = todaySessions.reduce((acc, s) => acc + s.actualDurationSeconds, 0);
      setTodayFocusMinutes(Math.floor(totalSecs / 60));
    });

    // 2. Subscribe to active timer changes
    const unsubscribeTimer = storageService.subscribe('activeTimer', (newTimer) => {
      if (newTimer) {
        setTimerState(newTimer);
      }
    });

    return () => {
      unsubscribeTimer();
    };
  }, []);

  const handleStartFocus = async () => {
    // Basic Phase 1 interactive response (full multi-state engine implemented in Phase 2)
    const newTimer: ActiveTimerState = {
      ...timerState,
      status: timerState.status === 'running' ? 'paused' : 'running',
      startedAt: timerState.startedAt ?? Date.now(),
      targetEndTime: Date.now() + timerState.durationSeconds * 1000
    };
    await storageService.set('activeTimer', newTimer);
    setTimerState(newTimer);
  };

  const openOptions = () => {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open('options.html', '_blank');
    }
  };

  // Format seconds as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const radius = 95;
  const circumference = 2 * Math.PI * radius;
  const progressRatio = timerState.status === 'running' ? 0.95 : 1;
  const strokeDashoffset = circumference * (1 - progressRatio);

  return (
    <div className="popup-container">
      {/* Header */}
      <header className="popup-header">
        <div className="brand-section">
          <img src="icons/icon-32.png" alt="FocusFlow Logo" className="brand-icon" />
          <h1 className="brand-name">FocusFlow</h1>
        </div>
        <button
          className="icon-btn"
          onClick={openOptions}
          title="Open Settings & Dashboard"
          aria-label="Settings"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </button>
      </header>

      {/* Main Focus Content */}
      <main className="timer-hero">
        <p className="tagline">Ready to focus?</p>

        <div className="timer-circle-wrap">
          <svg className="timer-svg" viewBox="0 0 210 210">
            <defs>
              <linearGradient id="timer-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="50%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#ec4899" />
              </linearGradient>
            </defs>
            <circle
              className="timer-bg-circle"
              cx="105"
              cy="105"
              r={radius}
            />
            <circle
              className="timer-progress-circle"
              cx="105"
              cy="105"
              r={radius}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
            />
          </svg>

          <div className="timer-display">
            <span className="time-digits">{formatTime(timerState.durationSeconds)}</span>
            <span className="status-badge">
              {timerState.status === 'running' ? 'Active' : timerState.status === 'paused' ? 'Paused' : 'Focus'}
            </span>
          </div>
        </div>

        <button
          className="action-btn-main"
          onClick={handleStartFocus}
          id="btn-start-focus"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
          {timerState.status === 'running' ? 'Pause Focus' : 'Start Focus'}
        </button>
      </main>

      {/* Today's Focus Summary Card */}
      <footer className="stats-card">
        <div className="stats-info">
          <span className="stats-label">Today's Focus</span>
          <span className="stats-value">{todayFocusMinutes} minutes</span>
        </div>
        <div className="stats-dot" title="Extension active" />
      </footer>
    </div>
  );
};
