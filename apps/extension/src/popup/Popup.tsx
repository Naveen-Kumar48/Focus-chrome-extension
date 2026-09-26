import React, { useEffect, useState, useMemo } from 'react';
import { storageService } from '../storage/chromeStorage';
import {
  ActiveTimerState,
  INITIAL_TIMER_STATE,
  ExtensionMessage,
  MessageResponse
} from '@focusflow/shared';
import {
  calculateRemainingSeconds,
  formatSecondsToMMSS,
  setTimerDuration
} from '../services/timerEngine';
import './popup.css';

const PRESETS = [
  { label: '15m', minutes: 15 },
  { label: '25m', minutes: 25 },
  { label: '45m', minutes: 45 },
  { label: '60m', minutes: 60 },
  { label: '90m', minutes: 90 }
];

export const Popup: React.FC = () => {
  const [timerState, setTimerState] = useState<ActiveTimerState>(INITIAL_TIMER_STATE);
  const [now, setNow] = useState<number>(Date.now());
  const [todayFocusMinutes, setTodayFocusMinutes] = useState<number>(0);
  const [showCustomModal, setShowCustomModal] = useState<boolean>(false);
  const [customInputMinutes, setCustomInputMinutes] = useState<string>('30');

  // Anti-circumvention & UX states
  const [isIncognitoAllowed, setIsIncognitoAllowed] = useState<boolean>(true);
  const [currentTabDomain, setCurrentTabDomain] = useState<string | null>(null);
  const [isCurrentDomainBlocked, setIsCurrentDomainBlocked] = useState<boolean>(false);
  const [strictModeEnabled, setStrictModeEnabled] = useState<boolean>(false);
  const [showStrictChallengeModal, setShowStrictChallengeModal] = useState<boolean>(false);
  const [strictChallengeInput, setStrictChallengeInput] = useState<string>('');
  const [strictPendingAction, setStrictPendingAction] = useState<'stop' | 'pause' | null>(null);

  const STRICT_PHRASE = 'I choose to break my focus session';

  // Helper to safely send runtime messages to background worker with fallback to storage
  const sendBackgroundMessage = async <T,>(msg: ExtensionMessage): Promise<T | undefined> => {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      try {
        const response: MessageResponse<T> = await chrome.runtime.sendMessage(msg);
        if (response && response.success) {
          return response.data;
        }
      } catch {
        // Fallback for isolated contexts
      }
    }
    return undefined;
  };

  useEffect(() => {
    // 1. Initial storage hydration
    storageService.initialize().then((state) => {
      setTimerState(state.activeTimer);
      setStrictModeEnabled(state.settings?.strictMode ?? false);

      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const startTimestamp = startOfDay.getTime();

      const todaySessions = state.sessions.filter(
        (s) => s.completed && s.endTime >= startTimestamp
      );
      const totalSecs = todaySessions.reduce((acc, s) => acc + s.actualDurationSeconds, 0);
      setTodayFocusMinutes(Math.floor(totalSecs / 60));

      // Check if current tab is in blocked list
      if (currentTabDomain) {
        const activeId = state.activeProfileId || state.activeTimer.profileId;
        const profile = state.profiles?.[activeId];
        if (profile) {
          setIsCurrentDomainBlocked(profile.blockedDomains.includes(currentTabDomain));
        }
      }
    });

    // 2. Subscribe to active timer changes
    const unsubscribeTimer = storageService.subscribe('activeTimer', (newTimer) => {
      if (newTimer) {
        setTimerState(newTimer);
      }
    });

    // 3. Check Incognito mode permission
    if (typeof chrome !== 'undefined' && chrome.extension?.isAllowedIncognitoAccess) {
      try {
        chrome.extension.isAllowedIncognitoAccess((isAllowed) => {
          setIsIncognitoAllowed(isAllowed);
        });
      } catch {}
    }

    // 4. Detect active tab domain for 1-click Quick Block
    if (typeof chrome !== 'undefined' && chrome.tabs?.query) {
      chrome.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
        const activeTab = tabs[0];
        if (activeTab?.url) {
          try {
            const parsed = new URL(activeTab.url);
            if (['http:', 'https:'].includes(parsed.protocol)) {
              let domain = parsed.hostname.toLowerCase();
              if (domain.startsWith('www.')) domain = domain.slice(4);
              setCurrentTabDomain(domain);
            }
          } catch {}
        }
      }).catch(() => {});
    }

    return () => {
      unsubscribeTimer();
    };
  }, [currentTabDomain]);

  // Sync blocked status for current tab when profiles change
  useEffect(() => {
    if (!currentTabDomain) return;
    storageService.getAll().then((state) => {
      const activeId = state.activeProfileId || timerState.profileId;
      const profile = state.profiles?.[activeId];
      if (profile) {
        setIsCurrentDomainBlocked(profile.blockedDomains.includes(currentTabDomain));
      }
      setStrictModeEnabled(state.settings?.strictMode ?? false);
    });
  }, [currentTabDomain, timerState.profileId]);

  // Live timer tick: updates 'now' every second when running
  useEffect(() => {
    if (timerState.status !== 'running') return;

    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, [timerState.status]);

  // Dynamic remaining seconds calculated from epoch timestamps
  const remainingSeconds = useMemo(() => {
    return calculateRemainingSeconds(timerState, now);
  }, [timerState, now]);

  // Actions
  const handleStart = async () => {
    await sendBackgroundMessage({
      type: 'TIMER_START',
      payload: { durationSeconds: timerState.durationSeconds, profileId: timerState.profileId }
    });
    // Optimistic local update
    const startedTimer: ActiveTimerState = {
      ...timerState,
      status: 'running',
      startedAt: Date.now(),
      targetEndTime: Date.now() + timerState.durationSeconds * 1000
    };
    await storageService.set('activeTimer', startedTimer);
    setTimerState(startedTimer);
  };

  const executePause = async () => {
    await sendBackgroundMessage({ type: 'TIMER_PAUSE' });
    const pausedTimer: ActiveTimerState = {
      ...timerState,
      status: 'paused',
      pausedAt: Date.now()
    };
    await storageService.set('activeTimer', pausedTimer);
    setTimerState(pausedTimer);
    setShowStrictChallengeModal(false);
    setStrictChallengeInput('');
    setStrictPendingAction(null);
  };

  const executeStop = async () => {
    await sendBackgroundMessage({ type: 'TIMER_STOP' });
    const stoppedTimer: ActiveTimerState = {
      ...timerState,
      status: 'idle',
      startedAt: null,
      pausedAt: null,
      accumulatedPausedMs: 0,
      targetEndTime: null
    };
    await storageService.set('activeTimer', stoppedTimer);
    setTimerState(stoppedTimer);
    setShowStrictChallengeModal(false);
    setStrictChallengeInput('');
    setStrictPendingAction(null);
  };

  const handlePause = async () => {
    if (strictModeEnabled && timerState.status === 'running') {
      setStrictPendingAction('pause');
      setShowStrictChallengeModal(true);
      return;
    }
    await executePause();
  };

  const handleResume = async () => {
    await sendBackgroundMessage({ type: 'TIMER_RESUME' });
    const pauseDuration = timerState.pausedAt ? Date.now() - timerState.pausedAt : 0;
    const resumedTimer: ActiveTimerState = {
      ...timerState,
      status: 'running',
      pausedAt: null,
      accumulatedPausedMs: timerState.accumulatedPausedMs + pauseDuration,
      targetEndTime: (timerState.targetEndTime ?? Date.now()) + pauseDuration
    };
    await storageService.set('activeTimer', resumedTimer);
    setTimerState(resumedTimer);
  };

  const handleStop = async () => {
    if (strictModeEnabled && timerState.status === 'running') {
      setStrictPendingAction('stop');
      setShowStrictChallengeModal(true);
      return;
    }
    await executeStop();
  };

  const handleQuickBlockCurrentSite = async () => {
    if (!currentTabDomain) return;
    try {
      const state = await storageService.getAll();
      const activeId = state.activeProfileId || timerState.profileId;
      const profile = state.profiles[activeId];
      if (profile && !profile.blockedDomains.includes(currentTabDomain)) {
        profile.blockedDomains = [...profile.blockedDomains, currentTabDomain];
        state.profiles[activeId] = profile;
        await storageService.set('profiles', state.profiles);
        setIsCurrentDomainBlocked(true);

        if (timerState.status === 'running') {
          await sendBackgroundMessage({ type: 'PURGE_OPEN_TABS' });
        }
      }
    } catch (err) {
      console.debug('[FocusFlow] Quick block error:', err);
    }
  };

  const handleReset = async () => {
    await sendBackgroundMessage({ type: 'TIMER_RESET' });
    const resetTimerState: ActiveTimerState = {
      ...timerState,
      status: 'idle',
      startedAt: null,
      pausedAt: null,
      accumulatedPausedMs: 0,
      targetEndTime: null
    };
    await storageService.set('activeTimer', resetTimerState);
    setTimerState(resetTimerState);
  };

  const handleSelectPreset = async (minutes: number) => {
    if (timerState.status !== 'idle') return;
    const durationSeconds = minutes * 60;
    await sendBackgroundMessage({
      type: 'TIMER_SET_DURATION',
      payload: { durationSeconds }
    });
    const updated = setTimerDuration(timerState, durationSeconds);
    await storageService.set('activeTimer', updated);
    setTimerState(updated);
  };

  const handleApplyCustomDuration = async () => {
    const mins = parseInt(customInputMinutes, 10);
    if (!isNaN(mins) && mins > 0) {
      await handleSelectPreset(mins);
      setShowCustomModal(false);
    }
  };

  const openOptions = () => {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open('options.html', '_blank');
    }
  };

  // SVG circular progress calculation
  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const progressRatio =
    timerState.durationSeconds > 0
      ? remainingSeconds / timerState.durationSeconds
      : 1;
  const strokeDashoffset = circumference * (1 - progressRatio);

  const currentDurationMinutes = Math.floor(timerState.durationSeconds / 60);

  return (
    <div className="popup-container">
      {/* Header */}
      <header className="popup-header">
        <div className="brand-section">
          <img src="icons/icon-32.png" alt="FocusFlow Logo" className="brand-icon" />
          <h1 className="brand-name">FocusFlow</h1>
          {strictModeEnabled && (
            <span className="badge-strict" title="Strict Mode active: Early cancellation requires verification">
              🔒 Strict
            </span>
          )}
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

      {/* Incognito Warning Alert */}
      {!isIncognitoAllowed && (
        <div className="incognito-alert" role="alert">
          <div className="incognito-alert-text">
            <strong>⚠️ Incognito is unblocked.</strong>
            <span>Allow FocusFlow in Incognito to prevent bypasses.</span>
          </div>
          <button
            className="btn-incognito-fix"
            onClick={() => {
              if (typeof chrome !== 'undefined' && chrome.tabs?.create) {
                chrome.tabs.create({ url: `chrome://extensions/?id=${chrome.runtime.id}` });
              }
            }}
          >
            Fix
          </button>
        </div>
      )}

      {/* 1-Click Quick Block Current Website Bar */}
      {currentTabDomain && !isCurrentDomainBlocked && (
        <div className="quick-block-bar">
          <button
            className="quick-block-btn"
            onClick={handleQuickBlockCurrentSite}
            title={`Block ${currentTabDomain} in the active profile`}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
            </svg>
            Block {currentTabDomain}
          </button>
        </div>
      )}

      {/* Duration Presets Bar */}
      <div className="presets-bar" role="group" aria-label="Duration Presets">
        {PRESETS.map((preset) => (
          <button
            key={preset.minutes}
            className={`preset-btn ${currentDurationMinutes === preset.minutes ? 'active' : ''}`}
            disabled={timerState.status !== 'idle'}
            onClick={() => handleSelectPreset(preset.minutes)}
            id={`preset-${preset.minutes}`}
          >
            {preset.label}
          </button>
        ))}
        <button
          className={`preset-btn ${!PRESETS.some((p) => p.minutes === currentDurationMinutes) ? 'active' : ''}`}
          disabled={timerState.status !== 'idle'}
          onClick={() => setShowCustomModal(true)}
          id="preset-custom"
          title="Custom duration"
        >
          Custom
        </button>
      </div>

      {/* Main Focus Content */}
      <main className="timer-hero">
        <p className="tagline">Ready to focus?</p>

        <div className="timer-circle-wrap">
          <svg className="timer-svg" viewBox="0 0 200 200">
            <defs>
              <linearGradient id="timer-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="50%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#ec4899" />
              </linearGradient>
            </defs>
            <circle
              className="timer-bg-circle"
              cx="100"
              cy="100"
              r={radius}
            />
            <circle
              className="timer-progress-circle"
              cx="100"
              cy="100"
              r={radius}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
            />
          </svg>

          <div className="timer-display">
            <span className="time-digits" id="timer-display-time">
              {formatSecondsToMMSS(remainingSeconds)}
            </span>
            <span className={`status-badge ${timerState.status}`}>
              {timerState.status === 'running'
                ? 'Active'
                : timerState.status === 'paused'
                ? 'Paused'
                : timerState.status === 'completed'
                ? 'Complete'
                : 'Focus'}
            </span>
          </div>
        </div>

        {/* State-dependent Control Buttons */}
        {timerState.status === 'idle' && (
          <button
            className="action-btn-main"
            onClick={handleStart}
            id="btn-start-focus"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            Start Focus
          </button>
        )}

        {timerState.status === 'running' && (
          <div className="btn-group-dual">
            <button
              className="action-btn-main action-btn-pause"
              onClick={handlePause}
              id="btn-pause"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" />
                <rect x="14" y="4" width="4" height="16" />
              </svg>
              Pause
            </button>
            <button
              className="action-btn-secondary action-btn-stop"
              onClick={handleStop}
              id="btn-stop"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <rect x="4" y="4" width="16" height="16" rx="2" />
              </svg>
              Stop
            </button>
          </div>
        )}

        {timerState.status === 'paused' && (
          <div className="btn-group-dual">
            <button
              className="action-btn-main"
              onClick={handleResume}
              id="btn-resume"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              Resume
            </button>
            <button
              className="action-btn-secondary"
              onClick={handleReset}
              id="btn-reset"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
              Reset
            </button>
          </div>
        )}

        {timerState.status === 'completed' && (
          <button
            className="action-btn-main"
            onClick={handleReset}
            id="btn-new-session"
          >
            Start New Session
          </button>
        )}
      </main>

      {/* Strict Mode Challenge Modal */}
      {showStrictChallengeModal && (
        <div className="modal-overlay">
          <div className="modal-content strict-modal">
            <div className="strict-modal-header">
              <span className="strict-lock-icon">🔒</span>
              <h3>Strict Mode Active</h3>
            </div>
            <p className="strict-modal-desc">
              To cancel or pause your focus session, type the phrase below:
            </p>
            <div className="strict-target-phrase">{STRICT_PHRASE}</div>
            <input
              type="text"
              value={strictChallengeInput}
              onChange={(e) => setStrictChallengeInput(e.target.value)}
              placeholder="Type the exact phrase above..."
              className="modal-input strict-input"
              autoFocus
            />
            <div className="modal-actions">
              <button
                className="action-btn-main action-btn-danger"
                disabled={strictChallengeInput.trim() !== STRICT_PHRASE}
                onClick={() => {
                  if (strictPendingAction === 'stop') executeStop();
                  else if (strictPendingAction === 'pause') executePause();
                }}
              >
                Confirm {strictPendingAction === 'pause' ? 'Pause' : 'Stop'}
              </button>
              <button
                className="action-btn-secondary"
                onClick={() => {
                  setShowStrictChallengeModal(false);
                  setStrictChallengeInput('');
                  setStrictPendingAction(null);
                }}
              >
                Stay Focused
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Duration Modal */}
      {showCustomModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Set Custom Duration</h3>
            <input
              type="number"
              min="1"
              max="360"
              value={customInputMinutes}
              onChange={(e) => setCustomInputMinutes(e.target.value)}
              className="modal-input"
              placeholder="Minutes (e.g. 30)"
              autoFocus
            />
            <div className="modal-actions">
              <button
                className="action-btn-main"
                onClick={handleApplyCustomDuration}
              >
                Set Minutes
              </button>
              <button
                className="action-btn-secondary"
                onClick={() => setShowCustomModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Today's Focus Summary Card */}
      <footer className="stats-card">
        <div className="stats-info">
          <span className="stats-label">Today's Focus</span>
          <span className="stats-value">{todayFocusMinutes} minutes</span>
        </div>
        <div className="stats-dot" title="Timer engine active" />
      </footer>
    </div>
  );
};
