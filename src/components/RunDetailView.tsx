import { StyleSheet, Text, View } from 'react-native';
import { distanceLabel, formatDate, formatDistance, formatDuration, formatPace, paceLabel } from '../tracking/geo';
import { useTheme } from '../theme';
import type { RunDraft, Unit } from '../types';
import { RunMap } from './RunMap';
import { Stat } from './Stat';

/** Shared layout for the post-run summary and the history detail view. */
export function RunDetailView({ run, unit }: { run: RunDraft; unit: Unit }) {
  const t = useTheme();
  return (
    <View style={styles.container}>
      <Text style={[styles.date, { color: t.subtext }]}>{formatDate(run.startTime)}</Text>
      <View style={styles.row}>
        <Stat big label="Distance" value={formatDistance(run.distanceM, unit)} unit={distanceLabel(unit)} />
      </View>
      <View style={styles.row}>
        <Stat label="Duration" value={formatDuration(run.durationSec)} />
        <Stat label="Avg pace" value={formatPace(run.avgPaceSecPerKm, unit)} unit={paceLabel(unit)} />
      </View>
      <View style={styles.mapWrap}>
        {run.routePoints.length ? (
          <RunMap points={run.routePoints} />
        ) : (
          <Text style={{ color: t.subtext, textAlign: 'center', marginTop: 40 }}>No route recorded</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: 12 },
  date: { fontSize: 16, fontWeight: '600', textAlign: 'center' },
  row: { flexDirection: 'row', gap: 12 },
  mapWrap: { flex: 1, borderRadius: 16, overflow: 'hidden', minHeight: 220 },
});

