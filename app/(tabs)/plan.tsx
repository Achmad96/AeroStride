import { useState, useMemo, useCallback, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Modal, ActivityIndicator } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSettings } from '../../src/store/settingsStore';
import { useTheme } from '../../src/theme';
import { generateTrainingPlan, getTodaysWorkout, Workout } from '../../src/tracking/trainingPlan';
import { Button } from '../../src/components/Button';
import { useAirQuality } from '../../src/tracking/airQuality';
import { getCurrentPerformance } from '../../src/db/database';

export default function PlanTab() {
  const t = useTheme();
  const profile = useSettings((s) => s.profile);
  const { aqi, loading, error } = useAirQuality();

  const [currentPerf, setCurrentPerf] = useState<{ speedMinsPerKm: number; distanceKm: number } | null>(null);

  useFocusEffect(
    useCallback(() => {
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

  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);

  // Initialize and synchronize currentMonth whenever plan start date changes
  const initialDate = profile.planStartDate ? new Date(profile.planStartDate) : new Date();
  const [currentMonth, setCurrentMonth] = useState(new Date(initialDate.getFullYear(), initialDate.getMonth(), 1));

  useEffect(() => {
    const pDate = profile.planStartDate ? new Date(profile.planStartDate) : new Date();
    setCurrentMonth(new Date(pDate.getFullYear(), pDate.getMonth(), 1));
  }, [profile.planStartDate]);

  const todaysWorkout = useMemo(() => getTodaysWorkout(plan), [plan]);

  const planByDate = useMemo(() => {
    const map = new Map<string, Workout>();
    plan.workouts.forEach((w) => {
      const d = new Date(w.dateStr!);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      map.set(key, w);
    });
    return map;
  }, [plan]);

  if (!profile.goal || plan.totalDays === 0) {
    return (
      <View style={[styles.center, { backgroundColor: t.bg }]}>
        <Text style={[styles.emptyText, { color: t.subtext }]}>
          No active training plan. Go to Settings and set up your Profile first.
        </Text>
      </View>
    );
  }

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };
  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const weekdays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  
  // Calculate days in month and padding
  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  const startOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1; // Monday = 0

  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) {
    calendarDays.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push(i);
  }
  // Pad the end to complete the last row
  while (calendarDays.length % 7 !== 0) {
    calendarDays.push(null);
  }

  // Group into rows of 7
  const rows: (number | null)[][] = [];
  for (let i = 0; i < calendarDays.length; i += 7) {
    rows.push(calendarDays.slice(i, i + 7));
  }

  return (
    <View style={[styles.container, { backgroundColor: t.bg }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.header, { color: t.text }]}>Training Calendar</Text>
        <Text style={[styles.subHeader, { color: t.subtext }]}>
          {plan.totalDays} days to reach your goal
        </Text>

        {todaysWorkout && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setSelectedWorkout(todaysWorkout)}
            style={[styles.todayCard, { backgroundColor: t.card, borderColor: t.primary }]}
          >
            <View style={styles.todayHeaderRow}>
              <View style={[styles.todayBadge, { backgroundColor: t.primary }]}>
                <Text style={[styles.todayBadgeText, { color: t.onPrimary }]}>TODAY'S TARGET</Text>
              </View>
              <Text style={[styles.todayType, { color: t.primary }]}>
                {todaysWorkout.type.toUpperCase()}
              </Text>
            </View>
            <Text style={[styles.todayDesc, { color: t.text }]}>{todaysWorkout.desc}</Text>
          </TouchableOpacity>
        )}

        <View style={[styles.aqiContainer, { backgroundColor: t.card, borderColor: t.border }]}>
          <Text style={[styles.aqiTitle, { color: t.text }]}>Today's Running Recommendation</Text>
          {loading && <ActivityIndicator size="small" color={t.primary} style={{ marginTop: 8 }} />}
          {error && <Text style={[styles.aqiText, { color: t.subtext }]}>{error}</Text>}
          {!loading && !error && !aqi && <Text style={[styles.aqiText, { color: t.subtext }]}>Set EXPO_PUBLIC_IQAIR_API_KEY in .env file</Text>}
          {!loading && !error && aqi && (
            <>
              <Text style={[styles.aqiLevel, { color: t.primary }]}>
                AQI {aqi.aqi} - {aqi.level}
              </Text>
              <Text style={[styles.aqiText, { color: t.text }]}>{aqi.recommendation}</Text>
            </>
          )}
        </View>

        <View style={[styles.monthHeader, { backgroundColor: t.card, borderColor: t.border }]}>
          <TouchableOpacity onPress={prevMonth} style={styles.navButton}>
            <Ionicons name="chevron-back" size={24} color={t.text} />
          </TouchableOpacity>
          <Text style={[styles.monthText, { color: t.text }]}>
            {currentMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
          </Text>
          <TouchableOpacity onPress={nextMonth} style={styles.navButton}>
            <Ionicons name="chevron-forward" size={24} color={t.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.weekdayHeader}>
          {weekdays.map((day, idx) => (
            <Text key={idx} style={[styles.weekdayText, { color: t.subtext }]}>
              {day}
            </Text>
          ))}
        </View>

        <View style={styles.grid}>
          {rows.map((row, rIdx) => (
            <View key={`row-${rIdx}`} style={styles.calendarRow}>
              {row.map((dayNum, cIdx) => {
                if (dayNum === null) {
                  return <View key={`empty-${rIdx}-${cIdx}`} style={[styles.dayBox, { borderWidth: 0 }]} />;
                }
                const key = `${currentMonth.getFullYear()}-${currentMonth.getMonth()}-${dayNum}`;
                const workout = planByDate.get(key);
                const isRest = workout ? workout.type === 'rest' : true;
                const hasWorkout = !!workout;

                const today = new Date();
                const isToday =
                  today.getFullYear() === currentMonth.getFullYear() &&
                  today.getMonth() === currentMonth.getMonth() &&
                  today.getDate() === dayNum;

                return (
                  <TouchableOpacity
                    key={`day-${dayNum}`}
                    disabled={!hasWorkout}
                    style={[
                      styles.dayBox,
                      {
                        backgroundColor: hasWorkout
                          ? (isRest ? t.card : t.primary)
                          : 'transparent',
                        borderColor: isToday
                          ? (hasWorkout && !isRest ? '#fff' : t.primary)
                          : (hasWorkout ? t.border : 'transparent'),
                        borderWidth: isToday ? 2.5 : 1,
                        opacity: hasWorkout ? 1 : 0.4,
                      },
                    ]}
                    onPress={() => hasWorkout && setSelectedWorkout(workout)}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        { color: hasWorkout && !isRest ? '#fff' : (isToday ? t.primary : t.text) },
                      ]}
                    >
                      {dayNum}
                    </Text>
                    {hasWorkout && !isRest && (
                      <View style={styles.runDot} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>

        <View style={styles.agendaContainer}>
          <Text style={[styles.agendaHeader, { color: t.text }]}>This Month's Menu</Text>
          {calendarDays.map((dayNum) => {
            if (dayNum === null) return null;
            const key = `${currentMonth.getFullYear()}-${currentMonth.getMonth()}-${dayNum}`;
            const workout = planByDate.get(key);
            if (!workout) return null;
            
            const isRest = workout.type === 'rest';
            if (isRest) return null; // Hide rest days from the list

            const dateStr = new Date(workout.dateStr!).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
            
            return (
              <View key={`agenda-${dayNum}`} style={[styles.agendaRow, { borderBottomColor: t.border }]}>
                <View style={styles.agendaDateWrap}>
                  <Text style={[styles.agendaDate, { color: t.text }]}>{dateStr}</Text>
                  <Text style={[styles.agendaType, { color: t.primary }]}>
                    {workout.type.toUpperCase()}
                  </Text>
                </View>
                <Text style={[styles.agendaDesc, { color: t.subtext }]}>{workout.desc}</Text>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Detail Modal */}
      <Modal
        visible={selectedWorkout !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedWorkout(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: t.bg }]}>
            {selectedWorkout && (
              <>
                <Text style={[styles.modalTitle, { color: t.text }]}>
                  {new Date(selectedWorkout.dateStr!).toLocaleDateString(undefined, {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </Text>
                <Text style={[styles.modalType, { color: t.primary }]}>
                  {selectedWorkout.type.toUpperCase()}
                </Text>
                <Text style={[styles.modalDesc, { color: t.subtext }]}>
                  {selectedWorkout.desc}
                </Text>
                <Button
                  title="Close"
                  onPress={() => setSelectedWorkout(null)}
                  style={{ marginTop: 24 }}
                />
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyText: { textAlign: 'center', fontSize: 16, lineHeight: 24 },
  scroll: { padding: 16 },
  header: { fontSize: 24, fontWeight: '800' },
  subHeader: { fontSize: 14, marginBottom: 16 },
  todayCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    marginBottom: 16,
    gap: 8,
  },
  todayHeaderRow: {
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
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
  },
  aqiContainer: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 24 },
  aqiTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  aqiLevel: { fontSize: 18, fontWeight: '800', marginBottom: 4 },
  aqiText: { fontSize: 14, lineHeight: 20 },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  navButton: { padding: 4 },
  monthText: { fontSize: 18, fontWeight: '700' },
  weekdayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  weekdayText: {
    width: 40,
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 14,
  },
  grid: { gap: 8 },
  calendarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  dayBox: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    fontSize: 14,
    fontWeight: '700',
  },
  runDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#fff',
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    minHeight: 250,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', marginBottom: 4 },
  modalType: { fontSize: 14, fontWeight: '700', letterSpacing: 1, marginBottom: 16 },
  modalDesc: { fontSize: 16, lineHeight: 24 },
  agendaContainer: { marginTop: 32 },
  agendaHeader: { fontSize: 20, fontWeight: '800', marginBottom: 16 },
  agendaRow: { paddingVertical: 12, borderBottomWidth: 1, flexDirection: 'row', gap: 16 },
  agendaDateWrap: { width: 90 },
  agendaDate: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  agendaType: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  agendaDesc: { flex: 1, fontSize: 14, lineHeight: 20 },
});

