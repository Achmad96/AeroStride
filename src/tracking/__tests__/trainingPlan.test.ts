import { generateTrainingPlan, getTodaysWorkout } from '../trainingPlan';

describe('Training Plan Generation', () => {
  it('generates a training plan for distance goal with immediate start date', () => {
    const today = new Date();
    const plan = generateTrainingPlan(
      'distance',
      6.0,
      5.0,
      3.0,
      10.0,
      70,
      30,
      'male',
      today.toISOString()
    );

    expect(plan.totalDays).toBeGreaterThan(0);
    expect(plan.workouts.length).toBe(plan.totalDays);

    const firstWorkout = plan.workouts[0];
    expect(firstWorkout.dayNumber).toBe(1);
    expect(firstWorkout.dateStr).toBeDefined();

    const firstDate = new Date(firstWorkout.dateStr!);
    expect(firstDate.getFullYear()).toBe(today.getFullYear());
    expect(firstDate.getMonth()).toBe(today.getMonth());
    expect(firstDate.getDate()).toBe(today.getDate());

    const todaysWorkout = getTodaysWorkout(plan, today);
    expect(todaysWorkout).not.toBeNull();
    expect(todaysWorkout?.dayNumber).toBe(1);
  });

  it('generates plans for speed goal', () => {
    const today = new Date();
    const plan = generateTrainingPlan(
      'speed',
      6.5,
      5.0,
      5.0,
      5.0,
      70,
      28,
      'female',
      today.toISOString()
    );

    expect(plan.totalDays).toBeGreaterThan(0);
    const intervals = plan.workouts.filter((w) => w.type === 'interval');
    expect(intervals.length).toBeGreaterThan(0);
  });

  it('generates plans for fitness goal', () => {
    const today = new Date();
    const plan = generateTrainingPlan(
      'fitness',
      6.0,
      0,
      3.0,
      0,
      65,
      25,
      'other',
      today.toISOString()
    );

    expect(plan.totalDays).toBe(56); // 8 weeks * 7 days
    const todaysWorkout = getTodaysWorkout(plan, today);
    expect(todaysWorkout).not.toBeNull();
  });

  it('generates plans for weight_loss goal', () => {
    const today = new Date();
    const plan = generateTrainingPlan(
      'weight_loss',
      7.0,
      0,
      2.0,
      0,
      85,
      35,
      'male',
      today.toISOString()
    );

    expect(plan.totalDays).toBe(56); // 8 weeks * 7 days
    const longs = plan.workouts.filter((w) => w.type === 'long');
    expect(longs.length).toBeGreaterThan(0);
  });

  it('handles edge cases gracefully with zero current stats', () => {
    const today = new Date();
    const plan = generateTrainingPlan(
      'distance',
      0,
      0,
      0,
      0,
      0,
      0,
      null,
      today.toISOString()
    );

    expect(plan.totalDays).toBeGreaterThan(0);
    expect(plan.workouts.length).toBe(plan.totalDays);
    expect(plan.workouts.some((w) => isNaN(w.distanceKm || 0))).toBe(false);
  });

  it('returns null for getTodaysWorkout when goal is null or plan empty', () => {
    const plan = generateTrainingPlan(null, 0, 0, 0, 0, 70, 25, null);
    expect(plan.totalDays).toBe(0);
    expect(getTodaysWorkout(plan)).toBeNull();
  });
});
