import { create } from 'zustand';
import { kvGet, kvSet, insertRun, deleteRun } from '../db/database';
import { getWorkoutDateKey, type Workout } from '../tracking/trainingPlan';

export interface CompletedWorkoutRecord {
  completedAt: number;
  runId?: number;
  isManual?: boolean;
}

interface PlanStore {
  completedWorkouts: Record<string, CompletedWorkoutRecord>;
  loaded: boolean;
  load: () => Promise<void>;
  completeWorkout: (workout: Workout) => Promise<void>;
  uncompleteWorkout: (workout: Workout) => Promise<void>;
  markDateCompleted: (dateKey: string, runId?: number, isManual?: boolean) => Promise<void>;
  isCompleted: (dateKey: string) => boolean;
}

export const usePlanStore = create<PlanStore>((set, get) => ({
  completedWorkouts: {},
  loaded: false,
  load: async () => {
    try {
      const raw = await kvGet('completed_workouts');
      if (raw) {
        set({ completedWorkouts: JSON.parse(raw), loaded: true });
        return;
      }
    } catch {}
    set({ completedWorkouts: {}, loaded: true });
  },
  completeWorkout: async (workout: Workout) => {
    if (!workout.dateStr) return;
    const dateKey = getWorkoutDateKey(workout.dateStr);
    const date = new Date(workout.dateStr);
    const isToday = date.toDateString() === new Date().toDateString();
    const startTime = isToday ? Date.now() : date.getTime();
    const distanceM = (workout.distanceKm || 0) * 1000;
    const paceSec = (workout.pace || 0) * 60;
    const durationSec = distanceM > 0 && paceSec > 0
      ? Math.round((distanceM / 1000) * paceSec)
      : 1800;

    let runId: number | undefined;
    if (distanceM > 0) {
      try {
        runId = await insertRun({
          startTime,
          durationSec,
          distanceM,
          avgPaceSecPerKm: paceSec > 0 ? paceSec : 360,
          routePoints: [],
        });
      } catch (e) {
        console.error('Failed to insert completed run record', e);
      }
    }

    const next = {
      ...get().completedWorkouts,
      [dateKey]: {
        completedAt: Date.now(),
        runId,
        isManual: true,
      },
    };
    set({ completedWorkouts: next });
    await kvSet('completed_workouts', JSON.stringify(next)).catch(() => {});
  },
  uncompleteWorkout: async (workout: Workout) => {
    if (!workout.dateStr) return;
    const dateKey = getWorkoutDateKey(workout.dateStr);
    const current = get().completedWorkouts[dateKey];
    if (current?.runId && current.isManual) {
      try {
        await deleteRun(current.runId);
      } catch (e) {
        console.error('Failed to delete completed run record', e);
      }
    }
    const next = { ...get().completedWorkouts };
    delete next[dateKey];
    set({ completedWorkouts: next });
    await kvSet('completed_workouts', JSON.stringify(next)).catch(() => {});
  },
  markDateCompleted: async (dateKey: string, runId?: number, isManual = false) => {
    const next = {
      ...get().completedWorkouts,
      [dateKey]: {
        completedAt: Date.now(),
        runId,
        isManual,
      },
    };
    set({ completedWorkouts: next });
    await kvSet('completed_workouts', JSON.stringify(next)).catch(() => {});
  },
  isCompleted: (dateKey: string) => {
    return !!get().completedWorkouts[dateKey];
  },
}));
