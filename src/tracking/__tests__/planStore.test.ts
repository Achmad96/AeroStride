import { usePlanStore } from '../../store/planStore';
import { getWorkoutDateKey, type Workout } from '../trainingPlan';
import { listRuns } from '../../db/database';

describe('planStore - Workout Completion', () => {
  beforeEach(async () => {
    usePlanStore.setState({ completedWorkouts: {}, loaded: true });
  });

  it('completes a run workout and inserts a run into database', async () => {
    const workout: Workout = {
      dayNumber: 1,
      dayOfWeek: 'Sunday',
      dateStr: new Date(2026, 9, 11).toISOString(),
      desc: 'Easy run: 3.0 km @ 6.00 min/km',
      type: 'easy',
      distanceKm: 3.0,
      pace: 6.0,
    };

    const dateKey = getWorkoutDateKey(workout.dateStr!);
    expect(usePlanStore.getState().isCompleted(dateKey)).toBe(false);

    await usePlanStore.getState().completeWorkout(workout);

    expect(usePlanStore.getState().isCompleted(dateKey)).toBe(true);
    const record = usePlanStore.getState().completedWorkouts[dateKey];
    expect(record).toBeDefined();
    expect(record.isManual).toBe(true);
    expect(record.runId).toBeDefined();

    // Verify run exists in DB
    const runs = await listRuns();
    const createdRun = runs.find((r) => r.id === record.runId);
    expect(createdRun).toBeDefined();
    expect(createdRun?.distanceM).toBe(3000);
  });

  it('uncompletes a workout and deletes manually inserted run', async () => {
    const workout: Workout = {
      dayNumber: 2,
      dayOfWeek: 'Monday',
      dateStr: new Date(2026, 9, 12).toISOString(),
      desc: 'Easy run: 2.0 km',
      type: 'easy',
      distanceKm: 2.0,
      pace: 6.0,
    };

    const dateKey = getWorkoutDateKey(workout.dateStr!);
    await usePlanStore.getState().completeWorkout(workout);
    const runId = usePlanStore.getState().completedWorkouts[dateKey]?.runId;
    expect(runId).toBeDefined();

    await usePlanStore.getState().uncompleteWorkout(workout);
    expect(usePlanStore.getState().isCompleted(dateKey)).toBe(false);

    const runs = await listRuns();
    expect(runs.some((r) => r.id === runId)).toBe(false);
  });

  it('marks date completed directly (e.g. from GPS tracker summary save)', async () => {
    const dateKey = '2026-9-15';
    await usePlanStore.getState().markDateCompleted(dateKey, 999, false);

    expect(usePlanStore.getState().isCompleted(dateKey)).toBe(true);
    const record = usePlanStore.getState().completedWorkouts[dateKey];
    expect(record.runId).toBe(999);
    expect(record.isManual).toBe(false);
  });

  it('automatically marks quest completed when a run is in the database', async () => {
    const startTime = Date.now();
    const dateKey = getWorkoutDateKey(new Date(startTime));

    // Reset store
    usePlanStore.setState({ completedWorkouts: {}, loaded: false });

    // Load store which syncs from runs
    await usePlanStore.getState().load();

    // Since runs from earlier tests exist in DB, verify dateKey is marked completed
    expect(usePlanStore.getState().isCompleted(dateKey)).toBe(true);
    expect(usePlanStore.getState().completedWorkouts[dateKey]?.isManual).toBe(false);
  });
});
