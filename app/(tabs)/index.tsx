import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AnalyticsView } from '../../src/components/AnalyticsView';
import { WeeklyStreakCard } from '../../src/components/WeeklyStreakCard';
import { getCurrentPerformance, listRuns } from '../../src/db/database';
import { useRunStore } from '../../src/store/runStore';
import { useSettings } from '../../src/store/settingsStore';
import { distanceLabel, formatDistance } from '../../src/tracking/geo';
import { stopTracking } from '../../src/tracking/locationService';
import { generateTrainingPlan, getTodaysWorkout, getWorkoutDateKey } from '../../src/tracking/trainingPlan';
import { calculateWeeklyStreak } from '../../src/tracking/streak';
import { getReminderSettings, scheduleDailyRunReminder } from '../../src/tracking/notificationService';
import { usePlanStore } from '../../src/store/planStore';
import { useTheme, fonts } from '../../src/theme';
import type { RunListItem } from '../../src/types';

export default function Home() {
  const t = useTheme();
  const router = useRouter();
  const unit = useSettings((s) => s.unit);
  const profile = useSettings((s) => s.profile);
  const status = useRunStore((s) => s.run.status);
  const [currentPerf, setCurrentPerf] = useState<{ speedMinsPerKm: number; distanceKm: number } | null>(null);
  const [runs, setRuns] = useState<RunListItem[]>([]);
  const checkedRecovery = useRef(false);

  const completedWorkouts = usePlanStore((s) => s.completedWorkouts);

  useFocusEffect(
    useCallback(() => {
      usePlanStore.getState().load();
      getCurrentPerformance().then(setCurrentPerf).catch(() => {});
      listRuns().then(setRuns).catch(() => {});
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

  const isTodayCompleted = todaysWorkout?.dateStr
    ? !!completedWorkouts[getWorkoutDateKey(todaysWorkout.dateStr)]
    : false;

  const streak = useMemo(
    () => calculateWeeklyStreak(runs, completedWorkouts),
    [runs, completedWorkouts]
  );

  // Automatically schedule reminder if configured
  useEffect(() => {
    getReminderSettings().then((settings) => {
      if (settings.enabled) {
        scheduleDailyRunReminder(settings, todaysWorkout?.desc).catch(() => {});
      }
    });
  }, [todaysWorkout?.desc]);

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

  const inProgress = status === 'running' || status === 'paused';
  const finished = status === 'stopped';

  const headerComponent = (
    <View style={styles.headerWrapper}>
      {/* Active or Unsaved Run Banner */}
      {(inProgress || finished) && (
        <View
          style={[
            styles.bannerCard,
            {
              backgroundColor: inProgress ? (status === 'paused' ? '#FEF3C7' : '#D1FAE5') : '#DBEAFE',
              borderColor: inProgress ? (status === 'paused' ? '#F59E0B' : '#10B981') : '#3B82F6',
            },
          ]}
        >
          <View style={styles.bannerContent}>
            <Ionicons
              name={inProgress ? (status === 'paused' ? 'pause-circle' : 'pulse') : 'checkmark-circle'}
              size={24}
              color={inProgress ? (status === 'paused' ? '#D97706' : '#059669') : '#2563EB'}
            />
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.bannerTitle,
                  { color: inProgress ? (status === 'paused' ? '#92400E' : '#065F46') : '#1E40AF' },
                ]}
              >
                {inProgress
                  ? status === 'paused'
                    ? 'Run is Paused'
                    : 'Run In Progress'
                  : 'Unsaved Run Ready for Review'}
              </Text>
              <Text
                style={[
                  styles.bannerSub,
                  { color: inProgress ? (status === 'paused' ? '#B45309' : '#047857') : '#1D4ED8' },
                ]}
              >
                {inProgress ? 'Tap the bottom navbar button or Resume here.' : 'Tap Review to save or discard below.'}
              </Text>
            </View>
          </View>

          <View style={styles.bannerActions}>
            <Pressable
              onPress={() => router.push(finished ? '/summary' : '/active')}
              style={[
                styles.actionBtn,
                { backgroundColor: inProgress ? (status === 'paused' ? '#D97706' : '#059669') : '#2563EB' },
              ]}
            >
              <Text style={styles.actionBtnText}>{finished ? 'Review' : 'Resume'}</Text>
            </Pressable>
            <Pressable
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
              style={[styles.actionBtnSecondary, { borderColor: t.border }]}
            >
              <Text style={[styles.actionBtnSecondaryText, { color: t.danger }]}>Discard</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Weekly Streak Card */}
      <WeeklyStreakCard streak={streak} />

      {/* Today's Target Card */}
      {todaysWorkout && (
        <View
          style={[
            styles.todayCard,
            {
              backgroundColor: t.card,
              borderColor: isTodayCompleted ? '#10B981' : t.primary,
              borderWidth: 1.5,
            },
          ]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Today's Target, tap to view full plan"
            onPress={() => router.push('/(tabs)/plan')}
          >
            <View style={styles.todayHeader}>
              <View
                style={[
                  styles.todayBadge,
                  { backgroundColor: isTodayCompleted ? '#10B981' : t.primary },
                ]}
              >
                <Text style={[styles.todayBadgeText, { color: '#fff' }]}>
                  {isTodayCompleted ? 'COMPLETED ✓' : "TODAY'S TARGET"}
                </Text>
              </View>
              <Text
                style={[
                  styles.todayType,
                  { color: isTodayCompleted ? '#10B981' : t.primary },
                ]}
              >
                {todaysWorkout.type.toUpperCase()}
              </Text>
            </View>
            <Text style={[styles.todayDesc, { color: t.text }]}>{todaysWorkout.desc}</Text>
            <View style={styles.todayFooter}>
              <Text style={[styles.todayLinkText, { color: isTodayCompleted ? '#10B981' : t.primary }]}>
                {isTodayCompleted ? 'Quest accomplished! View plan →' : 'View training plan →'}
              </Text>
            </View>
          </Pressable>
        </View>
      )}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: t.bg }]}>
      <AnalyticsView
        runs={runs}
        unit={unit}
        headerComponent={headerComponent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerWrapper: {
    gap: 14,
    marginBottom: 4,
  },
  bannerCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 14,
    gap: 12,
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bannerTitle: {
    fontSize: 14,
    fontFamily: fonts.extraBold,
    letterSpacing: 0.3,
  },
  bannerSub: {
    fontSize: 12,
    fontFamily: fonts.medium,
    marginTop: 2,
  },
  bannerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actionBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 13,
    fontFamily: fonts.extraBold,
  },
  actionBtnSecondary: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnSecondaryText: {
    fontSize: 13,
    fontFamily: fonts.bold,
  },
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
    fontFamily: fonts.extraBold,
    letterSpacing: 0.5,
  },
  todayType: {
    fontSize: 13,
    fontFamily: fonts.extraBold,
    letterSpacing: 1,
  },
  todayDesc: {
    fontSize: 15,
    fontFamily: fonts.semiBold,
    lineHeight: 20,
  },
  todayFooter: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  todayLinkText: {
    fontSize: 12,
    fontFamily: fonts.bold,
  },
});
