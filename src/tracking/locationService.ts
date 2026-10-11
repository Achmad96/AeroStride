import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { useRunStore } from '../store/runStore';
import type { Fix } from '../types';

export const LOCATION_TASK = 'run-tracker-location';

const isExpoGo =
  Constants.appOwnership === 'expo' ||
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

/**
 * Must be evaluated at app start (imported from the root layout) so the task is
 * registered even when the OS relaunches the JS runtime in the background.
 */
try {
  if (!TaskManager.isTaskDefined(LOCATION_TASK)) {
    TaskManager.defineTask(LOCATION_TASK, async ({ data, error }) => {
      try {
        if (error || !data) return;
        const { locations } = (data as { locations?: Location.LocationObject[] }) || {};
        if (!locations || !Array.isArray(locations) || locations.length === 0) return;
        const fixes: Fix[] = locations
          .filter((l) => l?.coords && typeof l.coords.latitude === 'number' && typeof l.coords.longitude === 'number')
          .map((l) => ({
            lat: l.coords.latitude,
            lng: l.coords.longitude,
            timestamp: l.timestamp || Date.now(),
            accuracy: l.coords.accuracy ?? null,
          }));
        if (fixes.length > 0) {
          useRunStore.getState().addFixes(fixes);
        }
      } catch (err) {
        console.warn('Error processing background location task:', err);
      }
    });
  }
} catch (e) {
  console.warn('Failed to define TaskManager task:', e);
}

let watchSubscription: Location.LocationSubscription | null = null;
let isTracking = false;

/** Ask for location permission. Background permission is best-effort. */
export async function ensureLocationPermission(): Promise<boolean> {
  try {
    const fg = await Location.requestForegroundPermissionsAsync();
    if (!fg.granted) return false;

    // Background permission is only requested in standalone / dev builds (never in Expo Go)
    if (!isExpoGo) {
      try {
        await Location.requestBackgroundPermissionsAsync();
      } catch {
        // Foreground tracking and foreground services will still function
      }
    }
    return true;
  } catch (err) {
    console.warn('Permission request error:', err);
    return false;
  }
}

export async function startTracking(): Promise<void> {
  if (isTracking) return;
  isTracking = true;

  // 1. Always start foreground location watching (works reliably in Expo Go, dev builds, and standalone APKs)
  try {
    if (!watchSubscription) {
      watchSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          distanceInterval: 1,
          timeInterval: 1000,
        },
        (loc) => {
          if (!loc?.coords) return;
          useRunStore.getState().addFixes([
            {
              lat: loc.coords.latitude,
              lng: loc.coords.longitude,
              timestamp: loc.timestamp || Date.now(),
              accuracy: loc.coords.accuracy ?? null,
            },
          ]);
        }
      );
    }
  } catch (err) {
    console.warn('watchPositionAsync failed:', err);
  }

  // 2. Start background service ONLY in standalone / dev builds (Expo Go does not support background location)
  if (!isExpoGo) {
    try {
      const alreadyStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK).catch(() => false);
      if (!alreadyStarted) {
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
      }
    } catch (err) {
      console.warn('startLocationUpdatesAsync failed (falling back to foreground tracking):', err);
    }
  }

  // 3. Immediately capture initial position if available
  try {
    Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })
      .then((l) => {
        if (l?.coords) {
          useRunStore.getState().addFixes([
            {
              lat: l.coords.latitude,
              lng: l.coords.longitude,
              timestamp: l.timestamp || Date.now(),
              accuracy: l.coords.accuracy ?? null,
            },
          ]);
        }
      })
      .catch(() => {});
  } catch {}
}

export async function stopTracking(): Promise<void> {
  isTracking = false;

  if (watchSubscription) {
    try {
      watchSubscription.remove();
    } catch {}
    watchSubscription = null;
  }

  if (!isExpoGo) {
    try {
      const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK).catch(() => false);
      if (hasStarted) {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK);
      }
    } catch (err) {
      console.warn('stopLocationUpdatesAsync failed:', err);
    }
  }
}
