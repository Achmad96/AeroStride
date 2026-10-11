import { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { deleteRun, listRuns } from '../../src/db/database';
import { useSettings } from '../../src/store/settingsStore';
import {
  distanceLabel,
  formatDate,
  formatDistance,
  formatDuration,
  formatPace,
  paceLabel,
} from '../../src/tracking/geo';
import { useTheme } from '../../src/theme';
import type { RunListItem } from '../../src/types';

export default function History() {
  const t = useTheme();
  const router = useRouter();
  const unit = useSettings((s) => s.unit);
  const [runs, setRuns] = useState<RunListItem[]>([]);

  const load = useCallback(() => {
    listRuns().then(setRuns).catch(() => {});
  }, []);
  useFocusEffect(load);

  const confirmDelete = (run: RunListItem) =>
    Alert.alert('Delete run?', formatDate(run.startTime), [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteRun(run.id);
          load();
        },
      },
    ]);

  return (
    <FlatList
      data={runs}
      keyExtractor={(r) => String(r.id)}
      contentContainerStyle={styles.list}
      ListEmptyComponent={
        <Text style={[styles.empty, { color: t.subtext }]}>No runs yet. Go for your first run!</Text>
      }
      ListHeaderComponent={
        runs.length ? (
          <Text style={[styles.hint, { color: t.subtext }]}>Long-press a run to delete it</Text>
        ) : null
      }
      renderItem={({ item }) => (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push(`/detail/${item.id}`)}
          onLongPress={() => confirmDelete(item)}
          style={({ pressed }) => [styles.card, { backgroundColor: t.card, opacity: pressed ? 0.8 : 1 }]}
        >
          <Text style={[styles.date, { color: t.subtext }]}>{formatDate(item.startTime)}</Text>
          <View style={styles.row}>
            <Text style={[styles.dist, { color: t.text }]}>
              {formatDistance(item.distanceM, unit)} {distanceLabel(unit)}
            </Text>
            <View style={styles.right}>
              <Text style={[styles.meta, { color: t.text }]}>{formatDuration(item.durationSec)}</Text>
              <Text style={[styles.meta, { color: t.subtext }]}>
                {formatPace(item.avgPaceSecPerKm, unit)} {paceLabel(unit)}
              </Text>
            </View>
          </View>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 12, flexGrow: 1 },
  empty: { textAlign: 'center', marginTop: 60, fontSize: 17 },
  hint: { textAlign: 'center', fontSize: 13, marginBottom: 4 },
  card: { borderRadius: 16, padding: 16, minHeight: 80, gap: 6 },
  date: { fontSize: 14, fontWeight: '600' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  right: { alignItems: 'flex-end' },
  dist: { fontSize: 28, fontWeight: '800' },
  meta: { fontSize: 15, fontWeight: '600' },
});

