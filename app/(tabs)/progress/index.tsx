import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';

import { TabBarIcon } from '../../../components/navigation/TabBarIcon';
import { GlassCard } from '../../../components/premium/GlassCard';
import {
  GoalForecastCard,
  MacroConsistencyCard,
  PRHighlightCard,
  ProgressKpiStrip,
  ProgressRangeSelector,
  ProgressSectionShell,
  ProgressStatusHero,
  WeeklyActivityBar,
  WeeklyTrendChart,
} from '../../../components/progress';
import {
  trackProgressCardRendered,
  trackProgressCtaTapped,
  trackProgressDashboardCardTapped,
  trackProgressDashboardRangeChanged,
  trackProgressViewed,
} from '../../../lib/analytics';
import { useTokens } from '../../../lib/theme';
import {
  useProgressRecordSummary,
  useProgressSnapshot,
  useProgressTrends,
  useWeeklyActivity,
} from '../../../hooks/useProgressMetrics';
import { useOnboardingAnswers, useProfile } from '../../../hooks/useUser';
import type { ProgressRangeOption } from '../../../services/progressMetricsService';

const RANGE_OPTIONS: ProgressRangeOption[] = ['7D', '14D', '1M', '3M', '6M', '12M'];

function formatRelativeDate(iso: string | null) {
  if (!iso) return 'No recent PR';
  const timestamp = Date.parse(iso);
  if (!Number.isFinite(timestamp)) return 'Recent PR';
  const diffDays = Math.max(0, Math.floor((Date.now() - timestamp) / (1000 * 60 * 60 * 24)));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 30) return `${diffDays} days ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function parseNumeric(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export default function ProgressHomeScreen() {
  const { c, s, ty, r } = useTokens();
  const router = useRouter();
  const trackedView = useRef(false);
  const renderedRef = useRef<Record<string, boolean>>({});
  const [range, setRange] = useState<ProgressRangeOption>('14D');

  const { data: snapshot, isLoading: snapshotLoading } = useProgressSnapshot(range);
  const { data: trendSnapshot, isLoading: trendLoading } = useProgressTrends(range);
  const { data: recordSummary, isLoading: recordLoading } = useProgressRecordSummary('90d');
  const { data: weeklyActivity } = useWeeklyActivity();
  const { data: profile } = useProfile();
  const { data: onboardingAnswers } = useOnboardingAnswers();

  useEffect(() => {
    if (!trackedView.current) {
      trackProgressViewed({ source: 'progress_dashboard', range });
      trackedView.current = true;
    }
  }, [range]);

  useEffect(() => {
    ['status_hero', 'kpi_strip', 'weekly_activity', 'performance', 'trajectory'].forEach((cardId) => {
      if (!snapshot || renderedRef.current[cardId]) return;
      trackProgressCardRendered({ card_id: cardId, range });
      renderedRef.current[cardId] = true;
    });
  }, [range, snapshot]);

  const isImperial = profile?.unit_system !== 'metric';
  const weightUnit = isImperial ? 'lb' : 'kg';

  const handleRangeChange = (next: ProgressRangeOption) => {
    setRange(next);
    trackProgressDashboardRangeChanged({ range: next });
  };

  const kpiItems = useMemo(() => {
    if (!snapshot) return [];

    const currentWeight = snapshot.bodyComp.currentWeightKg;
    const displayWeight = currentWeight == null
      ? null
      : (isImperial ? currentWeight * 2.20462 : currentWeight);

    return [
      {
        id: 'weight',
        label: 'Trajectory',
        value: displayWeight != null
          ? `${Math.round(displayWeight * 10) / 10} ${weightUnit}`
          : '—',
        subtitle: snapshot.bodyComp.weightChangePercent
          ? `${snapshot.bodyComp.weightChangePercent > 0 ? '+' : ''}${snapshot.bodyComp.weightChangePercent}%`
          : 'Flat',
        icon: 'scale-outline' as const,
        lastUpdatedIso: snapshot.dataFreshness.weightLastLoggedAt,
        onPress: () => {
          trackProgressDashboardCardTapped({ card_id: 'weight', target: 'trends' });
          router.push('/(tabs)/progress/trends');
        },
      },
      {
        id: 'consistency',
        label: 'Consistency',
        value: `${Math.round(snapshot.adherence.consistencyAverage)}%`,
        subtitle: `${snapshot.adherence.nutritionHitDays}/${snapshot.adherence.timeframeDays} days hit`,
        icon: 'pulse-outline' as const,
        lastUpdatedIso: snapshot.dataFreshness.consistencyLastLoggedAt,
        onPress: () => {
          trackProgressDashboardCardTapped({ card_id: 'consistency', target: 'trends' });
          router.push('/(tabs)/progress/trends');
        },
      },
      {
        id: 'training',
        label: 'Sessions / Volume',
        value: `${snapshot.trainingSummary.sessionsThisRange}`,
        subtitle: snapshot.trainingSummary.volumeChangePercent != null
          ? `Volume ${snapshot.trainingSummary.volumeChangePercent >= 0 ? '+' : ''}${snapshot.trainingSummary.volumeChangePercent}%`
          : `${snapshot.trainingSummary.sessionsPerWeek.toFixed(1)} / week`,
        icon: 'barbell-outline' as const,
        lastUpdatedIso: snapshot.dataFreshness.workoutLastSessionAt,
        onPress: () => {
          trackProgressDashboardCardTapped({ card_id: 'training', target: 'trends' });
          router.push('/(tabs)/progress/trends');
        },
      },
      {
        id: 'prs',
        label: 'PR Pace',
        value: `${snapshot.recordSummary.prCount30d}`,
        subtitle: snapshot.recordSummary.latestPrExercise || 'No recent PR',
        icon: 'trophy-outline' as const,
        lastUpdatedIso: snapshot.recordSummary.latestPrDate,
        onPress: () => {
          trackProgressDashboardCardTapped({ card_id: 'prs', target: 'personal_records' });
          router.push('/(tabs)/progress/personal-records');
        },
      },
    ];
  }, [isImperial, router, snapshot, weightUnit]);

  const onboardingPayload = (onboardingAnswers?.answers || {}) as Record<string, unknown>;
  const targetWeightLb = parseNumeric(onboardingPayload.target_weight_lb);
  const targetDate = typeof onboardingPayload.target_date === 'string' ? onboardingPayload.target_date : '—';

  const forecastCard = useMemo(() => {
    if (!snapshot) return null;
    if (snapshot.bodySummary.forecastReadiness === 'not_ready') {
      return (
        <GlassCard style={{ padding: 18 }}>
          <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.md }}>
            Goal forecast needs more check-ins
          </Text>
          <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.sm, marginTop: s.sm }}>
            Add a few more body check-ins to make the projection trustworthy.
          </Text>
        </GlassCard>
      );
    }

    return (
        <GoalForecastCard
        startWeight={Math.round((((snapshot.bodyComp.currentWeightKg || 0) * 2.20462) - (snapshot.bodyComp.weightDeltaKg * 2.20462)) || 0)}
        currentWeight={Math.round(((snapshot.bodyComp.currentWeightKg || 0) * 2.20462) * 10) / 10}
        goalWeight={targetWeightLb || Math.round(((snapshot.bodyComp.currentWeightKg || 0) * 2.20462) * 10) / 10}
        targetDate={targetDate === '—'
          ? 'Set in onboarding'
          : new Date(targetDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        onViewProjection={() => {
          trackProgressCtaTapped({ cta_id: 'progress_goal_forecast_opened' });
          router.push('/(tabs)/progress/trends');
        }}
      />
    );
  }, [c.text, c.textMuted, router, s.sm, snapshot, targetDate, targetWeightLb, ty.body.family, ty.body.familySemibold, ty.sizes.md, ty.sizes.sm]);

  const quickActions = [
    { id: 'trends', label: 'Trends', icon: 'trending-up-outline' as const, route: '/(tabs)/progress/trends' },
    { id: 'records', label: 'Personal Records', icon: 'trophy-outline' as const, route: '/(tabs)/progress/personal-records' },
    { id: 'photos', label: 'Photos', icon: 'camera-outline' as const, route: '/(tabs)/progress/photos' },
    { id: 'review', label: 'Weekly Review', icon: 'calendar-outline' as const, route: '/(tabs)/progress/weekly-review' },
  ];

  if ((snapshotLoading || trendLoading || recordLoading) && !snapshot && !trendSnapshot) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: c.bg }]}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  return (
    <ProgressSectionShell
      title="Progress"
      primarySection="overview"
      showBackButton={false}
    >
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: s.lg, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <MotiView from={{ opacity: 0, translateY: 10 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 320 }}>
          <ProgressRangeSelector
            options={RANGE_OPTIONS}
            selected={range}
            onChange={handleRangeChange}
          />
        </MotiView>

        {snapshot ? (
          <MotiView
            from={{ opacity: 0, translateY: 12 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 360, delay: 60 }}
            style={{ marginTop: s.lg }}
          >
            <ProgressStatusHero
              status={snapshot.summary.status}
              headline={snapshot.summary.headline}
              subheadline={snapshot.summary.subheadline}
              primaryDriver={snapshot.summary.primaryDriver}
              weightLastLoggedAt={snapshot.dataFreshness.weightLastLoggedAt}
              consistencyLastLoggedAt={snapshot.dataFreshness.consistencyLastLoggedAt}
              workoutLastSessionAt={snapshot.dataFreshness.workoutLastSessionAt}
            />
          </MotiView>
        ) : null}

        <MotiView
          from={{ opacity: 0, translateY: 12 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 360, delay: 120 }}
          style={{ marginTop: s.lg }}
        >
          <ProgressKpiStrip items={kpiItems} />
        </MotiView>

        <MotiView
          from={{ opacity: 0, translateY: 12 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 360, delay: 180 }}
          style={{ marginTop: s.lg }}
        >
          <WeeklyActivityBar
            days={weeklyActivity || [
              { dayLabel: 'SUN', macroGoalMet: false, workoutCompleted: false, isToday: false, date: '' },
              { dayLabel: 'MON', macroGoalMet: false, workoutCompleted: false, isToday: false, date: '' },
              { dayLabel: 'TUE', macroGoalMet: false, workoutCompleted: false, isToday: false, date: '' },
              { dayLabel: 'WED', macroGoalMet: false, workoutCompleted: false, isToday: false, date: '' },
              { dayLabel: 'THU', macroGoalMet: false, workoutCompleted: false, isToday: false, date: '' },
              { dayLabel: 'FRI', macroGoalMet: false, workoutCompleted: false, isToday: false, date: '' },
              { dayLabel: 'SAT', macroGoalMet: false, workoutCompleted: false, isToday: false, date: '' },
            ]}
          />
        </MotiView>

        <MotiView
          from={{ opacity: 0, translateY: 12 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 360, delay: 240 }}
          style={{ marginTop: s.xl }}
        >
          <Text style={[styles.sectionTitle, { color: c.text, fontFamily: ty.heading.familySemibold }]}>
            Performance
          </Text>
          {recordSummary?.highlight ? (
            <Pressable
              onPress={() => {
                trackProgressCtaTapped({ cta_id: 'progress_pr_highlight_opened' });
                router.push('/(tabs)/progress/personal-records');
              }}
            >
              <PRHighlightCard
                exercise={recordSummary.highlight.exercise}
                value={recordSummary.highlight.value}
                unit={recordSummary.highlight.unit}
                previousBest={recordSummary.highlight.previousBest ?? recordSummary.highlight.value}
                improvement={recordSummary.highlight.improvementPercent ?? 0}
                date={formatRelativeDate(recordSummary.highlight.date)}
                isNew={recordSummary.highlight.isNew}
              />
            </Pressable>
          ) : (
            <GlassCard style={{ padding: 18 }}>
              <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.md }}>
                No recent PRs yet
              </Text>
              <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.sm, marginTop: s.sm }}>
                Keep logging quality sessions and this section will surface your strongest lifts.
              </Text>
            </GlassCard>
          )}

          {trendSnapshot ? (
            <>
              <View style={{ marginTop: s.md }}>
                <WeeklyTrendChart
                  title="Training Volume"
                  data={trendSnapshot.volumeSeries}
                  targetValue={Math.max(
                    1,
                    Math.round(trendSnapshot.volumeSeries.reduce((sum, point) => sum + point.value, 0) / Math.max(1, trendSnapshot.volumeSeries.length)),
                  )}
                  changePercent={Math.abs(trendSnapshot.trainingSummary.volumeChangePercent || 0)}
                  changeDirection={(trendSnapshot.trainingSummary.volumeChangePercent || 0) >= 0 ? 'up' : 'down'}
                  emptyBehavior="min-bar"
                />
              </View>
              <GlassCard style={{ padding: 16, marginTop: s.md }}>
                <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.sm, textAlign: 'center' }}>
                  {trendSnapshot.trainingSummary.sessionsThisRange} sessions in {range} · {trendSnapshot.trainingSummary.sessionsPerWeek.toFixed(1)} / week · Avg duration {trendSnapshot.trainingSummary.avgDurationMinutes} min
                </Text>
              </GlassCard>
            </>
          ) : null}
        </MotiView>

        <MotiView
          from={{ opacity: 0, translateY: 12 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 360, delay: 300 }}
          style={{ marginTop: s.xl }}
        >
          <Text style={[styles.sectionTitle, { color: c.text, fontFamily: ty.heading.familySemibold }]}>
            Trajectory
          </Text>
          {forecastCard}

          {snapshot && snapshot.adherence.macroConsistencyScore > 0 ? (
            <View style={{ marginTop: s.md }}>
              <MacroConsistencyCard
                overallScore={snapshot.adherence.macroConsistencyScore}
                proteinPercent={snapshot.adherence.proteinPercent}
                carbsPercent={snapshot.adherence.carbsPercent}
                fatPercent={snapshot.adherence.fatPercent}
                onViewAnalytics={() => {
                  trackProgressCtaTapped({ cta_id: 'progress_macro_consistency_opened' });
                  router.push('/(tabs)/progress/trends');
                }}
              />
            </View>
          ) : (
            <GlassCard style={{ padding: 18, marginTop: s.md }}>
              <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.md }}>
                Macro consistency needs more meals logged
              </Text>
              <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.sm, marginTop: s.sm }}>
                Once you have a few days of food logging, this section will show how close your protein, carb, and fat intake is to target.
              </Text>
            </GlassCard>
          )}
        </MotiView>

        <MotiView
          from={{ opacity: 0, translateY: 12 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 360, delay: 360 }}
          style={{ marginTop: s.xl }}
        >
          <Text style={[styles.sectionTitle, { color: c.text, fontFamily: ty.heading.familySemibold }]}>
            Explore
          </Text>
          <View style={[styles.quickGrid, { gap: s.sm, marginTop: s.md }]}>
            {quickActions.map((action) => (
              <Pressable
                key={action.id}
                onPress={() => {
                  trackProgressCtaTapped({ cta_id: `progress_quick_${action.id}` });
                  router.push(action.route as never);
                }}
                style={[
                  styles.quickCard,
                  {
                    backgroundColor: c.surface,
                    borderColor: c.border,
                    borderRadius: r.lg,
                    padding: s.md,
                  },
                ]}
              >
                <View style={[styles.quickIconWrap, { backgroundColor: `${c.primary}12` }]}>
                  <TabBarIcon name={action.icon} color={c.primary} size={18} />
                </View>
                <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm, marginTop: s.sm }}>
                  {action.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </MotiView>
      </ScrollView>
    </ProgressSectionShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    letterSpacing: -0.3,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  quickCard: {
    width: '48%',
    borderWidth: 1,
  },
  quickIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
