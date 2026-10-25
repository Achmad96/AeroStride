import '../src/tracking/locationService'; // registers the background task
import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  useFonts,
  Montserrat_400Regular,
  Montserrat_500Medium,
  Montserrat_600SemiBold,
  Montserrat_700Bold,
  Montserrat_800ExtraBold,
} from '@expo-google-fonts/montserrat';
import { useSettings } from '../src/store/settingsStore';
import { usePlanStore } from '../src/store/planStore';
import { useTheme, fonts } from '../src/theme';

export default function RootLayout() {
  const t = useTheme();
  const [fontsLoaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_500Medium,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
    Montserrat_800ExtraBold,
  });

  const loadSettings = useSettings((s) => s.load);
  const loadPlan = usePlanStore((s) => s.load);
  useEffect(() => {
    loadSettings();
    loadPlan();
  }, [loadSettings, loadPlan]);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: t.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={t.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style={t.scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: t.bg },
          headerTintColor: t.text,
          headerTitleStyle: {
            fontFamily: fonts.bold,
          },
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
