import React, { useEffect, useState } from 'react';
import { storageService } from '../storage/chromeStorage';
import { ActiveTimerState, INITIAL_TIMER_STATE } from '@focusflow/shared';
import { calculateRemainingSeconds, formatSecondsToMMSS } from '../services/timerEngine';
import './blocked.css';

const QUOTES = [
  '“Focus is a muscle. Every distraction resisted makes you stronger.”',
  '“Starve your distractions, feed your focus.”',
  '“The successful warrior is the average man, with laser-like focus.”',
  '“Deep work is the superpower of the 21st century.”'
];

export const Blocked: React.FC = () => {
  const [timerState, setTimerState] = useState<ActiveTimerState>(INITIAL_TIMER_STATE);
  const [now, setNow] = useState<number>(Date.now());
  const [blockedDomain, setBlockedDomain] = useState<string>('this website');
  const [quote] = useState<string>(() => QUOTES[Math.floor(Math.random() * QUOTES.length)]);

  useEffect(() => {
    // 1. Parse domain from URL params
    const params = new URLSearchParams(window.location.search);
    const domain = params.get('domain');
    if (domain) {
      setBlockedDomain(domain);

      // Log distraction attempt to background service worker
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({
          type: 'LOG_DISTRACTION',
          payload: { domain }
        }).catch(() => {});
      }
    }

    // 2. Hydrate timer state
    storageService.get('activeTimer').then((t) => {
      if (t) setTimerState(t);
    });

    const unsubscribe = storageService.subscribe('activeTimer', (newTimer) => {
      if (newTimer) setTimerState(newTimer);
    });

    // 3. Live countdown tick
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const remainingSeconds = calculateRemainingSeconds(timerState, now);

  const handleReturnToFocus = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.close();
    }
  };

  return (
    <div className="blocked-card">
      <div className="brand-badge">
        <img src="icons/icon-16.png" alt="FocusFlow" className="brand-logo-icon" />
        FocusFlow Shield Active
      </div>

      <h1 className="blocked-title">This website is currently blocked</h1>
      <p className="blocked-subtitle">
        Access to <span className="domain-pill">{blockedDomain}</span> is paused to protect your attention. Your focus session is still active.
      </p>

      <div className="timer-box">
        <span className="timer-box-label">Remaining in Session</span>
        <span className="timer-box-digits">{formatSecondsToMMSS(remainingSeconds)}</span>
      </div>

      <p className="motivational-quote">{quote}</p>

      <button className="btn-return" onClick={handleReturnToFocus} id="btn-return-focus">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
        Return to Focus
      </button>
    </div>
  );
};
