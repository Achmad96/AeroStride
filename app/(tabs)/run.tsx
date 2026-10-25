import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useRunStore } from '../../src/store/runStore';
import { useTheme } from '../../src/theme';

export default function RunRoute() {
  const router = useRouter();
  const t = useTheme();
  const status = useRunStore((s) => s.run.status);

  useEffect(() => {
    if (status === 'running' || status === 'paused') {
      router.replace('/active');
    } else if (status === 'stopped') {
      router.replace('/summary');
    } else {
      router.replace('/(tabs)');
    }
  }, [router, status]);

  return (
    <View style={{ flex: 1, backgroundColor: t.bg, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color={t.primary} />
    </View>
  );
}

