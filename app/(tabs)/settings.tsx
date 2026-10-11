import { useState, useCallback } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Switch, Text, TextInput, View, Alert, type ViewStyle } from "react-native";
import { useFocusEffect } from "expo-router";
import { Button } from "../../src/components/Button";
import { useSettings } from "../../src/store/settingsStore";
import { useTheme } from "../../src/theme";
import { getCurrentPerformance } from "../../src/db/database";

function SelectRow<T extends string>({ label, options, value, onChange }: { label: string; options: { label: string; value: T }[]; value: T | null; onChange: (v: T) => void }) {
  const t = useTheme();
  // If there are more than 3 options, don't force them all on one line.
  // Using minWidth ensures they wrap into a grid (e.g. 2x2) rather than squishing.
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

  const [currentPerf, setCurrentPerf] = useState<{ speedMinsPerKm: number; distanceKm: number } | null>(null);

  useFocusEffect(
    useCallback(() => {
      getCurrentPerformance()
        .then(setCurrentPerf)
        .catch(() => {});
    }, [])
  );

  const save = () => {
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
      planStartDate: profile.planStartDate || new Date().toISOString()
    });
    Alert.alert("Saved", "Your personalization settings have been updated!");
  };

  const displaySpeed = currentPerf ? currentPerf.speedMinsPerKm.toFixed(2) : currSpeed;
  const displayDist = currentPerf ? currentPerf.distanceKm.toFixed(2) : currDistance;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={[styles.container, { backgroundColor: t.bg }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.row, { backgroundColor: t.card }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.sectionTitle, { color: t.text }]}>Use miles</Text>
            <Text style={{ color: t.subtext, fontSize: 14 }}>Currently showing {unit === "km" ? "kilometres" : "miles"}</Text>
          </View>
          <Switch accessibilityLabel="Use miles" value={unit === "mi"} onValueChange={(v) => setUnit(v ? "mi" : "km")} trackColor={{ true: t.primary, false: t.border }} />
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
              {currentPerf && <Text style={{ fontSize: 12, color: t.subtext }}>Auto-calculated from your run history.</Text>}
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
              {currentPerf && <Text style={{ fontSize: 12, color: t.subtext }}>Auto-calculated from your run history.</Text>}
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
  scroll: { padding: 16, gap: 24, paddingBottom: 40 },
  row: { flexDirection: "row", alignItems: "center", padding: 16, borderRadius: 16, minHeight: 72 },
  sectionTitle: { fontSize: 18, fontWeight: "700" },
  title: { fontSize: 24, fontWeight: "900", marginBottom: 8 },
  field: { gap: 8 },
  label: { fontSize: 14, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1 },
  radioGroup: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  input: { borderWidth: 1, borderRadius: 12, padding: 16, fontSize: 16 },
  formRow: { flexDirection: "row", gap: 12 }
});
