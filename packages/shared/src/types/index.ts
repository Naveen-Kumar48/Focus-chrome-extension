export type TimerStatus = 'idle' | 'running' | 'paused' | 'completed';
export type SessionMode = 'custom' | 'pomodoro';
export type PomodoroPhase = 'focus' | 'short_break' | 'long_break';

export interface ActiveTimerState {
  status: TimerStatus;
  mode: SessionMode;
  pomodoroPhase?: PomodoroPhase;
  pomodoroCycleCount: number;
  profileId: string;
  durationSeconds: number;
  startedAt: number | null;
  pausedAt: number | null;
  accumulatedPausedMs: number;
  targetEndTime: number | null;
}

export interface FocusProfile {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  durationMinutes: number;
  blockedDomains: string[];
  allowedDomains: string[];
  isPreset: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface CompletedSessionRecord {
  id: string;
  profileId: string;
  profileName: string;
  mode: SessionMode;
  startTime: number;
  endTime: number;
  scheduledDurationSeconds: number;
  actualDurationSeconds: number;
  completed: boolean;
  interrupted: boolean;
  interruptionReason?: string;
  distractionAttemptsCount: number;
  syncedWithCloud?: boolean;
}

export interface DistractionAttemptRecord {
  id: string;
  sessionId: string;
  domain: string;
  timestamp: number;
}

export interface FocusSchedule {
  id: string;
  name: string;
  profileId: string;
  daysOfWeek: number[]; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  startTime: string;    // "HH:mm" (24-hour)
  endTime: string;      // "HH:mm"
  isEnabled: boolean;
}

export interface UserSettings {
  theme: 'system' | 'light' | 'dark';
  soundEnabled: boolean;
  soundVolume: number;
  soundChoice: 'bell' | 'chime' | 'digital';
  notificationsEnabled: boolean;
  strictMode: boolean;
  autoStartBreaks: boolean;
  autoStartFocus: boolean;
  pomodoroFocusMinutes: number;
  pomodoroShortBreakMinutes: number;
  pomodoroLongBreakMinutes: number;
  pomodoroCyclesBeforeLongBreak: number;
  dailyGoalMinutes: number;
  weeklyGoalMinutes: number;
}

export interface StorageSchema {
  version: number;
  activeTimer: ActiveTimerState;
  activeProfileId: string;
  profiles: Record<string, FocusProfile>;
  sessions: CompletedSessionRecord[];
  distractionAttempts: DistractionAttemptRecord[];
  schedules: FocusSchedule[];
  settings: UserSettings;
}

export type ExtensionMessageType =
  | 'TIMER_START'
  | 'TIMER_PAUSE'
  | 'TIMER_RESUME'
  | 'TIMER_STOP'
  | 'TIMER_RESET'
  | 'LOG_DISTRACTION'
  | 'GET_TIMER_STATE'
  | 'SYNC_STATE';

export interface ExtensionMessage<T = unknown> {
  type: ExtensionMessageType;
  payload?: T;
}

export interface MessageResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
