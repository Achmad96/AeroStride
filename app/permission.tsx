import { Linking, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '../src/components/Button';
import { ensureLocationPermission } from '../src/tracking/locationService';
import { useTheme } from '../src/theme';

export default function Permission() {
  const t = useTheme();
  const router = useRouter();
  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: t.text }]}>Location access is required</Text>
      <Text style={[styles.body, { color: t.subtext }]}>
        Run Tracker uses your phone's GPS to measure distance, pace and draw your route. Your data
        stays on this device.{'\n\n'}
        For accurate tracking with the screen locked, choose "Allow all the time" (Android) or
        "While Using" / "Always" (iOS) in Settings.
      </Text>
      <View style={styles.actions}>
        <Button title="Open Settings" onPress={() => Linking.openSettings()} />
        <Button
          variant="secondary"
          title="Try again"
          onPress={async () => {
            if (await ensureLocationPermission()) router.back();
          }}
        />
        <Button variant="secondary" title="Not now" onPress={() => router.back()} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', gap: 16 },
  title: { fontSize: 26, fontWeight: '800' },
  body: { fontSize: 17, lineHeight: 24 },
  actions: { gap: 12, marginTop: 12 },
});

