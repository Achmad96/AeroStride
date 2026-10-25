import type { RunListItem } from '../types';
import type { CompletedWorkoutRecord } from '../store/planStore';
import { getWorkoutDateKey } from './trainingPlan';
import { startOfWeek } from './geo';

export interface WeekDayStatus {
  dayLabel: string;
  fullDayLabel: string;
  dateKey: string;
  date: Date;
  isCompleted: boolean;
  isToday: boolean;
  isPast: boolean;
}

export interface WeeklyStreakInfo {
  currentStreakWeeks: number;
  bestStreakWeeks: number;
  thisWeekCount: number;
  hasRunThisWeek: boolean;
  isPendingThisWeek: boolean;
  weekDays: WeekDayStatus[];
}

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const FULL_DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function calculateWeeklyStreak(
  runs: RunListItem[],
  completedWorkouts: Record<string, CompletedWorkoutRecord> = {},
  now = Date.now()
): WeeklyStreakInfo {
  // Collect all unique completed dates
  const completedDateKeys = new Set<string>();

  for (const r of runs) {
    if (r.startTime > 0) {
      completedDateKeys.add(getWorkoutDateKey(new Date(r.startTime)));
    }
  }

  for (const key of Object.keys(completedWorkouts)) {
    completedDateKeys.add(key);
  }

  // 1. Calculate current week days status
  const currentWeekStartMs = startOfWeek(now);
  const nowDate = new Date(now);
  const todayKey = getWorkoutDateKey(nowDate);

  const weekDays: WeekDayStatus[] = [];
  let thisWeekCount = 0;

  for (let i = 0; i < 7; i++) {
    const d = new Date(currentWeekStartMs);
    d.setDate(d.getDate() + i);
    const key = getWorkoutDateKey(d);
    const isCompleted = completedDateKeys.has(key);
    if (isCompleted) thisWeekCount++;

    const isToday = key === todayKey;
    const isPast = d.getTime() < now && !isToday;

    weekDays.push({
      dayLabel: DAY_LABELS[i],
      fullDayLabel: FULL_DAY_LABELS[i],
      dateKey: key,
      date: d,
      isCompleted,
      isToday,
      isPast,
    });
  }

  const hasRunThisWeek = thisWeekCount > 0;

  // 2. Helper to check if a specific week (defined by its Monday ms) had any completed workout
  const isWeekActive = (weekStartMs: number): boolean => {
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const d = new Date(weekStartMs);
      d.setDate(d.getDate() + dayOffset);
      const key = getWorkoutDateKey(d);
      if (completedDateKeys.has(key)) return true;
    }
    return false;
  };

  // 3. Calculate current consecutive weekly streak
  const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
  let currentStreakWeeks = 0;
  let isPendingThisWeek = false;

  if (hasRunThisWeek) {
    currentStreakWeeks = 1;
    // Check backwards from last week
    let checkWeekMs = currentWeekStartMs - ONE_WEEK_MS;
    while (isWeekActive(checkWeekMs)) {
      currentStreakWeeks++;
      checkWeekMs -= ONE_WEEK_MS;
    }
  } else {
    // Hasn't run yet this week: check if last week had a run to keep the streak pending
    let checkWeekMs = currentWeekStartMs - ONE_WEEK_MS;
    while (isWeekActive(checkWeekMs)) {
      currentStreakWeeks++;
      checkWeekMs -= ONE_WEEK_MS;
    }
    if (currentStreakWeeks > 0) {
      isPendingThisWeek = true;
    }
  }

  // 4. Calculate best historical weekly streak
  // Find earliest completed date
  let earliestMs = currentWeekStartMs;
  for (const r of runs) {
    if (r.startTime < earliestMs) earliestMs = r.startTime;
  }
  const earliestWeekMs = startOfWeek(earliestMs);

  let bestStreakWeeks = currentStreakWeeks;
  let tempStreak = 0;
  let w = earliestWeekMs;

  while (w <= currentWeekStartMs) {
    if (isWeekActive(w)) {
      tempStreak++;
      if (tempStreak > bestStreakWeeks) {
        bestStreakWeeks = tempStreak;
      }
    } else {
      tempStreak = 0;
    }
    w += ONE_WEEK_MS;
  }

  return {
    currentStreakWeeks,
    bestStreakWeeks: Math.max(bestStreakWeeks, currentStreakWeeks),
    thisWeekCount,
    hasRunThisWeek,
    isPendingThisWeek,
    weekDays,
  };
}

