import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import type { WeeklyStreakInfo } from '../tracking/streak';

interface Props {
  streak: WeeklyStreakInfo;
}

export function WeeklyStreakCard({ streak }: Props) {
  const t = useTheme();

  const flameColor = streak.currentStreakWeeks > 0 ? '#F59E0B' : t.subtext;

  return (
    <View style={[styles.card, { backgroundColor: t.card, borderColor: t.border }]}>
      <View style={styles.headerRow}>
        <View style={styles.titleWrap}>
          <Text style={styles.fireEmoji}>🔥</Text>
          <View>
            <Text style={[styles.streakCount, { color: t.text }]}>
              {streak.currentStreakWeeks} {streak.currentStreakWeeks === 1 ? 'WEEK' : 'WEEKS'} STREAK
            </Text>
            <Text style={[styles.subText, { color: t.subtext }]}>
              {streak.hasRunThisWeek
                ? `Active this week (${streak.thisWeekCount} ${streak.thisWeekCount === 1 ? 'day' : 'days'} run)`
                : streak.isPendingThisWeek
                ? 'Run this week to extend your streak!'
                : 'Run this week to start a streak!'}
            </Text>
          </View>
        </View>

        {streak.bestStreakWeeks > 0 && (
          <View style={[styles.bestBadge, { backgroundColor: t.border + '35' }]}>
            <Ionicons name="trophy" size={12} color="#F59E0B" />
            <Text style={[styles.bestText, { color: t.subtext }]}>
              Best: {streak.bestStreakWeeks}w
            </Text>
          </View>
        )}
      </View>

      {/* Weekday Visual Bubbles */}
      <View style={styles.daysRow}>
        {streak.weekDays.map((d) => {
          return (
            <View key={d.dateKey} style={styles.dayCol}>
              <View
                style={[
                  styles.dayBubble,
                  {
                    backgroundColor: d.isCompleted
                      ? '#10B981'
                      : d.isToday
                      ? t.primary + '20'
                      : t.border + '30',
                    borderColor: d.isToday ? t.primary : 'transparent',
                    borderWidth: d.isToday ? 2 : 0,
                  },
                ]}
              >
                {d.isCompleted ? (
                  <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                ) : (
                  <View
                    style={[
                      styles.dot,
                      { backgroundColor: d.isToday ? t.primary : t.subtext + '60' },
                    ]}
                  />
                )}
              </View>
              <Text
                style={[
                  styles.dayLabel,
                  {
                    color: d.isToday
                      ? t.primary
                      : d.isCompleted
                      ? '#10B981'
                      : t.subtext,
                    fontWeight: d.isToday || d.isCompleted ? '800' : '600',
                  },
                ]}
              >
                {d.dayLabel}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  fireEmoji: {
    fontSize: 28,
  },
  streakCount: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  subText: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 1,
  },
  bestBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  bestText: {
    fontSize: 11,
    fontWeight: '700',
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
  dayCol: {
    alignItems: 'center',
    gap: 6,
  },
  dayBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dayLabel: {
    fontSize: 12,
  },
});

