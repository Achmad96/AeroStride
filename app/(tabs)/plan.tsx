import { useState, useMemo, useCallback, useEffect } from "react";
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Modal, ActivityIndicator, Alert } from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSettings } from "../../src/store/settingsStore";
import { usePlanStore } from "../../src/store/planStore";
import { useTheme, fonts } from "../../src/theme";
import { generateTrainingPlan, getTodaysWorkout, getWorkoutDateKey, Workout } from "../../src/tracking/trainingPlan";
import { Button } from "../../src/components/Button";
import { useAirQuality } from "../../src/tracking/airQuality";
import { getCurrentPerformance } from "../../src/db/database";

export default function PlanTab() {
  const t = useTheme();
  const profile = useSettings((s) => s.profile);
  const { aqi, loading, error } = useAirQuality();

  const [currentPerf, setCurrentPerf] = useState<{ speedMinsPerKm: number; distanceKm: number } | null>(null);
  const completedWorkouts = usePlanStore((s) => s.completedWorkouts);
  const completeWorkout = usePlanStore((s) => s.completeWorkout);
  const uncompleteWorkout = usePlanStore((s) => s.uncompleteWorkout);

  useFocusEffect(
    useCallback(() => {
      usePlanStore.getState().load();
      getCurrentPerformance()
        .then(setCurrentPerf)
        .catch(() => {});
    }, [])
  );

  const handleToggleComplete = async (workout: Workout) => {
    if (!workout.dateStr) return;
    const dateKey = getWorkoutDateKey(workout.dateStr);
    const todayKey = getWorkoutDateKey(new Date());

    if (dateKey !== todayKey) {
      Alert.alert("Cannot Complete Run", "You can only complete today's scheduled run.");
      return;
    }

    const isCompleted = !!completedWorkouts[dateKey];

    if (isCompleted) {
      Alert.alert("Mark as Incomplete?", "Do you want to unmark this run as completed?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Mark Incomplete",
          style: "destructive",
          onPress: async () => {
            await uncompleteWorkout(workout);
            getCurrentPerformance()
              .then(setCurrentPerf)
              .catch(() => {});
          }
        }
      ]);
    } else {
      await completeWorkout(workout);
      getCurrentPerformance()
        .then(setCurrentPerf)
        .catch(() => {});
      Alert.alert("Run Completed! 🎉", `Marked "${workout.desc}" as complete.`);
    }
  };

  const currentSpeed = currentPerf ? currentPerf.speedMinsPerKm : parseFloat(profile.currentSpeedMinsPerKm) || 0;
  const currentDistance = currentPerf ? currentPerf.distanceKm : parseFloat(profile.currentDistanceKm) || 0;

  const plan = useMemo(
    () => generateTrainingPlan(profile.goal, currentSpeed, parseFloat(profile.targetSpeedMinsPerKm) || 0, currentDistance, parseFloat(profile.targetDistanceKm) || 0, parseFloat(profile.weightKg) || 70, parseInt(profile.age, 10) || 25, profile.gender, profile.planStartDate),
    [profile, currentSpeed, currentDistance]
  );

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
      const key = getWorkoutDateKey(w.dateStr!);
      map.set(key, w);
    });
    return map;
  }, [plan]);

  if (!profile.goal || plan.totalDays === 0) {
    return (
      <View style={[styles.center, { backgroundColor: t.bg }]}>
        <Text style={[styles.emptyText, { color: t.subtext }]}>No active training plan. Go to Settings and set up your Profile first.</Text>
      </View>
    );
  }

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };
  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const weekdays = ["M", "T", "W", "T", "F", "S", "S"];

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
        <Text style={[styles.subHeader, { color: t.subtext }]}>{plan.totalDays} days to reach your goal</Text>

        {todaysWorkout &&
          (() => {
            const isTodayCompleted = todaysWorkout.dateStr ? !!completedWorkouts[getWorkoutDateKey(todaysWorkout.dateStr)] : false;
            return (
              <View
                style={[
                  styles.todayCard,
                  {
                    backgroundColor: t.card,
                    borderColor: isTodayCompleted ? "#10B981" : t.primary
                  }
                ]}>
                <TouchableOpacity activeOpacity={0.8} onPress={() => setSelectedWorkout(todaysWorkout)}>
                  <View style={styles.todayHeaderRow}>
                    <View style={[styles.todayBadge, { backgroundColor: isTodayCompleted ? "#10B981" : t.primary }]}>
                      <Text style={[styles.todayBadgeText, { color: "#fff" }]}>{isTodayCompleted ? "COMPLETED ✓" : "TODAY'S TARGET"}</Text>
                    </View>
                    <Text style={[styles.todayType, { color: isTodayCompleted ? "#10B981" : t.primary }]}>{todaysWorkout.type.toUpperCase()}</Text>
                  </View>
                  <Text style={[styles.todayDesc, { color: t.text }]}>{todaysWorkout.desc}</Text>
                </TouchableOpacity>
                {todaysWorkout.type !== "rest" && <Button title={isTodayCompleted ? "Completed ✓" : "Complete Run"} variant={isTodayCompleted ? "secondary" : "primary"} onPress={() => handleToggleComplete(todaysWorkout)} style={{ marginTop: 8 }} />}
              </View>
            );
          })()}

        <View style={[styles.aqiContainer, { backgroundColor: t.card, borderColor: t.border }]}>
          <Text style={[styles.aqiTitle, { color: t.text }]}>Today's Running Recommendation</Text>
          {loading && <ActivityIndicator size="small" color={t.primary} style={{ marginTop: 8 }} />}
          {error && <Text style={[styles.aqiText, { color: t.subtext }]}>{error}</Text>}
          {!loading && !error && !aqi && <Text style={[styles.aqiText, { color: t.subtext }]}>Set IQAIR_API_KEY in .env file</Text>}
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
          <Text style={[styles.monthText, { color: t.text }]}>{currentMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</Text>
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
                const key = getWorkoutDateKey(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), dayNum));
                const workout = planByDate.get(key);
                const isRest = workout ? workout.type === "rest" : true;
                const hasWorkout = !!workout;
                const isCompleted = !!completedWorkouts[key];

                const today = new Date();
                const isToday = today.getFullYear() === currentMonth.getFullYear() && today.getMonth() === currentMonth.getMonth() && today.getDate() === dayNum;

                return (
                  <TouchableOpacity
                    key={`day-${dayNum}`}
                    disabled={!hasWorkout}
                    style={[
                      styles.dayBox,
                      {
                        backgroundColor: hasWorkout ? (isRest ? t.card : isCompleted ? "#10B981" : t.primary) : "transparent",
                        borderColor: isToday ? (hasWorkout && !isRest ? "#fff" : t.primary) : hasWorkout ? t.border : "transparent",
                        borderWidth: isToday ? 2.5 : 1,
                        opacity: hasWorkout ? 1 : 0.4
                      }
                    ]}
                    onPress={() => hasWorkout && setSelectedWorkout(workout)}>
                    <Text style={[styles.dayText, { color: hasWorkout && !isRest ? "#fff" : isToday ? t.primary : t.text }]}>{dayNum}</Text>
                    {hasWorkout && !isRest && (isCompleted ? <Ionicons name="checkmark" size={12} color="#fff" style={{ marginTop: 1 }} /> : <View style={styles.runDot} />)}
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
            const key = getWorkoutDateKey(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), dayNum));
            const workout = planByDate.get(key);
            if (!workout) return null;

            const isRest = workout.type === "rest";
            if (isRest) return null; // Hide rest days from the list

            const dateStr = new Date(workout.dateStr!).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
            const isCompleted = !!completedWorkouts[key];

            return (
              <TouchableOpacity key={`agenda-${dayNum}`} activeOpacity={0.7} onPress={() => setSelectedWorkout(workout)} style={[styles.agendaRow, { borderBottomColor: t.border }]}>
                <View style={styles.agendaDateWrap}>
                  <Text style={[styles.agendaDate, { color: t.text }]}>{dateStr}</Text>
                  <Text style={[styles.agendaType, { color: isCompleted ? "#10B981" : t.primary }]}>
                    {workout.type.toUpperCase()}
                    {isCompleted ? " ✓" : ""}
                  </Text>
                </View>
                <Text style={[styles.agendaDesc, { color: isCompleted ? t.subtext : t.text }]}>{workout.desc}</Text>
                {isCompleted && <Ionicons name="checkmark-circle" size={20} color="#10B981" style={{ alignSelf: "center" }} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Detail Modal */}
      <Modal visible={selectedWorkout !== null} transparent animationType="slide" onRequestClose={() => setSelectedWorkout(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: t.bg }]}>
            {selectedWorkout &&
              (() => {
                const dateKey = selectedWorkout.dateStr ? getWorkoutDateKey(selectedWorkout.dateStr) : "";
                const todayKey = getWorkoutDateKey(new Date());
                const isSelectedToday = dateKey === todayKey;
                const isSelectedCompleted = dateKey ? !!completedWorkouts[dateKey] : false;
                const completionRecord = dateKey ? completedWorkouts[dateKey] : null;

                return (
                  <>
                    <View style={styles.modalHeaderRow}>
                      <Text style={[styles.modalTitle, { color: t.text, flex: 1 }]}>
                        {new Date(selectedWorkout.dateStr!).toLocaleDateString(undefined, {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric"
                        })}
                      </Text>
                      {isSelectedCompleted && (
                        <View style={[styles.todayBadge, { backgroundColor: "#10B981" }]}>
                          <Text style={[styles.todayBadgeText, { color: "#fff" }]}>COMPLETED ✓</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.modalType, { color: isSelectedCompleted ? "#10B981" : t.primary }]}>{selectedWorkout.type.toUpperCase()}</Text>
                    <Text style={[styles.modalDesc, { color: t.subtext }]}>{selectedWorkout.desc}</Text>

                    {isSelectedCompleted && (
                      <View style={[styles.accomplishedNote, { backgroundColor: "#10B98115", borderColor: "#10B981" }]}>
                        <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                        <Text style={[styles.accomplishedText, { color: "#10B981" }]}>
                          {completionRecord?.isManual ? "Marked complete manually." : "Quest completed by accomplishing a recorded run! 🏃"}
                        </Text>
                      </View>
                    )}

                    {/* Button only rendered for today's run! */}
                    {isSelectedToday && selectedWorkout.type !== "rest" ? (
                      <Button
                        title={isSelectedCompleted ? "Completed ✓" : "Complete Run"}
                        variant={isSelectedCompleted ? "secondary" : "primary"}
                        onPress={() => handleToggleComplete(selectedWorkout)}
                        style={{ marginTop: 20 }}
                      />
                    ) : !isSelectedCompleted && selectedWorkout.type !== "rest" ? (
                      <Text style={[styles.notTodayHint, { color: t.subtext }]}>
                        Runs can only be completed on today's scheduled date.
                      </Text>
                    ) : null}

                    <Button title="Close" variant="secondary" onPress={() => setSelectedWorkout(null)} style={{ marginTop: 10 }} />
                  </>
                );
              })()}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  emptyText: { textAlign: "center", fontSize: 16, fontFamily: fonts.medium, lineHeight: 24 },
  scroll: { padding: 16 },
  header: { fontSize: 24, fontFamily: fonts.extraBold },
  subHeader: { fontSize: 14, fontFamily: fonts.medium, marginBottom: 16 },
  todayCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    marginBottom: 16,
    gap: 8
  },
  todayHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  todayBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8
  },
  todayBadgeText: {
    fontSize: 11,
    fontFamily: fonts.extraBold,
    letterSpacing: 0.5
  },
  todayType: {
    fontSize: 13,
    fontFamily: fonts.extraBold,
    letterSpacing: 1
  },
  todayDesc: {
    fontSize: 16,
    fontFamily: fonts.semiBold,
    lineHeight: 22
  },
  aqiContainer: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 24 },
  aqiTitle: { fontSize: 16, fontFamily: fonts.bold, marginBottom: 8 },
  aqiLevel: { fontSize: 18, fontFamily: fonts.extraBold, marginBottom: 4 },
  aqiText: { fontSize: 14, fontFamily: fonts.regular, lineHeight: 20 },
  monthHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16
  },
  navButton: { padding: 4 },
  monthText: { fontSize: 18, fontFamily: fonts.bold },
  weekdayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
    paddingHorizontal: 4
  },
  weekdayText: {
    width: 40,
    textAlign: "center",
    fontFamily: fonts.bold,
    fontSize: 14
  },
  grid: { gap: 8 },
  calendarRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 4
  },
  dayBox: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  dayText: {
    fontSize: 14,
    fontFamily: fonts.bold,
  },
  runDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#fff",
    marginTop: 2
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end"
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    minHeight: 250
  },
  modalHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4
  },
  modalTitle: { fontSize: 20, fontFamily: fonts.extraBold },
  modalType: { fontSize: 14, fontFamily: fonts.bold, letterSpacing: 1, marginBottom: 16 },
  modalDesc: { fontSize: 16, fontFamily: fonts.regular, lineHeight: 24 },
  agendaContainer: { marginTop: 32 },
  agendaHeader: { fontSize: 20, fontFamily: fonts.extraBold, marginBottom: 16 },
  agendaRow: { paddingVertical: 12, borderBottomWidth: 1, flexDirection: "row", gap: 16 },
  agendaDateWrap: { width: 90 },
  agendaDate: { fontSize: 14, fontFamily: fonts.bold, marginBottom: 4 },
  agendaType: { fontSize: 12, fontFamily: fonts.bold, letterSpacing: 0.5 },
  agendaDesc: { flex: 1, fontSize: 14, fontFamily: fonts.regular, lineHeight: 20 },
  accomplishedNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginTop: 12,
  },
  accomplishedText: {
    fontSize: 13,
    fontFamily: fonts.bold,
    flex: 1,
  },
  notTodayHint: {
    fontStyle: "italic",
    fontSize: 13,
    fontFamily: fonts.medium,
    marginTop: 16,
    textAlign: "center",
  },
});
