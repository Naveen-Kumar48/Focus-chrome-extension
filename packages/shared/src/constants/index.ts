import {
  ActiveTimerState,
  FocusProfile,
  StorageSchema,
  UserSettings
} from '../types';

export const STORAGE_VERSION = 1;

export const DEFAULT_PROFILES: Record<string, FocusProfile> = {
  'preset-deep-work': {
    id: 'preset-deep-work',
    name: 'Deep Work',
    icon: 'target',
    color: '#6366f1',
    durationMinutes: 45,
    blockedDomains: [
      'youtube.com',
      'instagram.com',
      'facebook.com',
      'twitter.com',
      'x.com',
      'reddit.com',
      'tiktok.com',
      'netflix.com'
    ],
    allowedDomains: [],
    isPreset: true,
    createdAt: 1700000000000,
    updatedAt: 1700000000000
  },
  'preset-coding': {
    id: 'preset-coding',
    name: 'Coding',
    icon: 'code',
    color: '#0ea5e9',
    durationMinutes: 60,
    blockedDomains: [
      'youtube.com',
      'instagram.com',
      'facebook.com',
      'reddit.com',
      'netflix.com'
    ],
    allowedDomains: [
      'github.com',
      'stackoverflow.com',
      'developer.mozilla.org',
      'chatgpt.com'
    ],
    isPreset: true,
    createdAt: 1700000000000,
    updatedAt: 1700000000000
  },
  'preset-study': {
    id: 'preset-study',
    name: 'Study',
    icon: 'book',
    color: '#10b981',
    durationMinutes: 25,
    blockedDomains: [
      'youtube.com',
      'instagram.com',
      'tiktok.com',
      'x.com',
      'reddit.com'
    ],
    allowedDomains: ['wikipedia.org', 'scholar.google.com'],
    isPreset: true,
    createdAt: 1700000000000,
    updatedAt: 1700000000000
  }
};

export const DEFAULT_SETTINGS: UserSettings = {
  theme: 'system',
  soundEnabled: true,
  soundVolume: 0.8,
  soundChoice: 'chime',
  notificationsEnabled: true,
  strictMode: false,
  autoStartBreaks: false,
  autoStartFocus: false,
  pomodoroFocusMinutes: 25,
  pomodoroShortBreakMinutes: 5,
  pomodoroLongBreakMinutes: 15,
  pomodoroCyclesBeforeLongBreak: 4,
  dailyGoalMinutes: 120,
  weeklyGoalMinutes: 600
};

export const INITIAL_TIMER_STATE: ActiveTimerState = {
  status: 'idle',
  mode: 'custom',
  pomodoroCycleCount: 1,
  profileId: 'preset-deep-work',
  durationSeconds: 25 * 60, // 25 minutes = 1500s
  startedAt: null,
  pausedAt: null,
  accumulatedPausedMs: 0,
  targetEndTime: null
};

export const DEFAULT_STORAGE_STATE: StorageSchema = {
  version: STORAGE_VERSION,
  activeTimer: INITIAL_TIMER_STATE,
  activeProfileId: 'preset-deep-work',
  profiles: DEFAULT_PROFILES,
  sessions: [],
  distractionAttempts: [],
  schedules: [],
  settings: DEFAULT_SETTINGS
};
