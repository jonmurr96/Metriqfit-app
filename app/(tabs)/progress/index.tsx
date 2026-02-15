import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { useTokens } from '../../../lib/theme';
import { TabBarIcon } from '../../../components/navigation/TabBarIcon';
import { RingIconButton } from '../../../components/common/RingIconButton';
import {
  TimeFrameTabs,
  GoalForecastCard,
  WeeklyTrendChart,
} from '../../../components/progress';
import { useMeasurements, useOnboardingAnswers, useProfile } from '../../../hooks/useUser';
import { useComputePlanConsistency, useConsistencyHistory } from '../../../hooks/usePlan';
import { usePrepCoachState, useRevertPrepAdjustment } from '../../../hooks/usePrepCoach';

type TimeFrame = 'week' | 'month' | 'year';

function getPrepRateBounds(
  discipline: 'bodybuilding' | 'powerlifting' | null | undefined,
  phase: 'cut' | 'bulk' | null | undefined,
) {
  if (!discipline || !phase) return null;
  if (discipline === 'bodybuilding' && phase === 'cut') return { min: -0.8, max: -0.4 };
  if (discipline === 'bodybuilding' && phase === 'bulk') return { min: 0.2, max: 0.5 };
  if (discipline === 'powerlifting' && phase === 'cut') return { min: -0.6, max: -0.25 };
  if (discipline === 'powerlifting' && phase === 'bulk') return { min: 0.15, max: 0.35 };
  return null;
}

export default function ProgressHomeScreen() {
  const { c, s, ty, r } = useTokens();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('week');

  // Fetch Data
  const { data: profile } = useProfile();
  const { data: onboardingAnswers } = useOnboardingAnswers();
  const { data: measurements, isLoading } = useMeasurements(30);
  const { data: consistencyHistory } = useConsistencyHistory(7);
  const { data: prepState } = usePrepCoachState();
  const revertPrepAdjustmentMutation = useRevertPrepAdjustment();
  const computeConsistencyMutation = useComputePlanConsistency();

  useEffect(() => {
    computeConsistencyMutation.mutate({ days: 7 });
    // run once on screen mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Quick Access ring icons
  const quickLinks = [
    { label: 'History', icon: 'time-outline', onPress: () => router.push('/(tabs)/workout/workout-history') },
    { label: 'Log Weight', icon: 'scale-outline', onPress: () => router.push('/log-weight-sheet') },
    { label: 'Records', icon: 'trophy-outline', onPress: () => router.push('/(tabs)/progress/personal-records') },
    { label: 'Photos', icon: 'camera-outline', onPress: () => router.push('/(tabs)/progress/photos' as any) },
  ];

  // Unit conversion: respect user preference
  const isImperial = profile?.unit_system === 'imperial';
  const toDisplayWeight = (kg: number) => isImperial ? kg * 2.20462 : kg;
  const weightUnit = isImperial ? 'lbs' : 'kg';

  // Process data for chart
  const weightData = (measurements || [])
    .slice(0, 7) // Last 7 entries
    .reverse()
    .map(m => ({
      day: new Date(m.logged_at).toLocaleDateString('en-US', { weekday: 'narrow' }),
      value: Math.round(toDisplayWeight(m.weight_kg) * 10) / 10,
      isToday: new Date(m.logged_at).getDate() === new Date().getDate(),
    }));

  const currentWeight = toDisplayWeight(profile?.current_weight_kg || 0);
  const onboardingPayload = (onboardingAnswers?.answers || {}) as Record<string, unknown>;
  const parseNumeric = (value: unknown): number | null => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  };
  const targetWeightEnabled = onboardingPayload.target_weight_enabled === true;
  const targetWeightLb = parseNumeric(onboardingPayload.target_weight_lb);
  const targetWeightDate = typeof onboardingPayload.target_date === 'string'
    ? onboardingPayload.target_date
    : null;
  const goalWeight = targetWeightEnabled && targetWeightLb
    ? (isImperial ? targetWeightLb : targetWeightLb * 0.453592)
    : currentWeight;
  const hasGoalWeight = targetWeightEnabled && !!targetWeightLb;

  // Calculate actual weight change percent from first to last measurement
  const weightChangePercent = useMemo(() => {
    if (!measurements || measurements.length < 2) return 0;
    const oldest = measurements[measurements.length - 1].weight_kg;
    const newest = measurements[0].weight_kg;
    if (oldest === 0) return 0;
    return Math.round(((newest - oldest) / oldest) * 1000) / 10; // 1 decimal place
  }, [measurements]);

  const hasData = measurements && measurements.length > 0;
  const consistencyAverage = useMemo(() => {
    if (!consistencyHistory?.length) return 0;
    return consistencyHistory.reduce((sum, row) => sum + Number(row.overall_score || 0), 0) / consistencyHistory.length;
  }, [consistencyHistory]);

  const consistencyTrend = useMemo(() => {
    return (consistencyHistory || []).map((row) => ({
      day: new Date(row.log_date).toLocaleDateString('en-US', { weekday: 'narrow' }),
      value: Number(row.overall_score || 0),
      isToday: row.log_date === new Date().toISOString().split('T')[0],
    }));
  }, [consistencyHistory]);

  const consistencyChangePercent = useMemo(() => {
    if (!consistencyHistory || consistencyHistory.length < 2) return 0;
    const latest = Number(consistencyHistory[0].overall_score || 0);
    const earliest = Number(consistencyHistory[consistencyHistory.length - 1].overall_score || 0);
    if (earliest === 0) return 0;
    return Math.round(((latest - earliest) / earliest) * 1000) / 10;
  }, [consistencyHistory]);

  // Calculate estimated target date based on weight trend
  const targetDate = useMemo(() => {
    if (!hasGoalWeight) return 'Set goal in onboarding';
    if (targetWeightDate) {
      const date = new Date(targetWeightDate);
      if (!Number.isNaN(date.getTime())) {
        return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      }
    }
    if (!measurements || measurements.length < 2) return 'Add more weigh-ins';
    const oldest = measurements[measurements.length - 1];
    const newest = measurements[0];
    const daysBetween = Math.max(
      1,
      (new Date(newest.logged_at).getTime() - new Date(oldest.logged_at).getTime()) / (1000 * 60 * 60 * 24)
    );
    const weightDiffKg = newest.weight_kg - oldest.weight_kg;
    const ratePerDay = weightDiffKg / daysBetween; // kg per day (negative = losing)
    const remainingKg = (currentWeight / (isImperial ? 2.20462 : 1)) - (goalWeight / (isImperial ? 2.20462 : 1));
    if (ratePerDay >= 0 || Math.abs(ratePerDay) < 0.001) return 'Maintain pace';
    const daysToGoal = Math.abs(remainingKg / ratePerDay);
    if (daysToGoal > 365 * 3) return '3+ years';
    const projected = new Date();
    projected.setDate(projected.getDate() + Math.ceil(daysToGoal));
    return projected.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }, [measurements, currentWeight, goalWeight, hasGoalWeight, isImperial, targetWeightDate]);

  const prepRateBounds = useMemo(
    () => getPrepRateBounds(prepState?.discipline, prepState?.phase),
    [prepState?.discipline, prepState?.phase],
  );

  const actualWeeklyRate = useMemo(() => {
    if (!measurements || measurements.length < 2) return null;
    const latest = measurements[0];
    const previous = measurements[1];
    const daysBetween = Math.max(
      1,
      (new Date(latest.logged_at).getTime() - new Date(previous.logged_at).getTime()) / (1000 * 60 * 60 * 24),
    );
    const weeklyMultiplier = 7 / daysBetween;
    if (!previous.weight_kg) return null;
    return (((latest.weight_kg - previous.weight_kg) / previous.weight_kg) * 100) * weeklyMultiplier;
  }, [measurements]);

  const prepAdherenceConfidence = useMemo(() => {
    if (!prepState?.enabled || actualWeeklyRate === null || !prepRateBounds) return null;
    const inBand = actualWeeklyRate >= prepRateBounds.min && actualWeeklyRate <= prepRateBounds.max;
    const paceScore = inBand
      ? 92
      : Math.max(
          45,
          92 - (Math.min(
            Math.abs(actualWeeklyRate - prepRateBounds.min),
            Math.abs(actualWeeklyRate - prepRateBounds.max),
          ) * 35),
        );
    const consistencyScore = Math.max(40, Math.min(100, consistencyAverage));
    return Math.round((paceScore * 0.65) + (consistencyScore * 0.35));
  }, [actualWeeklyRate, consistencyAverage, prepRateBounds, prepState?.enabled]);

  const handleRollbackPrepAdjustment = () => {
    const eventId = prepState?.lastAdjustment?.id;
    if (!eventId) return;
    Alert.alert(
      'Revert Prep Adjustment?',
      'This restores your previous targets and nutrition plan version. Session history will remain unchanged.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revert',
          style: 'destructive',
          onPress: () => {
            revertPrepAdjustmentMutation.mutate(eventId, {
              onError: (error: any) => {
                Alert.alert('Rollback failed', error?.message || 'Could not revert this prep adjustment.');
              },
            });
          },
        },
      ],
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      <MotiView
        from={{ opacity: 0, translateY: -10 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 300 }}
        style={[
          styles.header,
          {
            paddingTop: insets.top + s.md,
            paddingHorizontal: s.lg,
            backgroundColor: c.bg,
          },
        ]}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerButton} />
          <Pressable
            style={[
              styles.headerButton,
              {
                borderWidth: 2,
                borderColor: c.primary,
                backgroundColor: `${c.primary}15`,
                width: 'auto',
                paddingHorizontal: 16,
                flexDirection: 'row',
                gap: 6
              },
            ]}
            onPress={() => router.push('/check-in')}
          >
            <TabBarIcon name="scan-outline" color={c.primary} size={18} />
            <Text style={{ color: c.primary, fontFamily: ty.body.familySemibold, fontSize: 12 }}>Check In</Text>
          </Pressable>
        </View>
        <Text
          style={[
            styles.title,
            {
              color: c.text,
              fontFamily: ty.heading.family,
              fontSize: 28,
            },
          ]}
        >
          Progress & Insights
        </Text>
      </MotiView>

      <View style={{ paddingHorizontal: s.lg }}>
        <TimeFrameTabs selected={timeFrame} onSelect={setTimeFrame} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: 120 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <View style={{ padding: s.xl, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={c.primary} />
          </View>
        ) : !hasData ? (
          <View style={{ padding: s.xl, alignItems: 'center' }}>
            <Text style={{ color: c.textMuted, textAlign: 'center' }}>No progress data yet. Log your weight to see trends!</Text>
            <Pressable
              onPress={() => router.push('/log-weight-sheet')}
              style={{ marginTop: s.md, padding: s.md, backgroundColor: c.surface, borderRadius: r.md }}
            >
              <Text style={{ color: c.primary, fontFamily: ty.body.familySemibold }}>Log First Weigh-in</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={{ paddingHorizontal: s.lg, gap: s.lg }}>
              <View
                style={{
                  backgroundColor: c.surface,
                  borderRadius: r.lg,
                  padding: s.lg,
                  borderWidth: 1,
                  borderColor: c.border,
                }}
              >
                <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.md }}>
                  Composite Consistency
                </Text>
                <Text style={{ color: c.primary, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.h2, marginTop: s.xs }}>
                  {Math.round(consistencyAverage)}%
                </Text>
                <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.sm, marginTop: s.xs }}>
                  Nutrition 50% • Workout 35% • Hydration 15%
                </Text>
              </View>

              <GoalForecastCard
                startWeight={Math.round(toDisplayWeight(measurements[measurements.length - 1].weight_kg) * 10) / 10}
                currentWeight={Math.round(currentWeight * 10) / 10}
                goalWeight={Math.round(goalWeight * 10) / 10}
                targetDate={targetDate}
                onViewProjection={() => router.push('/(tabs)/progress/trends')}
              />
            </View>

            <View style={{ paddingHorizontal: s.lg, marginTop: s.xl }}>
              <WeeklyTrendChart
                title={`Weight Trend (${weightUnit})`}
                data={weightData.length > 0 ? weightData : [{ day: 'Now', value: Math.round(currentWeight * 10) / 10, isToday: true }]}
                changePercent={weightChangePercent}
              />
            </View>

            <View style={{ paddingHorizontal: s.lg, marginTop: s.lg }}>
              <WeeklyTrendChart
                title="Consistency Trend (%)"
                data={consistencyTrend.length > 0 ? consistencyTrend : [{ day: 'Now', value: 0, isToday: true }]}
                changePercent={consistencyChangePercent}
              />
            </View>

            {prepState?.enabled && (
              <View style={{ paddingHorizontal: s.lg, marginTop: s.lg }}>
                <View
                  style={{
                    backgroundColor: c.surface,
                    borderRadius: r.lg,
                    padding: s.lg,
                    borderWidth: 1,
                    borderColor: c.border,
                    gap: 8,
                  }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ color: c.primary, fontFamily: ty.body.familySemibold }}>
                      AI Prep Coach
                    </Text>
                    <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.xs }}>
                      {prepState.discipline || 'prep'} • {prepState.phase || 'phase'}
                    </Text>
                  </View>

                  <Text style={{ color: c.text, fontFamily: ty.body.familyMedium }}>
                    Target weekly rate: {prepRateBounds ? `${prepRateBounds.min}% to ${prepRateBounds.max}%` : 'Not set'}
                  </Text>
                  <Text style={{ color: c.textMuted, fontFamily: ty.body.family }}>
                    Actual weekly rate: {actualWeeklyRate === null ? 'Need 2 check-ins' : `${actualWeeklyRate.toFixed(2)}%`}
                  </Text>
                  <Text style={{ color: c.textMuted, fontFamily: ty.body.family }}>
                    Adherence confidence: {prepAdherenceConfidence === null ? '--' : `${prepAdherenceConfidence}%`}
                  </Text>

                  {prepState.lastAdjustment?.coach_summary ? (
                    <View style={{ marginTop: s.xs }}>
                      <Text style={{ color: c.textMuted, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs, letterSpacing: 1.2 }}>
                        LAST ADJUSTMENT
                      </Text>
                      <Text style={{ color: c.textMuted, fontFamily: ty.body.family, marginTop: 4 }}>
                        {prepState.lastAdjustment.coach_summary}
                      </Text>
                    </View>
                  ) : null}

                  {prepState.lastAdjustment?.status === 'applied' && prepState.lastAdjustment?.id ? (
                    <Pressable
                      onPress={handleRollbackPrepAdjustment}
                      disabled={revertPrepAdjustmentMutation.isPending}
                      style={{
                        alignSelf: 'flex-start',
                        marginTop: s.sm,
                        borderWidth: 1,
                        borderColor: `${c.warning}66`,
                        borderRadius: r.pill,
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                      }}
                    >
                      <Text style={{ color: c.warning, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs }}>
                        {revertPrepAdjustmentMutation.isPending ? 'Reverting...' : 'Rollback Last Adjustment'}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            )}
          </>
        )}

        {/* Quick Access - Ring Icons */}
        <View style={[styles.quickAccess, { paddingHorizontal: s.lg, marginTop: s.xl }]}>
          <Text
            style={{
              color: c.textMuted,
              fontFamily: ty.body.familySemibold,
              fontSize: ty.sizes.sm,
              letterSpacing: 1.5,
              marginBottom: s.lg,
            }}
          >
            QUICK ACCESS
          </Text>
          <View style={styles.linkRow}>
            {quickLinks.map((link, index) => (
              <RingIconButton
                key={link.label}
                icon={link.icon}
                label={link.label}
                onPress={link.onPress}
                size={56}
                delay={100 + index * 60}
              />
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 48,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    letterSpacing: -0.5,
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingTop: 16,
  },
  quickAccess: {},
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
});
