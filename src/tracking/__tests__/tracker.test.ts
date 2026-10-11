import {
  applyFix,
  canSave,
  createRun,
  getCurrentPaceSecPerKm,
  getElapsedMs,
  pauseRun,
  recoverRun,
  resumeRun,
  startRun,
  stopRun,
  toRunDraft,
  MIN_SAVE_DISTANCE_M,
  type TrackState,
} from '../tracker';
import type { Fix } from '../../types';

// ~1.11 m per 0.00001 degrees of latitude
const M = 0.00001 / 1.1119;
const fix = (tSec: number, meters: number, accuracy: number | null = 5): Fix => ({
  lat: meters * M,
  lng: 0,
  timestamp: 1_000_000 + tSec * 1000,
  accuracy,
});
const T0 = 1_000_000;

/** Run along a straight line at 3 m/s with one fix per second. */
function runStraight(s: TrackState, fromSec: number, toSec: number, startM = 0) {
  let state = s;
  for (let t = fromSec; t <= toSec; t++) state = applyFix(state, fix(t, startM + (t - fromSec) * 3));
  return state;
}

describe('distance', () => {
  it('accumulates distance from accepted fixes', () => {
    const s = runStraight(startRun(T0), 0, 10);
    expect(s.distanceM).toBeGreaterThan(29);
    expect(s.distanceM).toBeLessThan(31);
    expect(s.points).toHaveLength(11);
  });

  it('rejects inaccurate fixes', () => {
    let s = startRun(T0);
    s = applyFix(s, fix(0, 0));
    s = applyFix(s, fix(1, 3, 31));
    s = applyFix(s, fix(2, 6, null));
    s = applyFix(s, fix(3, 9, -1));
    expect(s.points).toHaveLength(1);
    expect(s.distanceM).toBe(0);
  });

  it('rejects unrealistic speed jumps', () => {
    let s = runStraight(startRun(T0), 0, 5);
    const before = s.distanceM;
    s = applyFix(s, fix(6, 1000)); // ~1 km in 1 s
    expect(s.distanceM).toBe(before);
    expect(s.points).toHaveLength(6);
  });

  it('accepts a far-away point once enough time has passed', () => {
    let s = runStraight(startRun(T0), 0, 5);
    s = applyFix(s, fix(305, 300)); // 300 m in ~5 min is plausible
    expect(s.distanceM).toBeGreaterThan(280);
  });

  it('ignores jitter while standing still', () => {
    let s = applyFix(startRun(T0), fix(0, 0));
    for (let t = 1; t < 20; t++) s = applyFix(s, fix(t, t % 2 ? 1 : 0));
    expect(s.distanceM).toBe(0);
  });

  it('ignores out-of-order fixes', () => {
    let s = runStraight(startRun(T0), 5, 10);
    const n = s.points.length;
    s = applyFix(s, fix(7, 100));
    expect(s.points).toHaveLength(n);
  });
});

describe('pause handling', () => {
  it('excludes paused time from elapsed time', () => {
    let s = startRun(T0);
    s = pauseRun(s, T0 + 10_000);
    expect(getElapsedMs(s, T0 + 50_000)).toBe(10_000);
    s = resumeRun(s, T0 + 60_000);
    expect(getElapsedMs(s, T0 + 70_000)).toBe(20_000);
  });

  it('ignores fixes while paused and does not count the gap on resume', () => {
    let s = runStraight(startRun(T0), 0, 10);
    const dist = s.distanceM;
    s = pauseRun(s, T0 + 10_000);
    s = applyFix(s, fix(20, 500));
    expect(s.distanceM).toBe(dist);
    s = resumeRun(s, T0 + 30_000);
    s = applyFix(s, fix(31, 500)); // first fix after resume: anchor only
    expect(s.distanceM).toBe(dist);
    s = applyFix(s, fix(32, 503));
    expect(s.distanceM).toBeGreaterThan(dist + 2);
  });

  it('drops late-delivered fixes from before a resume', () => {
    let s = pauseRun(startRun(T0), T0 + 5_000);
    s = resumeRun(s, T0 + 20_000);
    s = applyFix(s, fix(10, 10));
    expect(s.points).toHaveLength(0);
  });

  it('pause/resume are no-ops in the wrong state', () => {
    const s = startRun(T0);
    expect(resumeRun(s, T0 + 1000)).toBe(s);
    expect(pauseRun(createRun(), T0)).toEqual(createRun());
  });
});

describe('pace', () => {
  it('computes current pace over the recent window', () => {
    const s = runStraight(startRun(T0), 0, 20); // 3 m/s -> ~5:33 /km
    const pace = getCurrentPaceSecPerKm(s)!;
    expect(pace).toBeGreaterThan(325);
    expect(pace).toBeLessThan(341);
  });

  it('is null with no movement and when paused', () => {
    expect(getCurrentPaceSecPerKm(startRun(T0))).toBeNull();
    const s = pauseRun(runStraight(startRun(T0), 0, 20), T0 + 20_000);
    expect(getCurrentPaceSecPerKm(s)).toBeNull();
  });
});

describe('stop, save and recovery', () => {
  it('produces a run draft with average pace', () => {
    let s = runStraight(startRun(T0), 0, 100); // ~300 m in 100 s
    s = stopRun(s, T0 + 100_000);
    const run = toRunDraft(s);
    expect(s.status).toBe('stopped');
    expect(run.durationSec).toBe(100);
    expect(run.avgPaceSecPerKm).toBeGreaterThan(325);
    expect(run.avgPaceSecPerKm).toBeLessThan(341);
    expect(run.routePoints.length).toBeGreaterThan(50);
  });

  it('refuses to save runs under minimum distance', () => {
    expect(canSave(MIN_SAVE_DISTANCE_M - 0.1)).toBe(false);
    expect(canSave(MIN_SAVE_DISTANCE_M)).toBe(true);
  });

  it('recovers a killed run as paused, counted up to its last GPS point', () => {
    const s = runStraight(startRun(T0), 0, 30);
    const r = recoverRun(JSON.parse(JSON.stringify(s)));
    expect(r.status).toBe('paused');
    expect(getElapsedMs(r, T0 + 9_999_999)).toBe(30_000);
    expect(r.distanceM).toBe(s.distanceM);
    expect(resumeRun(r, T0 + 500_000).status).toBe('running');
  });

  it('leaves paused and stopped snapshots unchanged', () => {
    const p = pauseRun(startRun(T0), T0 + 1000);
    expect(recoverRun(p)).toBe(p);
    const st = stopRun(startRun(T0), T0 + 1000);
    expect(recoverRun(st)).toBe(st);
  });
});

