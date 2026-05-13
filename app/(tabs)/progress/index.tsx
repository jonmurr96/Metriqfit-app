import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';

import { TabBarIcon } from '../../../components/navigation/TabBarIcon';
import { GlassCard } from '../../../components/premium/GlassCard';
import { SubscriptionFeatureGate } from '../../../components/premium/SubscriptionFeatureGate';
import {
  GoalProgressHero,
  ProgressRangeSelector,
  ProgressSectionShell,
  WeeklyTrendChart,
} from '../../../components/progress';
import {
  trackEvent,
  trackProgressCardRendered,
  trackProgressCtaTapped,
  trackProgressDashboardCardTapped,
  trackProgressDashboardRangeChanged,
  trackProgressViewed,
} from '../../../lib/analytics';
import { useFeatureAccess } from '../../../hooks/useSubscription';
import { useTokens } from '../../../lib/theme';
import {
  useProgressSnapshot,
  useProgressTrends,
} from '../../../hooks/useProgressMetrics';
import { useLatestBodyCheckInStatus } from '../../../hooks/useProgressBody';
import { useLevelProgressDisplay } from '../../../hooks/useGamification';
import { useOnboardingAnswers, useProfile } from '../../../hooks/useUser';
import { useAuth } from '../../../lib/auth/AuthProvider';
import type { ProgressRangeOption } from '../../../services/progressMetricsService';

const RANGE_OPTIONS: ProgressRangeOption[] = ['7D', '14D', '1M', '3M', '6M', '12M'];

function parseNumeric(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function kgToLb(value: number | null | undefined) {
  return value == null ? null : value * 2.20462;
}

function lbToKg(value: number | null | undefined) {
  return value == null ? null : value / 2.20462;
}

function formatDateLabel(iso: unknown) {
  if (typeof iso !== 'string') return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatPercent(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return '--';
  return `${Math.round(value)}%`;
}

function formatRelativeDate(iso: string | null | undefined) {
  if (!iso) return 'No data';
  const timestamp = Date.parse(iso);
  if (!Number.isFinite(timestamp)) return 'No data';
  const diffDays = Math.max(0, Math.floor((Date.now() - timestamp) / (1000 * 60 * 60 * 24)));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return '1d ago';
  if (diffDays < 30) return `${diffDays}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function hasCompletedWeightGoal(startWeightLb: number | null, currentWeightLb: number | null, goalWeightLb: number | null) {
  if (startWeightLb == null || currentWeightLb == null || goalWeightLb == null) return false;
  if (!Number.isFinite(startWeightLb) || !Number.isFinite(currentWeightLb) || !Number.isFinite(goalWeightLb)) return false;
  if (Math.abs(goalWeightLb - startWeightLb) < 0.5) return false;
  return goalWeightLb > startWeightLb
    ? currentWeightLb >= goalWeightLb - 0.25
    : currentWeightLb <= goalWeightLb + 0.25;
}

interface MetricCardProps {
  label: string;
  value: string;
  meta: string;
  icon: React.ComponentProps<typeof TabBarIcon>['name'];
  tone?: 'primary' | 'success' | 'warning';
  onPress?: () => void;
}

function MetricCard({ label, value, meta, icon, tone = 'primary', onPress }: MetricCardProps) {
  const { c, s, ty, r } = useTokens();
  const toneColor = tone === 'success' ? c.success : tone === 'warning' ? c.warning : c.primary;
  const Content = (
    <GlassCard style={{ ...styles.metricCard, padding: s.md }}>
      <View style={styles.metricTopRow}>
        <View style={[styles.metricIcon, { backgroundColor: `${toneColor}14` }]}>
          <TabBarIcon name={icon} color={toneColor} size={18} />
        </View>
        <Text style={{ color: c.textMuted, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs }}>
          {label.toUpperCase()}
        </Text>
      </View>
      <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: 25, marginTop: s.md }}>
        {value}
      </Text>
      <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.xs, marginTop: 4 }}>
        {meta}
      </Text>
    </GlassCard>
  );

  if (!onPress) {
    return <View style={styles.metricPressable}>{Content}</View>;
  }
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [{ borderRadius: r.lg, opacity: pressed ? 0.78 : 1 }, styles.metricPressable]}
    >
      {Content}
    </Pressable>
  );
}

export default function ProgressHomeScreen() {
  const { c, s, ty, r } = useTokens();
  const router = useRouter();
  const { user } = useAuth();
  const trackedView = useRef(false);
  const renderedRef = useRef<Record<string, boolean>>({});
  const goalPromptRef = useRef<string | null>(null);
  const [completedGoalPromptKey, setCompletedGoalPromptKey] = useState<string | null>(null);
  const [range, setRange] = useState<ProgressRangeOption>('14D');

  const { data: snapshot, isLoading: snapshotLoading } = useProgressSnapshot(range);
  const { data: trendSnapshot, isLoading: trendLoading } = useProgressTrends(range);
  const { data: profile } = useProfile();
  const { data: onboardingAnswers } = useOnboardingAnswers();
  const { data: bodyStatus } = useLatestBodyCheckInStatus();
  const { data: levelProgress } = useLevelProgressDisplay();
  const analyticsAccess = useFeatureAccess('advanced_analytics');

  useEffect(() => {
    if (!trackedView.current) {
      trackProgressViewed({ source: 'progress_dashboard', range });
      trackedView.current = true;
    }
  }, [range]);

  useEffect(() => {
    ['goal_progress', 'performance_grid', 'nutrition_adherence', 'body_checkin'].forEach((cardId) => {
      if (!snapshot || renderedRef.current[cardId]) return;
      trackProgressCardRendered({ card_id: cardId, range });
      renderedRef.current[cardId] = true;
    });
  }, [range, snapshot]);

  useEffect(() => {
    if (!analyticsAccess.isLoading && !analyticsAccess.hasAccess) {
      trackEvent('feature_gate_viewed', {
        feature: 'advanced_analytics',
        source: 'progress_dashboard',
        required_tier: analyticsAccess.upgradeTier,
      });
    }
  }, [analyticsAccess.hasAccess, analyticsAccess.isLoading, analyticsAccess.upgradeTier]);

  const isImperial = profile?.unit_system !== 'metric';
  const weightUnit = isImperial ? 'lb' : 'kg';
  const onboardingPayload = (onboardingAnswers?.answers || {}) as Record<string, unknown>;
  const startWeightLb = parseNumeric(onboardingPayload.current_weight_lb);
  const goalWeightLb = parseNumeric(onboardingPayload.target_weight_lb);
  const targetDateLabel = formatDateLabel(onboardingPayload.target_date);

  const latestWeightKg = profile?.current_weight_kg ?? snapshot?.bodyComp.currentWeightKg ?? null;
  const currentWeightLb = latestWeightKg == null ? null : kgToLb(latestWeightKg);
  const currentWeight = isImperial
    ? kgToLb(latestWeightKg)
    : latestWeightKg;
  const startWeight = isImperial ? startWeightLb : lbToKg(startWeightLb);
  const goalWeight = isImperial ? goalWeightLb : lbToKg(goalWeightLb);
  const trendDelta = isImperial ? kgToLb(snapshot?.bodyComp.weightDeltaKg) : snapshot?.bodyComp.weightDeltaKg ?? null;
  const trendLabel = trendDelta == null || Math.abs(trendDelta) < 0.1
    ? 'Flat recently'
    : `${trendDelta > 0 ? '+' : ''}${Math.round(trendDelta * 10) / 10} ${weightUnit} in ${range}`;

  useEffect(() => {
    if (!user?.id || !hasCompletedWeightGoal(startWeightLb, currentWeightLb, goalWeightLb)) return;

    const promptKey = `progress-goal-completed:${user.id}:${Math.round((startWeightLb || 0) * 10)}:${Math.round((goalWeightLb || 0) * 10)}`;
    if (goalPromptRef.current === promptKey) return;
    goalPromptRef.current = promptKey;

    let isMounted = true;
    AsyncStorage.getItem(promptKey)
      .then((stored) => {
        if (!isMounted || stored === '1') return;
        setCompletedGoalPromptKey(promptKey);
      })
      .catch(() => undefined);

    return () => {
      isMounted = false;
    };
  }, [currentWeightLb, goalWeightLb, router, startWeightLb, user?.id]);

  const handleRangeChange = (next: ProgressRangeOption) => {
    setRange(next);
    trackProgressDashboardRangeChanged({ range: next });
  };

  const dismissCompletedGoalPrompt = async () => {
    const promptKey = completedGoalPromptKey;
    setCompletedGoalPromptKey(null);
    if (promptKey) {
      await AsyncStorage.setItem(promptKey, '1').catch(() => undefined);
    }
  };

  const openNextGoalPrompt = async () => {
    await dismissCompletedGoalPrompt();
    router.push('/set-weight-goal-sheet' as any);
  };

  const performanceCards = useMemo(() => {
    if (!snapshot) return [];
    return [
      {
        label: 'Sessions',
        value: `${snapshot.trainingSummary.sessionsThisRange}`,
        meta: `${snapshot.trainingSummary.sessionsPerWeek.toFixed(1)} / week`,
        icon: 'barbell-outline' as const,
        onPress: () => {
          trackProgressDashboardCardTapped({ card_id: 'sessions', target: 'trends' });
          router.push('/(tabs)/progress/trends');
        },
      },
      {
        label: 'Volume',
        value: `${Math.round(snapshot.performance.totalVolumeLb).toLocaleString()} lb`,
        meta: snapshot.trainingSummary.volumeChangePercent == null
          ? `${snapshot.performance.totalSets} sets`
          : `${snapshot.trainingSummary.volumeChangePercent >= 0 ? '+' : ''}${snapshot.trainingSummary.volumeChangePercent}% vs prior`,
        icon: 'stats-chart-outline' as const,
        onPress: () => {
          trackProgressDashboardCardTapped({ card_id: 'volume', target: 'trends' });
          router.push('/(tabs)/progress/trends');
        },
      },
      {
        label: 'PR Pace',
        value: `${snapshot.recordSummary.prCount30d}`,
        meta: snapshot.recordSummary.latestPrExercise || 'No recent PR',
        icon: 'trophy-outline' as const,
        tone: 'success' as const,
        onPress: () => {
          trackProgressDashboardCardTapped({ card_id: 'prs', target: 'personal_records' });
          router.push('/(tabs)/progress/personal-records');
        },
      },
      {
        label: 'XP Level',
        value: levelProgress ? `L${levelProgress.current_level}` : '--',
        meta: levelProgress
          ? levelProgress.is_max_level
            ? 'Max level'
            : `${levelProgress.xp_to_next_level} XP to next`
          : 'No XP yet',
        icon: 'sparkles-outline' as const,
        tone: 'primary' as const,
      },
    ];
  }, [levelProgress, router, snapshot]);

  const detailCards = [
    { id: 'trends', label: 'Trends', meta: 'Weight, volume, nutrition', icon: 'trending-up-outline' as const, route: '/(tabs)/progress/trends' },
    { id: 'records', label: 'Records', meta: 'PR timeline and best lifts', icon: 'trophy-outline' as const, route: '/(tabs)/progress/personal-records' },
    { id: 'photos', label: 'Body', meta: 'Check-ins and photo compare', icon: 'camera-outline' as const, route: '/(tabs)/progress/photos' },
    { id: 'review', label: 'Weekly Review', meta: 'Scorecard and next focus', icon: 'calendar-outline' as const, route: '/(tabs)/progress/weekly-review' },
  ];

  if ((snapshotLoading || trendLoading || analyticsAccess.isLoading) && !snapshot && !trendSnapshot) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: c.bg }]}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  if (!analyticsAccess.hasAccess) {
    return (
      <ProgressSectionShell
        title="Progress"
        primarySection="overview"
        showBackButton={false}
        showPrimaryNav={false}
      >
        <View style={{ paddingHorizontal: s.lg, paddingTop: s.lg }}>
          <SubscriptionFeatureGate
            requiredTier={analyticsAccess.upgradeTier}
            title="Advanced progress analytics are on Premium"
            subtitle="Unlock goal progress, body trends, performance velocity, and weekly review."
          />
        </View>
      </ProgressSectionShell>
    );
  }

  return (
    <ProgressSectionShell
      title="Progress"
      primarySection="overview"
      showBackButton={false}
      showPrimaryNav={false}
    >
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: s.lg, paddingBottom: 148 }}
        showsVerticalScrollIndicator={false}
      >
        <MotiView from={{ opacity: 0, translateY: 10 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 320 }}>
          <GoalProgressHero
            startWeight={startWeight}
            currentWeight={currentWeight}
            goalWeight={goalWeight}
            unit={weightUnit}
            targetDateLabel={targetDateLabel}
            trendLabel={trendLabel}
            onLogWeight={() => {
              trackProgressCtaTapped({ cta_id: 'progress_goal_log_weight' });
              router.push('/log-weight-sheet');
            }}
            onEditGoal={() => {
              trackProgressCtaTapped({ cta_id: 'progress_goal_edit_goal' });
              router.push('/set-weight-goal-sheet' as any);
            }}
          />
        </MotiView>

        <MotiView
          from={{ opacity: 0, translateY: 12 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 340, delay: 80 }}
          style={{ marginTop: s.lg }}
        >
          <View style={styles.rangeHeader}>
            <View>
              <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.lg }}>
                Analytics window
              </Text>
              <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.xs, marginTop: 3 }}>
                Applies below. Goal progress stays lifetime.
              </Text>
            </View>
          </View>
          <View style={{ marginTop: s.sm }}>
            <ProgressRangeSelector options={RANGE_OPTIONS} selected={range} onChange={handleRangeChange} />
          </View>
        </MotiView>

        {snapshot ? (
          <>
            <MotiView
              from={{ opacity: 0, translateY: 12 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'timing', duration: 340, delay: 140 }}
              style={{ marginTop: s.xl }}
            >
              <Text style={[styles.sectionTitle, { color: c.text, fontFamily: ty.heading.familySemibold }]}>
                Performance
              </Text>
              <View style={[styles.metricGrid, { gap: s.sm, marginTop: s.md }]}>
                {performanceCards.map((item) => (
                  <MetricCard key={item.label} {...item} />
                ))}
              </View>
            </MotiView>

            {trendSnapshot ? (
              <MotiView
                from={{ opacity: 0, translateY: 12 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'timing', duration: 340, delay: 200 }}
                style={{ marginTop: s.lg }}
              >
                <WeeklyTrendChart
                  title="Training Volume"
                  data={trendSnapshot.volumeSeries}
                  targetValue={Math.max(
                    1,
                    Math.round(
                      trendSnapshot.volumeSeries.reduce((sum, point) => sum + point.value, 0) /
                      Math.max(1, trendSnapshot.volumeSeries.length),
                    ),
                  )}
                  changePercent={Math.abs(trendSnapshot.trainingSummary.volumeChangePercent || 0)}
                  changeDirection={(trendSnapshot.trainingSummary.volumeChangePercent || 0) >= 0 ? 'up' : 'down'}
                  emptyBehavior="min-bar"
                />
              </MotiView>
            ) : null}

            <MotiView
              from={{ opacity: 0, translateY: 12 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'timing', duration: 340, delay: 260 }}
              style={{ marginTop: s.xl }}
            >
              <Text style={[styles.sectionTitle, { color: c.text, fontFamily: ty.heading.familySemibold }]}>
                Nutrition
              </Text>
              <GlassCard style={{ padding: 18, marginTop: s.md }}>
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.md }}>
                      Macro adherence
                    </Text>
                    <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.xs, marginTop: 4 }}>
                      {snapshot.adherence.nutritionHitDays}/{snapshot.adherence.timeframeDays} days hit in {range}
                    </Text>
                  </View>
                  <Text style={{ color: c.primary, fontFamily: ty.heading.familySemibold, fontSize: 28 }}>
                    {formatPercent(snapshot.adherence.macroConsistencyScore || snapshot.adherence.consistencyAverage)}
                  </Text>
                </View>
                <View style={[styles.macroRow, { gap: s.sm, marginTop: s.lg }]}>
                  <MacroPill label="Protein" value={snapshot.adherence.proteinPercent} color={c.primary} />
                  <MacroPill label="Carbs" value={snapshot.adherence.carbsPercent} color={c.warning} />
                  <MacroPill label="Fat" value={snapshot.adherence.fatPercent} color={c.accent} />
                </View>
                <Pressable
                  onPress={() => {
                    trackProgressDashboardCardTapped({ card_id: 'nutrition', target: 'trends' });
                    router.push('/(tabs)/progress/trends');
                  }}
                  style={[styles.textButton, { marginTop: s.lg }]}
                >
                  <Text style={{ color: c.primary, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm }}>
                    View nutrition trends
                  </Text>
                  <TabBarIcon name="chevron-forward" color={c.primary} size={16} />
                </Pressable>
              </GlassCard>
            </MotiView>

            <MotiView
              from={{ opacity: 0, translateY: 12 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'timing', duration: 340, delay: 320 }}
              style={{ marginTop: s.xl }}
            >
              <Text style={[styles.sectionTitle, { color: c.text, fontFamily: ty.heading.familySemibold }]}>
                Body
              </Text>
              <GlassCard style={{ padding: 18, marginTop: s.md }}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.md }}>
                      Check-in status
                    </Text>
                    <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.xs, marginTop: 4 }}>
                      Latest {formatRelativeDate(bodyStatus?.latestCheckInAt)}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { borderRadius: r.pill, backgroundColor: `${c.primary}14` }]}>
                    <Text style={{ color: c.primary, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs }}>
                      {bodyStatus?.latestPhotoCheckpointCount || 0} saved
                    </Text>
                  </View>
                </View>
                <View style={[styles.bodyStatsRow, { marginTop: s.lg }]}>
                  <View>
                    <Text style={{ color: c.textMuted, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs }}>Weight</Text>
                    <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.md, marginTop: 4 }}>
                      {currentWeight == null ? '--' : `${Math.round(currentWeight * 10) / 10} ${weightUnit}`}
                    </Text>
                  </View>
                  <View>
                    <Text style={{ color: c.textMuted, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs }}>Body fat</Text>
                    <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.md, marginTop: 4 }}>
                      {bodyStatus?.latestBodyFatPercentage == null ? '--' : `${bodyStatus.latestBodyFatPercentage}%`}
                    </Text>
                  </View>
                  <View>
                    <Text style={{ color: c.textMuted, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs }}>Readiness</Text>
                    <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.md, marginTop: 4 }}>
                      {snapshot.bodySummary.forecastReadiness === 'ready' ? 'Ready' : 'Needs data'}
                    </Text>
                  </View>
                </View>
                <Pressable
                  onPress={() => {
                    trackProgressDashboardCardTapped({ card_id: 'body', target: 'photos' });
                    router.push('/(tabs)/progress/photos');
                  }}
                  style={[styles.textButton, { marginTop: s.lg }]}
                >
                  <Text style={{ color: c.primary, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm }}>
                    Open body timeline
                  </Text>
                  <TabBarIcon name="chevron-forward" color={c.primary} size={16} />
                </Pressable>
              </GlassCard>
            </MotiView>
          </>
        ) : null}

        <MotiView
          from={{ opacity: 0, translateY: 12 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 340, delay: 380 }}
          style={{ marginTop: s.xl }}
        >
          <Text style={[styles.sectionTitle, { color: c.text, fontFamily: ty.heading.familySemibold }]}>
            Explore
          </Text>
          <View style={[styles.detailGrid, { gap: s.sm, marginTop: s.md }]}>
            {detailCards.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => {
                  trackProgressCtaTapped({ cta_id: `progress_open_${item.id}` });
                  router.push(item.route as any);
                }}
                style={({ pressed }) => [
                  styles.detailCard,
                  {
                    backgroundColor: c.surface,
                    borderColor: c.border,
                    borderRadius: r.lg,
                    opacity: pressed ? 0.78 : 1,
                  },
                ]}
              >
                <View style={[styles.detailIcon, { backgroundColor: `${c.primary}12` }]}>
                  <TabBarIcon name={item.icon} color={c.primary} size={18} />
                </View>
                <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm, marginTop: s.md }}>
                  {item.label}
                </Text>
                <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.xs, marginTop: 4 }}>
                  {item.meta}
                </Text>
              </Pressable>
            ))}
          </View>
        </MotiView>
      </ScrollView>
      <Modal
        visible={!!completedGoalPromptKey}
        transparent
        animationType="fade"
        onRequestClose={dismissCompletedGoalPrompt}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.goalModal,
              {
                backgroundColor: c.surface,
                borderColor: c.border,
                borderRadius: r.xl,
                padding: s.xl,
              },
            ]}
          >
            <View style={[styles.goalModalIcon, { backgroundColor: `${c.success}18` }]}>
              <TabBarIcon name="trophy" color={c.success} size={26} />
            </View>
            <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: 28, marginTop: s.lg, textAlign: 'center' }}>
              Congratulations!
            </Text>
            <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.sm, lineHeight: 21, marginTop: s.sm, textAlign: 'center' }}>
              You hit your weight goal. Set the next target so your calories, macros, and progress tracking keep moving with you.
            </Text>
            <Pressable
              onPress={openNextGoalPrompt}
              style={[styles.goalModalPrimary, { backgroundColor: c.primary, borderRadius: r.md, marginTop: s.xl }]}
            >
              <Text style={{ color: c.bg, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.md }}>
                Set New Goal
              </Text>
            </Pressable>
            <Pressable onPress={dismissCompletedGoalPrompt} style={styles.goalModalSecondary}>
              <Text style={{ color: c.textMuted, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm }}>
                Later
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ProgressSectionShell>
  );
}

function MacroPill({ label, value, color }: { label: string; value: number; color: string }) {
  const { c, ty, r } = useTokens();
  return (
    <View style={[styles.macroPill, { borderRadius: r.md, backgroundColor: c.surface2 }]}>
      <Text style={{ color, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm }}>
        {formatPercent(value)}
      </Text>
      <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: 11, marginTop: 3 }}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rangeHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 20,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  metricPressable: {
    width: '48.5%',
  },
  metricCard: {
    width: '100%',
    minHeight: 138,
  },
  metricTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  metricIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 14,
  },
  macroRow: {
    flexDirection: 'row',
  },
  macroPill: {
    flex: 1,
    minHeight: 58,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  bodyStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  detailCard: {
    width: '48.5%',
    borderWidth: 1,
    minHeight: 128,
    padding: 16,
  },
  detailIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: 'rgba(0,0,0,0.62)',
  },
  goalModal: {
    width: '100%',
    maxWidth: 420,
    borderWidth: 1,
    alignItems: 'center',
  },
  goalModalIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalModalPrimary: {
    minHeight: 52,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalModalSecondary: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
});
