import {
  CompletedSessionRecord,
  DistractionAttemptRecord
} from '@focusflow/shared';

export interface ProductivitySummary {
  todayFocusMinutes: number;
  weekFocusMinutes: number;
  totalSessionsCount: number;
  completedSessionsCount: number;
  interruptedSessionsCount: number;
  completionRatePercent: number;
  topDistractions: Array<{ domain: string; count: number }>;
}

/**
 * Computes high-level productivity analytics from local session records.
 */
export function calculateProductivitySummary(
  sessions: CompletedSessionRecord[] = [],
  distractions: DistractionAttemptRecord[] = [],
  now: number = Date.now()
): ProductivitySummary {
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const startOfDayMs = startOfDay.getTime();

  // Start of week (Monday)
  const startOfWeek = new Date(now);
  const day = startOfWeek.getDay();
  const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
  startOfWeek.setDate(diff);
  startOfWeek.setHours(0, 0, 0, 0);
  const startOfWeekMs = startOfWeek.getTime();

  let todaySecs = 0;
  let weekSecs = 0;
  let completedCount = 0;
  let interruptedCount = 0;

  sessions.forEach((s) => {
    if (s.completed) completedCount++;
    if (s.interrupted) interruptedCount++;

    if (s.endTime >= startOfDayMs) {
      todaySecs += s.actualDurationSeconds;
    }
    if (s.endTime >= startOfWeekMs) {
      weekSecs += s.actualDurationSeconds;
    }
  });

  const totalSessionsCount = sessions.length;
  const completionRatePercent =
    totalSessionsCount > 0 ? Math.round((completedCount / totalSessionsCount) * 100) : 0;

  // Aggregate distraction attempts by domain
  const countsByDomain: Record<string, number> = {};
  distractions.forEach((d) => {
    countsByDomain[d.domain] = (countsByDomain[d.domain] || 0) + 1;
  });

  const topDistractions = Object.entries(countsByDomain)
    .map(([domain, count]) => ({ domain, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    todayFocusMinutes: Math.floor(todaySecs / 60),
    weekFocusMinutes: Math.floor(weekSecs / 60),
    totalSessionsCount,
    completedSessionsCount: completedCount,
    interruptedSessionsCount: interruptedCount,
    completionRatePercent,
    topDistractions
  };
}

/**
 * Generates an exportable JSON payload of all local user data.
 */
export function generateExportData(data: Record<string, unknown>): string {
  return JSON.stringify(
    {
      app: 'FocusFlow',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      ...data
    },
    null,
    2
  );
}
