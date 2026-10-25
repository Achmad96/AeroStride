import { calculateWeeklyStreak } from '../streak';
import type { RunListItem } from '../../types';

describe('calculateWeeklyStreak', () => {
  const fakeRun = (date: Date): RunListItem => ({
    id: Math.random(),
    startTime: date.getTime(),
    durationSec: 1800,
    distanceM: 5000,
    avgPaceSecPerKm: 360,
  });

  it('returns 0 streak when there are no runs or completed workouts', () => {
    const result = calculateWeeklyStreak([], {}, Date.now());
    expect(result.currentStreakWeeks).toBe(0);
    expect(result.thisWeekCount).toBe(0);
    expect(result.hasRunThisWeek).toBe(false);
    expect(result.weekDays.length).toBe(7);
  });

  it('detects 1 week streak when run was done this week', () => {
    const today = new Date();
    const runs = [fakeRun(today)];
    const result = calculateWeeklyStreak(runs, {}, today.getTime());

    expect(result.currentStreakWeeks).toBe(1);
    expect(result.hasRunThisWeek).toBe(true);
    expect(result.thisWeekCount).toBe(1);
  });

  it('detects consecutive weeks streak', () => {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const runs = [fakeRun(now), fakeRun(oneWeekAgo), fakeRun(twoWeeksAgo)];
    const result = calculateWeeklyStreak(runs, {}, now.getTime());

    expect(result.currentStreakWeeks).toBe(3);
    expect(result.bestStreakWeeks).toBe(3);
  });

  it('keeps streak alive as pending when user ran last week but not yet this week', () => {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const runs = [fakeRun(oneWeekAgo)];
    const result = calculateWeeklyStreak(runs, {}, now.getTime());

    expect(result.currentStreakWeeks).toBe(1);
    expect(result.isPendingThisWeek).toBe(true);
    expect(result.hasRunThisWeek).toBe(false);
  });
});

