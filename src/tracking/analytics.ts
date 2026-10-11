import type { RunListItem, Unit } from '../types';
import { distanceInUnit, paceSecPerKm, startOfWeek } from './geo';

export interface DailyVolume {
  dayLabel: string;
  fullDayLabel: string;
  dateStr: string;
  distanceM: number;
  durationSec: number;
  runsCount: number;
  isToday: boolean;
  timestamp: number;
}

export interface WeeklyVolume {
  weekLabel: string;
  dateRangeStr: string;
  distanceM: number;
  durationSec: number;
  runsCount: number;
  isCurrentWeek: boolean;
}

export interface MonthlyVolume {
  monthLabel: string;
  year: number;
  distanceM: number;
  durationSec: number;
  runsCount: number;
  isCurrentMonth: boolean;
}

export interface PaceTrendPoint {
  runId: number;
  startTime: number;
  paceSecPerKm: number;
  distanceM: number;
  dateLabel: string;
}

export interface AnalyticsSummary {
  totalDistanceM: number;
  totalDurationSec: number;
  totalRuns: number;
  avgPaceSecPerKm: number;
  fastestPaceSecPerKm: number;
  longestRunDistanceM: number;
  caloriesBurned: number;
}

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const FULL_DAY_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Returns 7 days (Monday - Sunday) of daily volume for the week containing `now`.
 */
export function getWeeklyDailyVolumes(runs: RunListItem[], now = Date.now()): DailyVolume[] {
  const weekStart = startOfWeek(now);
  const today = new Date(now);
  const todayDateStr = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;

  const days: DailyVolume[] = [];
  for (let i = 0; i < 7; i++) {
    const dayStart = new Date(weekStart);
    dayStart.setDate(dayStart.getDate() + i);
    dayStart.setHours(0, 0, 0, 0);

    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const dayStartTime = dayStart.getTime();
    const dayEndTime = dayEnd.getTime();

    const isToday =
      `${dayStart.getFullYear()}-${dayStart.getMonth()}-${dayStart.getDate()}` === todayDateStr;

    const dayRuns = runs.filter((r) => r.startTime >= dayStartTime && r.startTime < dayEndTime);
    const distanceM = dayRuns.reduce((acc, r) => acc + r.distanceM, 0);
    const durationSec = dayRuns.reduce((acc, r) => acc + r.durationSec, 0);

    const dateStr = dayStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

    days.push({
      dayLabel: DAY_LABELS[i],
      fullDayLabel: FULL_DAY_LABELS[i],
      dateStr,
      distanceM,
      durationSec,
      runsCount: dayRuns.length,
      isToday,
      timestamp: dayStartTime,
    });
  }

  return days;
}

/**
 * Returns weekly breakdown for the current month.
 */
export function getMonthlyWeeklyVolumes(runs: RunListItem[], now = Date.now()): WeeklyVolume[] {
  const current = new Date(now);
  const year = current.getFullYear();
  const month = current.getMonth();

  // First day of current month
  const firstOfMonth = new Date(year, month, 1);
  const lastOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = lastOfMonth.getDate();

  const weeks: WeeklyVolume[] = [];
  let weekNum = 1;

  for (let day = 1; day <= daysInMonth; day += 7) {
    const startDay = day;
    const endDay = Math.min(day + 6, daysInMonth);

    const startDateTime = new Date(year, month, startDay, 0, 0, 0, 0).getTime();
    const endDateTime = new Date(year, month, endDay, 23, 59, 59, 999).getTime();

    const weekRuns = runs.filter((r) => r.startTime >= startDateTime && r.startTime <= endDateTime);
    const distanceM = weekRuns.reduce((acc, r) => acc + r.distanceM, 0);
    const durationSec = weekRuns.reduce((acc, r) => acc + r.durationSec, 0);

    const isCurrentWeek = now >= startDateTime && now <= endDateTime;

    weeks.push({
      weekLabel: `W${weekNum}`,
      dateRangeStr: `${MONTH_NAMES[month]} ${startDay}-${endDay}`,
      distanceM,
      durationSec,
      runsCount: weekRuns.length,
      isCurrentWeek,
    });
    weekNum++;
  }

  return weeks;
}

/**
 * Returns monthly breakdown for the last `monthsCount` months.
 */
export function getRecentMonthlyVolumes(
  runs: RunListItem[],
  monthsCount = 6,
  now = Date.now()
): MonthlyVolume[] {
  const current = new Date(now);
  const list: MonthlyVolume[] = [];

  for (let i = monthsCount - 1; i >= 0; i--) {
    const d = new Date(current.getFullYear(), current.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = d.getMonth();

    const startMs = new Date(y, m, 1, 0, 0, 0, 0).getTime();
    const endMs = new Date(y, m + 1, 0, 23, 59, 59, 999).getTime();

    const mRuns = runs.filter((r) => r.startTime >= startMs && r.startTime <= endMs);
    const distanceM = mRuns.reduce((acc, r) => acc + r.distanceM, 0);
    const durationSec = mRuns.reduce((acc, r) => acc + r.durationSec, 0);

    list.push({
      monthLabel: MONTH_NAMES[m],
      year: y,
      distanceM,
      durationSec,
      runsCount: mRuns.length,
      isCurrentMonth: i === 0,
    });
  }

  return list;
}

/**
 * Returns the pace trend points for up to `maxRuns` most recent runs, ordered chronologically.
 */
export function getPaceTrend(runs: RunListItem[], maxRuns = 7): PaceTrendPoint[] {
  const sorted = [...runs]
    .filter((r) => r.avgPaceSecPerKm > 0 && r.distanceM > 0)
    .sort((a, b) => a.startTime - b.startTime);

  const recent = sorted.slice(-maxRuns);

  return recent.map((r) => ({
    runId: r.id,
    startTime: r.startTime,
    paceSecPerKm: r.avgPaceSecPerKm,
    distanceM: r.distanceM,
    dateLabel: new Date(r.startTime).toLocaleDateString(undefined, {
      month: 'numeric',
      day: 'numeric',
    }),
  }));
}

/**
 * Computes summary statistics across a set of runs.
 */
export function calculateAnalyticsSummary(
  runs: RunListItem[],
  weightKg = 70
): AnalyticsSummary {
  if (runs.length === 0) {
    return {
      totalDistanceM: 0,
      totalDurationSec: 0,
      totalRuns: 0,
      avgPaceSecPerKm: 0,
      fastestPaceSecPerKm: 0,
      longestRunDistanceM: 0,
      caloriesBurned: 0,
    };
  }

  const totalDistanceM = runs.reduce((acc, r) => acc + r.distanceM, 0);
  const totalDurationSec = runs.reduce((acc, r) => acc + r.durationSec, 0);
  const totalRuns = runs.length;

  const validPaces = runs
    .map((r) => r.avgPaceSecPerKm)
    .filter((p) => p > 0 && isFinite(p));

  const fastestPaceSecPerKm = validPaces.length ? Math.min(...validPaces) : 0;
  const avgPaceSecPerKm = paceSecPerKm(totalDurationSec, totalDistanceM);
  const longestRunDistanceM = Math.max(...runs.map((r) => r.distanceM), 0);

  // Approximate calorie expenditure formula: weight(kg) * distance(km) * 1.036
  const effectiveWeight = weightKg > 0 ? weightKg : 70;
  const distanceKm = totalDistanceM / 1000;
  const caloriesBurned = Math.round(effectiveWeight * distanceKm * 1.036);

  return {
    totalDistanceM,
    totalDurationSec,
    totalRuns,
    avgPaceSecPerKm,
    fastestPaceSecPerKm,
    longestRunDistanceM,
    caloriesBurned,
  };
}
