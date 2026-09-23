import { describe, it, expect } from 'vitest';
import { getNextPomodoroPhase } from './pomodoroEngine';
import { ActiveTimerState, DEFAULT_SETTINGS, INITIAL_TIMER_STATE } from '@focusflow/shared';

describe('Pomodoro Cycle State Machine', () => {
  const basePomodoroState: ActiveTimerState = {
    ...INITIAL_TIMER_STATE,
    mode: 'pomodoro',
    pomodoroPhase: 'focus',
    pomodoroCycleCount: 1,
    durationSeconds: 25 * 60
  };

  it('transitions from focus to short break on cycle 1', () => {
    const res = getNextPomodoroPhase(basePomodoroState, DEFAULT_SETTINGS);
    expect(res.nextPhase).toBe('short_break');
    expect(res.durationSeconds).toBe(5 * 60);
    expect(res.nextState.pomodoroPhase).toBe('short_break');
  });

  it('transitions from short break to focus cycle 2', () => {
    const breakState: ActiveTimerState = {
      ...basePomodoroState,
      pomodoroPhase: 'short_break',
      pomodoroCycleCount: 1
    };
    const res = getNextPomodoroPhase(breakState, DEFAULT_SETTINGS);
    expect(res.nextPhase).toBe('focus');
    expect(res.durationSeconds).toBe(25 * 60);
    expect(res.nextState.pomodoroCycleCount).toBe(2);
  });

  it('transitions to long break after completing 4 focus cycles', () => {
    const cycle4State: ActiveTimerState = {
      ...basePomodoroState,
      pomodoroPhase: 'focus',
      pomodoroCycleCount: 4
    };
    const res = getNextPomodoroPhase(cycle4State, DEFAULT_SETTINGS);
    expect(res.nextPhase).toBe('long_break');
    expect(res.durationSeconds).toBe(15 * 60);
    expect(res.nextState.pomodoroPhase).toBe('long_break');
  });

  it('resets cycle count to 1 after long break completes', () => {
    const longBreakState: ActiveTimerState = {
      ...basePomodoroState,
      pomodoroPhase: 'long_break',
      pomodoroCycleCount: 4
    };
    const res = getNextPomodoroPhase(longBreakState, DEFAULT_SETTINGS);
    expect(res.nextPhase).toBe('focus');
    expect(res.nextState.pomodoroCycleCount).toBe(1);
  });
});
