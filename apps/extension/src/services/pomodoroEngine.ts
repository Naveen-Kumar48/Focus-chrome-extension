import {
  ActiveTimerState,
  PomodoroPhase,
  UserSettings
} from '@focusflow/shared';

export interface PomodoroTransitionResult {
  nextState: ActiveTimerState;
  nextPhase: PomodoroPhase;
  durationSeconds: number;
}

/**
 * Calculates the next phase and duration in the Pomodoro cycle.
 * Focus -> Short Break (cycles 1-3) -> Long Break (cycle 4) -> Focus
 */
export function getNextPomodoroPhase(
  currentState: ActiveTimerState,
  settings: UserSettings
): PomodoroTransitionResult {
  const currentPhase: PomodoroPhase = currentState.pomodoroPhase || 'focus';
  const cycleCount = currentState.pomodoroCycleCount || 1;
  const maxCycles = settings.pomodoroCyclesBeforeLongBreak || 4;

  if (currentPhase === 'focus') {
    if (cycleCount >= maxCycles) {
      // Completed 4 cycles -> Long Break
      const durationSeconds = (settings.pomodoroLongBreakMinutes || 15) * 60;
      return {
        nextPhase: 'long_break',
        durationSeconds,
        nextState: {
          ...currentState,
          status: settings.autoStartBreaks ? 'running' : 'idle',
          mode: 'pomodoro',
          pomodoroPhase: 'long_break',
          durationSeconds,
          startedAt: settings.autoStartBreaks ? Date.now() : null,
          targetEndTime: settings.autoStartBreaks ? Date.now() + durationSeconds * 1000 : null
        }
      };
    } else {
      // Short Break
      const durationSeconds = (settings.pomodoroShortBreakMinutes || 5) * 60;
      return {
        nextPhase: 'short_break',
        durationSeconds,
        nextState: {
          ...currentState,
          status: settings.autoStartBreaks ? 'running' : 'idle',
          mode: 'pomodoro',
          pomodoroPhase: 'short_break',
          durationSeconds,
          startedAt: settings.autoStartBreaks ? Date.now() : null,
          targetEndTime: settings.autoStartBreaks ? Date.now() + durationSeconds * 1000 : null
        }
      };
    }
  } else {
    // Coming off a break -> Next Focus cycle
    const nextCycleCount = currentPhase === 'long_break' ? 1 : cycleCount + 1;
    const durationSeconds = (settings.pomodoroFocusMinutes || 25) * 60;
    return {
      nextPhase: 'focus',
      durationSeconds,
      nextState: {
        ...currentState,
        status: settings.autoStartFocus ? 'running' : 'idle',
        mode: 'pomodoro',
        pomodoroPhase: 'focus',
        pomodoroCycleCount: nextCycleCount,
        durationSeconds,
        startedAt: settings.autoStartFocus ? Date.now() : null,
        targetEndTime: settings.autoStartFocus ? Date.now() + durationSeconds * 1000 : null
      }
    };
  }
}
