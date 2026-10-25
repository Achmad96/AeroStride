import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme';
import type { RunListItem, Unit } from '../types';
import { getWeeklyDailyVolumes } from '../tracking/analytics';
import { distanceInUnit, formatDistance } from '../tracking/geo';

interface Props {
  runs: RunListItem[];
  unit: Unit;
}

export function WeeklyMiniChart({ runs, unit }: Props) {
  const t = useTheme();
  const dailyVolumes = useMemo(() => getWeeklyDailyVolumes(runs), [runs]);

  const maxDistanceM = useMemo(() => {
    const max = Math.max(...dailyVolumes.map((d) => d.distanceM), 0);
    // At least 2km so empty days don't look 100% full
    return Math.max(max, 2000);
  }, [dailyVolumes]);

  const totalWeeklyDist = useMemo(() => {
    const totalM = dailyVolumes.reduce((acc, d) => acc + d.distanceM, 0);
    return formatDistance(totalM, unit);
  }, [dailyVolumes, unit]);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: t.subtext }]}>WEEKLY ACTIVITY</Text>
        <Text style={[styles.totalText, { color: t.text }]}>
          {totalWeeklyDist} {unit}
        </Text>
      </View>
      <View style={styles.chartRow}>
        {dailyVolumes.map((day, idx) => {
          const heightPct = Math.min(100, Math.round((day.distanceM / maxDistanceM) * 100));
          const hasRun = day.distanceM > 0;
          return (
            <View key={idx} style={styles.col}>
              <View
                style={[
                  styles.barTrack,
                  {
                    backgroundColor: t.border + '33',
                    borderColor: day.isToday ? t.primary : 'transparent',
                    borderWidth: day.isToday ? 1.5 : 0,
                  },
                ]}
              >
                <View
                  style={[
                    styles.barFill,
                    {
                      height: `${Math.max(hasRun ? 12 : 0, heightPct)}%`,
                      backgroundColor: day.isToday ? (hasRun ? t.primary : t.primary + '88') : (hasRun ? t.primary : 'transparent'),
                    },
                  ]}
                />
              </View>
              <Text
                style={[
                  styles.dayLabel,
                  {
                    color: day.isToday ? t.primary : t.subtext,
                    fontWeight: day.isToday ? '800' : '600',
                  },
                ]}
              >
                {day.dayLabel}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 8,
    gap: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  title: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  totalText: {
    fontSize: 12,
    fontWeight: '700',
  },
  chartRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 72,
    paddingHorizontal: 2,
  },
  col: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  barTrack: {
    width: 22,
    height: 48,
    borderRadius: 8,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  barFill: {
    width: '100%',
    borderRadius: 6,
  },
  dayLabel: {
    fontSize: 11,
  },
});

