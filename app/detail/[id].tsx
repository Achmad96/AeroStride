import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RunDetailView } from '../../src/components/RunDetailView';
import { getRun } from '../../src/db/database';
import { useSettings } from '../../src/store/settingsStore';
import { useTheme, fonts } from '../../src/theme';
import type { Run } from '../../src/types';

export default function Detail() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const unit = useSettings((s) => s.unit);
  const [run, setRun] = useState<Run | null | undefined>(undefined);

  useEffect(() => {
    getRun(Number(id)).then(setRun).catch(() => setRun(null));
  }, [id]);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {run === undefined ? (
        <ActivityIndicator color={t.primary} size="large" />
      ) : run === null ? (
        <Text style={{ color: t.subtext, textAlign: 'center', fontFamily: fonts.medium }}>Run not found.</Text>
      ) : (
        <RunDetailView run={run} unit={unit} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ container: { flex: 1, padding: 16, justifyContent: 'center' } });

