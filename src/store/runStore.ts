import { create } from 'zustand';
import { kvDelete, kvGet, kvSet } from '../db/database';
import {
  applyFix,
  createRun,
  pauseRun,
  recoverRun,
  resumeRun,
  startRun,
  stopRun,
  type TrackState,
} from '../tracking/tracker';
import type { Fix, RoutePoint } from '../types';

const ACTIVE_KEY = 'active_run';
const PERSIST_INTERVAL_MS = 5000;
let lastPersist = 0;

interface RunStore {
  run: TrackState;
  /** Wall-clock time of the most recent GPS fix (any quality). */
  lastFixAt: number | null;
  lastAccuracy: number | null;
  /** Most recent raw GPS position (any quality) for the "you are here" dot. */
  lastPosition: RoutePoint | null;
  start: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  addFixes: (fixes: Fix[]) => void;
  /** Reset to idle and delete the persisted snapshot. */
  clear: () => Promise<void>;
  /** Load an unsaved run left behind by a killed app. Returns it if found. */
  restore: () => Promise<TrackState | null>;
}

function persist(run: TrackState, force: boolean) {
  const now = Date.now();
  if (!force && now - lastPersist < PERSIST_INTERVAL_MS) return;
  lastPersist = now;
  kvSet(ACTIVE_KEY, JSON.stringify(run)).catch(() => {});
}

export const useRunStore = create<RunStore>((set, get) => ({
  run: createRun(),
  lastFixAt: null,
  lastAccuracy: null,
  lastPosition: null,

  start: () => {
    const run = startRun(Date.now());
    set({ run, lastFixAt: null, lastAccuracy: null, lastPosition: null });
    persist(run, true);
  },
  pause: () => {
    const run = pauseRun(get().run, Date.now());
    set({ run });
    persist(run, true);
  },
  resume: () => {
    const run = resumeRun(get().run, Date.now());
    set({ run });
    persist(run, true);
  },
  stop: () => {
    const run = stopRun(get().run, Date.now());
    set({ run });
    persist(run, true);
  },
  addFixes: (fixes) => {
    if (!fixes.length) return;
    let run = get().run;
    const sorted = [...fixes].sort((a, b) => a.timestamp - b.timestamp);
    for (const f of sorted) run = applyFix(run, f);
    const newest = sorted[sorted.length - 1];
    set({
      run,
      lastFixAt: Date.now(),
      lastAccuracy: newest.accuracy,
      lastPosition: { lat: newest.lat, lng: newest.lng, timestamp: newest.timestamp },
    });
    persist(run, false);
  },
  clear: async () => {
    set({ run: createRun(), lastFixAt: null, lastAccuracy: null, lastPosition: null });
    lastPersist = 0;
    await kvDelete(ACTIVE_KEY);
  },
  restore: async () => {
    if (get().run.status !== 'idle') return null;
    const raw = await kvGet(ACTIVE_KEY);
    if (!raw) return null;
    try {
      const snapshot = JSON.parse(raw) as TrackState;
      if (snapshot.status === 'idle') return null;
      const run = recoverRun(snapshot);
      set({ run, lastFixAt: null, lastAccuracy: null, lastPosition: null });
      persist(run, true);
      return run;
    } catch {
      await kvDelete(ACTIVE_KEY);
      return null;
    }
  },
}));

