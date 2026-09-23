import { describe, it, expect } from 'vitest';
import {
  calculateRemainingSeconds,
  startTimer,
  pauseTimer,
  resumeTimer,
  stopTimer,
  resetTimer,
  setTimerDuration,
  checkTimerExpiry,
  formatSecondsToMMSS,
  formatRemainingToBadge
} from './timerEngine';
import { ActiveTimerState, INITIAL_TIMER_STATE } from '@focusflow/shared';

describe('Timer Engine Timestamp Mathematics', () => {
  const baseTime = 1700000000000; // Fixed epoch in ms

  it('calculates remaining seconds correctly in idle and completed states', () => {
    const idleState: ActiveTimerState = { ...INITIAL_TIMER_STATE, durationSeconds: 1500 };
    expect(calculateRemainingSeconds(idleState, baseTime)).toBe(1500);

    const completedState: ActiveTimerState = { ...idleState, status: 'completed' };
    expect(calculateRemainingSeconds(completedState, baseTime)).toBe(0);
  });

  it('starts a timer and calculates remaining time accurately', () => {
    const started = startTimer(INITIAL_TIMER_STATE, { durationSeconds: 1500 }, baseTime);

    expect(started.status).toBe('running');
    expect(started.startedAt).toBe(baseTime);
    expect(started.targetEndTime).toBe(baseTime + 1500 * 1000);

    // After 300 seconds (5 minutes)
    const now5mLater = baseTime + 300 * 1000;
    expect(calculateRemainingSeconds(started, now5mLater)).toBe(1200);
  });

  it('pauses and freezes remaining time accurately', () => {
    const started = startTimer(INITIAL_TIMER_STATE, { durationSeconds: 1500 }, baseTime);

    // Pause after 100 seconds
    const pausedTime = baseTime + 100 * 1000;
    const paused = pauseTimer(started, pausedTime);

    expect(paused.status).toBe('paused');
    expect(paused.pausedAt).toBe(pausedTime);

    // Check remaining time at moment of pause
    expect(calculateRemainingSeconds(paused, pausedTime)).toBe(1400);

    // Check remaining time 500 seconds later while still paused — MUST REMAIN FROZEN at 1400!
    expect(calculateRemainingSeconds(paused, pausedTime + 500 * 1000)).toBe(1400);
  });

  it('resumes with pause-drift compensation and shifts targetEndTime forward', () => {
    const started = startTimer(INITIAL_TIMER_STATE, { durationSeconds: 1500 }, baseTime);

    // Pause after 100 seconds
    const pausedTime = baseTime + 100 * 1000;
    const paused = pauseTimer(started, pausedTime);

    // Resume after 200 seconds of being paused
    const resumeTime = pausedTime + 200 * 1000;
    const resumed = resumeTimer(paused, resumeTime);

    expect(resumed.status).toBe('running');
    expect(resumed.pausedAt).toBeNull();
    expect(resumed.accumulatedPausedMs).toBe(200 * 1000);
    expect(resumed.targetEndTime).toBe(baseTime + (1500 + 200) * 1000);

    // Check remaining immediately upon resume: should still be exactly 1400s
    expect(calculateRemainingSeconds(resumed, resumeTime)).toBe(1400);

    // 400 seconds later: should be 1000s
    expect(calculateRemainingSeconds(resumed, resumeTime + 400 * 1000)).toBe(1000);
  });

  it('simulates computer sleep/wake and detects timer expiration', () => {
    const started = startTimer(INITIAL_TIMER_STATE, { durationSeconds: 1500 }, baseTime);

    // Computer sleeps for 2 hours (7200 seconds)
    const wakeTime = baseTime + 7200 * 1000;

    const expiryCheck = checkTimerExpiry(started, wakeTime);
    expect(expiryCheck.isExpired).toBe(true);
    expect(expiryCheck.nextState.status).toBe('completed');
    expect(expiryCheck.completedRecord?.completed).toBe(true);
    expect(expiryCheck.completedRecord?.actualDurationSeconds).toBe(1500);
  });

  it('stops a running session early and records interruption record', () => {
    const started = startTimer(INITIAL_TIMER_STATE, { durationSeconds: 1500 }, baseTime);

    // User stops after 600s
    const stopTime = baseTime + 600 * 1000;
    const { nextState, interruptedRecord } = stopTimer(started, stopTime);

    expect(nextState.status).toBe('idle');
    expect(nextState.targetEndTime).toBeNull();
    expect(interruptedRecord?.interrupted).toBe(true);
    expect(interruptedRecord?.completed).toBe(false);
    expect(interruptedRecord?.actualDurationSeconds).toBe(600);
  });

  it('resets a timer to idle state with default duration', () => {
    const started = startTimer(INITIAL_TIMER_STATE, { durationSeconds: 1500 }, baseTime);
    const reset = resetTimer(started, 1800);
    expect(reset.status).toBe('idle');
    expect(reset.durationSeconds).toBe(1800);
    expect(reset.startedAt).toBeNull();
    expect(reset.targetEndTime).toBeNull();
  });

  it('allows changing duration only when idle', () => {
    const idle = INITIAL_TIMER_STATE;
    const changed = setTimerDuration(idle, 90 * 60);
    expect(changed.durationSeconds).toBe(5400);

    const started = startTimer(changed, undefined, baseTime);
    const cannotChange = setTimerDuration(started, 15 * 60);
    expect(cannotChange.durationSeconds).toBe(5400); // Unchanged because running
  });

  it('formats time to MM:SS and HH:MM:SS strings', () => {
    expect(formatSecondsToMMSS(1500)).toBe('25:00');
    expect(formatSecondsToMMSS(65)).toBe('01:05');
    expect(formatSecondsToMMSS(9)).toBe('00:09');
    expect(formatSecondsToMMSS(3665)).toBe('1:01:05');
  });

  it('generates accurate extension badge data', () => {
    expect(formatRemainingToBadge(1500, 'running')).toEqual({ text: '25m', color: '#6366f1' });
    expect(formatRemainingToBadge(45, 'running')).toEqual({ text: '<1m', color: '#ec4899' });
    expect(formatRemainingToBadge(1000, 'paused')).toEqual({ text: 'PAUS', color: '#f59e0b' });
    expect(formatRemainingToBadge(0, 'completed')).toEqual({ text: 'DONE', color: '#10b981' });
    expect(formatRemainingToBadge(1500, 'idle')).toEqual({ text: '', color: '#000000' });
  });
});
