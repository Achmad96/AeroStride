export interface Workout {
  dayNumber: number;
  dayOfWeek: string;
  dateStr?: string;
  desc: string;
  type: 'easy' | 'interval' | 'tempo' | 'long' | 'rest';
  distanceKm?: number;
  pace?: number;
}

export interface TrainingPlan {
  totalDays: number;
  workouts: Workout[];
}

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function generateTrainingPlan(
  goal: string | null,
  currSpeed: number, // in min/km
  targetSpeed: number,
  currDist: number, // in km
  targetDist: number,
  weightKg: number,
  age: number,
  gender: string | null,
  startDateStr?: string | null
): TrainingPlan {
  if (!goal) return { totalDays: 0, workouts: [] };

  // Calculate progression factor based on age, weight, gender
  // A younger, lighter male might progress slightly faster than an older, heavier individual.
  let progressionFactor = 1.0;
  
  if (age > 0) {
    if (age > 40) progressionFactor *= (1 - (age - 40) * 0.01); // 1% slower per year over 40
  }
  if (weightKg > 0) {
    if (weightKg > 80) progressionFactor *= (1 - (weightKg - 80) * 0.005);
  }
  if (gender === 'female') {
    progressionFactor *= 0.95;
  }
  
  // Ensure factor is reasonable
  progressionFactor = Math.max(0.5, Math.min(1.2, progressionFactor));

  const workouts: Workout[] = [];
  let dayCounter = 1;
  
  // Figure out the start day index (Monday = 0, Sunday = 6)
  const startDate = startDateStr ? new Date(startDateStr) : new Date();
  let currentDayIndex = startDate.getDay() === 0 ? 6 : startDate.getDay() - 1;

  if (goal === 'distance' && currDist > 0 && targetDist > currDist) {
    let maxRun = currDist;
    
    // Aggressiveness of distance increase (e.g. 10% base + adjusted)
    const weeklyIncreaseRate = 1.0 + (0.10 * progressionFactor);

    while (maxRun < targetDist && dayCounter <= 180) { // Max 6 months
      maxRun = Math.min(targetDist, maxRun * weeklyIncreaseRate);
      const shortRun = Math.max(1, maxRun * 0.4);
      const easyPace = currSpeed > 0 ? currSpeed * 1.2 : 0;

      for (let i = 0; i < 7; i++) {
        const dayOfWeek = DAYS_OF_WEEK[currentDayIndex % 7];
        
        let desc = 'Rest or cross-train';
        let type: Workout['type'] = 'rest';
        let distanceKm = 0;
        let pace = 0;

        if (dayOfWeek === 'Tuesday' || dayOfWeek === 'Thursday') {
          desc = `Easy run: ${shortRun.toFixed(1)} km`;
          type = 'easy';
          distanceKm = shortRun;
          pace = easyPace;
        } else if (dayOfWeek === 'Sunday') {
          desc = `Long run: ${maxRun.toFixed(1)} km`;
          type = 'long';
          distanceKm = maxRun;
          pace = easyPace;
        }

        const date = new Date(startDate);
        date.setDate(startDate.getDate() + dayCounter - 1);

        workouts.push({
          dayNumber: dayCounter,
          dayOfWeek,
          dateStr: date.toISOString(),
          desc: pace > 0 ? `${desc} @ ${pace.toFixed(2)} min/km` : desc,
          type,
          distanceKm,
          pace,
        });

        dayCounter++;
        currentDayIndex++;
      }
    }
  } else if (goal === 'speed' && currSpeed > 0 && targetSpeed > 0 && targetSpeed < currSpeed) {
    let pace = currSpeed;
    
    const weeklyPaceImprovement = 0.1 * progressionFactor;

    while (pace > targetSpeed && dayCounter <= 180) {
      pace -= weeklyPaceImprovement;
      if (pace < targetSpeed) pace = targetSpeed;

      for (let i = 0; i < 7; i++) {
        const dayOfWeek = DAYS_OF_WEEK[currentDayIndex % 7];
        
        let desc = 'Rest or cross-train';
        let type: Workout['type'] = 'rest';
        let distanceKm = 0;
        let targetPace = 0;

        if (dayOfWeek === 'Tuesday') {
          desc = `Intervals: 4x400m at ${pace.toFixed(2)} min/km pace`;
          type = 'interval';
          distanceKm = 1.6;
          targetPace = pace;
        } else if (dayOfWeek === 'Thursday') {
          desc = `Tempo run: 3km at ${(pace + 0.2).toFixed(2)} min/km`;
          type = 'tempo';
          distanceKm = 3;
          targetPace = pace + 0.2;
        } else if (dayOfWeek === 'Sunday') {
          desc = `Long easy run: 5km at ${(pace + 0.5).toFixed(2)} min/km`;
          type = 'long';
          distanceKm = 5;
          targetPace = pace + 0.5;
        }

        const date = new Date(startDate);
        date.setDate(startDate.getDate() + dayCounter - 1);

        workouts.push({
          dayNumber: dayCounter,
          dayOfWeek,
          dateStr: date.toISOString(),
          desc,
          type,
          distanceKm,
          pace: targetPace,
        });

        dayCounter++;
        currentDayIndex++;
      }
    }
  }

  return { totalDays: dayCounter - 1, workouts };
}
