import '../src/tracking/locationService'; // registers the background task
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSettings } from '../src/store/settingsStore';
import { useTheme } from '../src/theme';

export default function RootLayout() {
  const t = useTheme();
  const loadSettings = useSettings((s) => s.load);
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  return (
    <>
      <StatusBar style={t.scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: t.bg },
          headerTintColor: t.text,
          contentStyle: { backgroundColor: t.bg },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="active"
          options={{ title: 'Run', headerBackVisible: false, gestureEnabled: false }}
        />
        <Stack.Screen
          name="summary"
          options={{ title: 'Run summary', headerBackVisible: false, gestureEnabled: false }}
        />
        <Stack.Screen name="detail/[id]" options={{ title: 'Run' }} />
        <Stack.Screen name="permission" options={{ title: 'Location needed', presentation: 'modal' }} />
      </Stack>
    </>
  );
}

