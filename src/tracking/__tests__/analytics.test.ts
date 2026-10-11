import {
  getWeeklyDailyVolumes,
  getMonthlyWeeklyVolumes,
  getRecentMonthlyVolumes,
  getPaceTrend,
  calculateAnalyticsSummary,
} from '../analytics';
import type { RunListItem } from '../../types';

describe('Analytics Calculations', () => {
  const fixedNow = new Date(2026, 9, 11, 12, 0, 0).getTime(); // Sunday, Oct 11, 2026

  const mockRuns: RunListItem[] = [
    {
      id: 1,
      startTime: new Date(2026, 9, 6, 8, 0, 0).getTime(), // Tuesday
      distanceM: 5000,
      durationSec: 1800, // 6:00 /km
      avgPaceSecPerKm: 360,
    },
    {
      id: 2,
      startTime: new Date(2026, 9, 8, 8, 0, 0).getTime(), // Thursday
      distanceM: 3000,
      durationSec: 990, // 5:30 /km
      avgPaceSecPerKm: 330,
    },
    {
      id: 3,
      startTime: new Date(2026, 9, 11, 7, 0, 0).getTime(), // Sunday (today)
      distanceM: 10000,
      durationSec: 3600, // 6:00 /km
      avgPaceSecPerKm: 360,
    },
  ];

  it('calculates weekly daily volumes correctly', () => {
    const days = getWeeklyDailyVolumes(mockRuns, fixedNow);
    expect(days).toHaveLength(7);

    // Monday (index 0) - 0m
    expect(days[0].distanceM).toBe(0);
    expect(days[0].dayLabel).toBe('M');

    // Tuesday (index 1) - 5000m
    expect(days[1].distanceM).toBe(5000);
    expect(days[1].runsCount).toBe(1);

    // Thursday (index 3) - 3000m
    expect(days[3].distanceM).toBe(3000);

    // Sunday (index 6) - 10000m, isToday
    expect(days[6].distanceM).toBe(10000);
    expect(days[6].isToday).toBe(true);
  });

  it('calculates monthly weekly volumes correctly', () => {
    const weeks = getMonthlyWeeklyVolumes(mockRuns, fixedNow);
    expect(weeks.length).toBeGreaterThan(0);
    const totalDist = weeks.reduce((sum, w) => sum + w.distanceM, 0);
    expect(totalDist).toBe(18000);
  });

  it('calculates recent monthly volumes', () => {
    const months = getRecentMonthlyVolumes(mockRuns, 6, fixedNow);
    expect(months).toHaveLength(6);
    const currentMonth = months[months.length - 1];
    expect(currentMonth.isCurrentMonth).toBe(true);
    expect(currentMonth.distanceM).toBe(18000);
  });

  it('computes pace trend points chronologically', () => {
    const trend = getPaceTrend(mockRuns);
    expect(trend).toHaveLength(3);
    expect(trend[0].runId).toBe(1);
    expect(trend[1].runId).toBe(2);
    expect(trend[2].runId).toBe(3);
  });

  it('calculates summary statistics accurately', () => {
    const summary = calculateAnalyticsSummary(mockRuns, 70);
    expect(summary.totalDistanceM).toBe(18000);
    expect(summary.totalDurationSec).toBe(6390);
    expect(summary.totalRuns).toBe(3);
    expect(summary.longestRunDistanceM).toBe(10000);
    expect(summary.fastestPaceSecPerKm).toBe(330);
    expect(summary.caloriesBurned).toBeGreaterThan(1000);
  });

  it('handles empty runs list gracefully', () => {
    const summary = calculateAnalyticsSummary([]);
    expect(summary.totalDistanceM).toBe(0);
    expect(summary.totalRuns).toBe(0);
    expect(summary.caloriesBurned).toBe(0);
    expect(summary.avgPaceSecPerKm).toBe(0);

    const trend = getPaceTrend([]);
    expect(trend).toEqual([]);
  });
});
