import { useState, useCallback, useEffect } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Switch, Text, TextInput, View, Alert, type ViewStyle } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "../../src/components/Button";
import { useSettings } from "../../src/store/settingsStore";
import { useTheme, fonts } from "../../src/theme";
import { getCurrentPerformance } from "../../src/db/database";
import {
  getReminderSettings,
  saveReminderSettings,
  scheduleDailyRunReminder,
  sendInstantTestReminder,
} from "../../src/tracking/notificationService";

function SelectRow<T extends string>({ label, options, value, onChange }: { label: string; options: { label: string; value: T }[]; value: T | null; onChange: (v: T) => void }) {
  const t = useTheme();
  const buttonStyle: ViewStyle = options.length > 3 ? { flexGrow: 1, minWidth: "45%", paddingVertical: 8 } : { flex: 1, paddingVertical: 8 };

  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: t.subtext }]}>{label}</Text>
      <View style={styles.radioGroup}>
        {options.map((opt) => {
          const active = value === opt.value;
          return <Button key={opt.value} title={opt.label} variant={active ? "primary" : "secondary"} style={buttonStyle} onPress={() => onChange(opt.value)} />;
        })}
      </View>
    </View>
  );
}

export default function Settings() {
  const t = useTheme();
  const router = useRouter();
  const { unit, setUnit, profile, setProfile } = useSettings();

  // Local state for smooth typing
  const [goal, setGoal] = useState(profile.goal);
  const [targetSpeed, setTargetSpeed] = useState(profile.targetSpeedMinsPerKm);
  const [targetDistance, setTargetDistance] = useState(profile.targetDistanceKm);
  const [currSpeed, setCurrSpeed] = useState(profile.currentSpeedMinsPerKm);
  const [currDistance, setCurrDistance] = useState(profile.currentDistanceKm);
  const [gender, setGender] = useState(profile.gender);
  const [age, setAge] = useState(profile.age);
  const [weight, setWeight] = useState(profile.weightKg);
  const [height, setHeight] = useState(profile.heightCm);

  // Notification Reminder State
  const [remindersEnabled, setRemindersEnabled] = useState(true);
  const [reminderHour, setReminderHour] = useState(8);

  const [currentPerf, setCurrentPerf] = useState<{ speedMinsPerKm: number; distanceKm: number } | null>(null);

  useFocusEffect(
    useCallback(() => {
      getCurrentPerformance()
        .then(setCurrentPerf)
        .catch(() => {});

      getReminderSettings().then((s) => {
        setRemindersEnabled(s.enabled);
        setReminderHour(s.hour);
      });
    }, [])
  );

  const handleToggleReminders = async (enabled: boolean) => {
    setRemindersEnabled(enabled);
    const updated = { enabled, hour: reminderHour, minute: 0 };
    await saveReminderSettings(updated);
    await scheduleDailyRunReminder(updated);
  };

  const handleSelectHour = async (hour: number) => {
    setReminderHour(hour);
    const updated = { enabled: remindersEnabled, hour, minute: 0 };
    await saveReminderSettings(updated);
    if (remindersEnabled) {
      await scheduleDailyRunReminder(updated);
    }
  };

  const handleTestNotification = async () => {
    const success = await sendInstantTestReminder();
    if (success) {
      Alert.alert("Test Notification Sent", "Check your notification shade! 🏃🔥");
    } else {
      Alert.alert("Permission Required", "Please allow notifications in your device settings to receive reminders.");
    }
  };

  const save = () => {
    const newStartDate = new Date().toISOString();
    setProfile({
      goal,
      gender,
      age,
      weightKg: weight,
      heightCm: height,
      targetSpeedMinsPerKm: targetSpeed,
      targetDistanceKm: targetDistance,
      currentSpeedMinsPerKm: currSpeed,
      currentDistanceKm: currDistance,
      planStartDate: newStartDate
    });
    Alert.alert(
      "Plan Applied",
      "Your personalization settings have been saved and your new training plan is active starting today!",
      [
        {
          text: "View Plan",
          onPress: () => router.push("/(tabs)/plan")
        },
        { text: "OK" }
      ]
    );
  };

  const displaySpeed = currentPerf ? currentPerf.speedMinsPerKm.toFixed(2) : currSpeed;
  const displayDist = currentPerf ? currentPerf.distanceKm.toFixed(2) : currDistance;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={[styles.container, { backgroundColor: t.bg }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.row, { backgroundColor: t.card }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.sectionTitle, { color: t.text }]}>Use miles</Text>
            <Text style={{ color: t.subtext, fontSize: 14, fontFamily: fonts.medium }}>Currently showing {unit === "km" ? "kilometres" : "miles"}</Text>
          </View>
          <Switch accessibilityLabel="Use miles" value={unit === "mi"} onValueChange={(v) => setUnit(v ? "mi" : "km")} trackColor={{ true: t.primary, false: t.border }} />
        </View>

        {/* Notifications & Reminders Section */}
        <Text style={[styles.title, { color: t.text, marginTop: 8 }]}>Reminders</Text>
        <View style={[styles.cardContainer, { backgroundColor: t.card, borderColor: t.border }]}>
          <View style={styles.cardHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sectionTitle, { color: t.text }]}>Daily Run Reminder</Text>
              <Text style={{ color: t.subtext, fontSize: 13, marginTop: 2, fontFamily: fonts.regular }}>
                Get notified so you never break your weekly streak
              </Text>
            </View>
            <Switch
              accessibilityLabel="Daily Run Reminder"
              value={remindersEnabled}
              onValueChange={handleToggleReminders}
              trackColor={{ true: t.primary, false: t.border }}
            />
          </View>

          {remindersEnabled && (
            <View style={styles.reminderOptions}>
              <Text style={[styles.label, { color: t.subtext }]}>Preferred reminder time</Text>
              <View style={styles.radioGroup}>
                {[
                  { label: "07:00 AM", hour: 7 },
                  { label: "08:00 AM", hour: 8 },
                  { label: "05:00 PM", hour: 17 },
                  { label: "06:30 PM", hour: 18 },
                ].map((slot) => {
                  const active = reminderHour === slot.hour;
                  return (
                    <Button
                      key={slot.hour}
                      title={slot.label}
                      variant={active ? "primary" : "secondary"}
                      style={{ flex: 1, minWidth: "45%", paddingVertical: 8 }}
                      onPress={() => handleSelectHour(slot.hour)}
                    />
                  );
                })}
              </View>

              <Button
                title="Send Test Reminder 🔔"
                variant="secondary"
                onPress={handleTestNotification}
                style={{ marginTop: 6 }}
              />
            </View>
          )}
        </View>

        <Text style={[styles.title, { color: t.text, marginTop: 16 }]}>Personalize</Text>

        <SelectRow
          label="What is your main goal?"
          value={goal}
          onChange={setGoal}
          options={[
            { label: "Speed", value: "speed" },
            { label: "Distance", value: "distance" },
            { label: "Fitness", value: "fitness" },
            { label: "Weight Loss", value: "weight_loss" }
          ]}
        />

        {goal === "speed" && (
          <View style={styles.formRow}>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={[styles.label, { color: t.subtext }]}>Current Pace (min/km)</Text>
              <TextInput style={[styles.input, { color: currentPerf ? t.subtext : t.text, backgroundColor: t.card, borderColor: t.border }]} keyboardType="decimal-pad" value={displaySpeed} onChangeText={setCurrSpeed} placeholder="e.g. 6.5" placeholderTextColor={t.subtext} editable={!currentPerf} />
              {currentPerf && <Text style={{ fontSize: 12, color: t.subtext, fontFamily: fonts.medium }}>Auto-calculated from your run history.</Text>}
            </View>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={[styles.label, { color: t.subtext }]}>Target Pace (min/km)</Text>
              <TextInput style={[styles.input, { color: t.text, backgroundColor: t.card, borderColor: t.border }]} keyboardType="decimal-pad" value={targetSpeed} onChangeText={setTargetSpeed} placeholder="e.g. 5.0" placeholderTextColor={t.subtext} />
            </View>
          </View>
        )}

        {goal === "distance" && (
          <View style={styles.formRow}>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={[styles.label, { color: t.subtext }]}>Current Max (km)</Text>
              <TextInput style={[styles.input, { color: currentPerf ? t.subtext : t.text, backgroundColor: t.card, borderColor: t.border }]} keyboardType="decimal-pad" value={displayDist} onChangeText={setCurrDistance} placeholder="e.g. 5" placeholderTextColor={t.subtext} editable={!currentPerf} />
              {currentPerf && <Text style={{ fontSize: 12, color: t.subtext, fontFamily: fonts.medium }}>Auto-calculated from your run history.</Text>}
            </View>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={[styles.label, { color: t.subtext }]}>Target Distance (km)</Text>
              <TextInput style={[styles.input, { color: t.text, backgroundColor: t.card, borderColor: t.border }]} keyboardType="decimal-pad" value={targetDistance} onChangeText={setTargetDistance} placeholder="e.g. 21" placeholderTextColor={t.subtext} />
            </View>
          </View>
        )}

        <SelectRow
          label="Gender"
          value={gender}
          onChange={setGender}
          options={[
            { label: "Male", value: "male" },
            { label: "Female", value: "female" }
          ]}
        />

        <View style={styles.field}>
          <Text style={[styles.label, { color: t.subtext }]}>Age (years)</Text>
          <TextInput style={[styles.input, { color: t.text, backgroundColor: t.card, borderColor: t.border }]} keyboardType="number-pad" value={age} onChangeText={setAge} placeholder="e.g. 25" placeholderTextColor={t.subtext} />
        </View>

        <View style={styles.formRow}>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={[styles.label, { color: t.subtext }]}>Height (cm)</Text>
            <TextInput style={[styles.input, { color: t.text, backgroundColor: t.card, borderColor: t.border }]} keyboardType="decimal-pad" value={height} onChangeText={setHeight} placeholder="e.g. 175" placeholderTextColor={t.subtext} />
          </View>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={[styles.label, { color: t.subtext }]}>Weight (kg)</Text>
            <TextInput style={[styles.input, { color: t.text, backgroundColor: t.card, borderColor: t.border }]} keyboardType="decimal-pad" value={weight} onChangeText={setWeight} placeholder="e.g. 70" placeholderTextColor={t.subtext} />
          </View>
        </View>

        <Button title="Save Personalization" onPress={save} style={{ marginTop: 8 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 16, gap: 20, paddingBottom: 40 },
  row: { flexDirection: "row", alignItems: "center", padding: 16, borderRadius: 16, minHeight: 72 },
  cardContainer: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  reminderOptions: {
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.06)",
    paddingTop: 12,
  },
  sectionTitle: { fontSize: 18, fontFamily: fonts.bold },
  title: { fontSize: 24, fontFamily: fonts.extraBold, marginBottom: 4 },
  field: { gap: 8 },
  label: { fontSize: 14, fontFamily: fonts.semiBold, textTransform: "uppercase", letterSpacing: 1 },
  radioGroup: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  input: { borderWidth: 1, borderRadius: 12, padding: 16, fontSize: 16, fontFamily: fonts.semiBold },
  formRow: { flexDirection: "row", gap: 12 }
});
