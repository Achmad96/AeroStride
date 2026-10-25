import { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { useRouter, type ErrorBoundaryProps } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "../src/components/Button";
import { RunMap } from "../src/components/RunMap";
import { Stat } from "../src/components/Stat";
import { useRunStore } from "../src/store/runStore";
import { useSettings } from "../src/store/settingsStore";
import { distanceLabel, formatDistance, formatDuration, formatPace, paceLabel } from "../src/tracking/geo";
import { startTracking, stopTracking } from "../src/tracking/locationService";
import { getCurrentPaceSecPerKm, getElapsedMs } from "../src/tracking/tracker";
import { useTheme, fonts } from "../src/theme";

const NO_SIGNAL_AFTER_MS = 15_000;

/** Shown instead of crashing if anything on this screen throws while rendering. */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const t = useTheme();
  const router = useRouter();
  return (
    <SafeAreaView style={[styles.container, styles.errorWrap, { backgroundColor: t.bg }]}>
      <Text style={[styles.errorTitle, { color: t.text }]}>Something went wrong</Text>
      <Text style={{ color: t.subtext, textAlign: "center", fontFamily: fonts.regular }}>
        Your run is still being recorded. {error?.message ?? ""}
      </Text>
      <Button title="Try again" onPress={retry} />
      <Button
        title="Stop and review run"
        variant="secondary"
        onPress={async () => {
          useRunStore.getState().stop();
          await stopTracking().catch(() => {});
          router.replace("/summary");
        }}
      />
    </SafeAreaView>
  );
}

export default function ActiveRun() {
  const t = useTheme();
  const router = useRouter();
  const unit = useSettings((s) => s.unit);
  const run = useRunStore((s) => s.run);
  const lastFixAt = useRunStore((s) => s.lastFixAt);
  const lastAccuracy = useRunStore((s) => s.lastAccuracy);
  const lastPosition = useRunStore((s) => s.lastPosition);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (run.status === "idle") router.replace("/");
    if (run.status === "stopped") router.replace("/summary");
  }, [run.status, router]);

  const paused = run.status === "paused";
  const elapsedSec = getElapsedMs(run, now) / 1000;
  const pace = getCurrentPaceSecPerKm(run);

  let gpsMessage: string | null = null;
  if (!paused) {
    if (lastFixAt == null || now - lastFixAt > NO_SIGNAL_AFTER_MS) {
      gpsMessage = run.points.length ? "GPS signal lost – still timing, distance paused" : "Waiting for GPS signal…";
    } else if (lastAccuracy == null || lastAccuracy > 30) {
      gpsMessage = "Weak GPS signal – move to open sky";
    }
  }

  const onPause = () => useRunStore.getState().pause();
  const onResume = async () => {
    // Make sure updates are running (e.g. after recovering an app-kill).
    await startTracking().catch(() => {});
    useRunStore.getState().resume();
  };
  const onStop = () =>
    Alert.alert("Stop run?", "You can save or discard it on the next screen.", [
      { text: "Keep running", style: "cancel" },
      {
        text: "Stop",
        style: "destructive",
        onPress: async () => {
          useRunStore.getState().stop();
          await stopTracking().catch(() => {});
        }
      }
    ]);

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <View style={styles.mapWrap}>
        <RunMap points={run.points} current={lastPosition} follow />
        {gpsMessage && (
          <View style={[styles.banner, { backgroundColor: t.danger }]}>
            <Text style={[styles.bannerText, { color: t.onDanger }]}>{gpsMessage}</Text>
          </View>
        )}
        {paused && (
          <View style={[styles.banner, { backgroundColor: t.card }]}>
            <Text style={[styles.bannerText, { color: t.text }]}>PAUSED</Text>
          </View>
        )}
      </View>

      <View style={styles.panel}>
        <Stat big label="Time" value={formatDuration(elapsedSec)} />
        <View style={styles.row}>
          <Stat label="Distance" value={formatDistance(run.distanceM, unit)} unit={distanceLabel(unit)} />
          <Stat label="Pace" value={formatPace(pace, unit)} unit={paceLabel(unit)} />
        </View>
        <View style={styles.row}>
          {paused ? <Button title="Resume" onPress={onResume} style={styles.flex} /> : <Button title="Pause" variant="secondary" onPress={onPause} style={styles.flex} />}
          <Button title="Stop" variant="danger" onPress={onStop} style={styles.flex} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  mapWrap: { flex: 1, minHeight: 180 },
  banner: { position: "absolute", top: 12, left: 12, right: 12, borderRadius: 12, padding: 12 },
  bannerText: { fontSize: 16, fontFamily: fonts.bold, textAlign: "center" },
  panel: { padding: 16, gap: 12 },
  row: { flexDirection: "row", gap: 12 },
  flex: { flex: 1 },
  errorWrap: { justifyContent: "center", padding: 24, gap: 16 },
  errorTitle: { fontSize: 22, fontFamily: fonts.extraBold, textAlign: "center" }
});
