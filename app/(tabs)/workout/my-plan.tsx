/**
 * Workout Plan Viewing Screen
 * Includes plan versions, template day breakdown,
 * and monthly date-based schedule summary.
 */

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { useTokens } from '../../../lib/theme';
import { TabBarIcon } from '../../../components/navigation/TabBarIcon';
import { PremiumBackground } from '../../../components/premium/PremiumBackground';
import { GlassCard } from '../../../components/premium/GlassCard';
import { PressableScale } from '@/components/common/PressableScale';
import {
  useActiveWorkoutPlan,
  useRepairWorkoutPlanPreview,
  useWorkoutPlanHistory,
  useWorkoutPlanCoherence,
  useWorkoutPlanPreview,
  useReactivatePlan,
  useWorkoutSchedule,
} from '../../../hooks/usePlan';
import {
} from '../../../lib/analytics';

function toDateString(date: Date) {
  return date.toISOString().split('T')[0];
}

function monthBounds(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return {
    start: toDateString(start),
    end: toDateString(end),
  };
}

// ─── Stat Tile ────────────────────────────────────────────────────────────────
function StatTile({
  icon,
  color,
  value,
  label,
  delay = 0,
}: {
  icon: string;
  color: string;
  value: number;
  label: string;
  delay?: number;
}) {
  const { c, s, ty, r } = useTokens();

  return (
    <MotiView
      from={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'timing', duration: 350, delay }}
      style={[
        styles.statTile,
        {
          backgroundColor: c.surface,
          borderRadius: r.md,
          borderWidth: 1,
          borderColor: `${color}22`,
        },
      ]}
    >
      <View
        style={[
          styles.statIconWrap,
          { backgroundColor: `${color}18`, borderRadius: r.sm },
        ]}
      >
        <TabBarIcon name={icon as any} color={color} size={16} />
      </View>
      <Text
        style={{
          color: c.text,
          fontFamily: ty.heading.familySemibold,
          fontSize: ty.sizes.h3,
          marginTop: s.xs,
          letterSpacing: -0.5,
        }}
      >
        {value}
      </Text>
      <Text
        style={{
          color: c.textMuted,
          fontFamily: ty.body.family,
          fontSize: ty.sizes.xs,
          marginTop: 2,
        }}
      >
        {label}
      </Text>
    </MotiView>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function MyWorkoutPlanScreen() {
  const { c, s, ty, r, animation } = useTokens();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [showHistory, setShowHistory] = useState(false);
  const [repairDismissed, setRepairDismissed] = useState(false);
  const autoRepairRequestedForPlan = useRef<string | null>(null);

  const {
    data: workoutPlan,
    isLoading,
    isRefetching,
    refetch,
  } = useActiveWorkoutPlan();

  const { data: coherenceReport } = useWorkoutPlanCoherence(workoutPlan?.id, {
    enabled: !!workoutPlan?.id,
  });
  const { data: repairPreview } = useWorkoutPlanPreview(workoutPlan?.id, {
    enabled: !!workoutPlan?.id,
  });

  const { data: planHistory } = useWorkoutPlanHistory();
  const reactivateMutation = useReactivatePlan();
  const repairPreviewMutation = useRepairWorkoutPlanPreview();

  const bounds = useMemo(() => monthBounds(new Date()), []);
  const { data: monthlySchedule, isLoading: scheduleLoading } = useWorkoutSchedule(bounds.start, bounds.end, {
    enabled: !!workoutPlan,
  });

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  useEffect(() => {
    if (!workoutPlan?.id) {
      autoRepairRequestedForPlan.current = null;
      return;
    }

    if (!coherenceReport?.hasHardViolations || !coherenceReport.canRepair) {
      return;
    }

    if (repairPreview?.id || repairPreviewMutation.isPending) {
      return;
    }

    if (autoRepairRequestedForPlan.current === workoutPlan.id) {
      return;
    }

    autoRepairRequestedForPlan.current = workoutPlan.id;
    repairPreviewMutation.mutate(workoutPlan.id, {
      onError: () => {
        autoRepairRequestedForPlan.current = null;
      },
    });
  }, [
    coherenceReport?.canRepair,
    coherenceReport?.hasHardViolations,
    repairPreview?.id,
    repairPreviewMutation,
    repairPreviewMutation.isPending,
    workoutPlan?.id,
  ]);

  const handleOpenRegeneration = useCallback(() => {
    router.push('/(tabs)/workout/regenerate-plan');
  }, [router]);

  const handleOpenBuilder = useCallback(() => {
    router.push({ pathname: '/(tabs)/workout/program-builder', params: { entry: 'my_plan' } });
  }, [router]);

  const handleOpenImport = useCallback(() => {
    router.push({ pathname: '/(tabs)/workout/import-plan', params: { entry: 'my_plan' } });
  }, [router]);

  const handleOpenRepairPreview = useCallback(() => {
    router.push({ pathname: '/(tabs)/workout/regenerate-plan', params: { mode: 'repair' } });
  }, [router]);

  const handleReactivatePlan = (planId: string, version: number) => {
    Alert.alert(
      'Reactivate Plan',
      `Switch back to Plan v${version}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reactivate',
          onPress: async () => {
            try {
              await reactivateMutation.mutateAsync({ planId, planType: 'workout' });
              setShowHistory(false);
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to reactivate plan');
            }
          },
        },
      ],
    );
  };

  const scheduleStats = useMemo(() => {
    const rows = monthlySchedule || [];
    const plannedWorkouts = rows.filter((row) => row.session_type === 'workout').length;
    const restDays = rows.filter((row) => row.session_type === 'rest').length;
    const recoveryDays = rows.filter((row) => row.session_type === 'active_recovery' || row.session_type === 'conditioning').length;
    const completed = rows.filter((row) => row.status === 'completed').length;
    return { plannedWorkouts, restDays, recoveryDays, completed };
  }, [monthlySchedule]);

  const shouldShowRepairBanner = !!workoutPlan
    && !!coherenceReport?.hasHardViolations
    && coherenceReport.canRepair
    && !repairDismissed;

  // ─── Loading ─────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <PremiumBackground variant="subtle">
        <View style={{ flex: 1, paddingTop: insets.top }}>
          <View style={[styles.header, { paddingHorizontal: s.lg }]}>
            <Pressable onPress={() => router.back()} style={[styles.iconButton, { backgroundColor: c.surface }]}>
              <TabBarIcon name="chevron-back" color={c.text} size={24} />
            </Pressable>
            <Text style={[styles.titleText, { color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.xl }]}>
              My Plan
            </Text>
            <View style={styles.placeholder} />
          </View>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color={c.primary} />
          </View>
        </View>
      </PremiumBackground>
    );
  }

  // ─── Empty State ─────────────────────────────────────────────────────────
  if (!workoutPlan) {
    return (
      <PremiumBackground variant="subtle">
        <View style={{ flex: 1, paddingTop: insets.top }}>
          <View style={[styles.header, { paddingHorizontal: s.lg }]}>
            <Pressable onPress={() => router.back()} style={[styles.iconButton, { backgroundColor: c.surface }]}>
              <TabBarIcon name="chevron-back" color={c.text} size={24} />
            </Pressable>
            <Text style={[styles.titleText, { color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.xl }]}>
              My Plan
            </Text>
            <View style={styles.placeholder} />
          </View>

          <View style={{ flex: 1, justifyContent: 'center', padding: s.xl }}>
            <GlassCard intensity="medium" style={{ borderRadius: r.xl }}>
              <View style={{ alignItems: 'center' }}>
                <View
                  style={[
                    styles.emptyIconWrap,
                    { backgroundColor: `${c.primary}15`, borderRadius: r.lg },
                  ]}
                >
                  <TabBarIcon name="barbell-outline" color={c.primary} size={40} />
                </View>
                <Text
                  style={{
                    color: c.text,
                    fontFamily: ty.heading.familySemibold,
                    fontSize: ty.sizes.lg,
                    marginTop: s.lg,
                    textAlign: 'center',
                    letterSpacing: -0.3,
                  }}
                >
                  No Workout Plan Yet
                </Text>
                <Text
                  style={{
                    color: c.textMuted,
                    fontFamily: ty.body.family,
                    fontSize: ty.sizes.sm,
                    marginTop: s.sm,
                    textAlign: 'center',
                    lineHeight: 20,
                  }}
                >
                  Generate with AI, build manually, or import a plan from another app or coach.
                </Text>
                <View style={{ width: '100%', gap: s.sm, marginTop: s.xl }}>
                  <Pressable
                    style={[styles.generateButton, { backgroundColor: c.primary, borderRadius: r.md }]}
                    onPress={handleOpenRegeneration}
                  >
                    <TabBarIcon name="sparkles" color={c.bg} size={18} />
                    <Text
                      style={{
                        color: c.bg,
                        fontFamily: ty.body.familySemibold,
                        fontSize: ty.sizes.md,
                        marginLeft: s.xs,
                      }}
                    >
                      Generate with AI
                    </Text>
                  </Pressable>
                  <Text
                    style={{
                      color: c.textSubtle,
                      fontFamily: ty.body.family,
                      fontSize: ty.sizes.xs,
                      textAlign: 'center',
                    }}
                  >
                    AI will ask what is not working before building your first plan.
                  </Text>
                  <Pressable
                    style={[
                      styles.secondaryActionButton,
                      { borderColor: c.border, backgroundColor: c.surface2, borderRadius: r.md },
                    ]}
                    onPress={handleOpenBuilder}
                  >
                    <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm }}>
                      Build Manually
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.secondaryActionButton,
                      { borderColor: c.border, backgroundColor: c.surface2, borderRadius: r.md },
                    ]}
                    onPress={handleOpenImport}
                  >
                    <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm }}>
                      Import Existing Plan
                    </Text>
                  </Pressable>
                </View>
              </View>
            </GlassCard>
          </View>
        </View>
      </PremiumBackground>
    );
  }

  // ─── Main View ───────────────────────────────────────────────────────────
  return (
    <PremiumBackground variant="subtle">
      <View style={{ flex: 1, paddingTop: insets.top }}>

        {/* Header */}
        <MotiView
          from={{ opacity: 0, translateY: -10 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: animation.duration.normal }}
          style={[styles.header, { paddingHorizontal: s.lg }]}
        >
          <Pressable onPress={() => router.back()} style={[styles.iconButton, { backgroundColor: c.surface }]}>
            <TabBarIcon name="chevron-back" color={c.text} size={24} />
          </Pressable>

          <View style={{ alignItems: 'center', gap: 2 }}>
            <Text
              style={{
                color: c.textMuted,
                fontFamily: ty.body.familySemibold,
                fontSize: ty.sizes.xs,
                letterSpacing: 1.4,
              }}
            >
              WORKOUT
            </Text>
            <Text
              style={[
                styles.titleText,
                { color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.xl },
              ]}
            >
              My Plan
            </Text>
          </View>

          <Pressable
            onPress={() => setShowHistory(!showHistory)}
            style={[
              styles.iconButton,
              {
                backgroundColor: showHistory ? `${c.primary}20` : c.surface,
                borderWidth: showHistory ? 1 : 0,
                borderColor: `${c.primary}55`,
              },
            ]}
          >
            <TabBarIcon name="time-outline" color={showHistory ? c.primary : c.text} size={20} />
          </Pressable>
        </MotiView>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: s.lg,
            paddingTop: s.sm,
            paddingBottom: insets.bottom + s.xl,
          }}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} tintColor={c.primary} />
          }
          showsVerticalScrollIndicator={false}
        >

          {/* ── Plan Card ─────────────────────────────────────────────── */}
          <MotiView
            from={{ opacity: 0, translateY: 14 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 400, delay: 60 }}
            style={{ marginBottom: s.lg }}
          >
            <GlassCard intensity="medium" glowEffect animated={false}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>

                {/* Left content */}
                <View style={{ flex: 1, marginRight: s.md }}>

                  {/* Version + Week row */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: s.xs, marginBottom: s.sm }}>
                    <View
                      style={[
                        styles.versionPill,
                        { backgroundColor: `${c.primary}20`, borderRadius: r.sm, borderColor: `${c.primary}40` },
                      ]}
                    >
                      <Text style={{ color: c.primary, fontFamily: ty.mono.family, fontSize: 10, letterSpacing: 0.6 }}>
                        v{workoutPlan.version}
                      </Text>
                    </View>
                    <Text style={{ color: c.textSubtle, fontFamily: ty.mono.familyRegular, fontSize: ty.sizes.xs }}>
                      Week {workoutPlan.current_week || 1}
                    </Text>
                  </View>

                  {/* Plan name */}
                  <Text
                    style={{
                      color: c.text,
                      fontFamily: ty.heading.familySemibold,
                      fontSize: ty.sizes.lg,
                      letterSpacing: -0.3,
                      marginBottom: s.xs,
                    }}
                  >
                    {workoutPlan.name}
                  </Text>

                  {/* Duration */}
                  <Text
                    style={{
                      color: c.textMuted,
                      fontFamily: ty.body.family,
                      fontSize: ty.sizes.sm,
                      marginBottom: s.md,
                    }}
                  >
                    {workoutPlan.days_per_week} days/week · {workoutPlan.total_weeks ? `${workoutPlan.total_weeks} weeks` : 'Ongoing'}
                  </Text>

                  {/* Tags */}
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {workoutPlan.programMeta?.programFamilyKey ? (
                      <View style={[styles.tag, { backgroundColor: c.surface3, borderRadius: r.sm }]}>
                        <Text style={{ color: c.textMuted, fontFamily: ty.body.familySemibold, fontSize: 11 }}>
                          {workoutPlan.programMeta.programFamilyKey.replaceAll('_', ' ')}
                        </Text>
                      </View>
                    ) : null}
                    {workoutPlan.programMeta?.progressionModel ? (
                      <View style={[styles.tag, { backgroundColor: c.surface3, borderRadius: r.sm }]}>
                        <Text style={{ color: c.textMuted, fontFamily: ty.body.familySemibold, fontSize: 11 }}>
                          {workoutPlan.programMeta.progressionModel.replaceAll('_', ' ')}
                        </Text>
                      </View>
                    ) : null}
                    <View style={[styles.tag, { backgroundColor: c.surface3, borderRadius: r.sm }]}>
                      <Text style={{ color: c.textMuted, fontFamily: ty.body.familySemibold, fontSize: 11 }}>
                        {workoutPlan.programMeta?.sourceModel === 'custom_builder'
                          ? 'Custom'
                          : workoutPlan.programMeta?.sourceModel === 'v2_template'
                            ? 'Template'
                            : workoutPlan.programMeta?.sourceModel === 'legacy_template'
                              ? 'Legacy'
                              : workoutPlan.programMeta?.sourceModel === 'v1_architect'
                                ? 'V1 Architect'
                                : workoutPlan.programMeta?.sourceModel === 'v3_deterministic'
                                  ? 'V3'
                              : 'Generated'}
                      </Text>
                    </View>
                  </View>

                  {/* Weekly layout */}
                  {workoutPlan.weeklyLayoutSummary ? (
                    <Text
                      style={{
                        color: c.textSubtle,
                        fontFamily: ty.mono.familyRegular,
                        fontSize: 11,
                        marginTop: s.sm,
                        letterSpacing: 0.2,
                      }}
                    >
                      {workoutPlan.weeklyLayoutSummary}
                    </Text>
                  ) : null}
                </View>

                {/* Active badge */}
                <View
                  style={[
                    styles.activePill,
                    {
                      backgroundColor: workoutPlan.is_active ? c.success : c.surface2,
                      borderRadius: r.pill,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: workoutPlan.is_active ? c.bg : c.textMuted,
                      fontFamily: ty.body.familySemibold,
                      fontSize: 11,
                      letterSpacing: 0.4,
                    }}
                  >
                    {workoutPlan.is_active ? 'Active' : 'Inactive'}
                  </Text>
                </View>
              </View>
            </GlassCard>
          </MotiView>

          {/* ── Repair Banner ─────────────────────────────────────────── */}
          {shouldShowRepairBanner ? (
            <MotiView
              from={{ opacity: 0, translateY: 8 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'timing', duration: 350 }}
              style={[
                styles.repairBanner,
                {
                  backgroundColor: `${c.warning}10`,
                  borderColor: `${c.warning}40`,
                  borderRadius: r.lg,
                  marginBottom: s.lg,
                },
              ]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: s.xs, marginBottom: s.xs }}>
                <TabBarIcon name="warning-outline" color={c.warning} size={16} />
                <Text style={{ color: c.warning, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs, letterSpacing: 0.6 }}>
                  PLAN NEEDS ATTENTION
                </Text>
              </View>
              <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.md, marginBottom: s.xs }}>
                Exercises do not match workout days
              </Text>
              <Text
                style={{
                  color: c.textMuted,
                  fontFamily: ty.body.family,
                  fontSize: ty.sizes.sm,
                  lineHeight: 20,
                  marginBottom: s.md,
                }}
              >
                Review a repair preview before starting these workouts so each day matches its intended focus.
              </Text>
              {repairPreviewMutation.isPending ? (
                <Text style={{ color: c.textSubtle, fontFamily: ty.body.family, fontSize: ty.sizes.xs, marginBottom: s.sm }}>
                  Building repair preview...
                </Text>
              ) : null}
              <View style={{ flexDirection: 'row', gap: s.sm }}>
                <Pressable
                  style={[
                    styles.repairBtn,
                    { flex: 1, backgroundColor: c.primary, borderRadius: r.md },
                  ]}
                  onPress={handleOpenRepairPreview}
                >
                  <Text style={{ color: c.bg, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm }}>
                    Review Repair
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.repairBtn,
                    { flex: 1, backgroundColor: c.surface2, borderColor: c.border, borderRadius: r.md },
                  ]}
                  onPress={() => setRepairDismissed(true)}
                >
                  <Text style={{ color: c.textMuted, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm }}>
                    Dismiss
                  </Text>
                </Pressable>
              </View>
            </MotiView>
          ) : null}

          {/* ── History / Main toggle ─────────────────────────────────── */}
          {showHistory ? (

            // ── Plan History ──────────────────────────────────────────
            <MotiView
              from={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ type: 'timing', duration: 300 }}
            >
              <Text
                style={[
                  styles.sectionLabel,
                  {
                    color: c.textMuted,
                    fontFamily: ty.body.familySemibold,
                    letterSpacing: 1.2,
                    marginBottom: s.md,
                  },
                ]}
              >
                PLAN HISTORY
              </Text>

              {planHistory && planHistory.length > 0 ? (
                planHistory.map((plan: any, index: number) => (
                  <MotiView
                    key={plan.id}
                    from={{ opacity: 0, translateX: -10 }}
                    animate={{ opacity: 1, translateX: 0 }}
                    transition={{ type: 'timing', duration: 300, delay: index * 50 }}
                  >
                    <Pressable
                      style={[
                        styles.historyCard,
                        {
                          backgroundColor: plan.is_active ? `${c.primary}10` : c.surface,
                          borderRadius: r.md,
                          borderWidth: 1,
                          borderColor: plan.is_active ? `${c.primary}40` : c.border,
                          marginBottom: s.sm,
                        },
                      ]}
                      onPress={() => !plan.is_active && handleReactivatePlan(plan.id, plan.version)}
                      disabled={plan.is_active}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.md }}>
                            v{plan.version} — {plan.name || 'Workout Plan'}
                          </Text>
                          <Text
                            style={{
                              color: c.textSubtle,
                              fontFamily: ty.mono.familyRegular,
                              fontSize: ty.sizes.xs,
                              marginTop: 2,
                            }}
                          >
                            {new Date(plan.created_at).toLocaleDateString()}
                          </Text>
                        </View>
                        {plan.is_active ? (
                          <View
                            style={[
                              styles.tag,
                              { backgroundColor: `${c.primary}20`, borderRadius: r.pill },
                            ]}
                          >
                            <Text style={{ color: c.primary, fontFamily: ty.body.familySemibold, fontSize: 11 }}>
                              Current
                            </Text>
                          </View>
                        ) : (
                          <View style={[styles.restoreHint, { borderColor: c.border }]}>
                            <TabBarIcon name="refresh" color={c.textMuted} size={14} />
                            <Text
                              style={{
                                color: c.textMuted,
                                fontFamily: ty.body.family,
                                fontSize: 11,
                                marginLeft: 4,
                              }}
                            >
                              Restore
                            </Text>
                          </View>
                        )}
                      </View>
                    </Pressable>
                  </MotiView>
                ))
              ) : (
                <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.sm }}>
                  No plan history yet.
                </Text>
              )}
            </MotiView>

          ) : (
            <>
              {/* ── Monthly Overview ─────────────────────────────────── */}
              <MotiView
                from={{ opacity: 0, translateY: 10 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'timing', duration: 400, delay: 120 }}
                style={{ marginBottom: s.xl }}
              >
                <Text
                  style={[
                    styles.sectionLabel,
                    {
                      color: c.textMuted,
                      fontFamily: ty.body.familySemibold,
                      letterSpacing: 1.2,
                      marginBottom: s.md,
                    },
                  ]}
                >
                  MONTHLY OVERVIEW
                </Text>

                {scheduleLoading ? (
                  <View style={{ paddingVertical: s.lg, alignItems: 'center' }}>
                    <ActivityIndicator color={c.primary} />
                  </View>
                ) : (
                  <View style={styles.statsGrid}>
                    <StatTile
                      icon="barbell-outline"
                      color={c.primary}
                      value={scheduleStats.plannedWorkouts}
                      label="Planned"
                      delay={160}
                    />
                    <StatTile
                      icon="checkmark-circle"
                      color={c.success}
                      value={scheduleStats.completed}
                      label="Completed"
                      delay={190}
                    />
                    <StatTile
                      icon="flash-outline"
                      color="#F97316"
                      value={scheduleStats.recoveryDays}
                      label="Recovery"
                      delay={220}
                    />
                    <StatTile
                      icon="moon-outline"
                      color="#A855F7"
                      value={scheduleStats.restDays}
                      label="Rest Days"
                      delay={250}
                    />
                  </View>
                )}
              </MotiView>

              {/* ── Template Days ─────────────────────────────────────── */}
              <MotiView
                from={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ type: 'timing', duration: 300, delay: 180 }}
              >
                <Text
                  style={[
                    styles.sectionLabel,
                    {
                      color: c.textMuted,
                      fontFamily: ty.body.familySemibold,
                      letterSpacing: 1.2,
                      marginBottom: s.md,
                    },
                  ]}
                >
                  TEMPLATE DAYS
                </Text>

                {workoutPlan.days && workoutPlan.days.length > 0 ? (
                  workoutPlan.days
                    .sort((a: any, b: any) => a.day_number - b.day_number)
                    .map((day: any, index: number) => (
                      <MotiView
                        key={day.id}
                        from={{ opacity: 0, translateX: -10 }}
                        animate={{ opacity: 1, translateX: 0 }}
                        transition={{ type: 'timing', duration: 350, delay: 200 + index * 55 }}
                      >
                        <PressableScale
                          style={(pressed) => [
                            styles.dayCard,
                            {
                              backgroundColor: pressed ? c.surface2 : c.surface,
                              borderRadius: r.md,
                              borderWidth: 1,
                              borderColor: day.is_completed ? `${c.success}30` : c.border,
                              marginBottom: s.sm,
                            },
                          ]}
                          onPress={() => {
                            router.push({
                              pathname: '/(tabs)/workout/day-preview',
                              params: {
                                dayId: day.id,
                                dayNumber: String(day.day_number),
                                dayName: day.name,
                              },
                            });
                          }}
                        >
                          <View
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                            }}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>

                              {/* Day number badge */}
                              <View
                                style={[
                                  styles.dayBadge,
                                  {
                                    backgroundColor: day.is_completed
                                      ? `${c.success}18`
                                      : `${c.primary}18`,
                                    borderRadius: r.sm,
                                    borderWidth: 1,
                                    borderColor: day.is_completed
                                      ? `${c.success}45`
                                      : `${c.primary}45`,
                                    marginRight: s.md,
                                  },
                                ]}
                              >
                                <Text
                                  style={{
                                    color: day.is_completed ? c.success : c.primary,
                                    fontFamily: ty.heading.familySemibold,
                                    fontSize: ty.sizes.sm,
                                  }}
                                >
                                  {day.day_number}
                                </Text>
                              </View>

                              {/* Day info */}
                              <View style={{ flex: 1 }}>
                                <Text
                                  style={{
                                    color: c.text,
                                    fontFamily: ty.body.familySemibold,
                                    fontSize: ty.sizes.md,
                                  }}
                                >
                                  {day.name || `Day ${day.day_number}`}
                                </Text>
                                <Text
                                  style={{
                                    color: c.textSubtle,
                                    fontFamily: ty.mono.familyRegular,
                                    fontSize: 11,
                                    marginTop: 2,
                                    letterSpacing: 0.2,
                                  }}
                                >
                                  {day.exercises?.length || 0} exercises · {day.focus || 'Full Body'}
                                </Text>
                              </View>
                            </View>

                            {/* Right icon */}
                            {day.is_completed ? (
                              <TabBarIcon name="checkmark-circle" color={c.success} size={22} />
                            ) : (
                              <TabBarIcon name="chevron-forward" color={c.textSubtle} size={18} />
                            )}
                          </View>
                        </PressableScale>
                      </MotiView>
                    ))
                ) : (
                  <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.sm }}>
                    No workout days in this plan.
                  </Text>
                )}
              </MotiView>
            </>
          )}

          {/* ── Actions ───────────────────────────────────────────────── */}
          <MotiView
            from={{ opacity: 0, translateY: 12 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 400, delay: 320 }}
            style={{ marginTop: s.xl, gap: s.sm }}
          >
            {/* Regenerate primary */}
            <PressableScale
              style={(pressed) => [
                styles.regenerateButton,
                {
                  backgroundColor: pressed ? `${c.primary}20` : `${c.primary}12`,
                  borderRadius: r.md,
                  borderWidth: 1,
                  borderColor: `${c.primary}50`,
                },
              ]}
              onPress={handleOpenRegeneration}
            >
              <TabBarIcon name="sparkles" color={c.primary} size={18} />
              <Text
                style={{
                  color: c.primary,
                  fontFamily: ty.body.familySemibold,
                  fontSize: ty.sizes.md,
                  marginLeft: s.xs,
                }}
              >
                Regenerate with AI
              </Text>
            </PressableScale>

            <Text
              style={{
                color: c.textSubtle,
                fontFamily: ty.body.family,
                fontSize: ty.sizes.xs,
                textAlign: 'center',
              }}
            >
              AI will ask what is not working before building a replacement preview.
            </Text>

            <View style={{ flexDirection: 'row', gap: s.sm }}>
              <Pressable
                style={[
                  styles.secondaryActionButton,
                  { flex: 1, borderColor: c.border, backgroundColor: c.surface, borderRadius: r.md },
                ]}
                onPress={handleOpenBuilder}
              >
                <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm }}>
                  Build Manually
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.secondaryActionButton,
                  { flex: 1, borderColor: c.border, backgroundColor: c.surface, borderRadius: r.md },
                ]}
                onPress={handleOpenImport}
              >
                <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm }}>
                  Import Plan
                </Text>
              </Pressable>
            </View>

            <Text
              style={{
                color: c.textSubtle,
                fontFamily: ty.mono.family,
                fontSize: 11,
                textAlign: 'center',
                marginTop: s.xs,
                letterSpacing: 0.3,
              }}
            >
              Free: 1/hour · Elite: 3/hour
            </Text>
          </MotiView>

        </ScrollView>
      </View>
    </PremiumBackground>
  );
}

const styles = StyleSheet.create({
  // ── Header ─────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleText: {
    letterSpacing: -0.3,
  },
  placeholder: {
    width: 40,
  },

  // ── Section labels ──────────────────────────────────────────────────────
  sectionLabel: {
    fontSize: 11,
  },

  // ── Plan card ───────────────────────────────────────────────────────────
  versionPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
  },
  activePill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },

  // ── Stats grid ──────────────────────────────────────────────────────────
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statTile: {
    flex: 1,
    minWidth: '44%',
    padding: 14,
  },
  statIconWrap: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Day cards ───────────────────────────────────────────────────────────
  dayCard: {
    padding: 14,
  },
  dayBadge: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── History ─────────────────────────────────────────────────────────────
  historyCard: {
    padding: 14,
  },
  restoreHint: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },

  // ── Repair banner ───────────────────────────────────────────────────────
  repairBanner: {
    padding: 16,
    borderWidth: 1,
  },
  repairBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },

  // ── Empty state ─────────────────────────────────────────────────────────
  emptyIconWrap: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Action buttons ──────────────────────────────────────────────────────
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  regenerateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  secondaryActionButton: {
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
