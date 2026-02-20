import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotiView } from 'moti';

import { useTokens } from '../../../lib/theme';
import { useAuth } from '../../../lib/auth';
import {
  trackProgressViewed,
  trackProgressCardRendered,
  trackProgressCtaTapped,
  trackProgressHistoryRangeChanged,
  trackProgressWeeklyActivityViewed,
} from '../../../lib/analytics';
import { useProgressSnapshot, useWeeklyActivity } from '../../../hooks/useProgressMetrics';
import { useProfile, useOnboardingAnswers, useMeasurements } from '../../../hooks/useUser';
import { usePrepCoachState } from '../../../hooks/usePrepCoach';
import { WeeklyActivityBar } from '../../../components/progress/WeeklyActivityBar';
import { GoalTrackerRow, type GoalTrackerItem } from '../../../components/progress/GoalTrackerRow';
import { StreakCard } from '../../../components/progress/StreakCard';
import { FreshnessChip } from '../../../components/progress/FreshnessChip';
import { WeeklyTrendChart } from '../../../components/progress/WeeklyTrendChart';
import { GlassCard } from '../../../components/premium/GlassCard';
import { TabBarIcon } from '../../../components/navigation/TabBarIcon';

import type { ProgressTimeframe } from '../../../services/progressMetricsService';

// —— History time-range options ——
const HISTORY_RANGES = [
  { label: '7D', days: 7, tf: 'week' as ProgressTimeframe },
  { label: '14D', days: 14, tf: 'week' as ProgressTimeframe },
  { label: '1M', days: 30, tf: 'month' as ProgressTimeframe },
  { label: '3M', days: 90, tf: 'month' as ProgressTimeframe },
  { label: '6M', days: 180, tf: 'year' as ProgressTimeframe },
  { label: '12M', days: 365, tf: 'year' as ProgressTimeframe },
];

function formatKg(kg: number | null) {
  if (kg == null) return '—';
  return `${Math.round(kg * 2.205)} lb`;
}

function formatDelta(delta: number, unit: string) {
  const sign = delta > 0 ? '+' : '';
  return `${sign}${delta}${unit}`;
}

export default function ProgressHomeScreen() {
  const { c, ty, s, r } = useTokens();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const trackedView = useRef(false);

  // — Data hooks —
  const [historyRange, setHistoryRange] = useState(HISTORY_RANGES[0]);
  const timeFrame = historyRange.tf;

  const { data: snapshot, isLoading } = useProgressSnapshot(timeFrame);
  const { data: weeklyDays, isLoading: weekLoading } = useWeeklyActivity();
  const { data: profile } = useProfile();
  const { data: onboarding } = useOnboardingAnswers();
  const { data: measurements } = useMeasurements();

  // — Track screen view once —
  useEffect(() => {
    if (!trackedView.current && user) {
      trackProgressViewed({ timeframe: timeFrame });
      trackedView.current = true;
    }
  }, [user, timeFrame]);

  // — Goal Tracker row items —
  const goalItems: GoalTrackerItem[] = useMemo(() => {
    if (!snapshot) return [];
    const items: GoalTrackerItem[] = [
      {
        id: 'streak',
        label: 'Streak',
        value: `${snapshot.adherence.streakDays}`,
        subtitle: 'consecutive days',
        progress: Math.min(100, (snapshot.adherence.streakDays / 30) * 100),
        lastUpdatedIso: snapshot.dataFreshness?.consistencyLastLoggedAt || null,
        onPress: () => {
          trackProgressCtaTapped({ cta_id: 'streak_detail' });
          router.push('/(tabs)/progress/trends');
        },
      },
      {
        id: 'weight',
        label: 'Weight',
        value: formatKg(snapshot.bodyComp.currentWeightKg),
        subtitle: snapshot.bodyComp.weightDeltaKg
          ? formatDelta(Math.round(snapshot.bodyComp.weightDeltaKg * 2.205), ' lb')
          : 'No change',
        progress: Math.min(100, snapshot.bodyComp.weightTrendQualityScore),
        lastUpdatedIso: snapshot.dataFreshness?.weightLastLoggedAt || null,
        onPress: () => {
          trackProgressCtaTapped({ cta_id: 'weight_detail' });
          router.push('/(tabs)/progress/trends');
        },
      },
      {
        id: 'bodyfat',
        label: 'Body Fat',
        value: snapshot.bodyComp.bodyFatCurrent != null ? `${snapshot.bodyComp.bodyFatCurrent}%` : '—',
        subtitle: snapshot.bodyComp.bodyFatChange != null ? formatDelta(snapshot.bodyComp.bodyFatChange, '%') : 'Not tracked',
        progress: snapshot.bodyComp.bodyFatCurrent != null ? Math.min(100, (1 - snapshot.bodyComp.bodyFatCurrent / 40) * 100) : 0,
        lastUpdatedIso: snapshot.dataFreshness?.weightLastLoggedAt || null,
      },
      {
        id: 'consistency',
        label: 'Consistency',
        value: `${Math.round(snapshot.adherence.consistencyAverage)}%`,
        subtitle: `${snapshot.adherence.nutritionHitDays}/${snapshot.adherence.timeframeDays} days hit`,
        progress: snapshot.adherence.consistencyAverage,
        lastUpdatedIso: snapshot.dataFreshness?.consistencyLastLoggedAt || null,
        onPress: () => {
          trackProgressCtaTapped({ cta_id: 'consistency_detail' });
          router.push('/(tabs)/progress/daily-summary');
        },
      },
    ];
    return items;
  }, [snapshot, router]);

  // — History range handler —
  const handleRangeChange = useCallback((range: typeof HISTORY_RANGES[number]) => {
    setHistoryRange(range);
    trackProgressHistoryRangeChanged({ range: range.label, days: range.days });
  }, []);

  // — Quick-access buttons —
  const quickAccessButtons = useMemo(() => [
    { id: 'personal-records', label: 'Personal Records', icon: 'trophy-outline' as const, route: '/(tabs)/progress/personal-records' },
    { id: 'photo-compare', label: 'Compare Photos', icon: 'images-outline' as const, route: '/(tabs)/progress/photo-compare' },
    { id: 'weekly-review', label: 'Weekly Review', icon: 'calendar-outline' as const, route: '/(tabs)/progress/weekly-review' },
    { id: 'trends', label: 'Trends', icon: 'trending-up-outline' as const, route: '/(tabs)/progress/trends' },
  ], []);

  if (isLoading && !snapshot) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: c.bg }]}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: c.bg, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, { paddingHorizontal: s.lg }]}>
        <Text style={[styles.headerTitle, { color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.h3 }]}>
          Progress
        </Text>
        <Pressable
          onPress={() => {
            trackProgressCtaTapped({ cta_id: 'photos_cta' });
            router.push('/(tabs)/progress/photos');
          }}
          hitSlop={12}
        >
          <TabBarIcon name="camera-outline" color={c.primary} size={24} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: s.lg, paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ────────── 1. Weekly Activity Bar ────────── */}
        <MotiView
          from={{ opacity: 0, translateY: 10 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 400 }}
          style={styles.section}
        >
          <WeeklyActivityBar days={weeklyDays || [
            { dayLabel: 'SUN', macroGoalMet: false, workoutCompleted: false, isToday: false },
            { dayLabel: 'MON', macroGoalMet: false, workoutCompleted: false, isToday: false },
            { dayLabel: 'TUE', macroGoalMet: false, workoutCompleted: false, isToday: false },
            { dayLabel: 'WED', macroGoalMet: false, workoutCompleted: false, isToday: false },
            { dayLabel: 'THU', macroGoalMet: false, workoutCompleted: false, isToday: false },
            { dayLabel: 'FRI', macroGoalMet: false, workoutCompleted: false, isToday: false },
            { dayLabel: 'SAT', macroGoalMet: false, workoutCompleted: false, isToday: false },
          ]} />
        </MotiView>

        {/* ────────── 2. Goal Tracker Row ────────── */}
        <MotiView
          from={{ opacity: 0, translateY: 10 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 400, delay: 100 }}
        >
          <GoalTrackerRow items={goalItems} />
        </MotiView>

        {/* ────────── 3. Insights Section ────────── */}
        <MotiView
          from={{ opacity: 0, translateY: 10 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 400, delay: 200 }}
          style={styles.section}
        >
          <Text style={[styles.sectionTitle, { color: c.text, fontFamily: ty.heading.familySemibold }]}>
            Insights
          </Text>

          {/* Streak cards */}
          <View style={styles.streakRow}>
            <StreakCard
              title="Workout"
              currentStreak={snapshot?.adherence.streakDays ?? 0}
              longestStreak={snapshot?.adherence.streakDays ?? 0}
              variant="workout"
            />
            <StreakCard
              title="Nutrition"
              currentStreak={snapshot?.adherence.nutritionHitDays ?? 0}
              longestStreak={snapshot?.adherence.nutritionHitDays ?? 0}
              variant="nutrition"
            />
          </View>

          {/* Goal Benchmark Banner */}
          {snapshot?.goalBenchmark && (
            <GlassCard style={{ marginTop: 12 }}>
              <View style={styles.benchmarkRow}>
                <View style={styles.benchmarkInfo}>
                  <View style={styles.benchmarkTitleRow}>
                    <TabBarIcon
                      name={snapshot.goalBenchmark.key === 'fat_loss' ? 'flame-outline' : 'barbell-outline'}
                      color={
                        snapshot.goalBenchmark.status === 'on_track' ? c.success as string :
                          snapshot.goalBenchmark.status === 'off_track' ? '#FF5C5C' : c.textMuted as string
                      }
                      size={16}
                    />
                    <Text style={[styles.benchmarkTitle, { color: c.text, fontFamily: ty.body.familySemibold }]}>
                      {snapshot.goalBenchmark.title}
                    </Text>
                  </View>
                  <Text style={[styles.benchmarkPace, { color: c.primary, fontFamily: ty.heading.family }]}>
                    {snapshot.goalBenchmark.paceValue}
                  </Text>
                  <Text style={[styles.benchmarkDetail, { color: c.textMuted, fontFamily: ty.body.family }]}>
                    Target: {snapshot.goalBenchmark.targetBand}
                  </Text>
                </View>
                <View style={[
                  styles.statusBadge,
                  {
                    backgroundColor:
                      snapshot.goalBenchmark.status === 'on_track' ? `${c.success}20` :
                        snapshot.goalBenchmark.status === 'off_track' ? '#FF5C5C20' : `${c.textMuted}20`,
                  },
                ]}>
                  <Text style={{
                    fontSize: 10,
                    fontFamily: ty.body.familySemibold,
                    color:
                      snapshot.goalBenchmark.status === 'on_track' ? c.success :
                        snapshot.goalBenchmark.status === 'off_track' ? '#FF5C5C' : c.textMuted,
                    textTransform: 'uppercase',
                    letterSpacing: 0.8,
                  }}>
                    {snapshot.goalBenchmark.status.replace('_', ' ')}
                  </Text>
                </View>
              </View>
            </GlassCard>
          )}

          {/* Quick access buttons */}
          <View style={styles.quickAccessRow}>
            {quickAccessButtons.map((btn) => (
              <Pressable
                key={btn.id}
                style={[styles.quickAccessBtn, { backgroundColor: c.surface, borderColor: c.border }]}
                onPress={() => {
                  trackProgressCtaTapped({ cta_id: btn.id });
                  router.push(btn.route as any);
                }}
              >
                <TabBarIcon name={btn.icon} color={c.primary} size={18} />
                <Text style={[styles.quickAccessLabel, { color: c.text, fontFamily: ty.body.family }]}>
                  {btn.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </MotiView>

        {/* ────────── 4. History Section ────────── */}
        <MotiView
          from={{ opacity: 0, translateY: 10 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 400, delay: 300 }}
          style={styles.section}
        >
          <Text style={[styles.sectionTitle, { color: c.text, fontFamily: ty.heading.familySemibold }]}>
            History
          </Text>

          {/* Time-range chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {HISTORY_RANGES.map((range) => (
              <Pressable
                key={range.label}
                style={[
                  styles.chip,
                  {
                    backgroundColor: historyRange.label === range.label ? c.primary : c.surface,
                    borderColor: historyRange.label === range.label ? c.primary : c.border,
                  },
                ]}
                onPress={() => handleRangeChange(range)}
              >
                <Text style={[
                  styles.chipText,
                  {
                    color: historyRange.label === range.label ? c.bg : c.text,
                    fontFamily: ty.body.familySemibold,
                  },
                ]}>
                  {range.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Trend chart */}
          <GlassCard style={{ marginTop: 12 }}>
            <View style={styles.chartHeader}>
              <Text style={[styles.chartTitle, { color: c.text, fontFamily: ty.body.familySemibold }]}>
                Weight Trend
              </Text>
              <FreshnessChip lastUpdatedIso={snapshot?.dataFreshness?.weightLastLoggedAt || null} />
            </View>
            {snapshot?.bodyComp.weightTrendSeries && snapshot.bodyComp.weightTrendSeries.length > 0 ? (
              <WeeklyTrendChart
                title="Weight Trend"
                data={snapshot.bodyComp.weightTrendSeries.map((pt) => ({
                  day: pt.day,
                  value: Math.round(pt.value * 2.205),
                }))}
              />
            ) : (
              <View style={styles.emptyChart}>
                <TabBarIcon name="analytics-outline" color={c.textMuted} size={32} />
                <Text style={[styles.emptyChartText, { color: c.textMuted, fontFamily: ty.body.family }]}>
                  Add weigh-ins to see your trend
                </Text>
              </View>
            )}
          </GlassCard>

          {/* Performance summary */}
          {snapshot && snapshot.performance.sessions > 0 && (
            <GlassCard style={{ marginTop: 12 }}>
              <View style={styles.chartHeader}>
                <Text style={[styles.chartTitle, { color: c.text, fontFamily: ty.body.familySemibold }]}>
                  Performance
                </Text>
                <FreshnessChip lastUpdatedIso={snapshot.dataFreshness?.workoutLastSessionAt || null} />
              </View>
              <View style={styles.perfRow}>
                <View style={styles.perfStat}>
                  <Text style={[styles.perfValue, { color: c.text, fontFamily: ty.heading.family }]}>
                    {snapshot.performance.sessions}
                  </Text>
                  <Text style={[styles.perfLabel, { color: c.textMuted, fontFamily: ty.body.family }]}>Sessions</Text>
                </View>
                <View style={[styles.perfDivider, { backgroundColor: c.border }]} />
                <View style={styles.perfStat}>
                  <Text style={[styles.perfValue, { color: c.text, fontFamily: ty.heading.family }]}>
                    {Math.round(snapshot.performance.totalVolumeLb).toLocaleString()}
                  </Text>
                  <Text style={[styles.perfLabel, { color: c.textMuted, fontFamily: ty.body.family }]}>Total Vol (lb)</Text>
                </View>
                <View style={[styles.perfDivider, { backgroundColor: c.border }]} />
                <View style={styles.perfStat}>
                  <Text style={[styles.perfValue, { color: c.text, fontFamily: ty.heading.family }]}>
                    {snapshot.performance.prVelocity30d}
                  </Text>
                  <Text style={[styles.perfLabel, { color: c.textMuted, fontFamily: ty.body.family }]}>PRs (30d)</Text>
                </View>
              </View>
            </GlassCard>
          )}

          {/* Data quality flags */}
          {snapshot?.qualityFlags && snapshot.qualityFlags.some((f) => f.status !== 'good') && (
            <View style={[styles.flagsContainer, { marginTop: 12 }]}>
              {snapshot.qualityFlags
                .filter((f) => f.status !== 'good')
                .map((flag) => (
                  <View key={flag.key} style={[styles.flagBadge, { backgroundColor: flag.status === 'warn' ? '#FFB94615' : '#FF5C5C15' }]}>
                    <TabBarIcon
                      name={flag.status === 'warn' ? 'warning-outline' : 'alert-circle-outline'}
                      color={flag.status === 'warn' ? '#FFB946' : '#FF5C5C'}
                      size={14}
                    />
                    <Text style={{ color: flag.status === 'warn' ? '#FFB946' : '#FF5C5C', fontSize: 11, fontFamily: ty.body.family, flex: 1 }}>
                      {flag.message}
                    </Text>
                  </View>
                ))}
            </View>
          )}
        </MotiView>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  headerTitle: { letterSpacing: -0.5 },
  scrollContent: { gap: 20, paddingTop: 4 },
  section: { gap: 12 },
  sectionTitle: { fontSize: 18, letterSpacing: -0.3 },

  // Streak row
  streakRow: { flexDirection: 'row', gap: 10 },

  // Goal benchmark
  benchmarkRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  benchmarkInfo: { flex: 1, gap: 4 },
  benchmarkTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  benchmarkTitle: { fontSize: 13 },
  benchmarkPace: { fontSize: 20, letterSpacing: -0.5 },
  benchmarkDetail: { fontSize: 11 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },

  // Quick access
  quickAccessRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  quickAccessBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  quickAccessLabel: { fontSize: 12 },

  // Chips
  chipRow: { gap: 8, paddingVertical: 2 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16, borderWidth: 1 },
  chipText: { fontSize: 12 },

  // Chart
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  chartTitle: { fontSize: 14 },
  emptyChart: { alignItems: 'center', paddingVertical: 30, gap: 8 },
  emptyChartText: { fontSize: 13 },

  // Performance
  perfRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingVertical: 8 },
  perfStat: { alignItems: 'center' },
  perfValue: { fontSize: 20, letterSpacing: -0.5 },
  perfLabel: { fontSize: 11, marginTop: 2 },
  perfDivider: { width: 1, height: 28 },

  // Flags
  flagsContainer: { gap: 6 },
  flagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
});
