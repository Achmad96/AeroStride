import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, fonts } from '../theme';
import type { RunListItem, Unit } from '../types';
import {
  getWeeklyDailyVolumes,
  getMonthlyWeeklyVolumes,
  getRecentMonthlyVolumes,
  getPaceTrend,
  calculateAnalyticsSummary,
} from '../tracking/analytics';
import {
  distanceInUnit,
  distanceLabel,
  formatDistance,
  formatDuration,
  formatPace,
  paceLabel,
} from '../tracking/geo';
import { useSettings } from '../store/settingsStore';
import { usePlanStore } from '../store/planStore';

interface Props {
  runs: RunListItem[];
  unit: Unit;
  headerComponent?: React.ReactNode;
}

type Timeframe = 'week' | 'month' | 'all';

export function AnalyticsView({ runs, unit, headerComponent }: Props) {
  const t = useTheme();
  const profile = useSettings((s) => s.profile);
  const completedWorkouts = usePlanStore((s) => s.completedWorkouts);

  const [timeframe, setTimeframe] = useState<Timeframe>('week');
  const [selectedBarIdx, setSelectedBarIdx] = useState<number | null>(null);

  const userWeight = parseFloat(profile.weightKg) || 70;

  // Filter runs based on timeframe
  const filteredRuns = useMemo(() => {
    const now = Date.now();
    if (timeframe === 'week') {
      const startOfWk = new Date(now);
      startOfWk.setHours(0, 0, 0, 0);
      const daysSinceMon = (startOfWk.getDay() + 6) % 7;
      startOfWk.setDate(startOfWk.getDate() - daysSinceMon);
      return runs.filter((r) => r.startTime >= startOfWk.getTime());
    } else if (timeframe === 'month') {
      const startOfMo = new Date(now);
      startOfMo.setDate(1);
      startOfMo.setHours(0, 0, 0, 0);
      return runs.filter((r) => r.startTime >= startOfMo.getTime());
    }
    return runs;
  }, [runs, timeframe]);

  const summary = useMemo(
    () => calculateAnalyticsSummary(filteredRuns, userWeight),
    [filteredRuns, userWeight]
  );

  // Chart data sources
  const weeklyData = useMemo(() => getWeeklyDailyVolumes(runs), [runs]);
  const monthlyData = useMemo(() => getMonthlyWeeklyVolumes(runs), [runs]);
  const allTimeData = useMemo(() => getRecentMonthlyVolumes(runs, 6), [runs]);

  // Current chart bars based on timeframe
  const chartBars = useMemo(() => {
    if (timeframe === 'week') {
      return weeklyData.map((d, i) => ({
        id: `week-${i}`,
        label: d.dayLabel,
        subLabel: d.dateStr,
        distanceM: d.distanceM,
        durationSec: d.durationSec,
        runsCount: d.runsCount,
        isActive: d.isToday,
      }));
    } else if (timeframe === 'month') {
      return monthlyData.map((w, i) => ({
        id: `month-${i}`,
        label: w.weekLabel,
        subLabel: w.dateRangeStr,
        distanceM: w.distanceM,
        durationSec: w.durationSec,
        runsCount: w.runsCount,
        isActive: w.isCurrentWeek,
      }));
    } else {
      return allTimeData.map((m, i) => ({
        id: `all-${i}`,
        label: m.monthLabel,
        subLabel: `${m.monthLabel} ${m.year}`,
        distanceM: m.distanceM,
        durationSec: m.durationSec,
        runsCount: m.runsCount,
        isActive: m.isCurrentMonth,
      }));
    }
  }, [timeframe, weeklyData, monthlyData, allTimeData]);

  const maxChartDistanceM = useMemo(() => {
    const max = Math.max(...chartBars.map((b) => b.distanceM), 0);
    return Math.max(max, 3000); // Minimum scale baseline
  }, [chartBars]);

  // Active selected bar info
  const activeBar = selectedBarIdx !== null && chartBars[selectedBarIdx]
    ? chartBars[selectedBarIdx]
    : chartBars.find((b) => b.isActive) || chartBars[chartBars.length - 1];

  // Pace trend for recent runs
  const paceTrend = useMemo(() => getPaceTrend(runs, 5), [runs]);

  // Plan completion stats
  const completedCount = useMemo(
    () => Object.keys(completedWorkouts).length,
    [completedWorkouts]
  );

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      {headerComponent}

      {/* Timeframe Selector Tabs */}
      <View style={[styles.timeframeTabs, { backgroundColor: t.card, borderColor: t.border }]}>
        {(['week', 'month', 'all'] as Timeframe[]).map((tf) => {
          const isSelected = timeframe === tf;
          const label = tf === 'week' ? 'This Week' : tf === 'month' ? 'This Month' : 'All Time';
          return (
            <TouchableOpacity
              key={tf}
              onPress={() => {
                setTimeframe(tf);
                setSelectedBarIdx(null);
              }}
              style={[
                styles.timeframeBtn,
                isSelected && { backgroundColor: t.primary },
              ]}
            >
              <Text
                style={[
                  styles.timeframeText,
                  { color: isSelected ? t.onPrimary : t.subtext },
                  isSelected && { fontFamily: fonts.extraBold },
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Main Bar Chart Card */}
      <View style={[styles.card, { backgroundColor: t.card, borderColor: t.border }]}>
        <View style={styles.chartHeader}>
          <View>
            <Text style={[styles.cardSubTitle, { color: t.subtext }]}>
              {timeframe === 'week'
                ? 'DAILY DISTANCE'
                : timeframe === 'month'
                ? 'WEEKLY BREAKDOWN'
                : 'MONTHLY VOLUME'}
            </Text>
            <Text style={[styles.cardMainStat, { color: t.text }]}>
              {formatDistance(summary.totalDistanceM, unit)} {distanceLabel(unit)}
            </Text>
          </View>

          {activeBar && (
            <View style={[styles.activePill, { backgroundColor: t.primary + '18', borderColor: t.primary }]}>
              <Text style={[styles.activePillText, { color: t.primary }]}>
                {activeBar.subLabel}: {formatDistance(activeBar.distanceM, unit)} {distanceLabel(unit)}
              </Text>
            </View>
          )}
        </View>

        {/* Visual Bar Chart */}
        <View style={styles.chartGraphicWrap}>
          {chartBars.map((bar, idx) => {
            const isSelected = selectedBarIdx === idx || (selectedBarIdx === null && bar.isActive);
            const heightPct = Math.min(100, Math.round((bar.distanceM / maxChartDistanceM) * 100));
            const hasDistance = bar.distanceM > 0;
            const distLabel = hasDistance ? distanceInUnit(bar.distanceM, unit).toFixed(1) : '';

            return (
              <TouchableOpacity
                key={bar.id}
                activeOpacity={0.7}
                onPress={() => setSelectedBarIdx(idx)}
                style={styles.barColumn}
              >
                <Text style={[styles.barTopValue, { color: isSelected ? t.primary : t.subtext }]}>
                  {distLabel}
                </Text>

                <View
                  style={[
                    styles.barTrack,
                    {
                      backgroundColor: t.border + '30',
                      borderColor: isSelected ? t.primary : 'transparent',
                      borderWidth: isSelected ? 2 : 0,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.barFill,
                      {
                        height: `${Math.max(hasDistance ? 10 : 0, heightPct)}%`,
                        backgroundColor: isSelected
                          ? t.primary
                          : hasDistance
                          ? t.primary + 'B0'
                          : 'transparent',
                      },
                    ]}
                  />
                </View>

                <Text
                  style={[
                    styles.barBottomLabel,
                    {
                      color: isSelected ? t.primary : t.text,
                      fontFamily: isSelected ? fonts.extraBold : fonts.semiBold,
                    },
                  ]}
                >
                  {bar.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[styles.chartHint, { color: t.subtext }]}>
          Tap any bar to inspect volume and details
        </Text>
      </View>

      {/* Primary Summary Grid */}
      <View style={styles.gridRow}>
        <View style={[styles.statBox, { backgroundColor: t.card, borderColor: t.border }]}>
          <View style={styles.statBoxHeader}>
            <Ionicons name="speedometer-outline" size={18} color={t.primary} />
            <Text style={[styles.statBoxLabel, { color: t.subtext }]}>AVG PACE</Text>
          </View>
          <Text style={[styles.statBoxValue, { color: t.text }]}>
            {formatPace(summary.avgPaceSecPerKm, unit)}
          </Text>
          <Text style={[styles.statBoxUnit, { color: t.subtext }]}>{paceLabel(unit)}</Text>
        </View>

        <View style={[styles.statBox, { backgroundColor: t.card, borderColor: t.border }]}>
          <View style={styles.statBoxHeader}>
            <Ionicons name="time-outline" size={18} color={t.primary} />
            <Text style={[styles.statBoxLabel, { color: t.subtext }]}>DURATION</Text>
          </View>
          <Text style={[styles.statBoxValue, { color: t.text }]}>
            {formatDuration(summary.totalDurationSec)}
          </Text>
          <Text style={[styles.statBoxUnit, { color: t.subtext }]}>{summary.totalRuns} runs</Text>
        </View>
      </View>

      <View style={styles.gridRow}>
        <View style={[styles.statBox, { backgroundColor: t.card, borderColor: t.border }]}>
          <View style={styles.statBoxHeader}>
            <Ionicons name="flame-outline" size={18} color="#FF6B00" />
            <Text style={[styles.statBoxLabel, { color: t.subtext }]}>CALORIES</Text>
          </View>
          <Text style={[styles.statBoxValue, { color: t.text }]}>
            {summary.caloriesBurned.toLocaleString()}
          </Text>
          <Text style={[styles.statBoxUnit, { color: t.subtext }]}>est. kcal</Text>
        </View>

        <View style={[styles.statBox, { backgroundColor: t.card, borderColor: t.border }]}>
          <View style={styles.statBoxHeader}>
            <Ionicons name="trophy-outline" size={18} color="#FFB800" />
            <Text style={[styles.statBoxLabel, { color: t.subtext }]}>LONGEST RUN</Text>
          </View>
          <Text style={[styles.statBoxValue, { color: t.text }]}>
            {formatDistance(summary.longestRunDistanceM, unit)}
          </Text>
          <Text style={[styles.statBoxUnit, { color: t.subtext }]}>{distanceLabel(unit)}</Text>
        </View>
      </View>

      {/* Pace Progression Graphic Card */}
      {paceTrend.length > 1 && (
        <View style={[styles.card, { backgroundColor: t.card, borderColor: t.border }]}>
          <View style={styles.paceHeaderRow}>
            <View>
              <Text style={[styles.cardSubTitle, { color: t.subtext }]}>PACE TREND</Text>
              <Text style={[styles.paceFastest, { color: t.text }]}>
                Best: {formatPace(summary.fastestPaceSecPerKm, unit)} {paceLabel(unit)}
              </Text>
            </View>
            <View style={[styles.trendBadge, { backgroundColor: t.primary }]}>
              <Ionicons name="trending-up" size={14} color={t.onPrimary} />
              <Text style={[styles.trendBadgeText, { color: t.onPrimary }]}>RECENT SESSIONS</Text>
            </View>
          </View>

          <View style={styles.paceList}>
            {paceTrend.map((pt, i) => (
              <View key={pt.runId} style={styles.paceRow}>
                <Text style={[styles.paceDate, { color: t.subtext }]}>{pt.dateLabel}</Text>
                <View style={styles.paceBarTrack}>
                  <View
                    style={[
                      styles.paceBarFill,
                      {
                        backgroundColor: t.primary,
                        width: `${Math.max(
                          25,
                          Math.min(
                            100,
                            summary.fastestPaceSecPerKm > 0
                              ? (summary.fastestPaceSecPerKm / pt.paceSecPerKm) * 100
                              : 70
                          )
                        )}%`,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.paceValue, { color: t.text }]}>
                  {formatPace(pt.paceSecPerKm, unit)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Training Plan Goal Adherence Card */}
      {profile.goal && (
        <View style={[styles.card, { backgroundColor: t.card, borderColor: t.border }]}>
          <View style={styles.planHeader}>
            <Ionicons name="checkbox-outline" size={20} color={t.primary} />
            <Text style={[styles.cardSubTitle, { color: t.text, flex: 1 }]}>
              TRAINING GOAL: {profile.goal.toUpperCase()}
            </Text>
            <Text style={[styles.planCount, { color: t.primary }]}>
              {completedCount} Completed
            </Text>
          </View>
          <Text style={[styles.planDesc, { color: t.subtext }]}>
            Consistency is the foundation of endurance. Every completed workout builds strength!
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 16,
  },
  timeframeTabs: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    padding: 4,
  },
  timeframeBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeframeText: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardSubTitle: {
    fontSize: 12,
    fontFamily: fonts.extraBold,
    letterSpacing: 0.8,
  },
  cardMainStat: {
    fontSize: 26,
    fontFamily: fonts.extraBold,
    marginTop: 2,
  },
  activePill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
  },
  activePillText: {
    fontSize: 12,
    fontFamily: fonts.bold,
  },
  chartGraphicWrap: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 160,
    paddingTop: 16,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  barTopValue: {
    fontSize: 10,
    fontFamily: fonts.bold,
    height: 14,
  },
  barTrack: {
    width: 26,
    height: 110,
    borderRadius: 10,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  barFill: {
    width: '100%',
    borderRadius: 8,
  },
  barBottomLabel: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
  },
  chartHint: {
    fontSize: 11,
    fontFamily: fonts.regular,
    textAlign: 'center',
    marginTop: -4,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statBox: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 4,
  },
  statBoxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  statBoxLabel: {
    fontSize: 11,
    fontFamily: fonts.extraBold,
    letterSpacing: 0.6,
  },
  statBoxValue: {
    fontSize: 22,
    fontFamily: fonts.extraBold,
  },
  statBoxUnit: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
  },
  paceHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paceFastest: {
    fontSize: 15,
    fontFamily: fonts.bold,
    marginTop: 2,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  trendBadgeText: {
    fontSize: 10,
    fontFamily: fonts.extraBold,
    letterSpacing: 0.5,
  },
  paceList: {
    gap: 10,
    marginTop: 4,
  },
  paceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  paceDate: {
    width: 44,
    fontSize: 12,
    fontFamily: fonts.semiBold,
  },
  paceBarTrack: {
    flex: 1,
    height: 10,
    backgroundColor: 'rgba(0,0,0,0.06)',
    borderRadius: 5,
    overflow: 'hidden',
  },
  paceBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  paceValue: {
    width: 48,
    fontSize: 12,
    fontFamily: fonts.bold,
    textAlign: 'right',
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  planCount: {
    fontSize: 14,
    fontFamily: fonts.extraBold,
  },
  planDesc: {
    fontSize: 13,
    fontFamily: fonts.regular,
    lineHeight: 18,
  },
});

