import { haversineM, paceSecPerKm, M_PER_KM } from './geo';
import type { Fix, RoutePoint, RunDraft, RunStatus } from '../types';

/** Fixes less accurate than this (metres) are discarded (anti-drift). */
export const MAX_ACCURACY_M = 15;
/** Implied speeds above this (m/s, ~43 km/h) are treated as GPS jumps. */
export const MAX_SPEED_MPS = 12;
/** Steps shorter than this (metres) are treated as GPS jitter while standing. */
export const MIN_STEP_M = 2;
/** Runs shorter than this (metres) cannot be saved. */
export const MIN_SAVE_DISTANCE_M = 1;
/** Window used for the "current pace" display. */
export const PACE_WINDOW_MS = 30_000;

interface Sample {
  t: number;
  d: number;
}

/**
 * Serializable run-tracking state. All functions below are pure: they take a
 * state and return a new one, which makes them trivially testable and lets the
 * state be persisted/restored for crash recovery.
 */
export interface TrackState {
  status: RunStatus;
  startTime: number;
  /** Active (non-paused) time accumulated in finished segments, ms. */
  accumulatedMs: number;
  /** Start of the current running segment (epoch ms), null if not running. */
  segmentStart: number | null;
  distanceM: number;
  points: RoutePoint[];
  /** Last accepted point of the current segment; null right after start/resume. */
  last: RoutePoint | null;
  /** Recent (time, cumulative distance) samples for current pace. */
  recent: Sample[];
}

export function createRun(): TrackState {
  return {
    status: 'idle',
    startTime: 0,
    accumulatedMs: 0,
    segmentStart: null,
    distanceM: 0,
    points: [],
    last: null,
    recent: [],
  };
}

export function startRun(now: number): TrackState {
  return { ...createRun(), status: 'running', startTime: now, segmentStart: now };
}

export function pauseRun(s: TrackState, now: number): TrackState {
  if (s.status !== 'running' || s.segmentStart == null) return s;
  return {
    ...s,
    status: 'paused',
    accumulatedMs: s.accumulatedMs + Math.max(0, now - s.segmentStart),
    segmentStart: null,
    last: null,
    recent: [],
  };
}

export function resumeRun(s: TrackState, now: number): TrackState {
  if (s.status !== 'paused') return s;
  // `last` stays null so the distance travelled while paused is never counted.
  return { ...s, status: 'running', segmentStart: now, last: null, recent: [] };
}

export function stopRun(s: TrackState, now: number): TrackState {
  if (s.status === 'idle' || s.status === 'stopped') return s;
  const paused = s.status === 'paused' ? s : pauseRun(s, now);
  return { ...paused, status: 'stopped' };
}

/** Active time in ms (excludes pauses). */
export function getElapsedMs(s: TrackState, now: number): number {
  const live = s.status === 'running' && s.segmentStart != null ? now - s.segmentStart : 0;
  return s.accumulatedMs + Math.max(0, live);
}

/**
 * Feed a GPS fix into the run. Fixes are ignored when paused, stale, inaccurate,
 * jittery, or imply an unrealistic speed.
 */
export function applyFix(s: TrackState, fix: Fix): TrackState {
  if (s.status !== 'running' || s.segmentStart == null) return s;
  if (fix.timestamp < s.segmentStart) return s; // delivered late from a paused period
  if (!Number.isFinite(fix.lat) || !Number.isFinite(fix.lng)) return s;
  if (fix.accuracy == null || fix.accuracy < 0 || fix.accuracy > MAX_ACCURACY_M) return s;

  const point: RoutePoint = {
    lat: fix.lat,
    lng: fix.lng,
    latitude: fix.latitude ?? fix.lat,
    longitude: fix.longitude ?? fix.lng,
    altitude: fix.altitude ?? null,
    timestamp: fix.timestamp,
  };

  if (!s.last) {
    return {
      ...s,
      points: [...s.points, point],
      last: point,
      recent: [{ t: point.timestamp, d: s.distanceM }],
    };
  }

  const dtSec = (point.timestamp - s.last.timestamp) / 1000;
  if (dtSec <= 0) return s;
  const step = haversineM(s.last, point);
  if (step < MIN_STEP_M) return s;
  // A rejected jump does not move `last`, so as dt grows a genuine position
  // eventually becomes plausible again (self-healing after GPS loss).
  if (step / dtSec > MAX_SPEED_MPS) return s;

  const distanceM = s.distanceM + step;
  const recent = [...s.recent, { t: point.timestamp, d: distanceM }].filter(
    (r) => point.timestamp - r.t <= PACE_WINDOW_MS
  );
  return { ...s, distanceM, points: [...s.points, point], last: point, recent };
}

/** Pace over the last ~30 s in sec/km, or null if not enough movement. */
export function getCurrentPaceSecPerKm(s: TrackState): number | null {
  if (s.status !== 'running' || s.recent.length < 2) return null;
  const first = s.recent[0];
  const last = s.recent[s.recent.length - 1];
  const dd = last.d - first.d;
  const dtSec = (last.t - first.t) / 1000;
  if (dd < 5 || dtSec <= 0) return null;
  return dtSec / (dd / M_PER_KM);
}

export function getAvgPaceSecPerKm(s: TrackState, now: number): number {
  return paceSecPerKm(getElapsedMs(s, now) / 1000, s.distanceM);
}

export function canSave(distanceM: number): boolean {
  return distanceM >= MIN_SAVE_DISTANCE_M;
}

/** Convert a stopped run into the persisted shape (without id). */
export function toRunDraft(s: TrackState): RunDraft {
  const durationSec = Math.round(s.accumulatedMs / 1000);
  return {
    startTime: s.startTime,
    durationSec,
    distanceM: s.distanceM,
    avgPaceSecPerKm: paceSecPerKm(durationSec, s.distanceM),
    routePoints: s.points,
  };
}

/**
 * Restore a snapshot after the app was killed. A run that was "running" is
 * counted only up to its last known GPS point and comes back paused, so the
 * user decides whether to resume or finish it.
 */
export function recoverRun(s: TrackState): TrackState {
  if (s.status !== 'running' || s.segmentStart == null) return s;
  const lastTs = s.points.length ? s.points[s.points.length - 1].timestamp : s.segmentStart;
  return {
    ...s,
    status: 'paused',
    accumulatedMs: s.accumulatedMs + Math.max(0, lastTs - s.segmentStart),
    segmentStart: null,
    last: null,
    recent: [],
  };
}

