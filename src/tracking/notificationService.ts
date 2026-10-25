import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { kvGet, kvSet } from '../db/database';

export const REMINDER_SETTINGS_KEY = 'run_reminder_settings';

export interface ReminderSettings {
  enabled: boolean;
  hour: number;
  minute: number;
}

export const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
  enabled: true,
  hour: 8,
  minute: 0,
};

// Configure foreground notification presentation
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
} catch {}

export async function setupAndroidChannel(): Promise<void> {
  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync('run-reminders', {
        name: 'Run Reminders',
        description: 'Daily reminders to complete your training workout',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#0A7F3F',
      });
    } catch (e) {
      console.warn('Could not set notification channel:', e);
    }
  }
}

export async function getReminderSettings(): Promise<ReminderSettings> {
  try {
    const raw = await kvGet(REMINDER_SETTINGS_KEY);
    if (raw) return { ...DEFAULT_REMINDER_SETTINGS, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_REMINDER_SETTINGS;
}

export async function saveReminderSettings(settings: ReminderSettings): Promise<void> {
  await kvSet(REMINDER_SETTINGS_KEY, JSON.stringify(settings));
}

export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    return finalStatus === 'granted';
  } catch {
    return false;
  }
}

export async function scheduleDailyRunReminder(
  settings: ReminderSettings,
  targetDesc?: string
): Promise<boolean> {
  try {
    await setupAndroidChannel();

    // Cancel previously scheduled reminders
    await Notifications.cancelAllScheduledNotificationsAsync().catch(() => {});

    if (!settings.enabled) {
      return true;
    }

    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) return false;

    const bodyText = targetDesc
      ? `Today's target: ${targetDesc}. Complete your run to keep your weekly streak alive! 🔥`
      : 'Ready for today’s run? Lace up and keep your weekly streak going! 🏃🔥';

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Time for Your Daily Run! 🏃',
        body: bodyText,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        data: { screen: '/(tabs)' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: settings.hour,
        minute: settings.minute,
        channelId: 'run-reminders',
      },
    });

    return true;
  } catch (err) {
    console.warn('Failed to schedule daily run reminder:', err);
    return false;
  }
}

export async function sendInstantTestReminder(): Promise<boolean> {
  try {
    await setupAndroidChannel();
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) return false;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Run Tracker Reminder 🏃🔥',
        body: 'Keep your weekly streak going! You have a run scheduled today.',
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: null,
    });
    return true;
  } catch (err) {
    console.warn('Failed to send test reminder:', err);
    return false;
  }
}
