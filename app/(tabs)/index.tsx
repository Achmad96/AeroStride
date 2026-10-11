import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Stat } from '../../src/components/Stat';
import { Button } from '../../src/components/Button';
import { getCurrentPerformance, getStatsSince, type PeriodStats } from '../../src/db/database';
import { useRunStore } from '../../src/store/runStore';
import { useSettings } from '../../src/store/settingsStore';
import { distanceLabel, formatDistance, formatDuration, startOfWeek } from '../../src/tracking/geo';
import { ensureLocationPermission, startTracking, stopTracking } from '../../src/tracking/locationService';
import { generateTrainingPlan, getTodaysWorkout } from '../../src/tracking/trainingPlan';
import { useTheme } from '../../src/theme';

export default function Home() {
  const t = useTheme();
  const router = useRouter();
  const unit = useSettings((s) => s.unit);
  const profile = useSettings((s) => s.profile);
  const status = useRunStore((s) => s.run.status);
  const [stats, setStats] = useState<PeriodStats>({ runs: 0, distanceM: 0, durationSec: 0 });
  const [currentPerf, setCurrentPerf] = useState<{ speedMinsPerKm: number; distanceKm: number } | null>(null);
  const checkedRecovery = useRef(false);

  useFocusEffect(
    useCallback(() => {
      getStatsSince(startOfWeek()).then(setStats).catch(() => {});
      getCurrentPerformance().then(setCurrentPerf).catch(() => {});
    }, [])
  );

  const currentSpeed = currentPerf ? currentPerf.speedMinsPerKm : parseFloat(profile.currentSpeedMinsPerKm) || 0;
  const currentDistance = currentPerf ? currentPerf.distanceKm : parseFloat(profile.currentDistanceKm) || 0;

  const plan = useMemo(() => generateTrainingPlan(
    profile.goal,
    currentSpeed,
    parseFloat(profile.targetSpeedMinsPerKm) || 0,
    currentDistance,
    parseFloat(profile.targetDistanceKm) || 0,
    parseFloat(profile.weightKg) || 70,
    parseInt(profile.age, 10) || 25,
    profile.gender,
    profile.planStartDate
  ), [profile, currentSpeed, currentDistance]);

  const todaysWorkout = useMemo(() => getTodaysWorkout(plan), [plan]);

  // Recover an unsaved run if the app was killed mid-run.
  useEffect(() => {
    if (checkedRecovery.current) return;
    checkedRecovery.current = true;
    (async () => {
      const recovered = await useRunStore.getState().restore();
      if (!recovered) return;
      Alert.alert(
        'Unsaved run found',
        `Your last run (${formatDistance(recovered.distanceM, unit)} ${distanceLabel(unit)}) wasn't saved.`,
        [
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => useRunStore.getState().clear(),
          },
          {
            text: 'Recover',
            onPress: () => router.push(recovered.status === 'stopped' ? '/summary' : '/active'),
          },
        ],
        { cancelable: false }
      );
    })().catch(() => {});
  }, [router, unit]);

  const startRunFlow = async () => {
    try {
      if (!(await ensureLocationPermission())) {
        router.push('/permission');
        return;
      }
      useRunStore.getState().start();
      await startTracking();
      router.push('/active');
    } catch (e) {
      useRunStore.getState().clear();
      await stopTracking().catch(() => {});
      Alert.alert('Could not start run', String(e instanceof Error ? e.message : e));
    }
  };

  const inProgress = status === 'running' || status === 'paused';
  const finished = status === 'stopped';

  return (
    <View style={styles.container}>
      <View style={[styles.week, { backgroundColor: t.card }]}>
        <Text style={[styles.weekTitle, { color: t.subtext }]}>THIS WEEK</Text>
        <View style={styles.row}>
          <Stat label="Distance" value={formatDistance(stats.distanceM, unit)} unit={distanceLabel(unit)} style={styles.flat} />
          <Stat label="Time" value={formatDuration(stats.durationSec)} style={styles.flat} />
          <Stat label="Runs" value={String(stats.runs)} style={styles.flat} />
        </View>
      </View>

      {todaysWorkout && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Today's Target, tap to view full plan"
          onPress={() => router.push('/(tabs)/plan')}
          style={({ pressed }) => [
            styles.todayCard,
            { backgroundColor: t.card, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <View style={styles.todayHeader}>
            <View style={[styles.todayBadge, { backgroundColor: t.primary }]}>
              <Text style={[styles.todayBadgeText, { color: t.onPrimary }]}>TODAY'S TARGET</Text>
            </View>
            <Text style={[styles.todayType, { color: t.primary }]}>
              {todaysWorkout.type.toUpperCase()}
            </Text>
          </View>
          <Text style={[styles.todayDesc, { color: t.text }]}>{todaysWorkout.desc}</Text>
        </Pressable>
      )}

      <View style={styles.center}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={inProgress ? 'Continue run' : finished ? 'Review run' : 'Start run'}
          onPress={() =>
            inProgress ? router.push('/active') : finished ? router.push('/summary') : startRunFlow()
          }
          style={({ pressed }) => [
            styles.startBtn,
            { backgroundColor: t.primary, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Text style={[styles.startText, { color: t.onPrimary }]}>
            {inProgress ? 'CONTINUE\nRUN' : finished ? 'REVIEW\nRUN' : 'START\nRUN'}
          </Text>
        </Pressable>
      </View>
      {!inProgress && !finished ? null : (
        <Button
          variant="secondary"
          title="Discard this run"
          onPress={() =>
            Alert.alert('Discard run?', 'This run will be deleted.', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Discard',
                style: 'destructive',
                onPress: async () => {
                  await stopTracking().catch(() => {});
                  await useRunStore.getState().clear();
                },
              },
            ])
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 16 },
  week: { borderRadius: 20, padding: 12, gap: 8 },
  weekTitle: { fontSize: 13, fontWeight: '700', letterSpacing: 1, textAlign: 'center' },
  row: { flexDirection: 'row', gap: 8 },
  flat: { backgroundColor: 'transparent', padding: 4 },
  todayCard: {
    borderRadius: 20,
    padding: 16,
    gap: 8,
  },
  todayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  todayBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  todayBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  todayType: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
  },
  todayDesc: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  startBtn: {
    width: 220,
    height: 220,
    borderRadius: 110,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
  },
  startText: { fontSize: 32, fontWeight: '900', textAlign: 'center', letterSpacing: 1 },
});

