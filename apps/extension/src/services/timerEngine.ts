import {
  ActiveTimerState,
  CompletedSessionRecord,
  TimerStatus
} from '@focusflow/shared';

/**
 * Calculates remaining seconds dynamically based on epoch timestamps.
 * This guarantees 100% precision even if the computer sleeps, the browser restarts,
 * or background workers suspend.
 */
export function calculateRemainingSeconds(
  timer: ActiveTimerState,
  now: number = Date.now()
): number {
  if (timer.status === 'idle') {
    return timer.durationSeconds;
  }

  if (timer.status === 'completed') {
    return 0;
  }

  if (timer.status === 'paused') {
    if (timer.pausedAt === null || timer.startedAt === null) {
      return timer.durationSeconds;
    }
    const elapsedBeforePauseMs =
      timer.pausedAt - timer.startedAt - timer.accumulatedPausedMs;
    const remainingMs = timer.durationSeconds * 1000 - elapsedBeforePauseMs;
    return Math.max(0, Math.ceil(remainingMs / 1000));
  }

  if (timer.status === 'running') {
    if (timer.targetEndTime !== null) {
      const remainingMs = timer.targetEndTime - now;
      return Math.max(0, Math.ceil(remainingMs / 1000));
    }
    if (timer.startedAt !== null) {
      const elapsedMs = now - timer.startedAt - timer.accumulatedPausedMs;
      const remainingMs = timer.durationSeconds * 1000 - elapsedMs;
      return Math.max(0, Math.ceil(remainingMs / 1000));
    }
  }

  return timer.durationSeconds;
}

/**
 * Starts a new focus session.
 */
export function startTimer(
  state: ActiveTimerState,
  options?: { durationSeconds?: number; profileId?: string },
  now: number = Date.now()
): ActiveTimerState {
  const duration = options?.durationSeconds ?? state.durationSeconds;
  const profileId = options?.profileId ?? state.profileId;

  return {
    ...state,
    status: 'running',
    durationSeconds: duration,
    profileId,
    startedAt: now,
    pausedAt: null,
    accumulatedPausedMs: 0,
    targetEndTime: now + duration * 1000
  };
}

/**
 * Pauses an active focus session.
 */
export function pauseTimer(
  state: ActiveTimerState,
  now: number = Date.now()
): ActiveTimerState {
  if (state.status !== 'running') {
    return state;
  }

  return {
    ...state,
    status: 'paused',
    pausedAt: now
  };
}

/**
 * Resumes a paused focus session with pause-drift compensation.
 */
export function resumeTimer(
  state: ActiveTimerState,
  now: number = Date.now()
): ActiveTimerState {
  if (state.status !== 'paused' || state.pausedAt === null) {
    return state;
  }

  const pauseDurationMs = Math.max(0, now - state.pausedAt);
  const accumulatedPausedMs = state.accumulatedPausedMs + pauseDurationMs;
  const currentTarget =
    state.targetEndTime ??
    (state.startedAt ?? now) + state.durationSeconds * 1000;
  const newTargetEndTime = currentTarget + pauseDurationMs;

  return {
    ...state,
    status: 'running',
    pausedAt: null,
    accumulatedPausedMs,
    targetEndTime: newTargetEndTime
  };
}

/**
 * Stops an active or paused session early (interrupted).
 */
export function stopTimer(
  state: ActiveTimerState,
  now: number = Date.now()
): {
  nextState: ActiveTimerState;
  interruptedRecord: Partial<CompletedSessionRecord> | null;
} {
  if (state.status === 'idle') {
    return { nextState: state, interruptedRecord: null };
  }

  const remaining = calculateRemainingSeconds(state, now);
  const actualDurationSeconds = Math.max(0, state.durationSeconds - remaining);

  const interruptedRecord: Partial<CompletedSessionRecord> = {
    profileId: state.profileId,
    mode: state.mode,
    startTime: state.startedAt ?? now,
    endTime: now,
    scheduledDurationSeconds: state.durationSeconds,
    actualDurationSeconds,
    completed: false,
    interrupted: true,
    interruptionReason: 'User stopped session early',
    distractionAttemptsCount: 0
  };

  const nextState: ActiveTimerState = {
    ...state,
    status: 'idle',
    startedAt: null,
    pausedAt: null,
    accumulatedPausedMs: 0,
    targetEndTime: null
  };

  return { nextState, interruptedRecord };
}

/**
 * Resets the timer back to idle state with the specified or current duration.
 */
export function resetTimer(
  state: ActiveTimerState,
  defaultDuration?: number
): ActiveTimerState {
  return {
    ...state,
    status: 'idle',
    durationSeconds: defaultDuration ?? state.durationSeconds,
    startedAt: null,
    pausedAt: null,
    accumulatedPausedMs: 0,
    targetEndTime: null
  };
}

/**
 * Sets duration when the timer is idle.
 */
export function setTimerDuration(
  state: ActiveTimerState,
  durationSeconds: number
): ActiveTimerState {
  if (state.status !== 'idle') {
    return state;
  }
  return {
    ...state,
    durationSeconds: Math.max(60, durationSeconds) // Minimum 1 minute
  };
}

/**
 * Evaluates whether a running timer has reached or passed its target end time.
 */
export function checkTimerExpiry(
  state: ActiveTimerState,
  now: number = Date.now()
): {
  isExpired: boolean;
  nextState: ActiveTimerState;
  completedRecord: Partial<CompletedSessionRecord> | null;
} {
  if (state.status !== 'running') {
    return { isExpired: false, nextState: state, completedRecord: null };
  }

  const isExpired =
    state.targetEndTime !== null && now >= state.targetEndTime;

  if (isExpired) {
    const completedRecord: Partial<CompletedSessionRecord> = {
      profileId: state.profileId,
      mode: state.mode,
      startTime: state.startedAt ?? now - state.durationSeconds * 1000,
      endTime: now,
      scheduledDurationSeconds: state.durationSeconds,
      actualDurationSeconds: state.durationSeconds,
      completed: true,
      interrupted: false,
      distractionAttemptsCount: 0
    };

    const nextState: ActiveTimerState = {
      ...state,
      status: 'completed',
      targetEndTime: null
    };

    return { isExpired: true, nextState, completedRecord };
  }

  return { isExpired: false, nextState: state, completedRecord: null };
}

/**
 * Formats a second count to MM:SS or HH:MM:SS string.
 */
export function formatSecondsToMMSS(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const secs = safeSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Generates badge text for the Chrome extension icon.
 */
export function formatRemainingToBadge(
  remainingSeconds: number,
  status: TimerStatus
): { text: string; color: string } {
  switch (status) {
    case 'running': {
      if (remainingSeconds < 60) {
        return { text: '<1m', color: '#ec4899' }; // Pink warning
      }
      const mins = Math.ceil(remainingSeconds / 60);
      return { text: `${mins}m`, color: '#6366f1' }; // Indigo
    }
    case 'paused':
      return { text: 'PAUS', color: '#f59e0b' }; // Amber
    case 'completed':
      return { text: 'DONE', color: '#10b981' }; // Green
    case 'idle':
    default:
      return { text: '', color: '#000000' };
  }
}
