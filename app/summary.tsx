import { useEffect } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../src/components/Button';
import { RunDetailView } from '../src/components/RunDetailView';
import { insertRun } from '../src/db/database';
import { useRunStore } from '../src/store/runStore';
import { useSettings } from '../src/store/settingsStore';
import { usePlanStore } from '../src/store/planStore';
import { getWorkoutDateKey } from '../src/tracking/trainingPlan';
import { canSave, MIN_SAVE_DISTANCE_M, toRunDraft } from '../src/tracking/tracker';
import { useTheme, fonts } from '../src/theme';

export default function Summary() {
  const t = useTheme();
  const router = useRouter();
  const unit = useSettings((s) => s.unit);
  const run = useRunStore((s) => s.run);

  useEffect(() => {
    if (run.status === 'idle') router.replace('/');
  }, [run.status, router]);

  if (run.status !== 'stopped') return null;
  const draft = toRunDraft(run);
  const saveable = canSave(draft.distanceM);

  const finish = async () => {
    await useRunStore.getState().clear();
    router.replace('/');
  };

  const onSave = async () => {
    try {
      const runId = await insertRun(draft);
      const todayKey = getWorkoutDateKey(new Date(draft.startTime));
      await usePlanStore.getState().markDateCompleted(todayKey, runId, false);
      await finish();
    } catch (e) {
      Alert.alert('Could not save run', String(e instanceof Error ? e.message : e));
    }
  };

  const onDiscard = () =>
    Alert.alert('Discard run?', 'This run will be permanently deleted.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: finish },
    ]);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <RunDetailView run={draft} unit={unit} />
      {!saveable && (
        <Text style={[styles.warn, { color: t.danger }]}>
          Runs under {MIN_SAVE_DISTANCE_M} m can't be saved.
        </Text>
      )}
      <View style={styles.row}>
        <Button title="Discard" variant="secondary" onPress={onDiscard} style={styles.flex} />
        <Button title="Save" onPress={onSave} disabled={!saveable} style={styles.flex} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  row: { flexDirection: 'row', gap: 12 },
  flex: { flex: 1 },
  warn: { textAlign: 'center', fontFamily: fonts.bold, fontSize: 15 },
});

