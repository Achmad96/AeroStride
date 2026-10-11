import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { useRunStore } from '../store/runStore';
import type { Fix } from '../types';

export const LOCATION_TASK = 'run-tracker-location';

/**
 * Must be evaluated at app start (imported from the root layout) so the task is
 * registered even when the OS relaunches the JS runtime in the background.
 */
TaskManager.defineTask(LOCATION_TASK, async ({ data, error }) => {
  if (error || !data) return;
  const { locations } = data as { locations: Location.LocationObject[] };
  const fixes: Fix[] = locations.map((l) => ({
    lat: l.coords.latitude,
    lng: l.coords.longitude,
    timestamp: l.timestamp,
    accuracy: l.coords.accuracy,
  }));
  useRunStore.getState().addFixes(fixes);
});

/** Ask for location permission. Background permission is best-effort. */
export async function ensureLocationPermission(): Promise<boolean> {
  const fg = await Location.requestForegroundPermissionsAsync();
  if (!fg.granted) return false;
  try {
    await Location.requestBackgroundPermissionsAsync();
  } catch {
    // Tracking still works in the foreground (and via the foreground service).
  }
  return true;
}

export async function startTracking(): Promise<void> {
  if (await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK).catch(() => false)) return;

  await Location.startLocationUpdatesAsync(LOCATION_TASK, {
    accuracy: Location.Accuracy.BestForNavigation,
    distanceInterval: 1,
    timeInterval: 2000,
    activityType: Location.ActivityType.Fitness,
    pausesUpdatesAutomatically: false,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: 'Run in progress',
      notificationBody: 'Run Tracker is recording your route.',
      notificationColor: '#0A7F3F',
    },
  });

  // Show the user's position right away instead of waiting for them to move.
  // Not awaited: a slow GPS lock must never block starting the run.
  Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })
    .then((l) =>
      useRunStore.getState().addFixes([
        {
          lat: l.coords.latitude,
          lng: l.coords.longitude,
          timestamp: l.timestamp,
          accuracy: l.coords.accuracy,
        },
      ])
    )
    .catch(() => {});
}

export async function stopTracking(): Promise<void> {
  if (await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK).catch(() => false)) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK);
  }
}
