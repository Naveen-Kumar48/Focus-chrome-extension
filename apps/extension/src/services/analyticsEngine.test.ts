import { describe, it, expect } from 'vitest';
import { calculateProductivitySummary, generateExportData } from './analyticsEngine';
import { CompletedSessionRecord, DistractionAttemptRecord } from '@focusflow/shared';

describe('Analytics Engine Calculations', () => {
  const fixedNow = 1700050000000;

  const mockSessions: CompletedSessionRecord[] = [
    {
      id: 's1',
      profileId: 'p1',
      profileName: 'Coding',
      mode: 'custom',
      startTime: fixedNow - 3600 * 1000,
      endTime: fixedNow - 1800 * 1000,
      scheduledDurationSeconds: 1800,
      actualDurationSeconds: 1800, // 30 mins
      completed: true,
      interrupted: false,
      distractionAttemptsCount: 2
    },
    {
      id: 's2',
      profileId: 'p1',
      profileName: 'Coding',
      mode: 'custom',
      startTime: fixedNow - 1000 * 1000,
      endTime: fixedNow - 400 * 1000,
      scheduledDurationSeconds: 1800,
      actualDurationSeconds: 600, // 10 mins
      completed: false,
      interrupted: true,
      distractionAttemptsCount: 1
    }
  ];

  const mockDistractions: DistractionAttemptRecord[] = [
    { id: 'd1', sessionId: 's1', domain: 'youtube.com', timestamp: fixedNow - 3000 },
    { id: 'd2', sessionId: 's1', domain: 'youtube.com', timestamp: fixedNow - 2000 },
    { id: 'd3', sessionId: 's1', domain: 'instagram.com', timestamp: fixedNow - 1000 }
  ];

  it('calculates total minutes, completion rates, and top distractions correctly', () => {
    const summary = calculateProductivitySummary(mockSessions, mockDistractions, fixedNow);

    expect(summary.totalSessionsCount).toBe(2);
    expect(summary.completedSessionsCount).toBe(1);
    expect(summary.interruptedSessionsCount).toBe(1);
    expect(summary.completionRatePercent).toBe(50);
    expect(summary.todayFocusMinutes).toBe(40); // 30 + 10 mins

    // Distractions
    expect(summary.topDistractions).toHaveLength(2);
    expect(summary.topDistractions[0]).toEqual({ domain: 'youtube.com', count: 2 });
    expect(summary.topDistractions[1]).toEqual({ domain: 'instagram.com', count: 1 });
  });

  it('generates valid JSON export string', () => {
    const jsonStr = generateExportData({ testKey: 'testVal' });
    const parsed = JSON.parse(jsonStr);
    expect(parsed.app).toBe('FocusFlow');
    expect(parsed.testKey).toBe('testVal');
  });
});
