import { AppState, PermissionsAndroid, Platform, type AppStateStatus, type NativeEventSubscription } from 'react-native';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { useRunStore } from '../store/runStore';
import type { Fix } from '../types';

export const LOCATION_TASK = 'run-tracker-location';

const isExpoGo =
  Constants.appOwnership === 'expo' ||
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

function toFix(l: Location.LocationObject | null | undefined): Fix | null {
  const c = l?.coords;
  if (!c || !Number.isFinite(c.latitude) || !Number.isFinite(c.longitude)) return null;
  return {
    lat: c.latitude,
    lng: c.longitude,
    timestamp: l!.timestamp || Date.now(),
    accuracy: c.accuracy ?? null,
  };
}

function pushFixes(fixes: (Fix | null)[]) {
  try {
    const valid = fixes.filter((f): f is Fix => f !== null);
    if (valid.length > 0) useRunStore.getState().addFixes(valid);
  } catch (err) {
    // Never let a bad fix bubble up into a native callback (would kill a release build).
    console.warn('Failed to apply location fix:', err);
  }
}

/**
 * Must be evaluated at app start (imported from the root layout) so the task is
 * registered even when the OS relaunches the JS runtime in the background.
 */
try {
  if (!TaskManager.isTaskDefined(LOCATION_TASK)) {
    TaskManager.defineTask(LOCATION_TASK, async ({ data, error }) => {
      if (error || !data) return;
      const { locations } = (data as { locations?: Location.LocationObject[] }) || {};
      if (!Array.isArray(locations) || locations.length === 0) return;
      pushFixes(locations.map(toFix));
    });
  }
} catch (e) {
  console.warn('Failed to define TaskManager task:', e);
}

let watchSubscription: Location.LocationSubscription | null = null;
let appStateSub: NativeEventSubscription | null = null;
let isTracking = false;

/** Ask for location permission. Background permission is best-effort. */
export async function ensureLocationPermission(): Promise<boolean> {
  try {
    const fg = await Location.requestForegroundPermissionsAsync();
    if (!fg.granted) return false;

    // Android 13+: allow the "Run in progress" foreground-service notification.
    if (Platform.OS === 'android' && Number(Platform.Version) >= 33) {
      try {
        await PermissionsAndroid.request('android.permission.POST_NOTIFICATIONS' as any);
      } catch {}
    }

    // Background permission is only requested in standalone / dev builds (never in Expo Go).
    // Only ask once: on Android 11+ this opens the system Settings page, which sends the app
    // to the background.
    if (!isExpoGo) {
      try {
        const bg = await Location.getBackgroundPermissionsAsync();
        if (!bg.granted && bg.canAskAgain) {
          await Location.requestBackgroundPermissionsAsync();
        }
      } catch {
        // Foreground tracking still works without it.
      }
    }
    return true;
  } catch (err) {
    console.warn('Permission request error:', err);
    return false;
  }
}

/**
 * Start the background location foreground service. Android 12+ throws a *native*
 * exception (uncatchable from JS, crashes the app) if a location foreground service
 * is started while the app is not in the foreground, so we wait until it is active.
 */
async function startBackgroundUpdates(): Promise<void> {
  if (isExpoGo || !isTracking) return;

  if (AppState.currentState !== 'active') {
    if (!appStateSub) {
      appStateSub = AppState.addEventListener('change', (state: AppStateStatus) => {
        if (state !== 'active') return;
        appStateSub?.remove();
        appStateSub = null;
        startBackgroundUpdates().catch(() => {});
      });
    }
    return;
  }

  try {
    const fg = await Location.getForegroundPermissionsAsync();
    if (!fg.granted) return;

    const alreadyStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK).catch(() => false);
    if (alreadyStarted || !isTracking) return;

    await Location.startLocationUpdatesAsync(LOCATION_TASK, {
      accuracy: Location.Accuracy.BestForNavigation,
      distanceInterval: 2,
      timeInterval: 2000,
      activityType: Location.ActivityType.Fitness,
      pausesUpdatesAutomatically: false,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: 'Run in progress',
        notificationBody: 'Run Tracker is recording your route.',
        notificationColor: '#0A7F3F',
        killServiceOnDestroy: false,
      },
    });
  } catch (err) {
    console.warn('startLocationUpdatesAsync failed (falling back to foreground tracking):', err);
  }
}

export async function startTracking(): Promise<void> {
  if (isTracking) return;
  isTracking = true;

  // 1. Foreground location watching (works in Expo Go, dev builds and standalone APKs).
  try {
    if (!watchSubscription) {
      watchSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          distanceInterval: 2,
          timeInterval: 1000,
        },
        (loc) => pushFixes([toFix(loc)])
      );
    }
  } catch (err) {
    console.warn('watchPositionAsync failed:', err);
  }

  // 2. Background service (standalone / dev builds only).
  await startBackgroundUpdates();

  // 3. Capture an initial position quickly if available.
  Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })
    .then((l) => pushFixes([toFix(l)]))
    .catch(() => {});
}

export async function stopTracking(): Promise<void> {
  isTracking = false;

  appStateSub?.remove();
  appStateSub = null;

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
