import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useRunStore } from '../store/runStore';
import { useTheme } from '../theme';
import { ensureLocationPermission, startTracking } from '../tracking/locationService';

export function RunNavbarButton() {
  const t = useTheme();
  const router = useRouter();
  const status = useRunStore((s) => s.run.status);

  const inProgress = status === 'running' || status === 'paused';
  const finished = status === 'stopped';

  const handlePress = async () => {
    if (inProgress) {
      router.push('/active');
      return;
    }
    if (finished) {
      router.push('/summary');
      return;
    }
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
      Alert.alert('Could not start run', String(e instanceof Error ? e.message : e));
    }
  };

  const buttonBg = inProgress
    ? (status === 'paused' ? '#F59E0B' : '#10B981')
    : finished
    ? '#3B82F6'
    : t.primary;

  const iconName = inProgress
    ? (status === 'paused' ? 'play' : 'pause')
    : finished
    ? 'checkmark'
    : 'play';

  const label = inProgress
    ? (status === 'paused' ? 'PAUSED' : 'LIVE')
    : finished
    ? 'REVIEW'
    : 'RUN';

  return (
    <View style={styles.container} pointerEvents="box-none">
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={handlePress}
        style={[
          styles.button,
          {
            backgroundColor: buttonBg,
            borderColor: t.bg,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel={
          inProgress
            ? 'Active run in progress, tap to resume'
            : finished
            ? 'Review unsaved run'
            : 'Start running'
        }
      >
        <Ionicons
          name={iconName}
          size={22}
          color="#FFFFFF"
          style={{ marginLeft: iconName === 'play' ? 2 : 0 }}
        />
        <Text style={styles.label}>{label}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  button: {
    position: 'absolute',
    top: -16,
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginTop: 1,
  },
});

