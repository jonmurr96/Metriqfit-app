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
import { useTokens } from '../../../lib/theme';
import { TabBarIcon } from '../../../components/navigation/TabBarIcon';
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

export default function MyWorkoutPlanScreen() {
  const { c, s, ty, r } = useTokens();
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

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: c.bg, paddingTop: insets.top }]}> 
        <View style={[styles.header, { paddingHorizontal: s.lg }]}> 
          <Pressable onPress={() => router.back()} style={[styles.backButton, { backgroundColor: c.surface }]}> 
            <TabBarIcon name="chevron-back" color={c.text} size={24} />
          </Pressable>
          <Text style={[styles.title, { color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.xl }]}> 
            My Workout Plan
          </Text>
          <View style={styles.placeholder} />
        </View>
        <View style={[styles.loadingContainer, { flex: 1 }]}> 
          <ActivityIndicator size="large" color={c.primary} />
        </View>
      </View>
    );
  }

  if (!workoutPlan) {
    return (
      <View style={[styles.container, { backgroundColor: c.bg, paddingTop: insets.top }]}> 
        <View style={[styles.header, { paddingHorizontal: s.lg }]}> 
          <Pressable onPress={() => router.back()} style={[styles.backButton, { backgroundColor: c.surface }]}> 
            <TabBarIcon name="chevron-back" color={c.text} size={24} />
          </Pressable>
          <Text style={[styles.title, { color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.xl }]}> 
            My Workout Plan
          </Text>
          <View style={styles.placeholder} />
        </View>

        <View style={[styles.emptyState, { padding: s.xl }]}> 
          <View style={[styles.emptyCard, { backgroundColor: c.surface, borderRadius: r.lg, padding: s.xl }]}> 
            <TabBarIcon name="barbell-outline" color={c.textMuted} size={64} />
            <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.lg, marginTop: s.lg, textAlign: 'center' }}>
              No Workout Plan Yet
            </Text>
            <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.md, marginTop: s.sm, textAlign: 'center' }}>
              Generate with AI, build manually, or import a plan from another app or coach.
            </Text>
            <View style={{ width: '100%', gap: s.sm, marginTop: s.xl }}>
              <Pressable
                style={[styles.generateButton, { backgroundColor: c.primary, borderRadius: r.md }]}
                onPress={handleOpenRegeneration}
              >
                <Text style={{ color: c.bg, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.md }}>
                  Generate with AI
                </Text>
              </Pressable>
              <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.xs, textAlign: 'center' }}>
                AI will ask what is not working before building your first plan.
              </Text>
              <Pressable
                style={[styles.secondaryActionButton, { borderColor: c.border, backgroundColor: c.surface2, borderRadius: r.md }]}
                onPress={handleOpenBuilder}
              >
                <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm }}>
                  Build Manually
                </Text>
              </Pressable>
              <Pressable
                style={[styles.secondaryActionButton, { borderColor: c.border, backgroundColor: c.surface2, borderRadius: r.md }]}
                onPress={handleOpenImport}
              >
                <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm }}>
                  Import Existing Plan
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: c.bg, paddingTop: insets.top }]}> 
      <View style={[styles.header, { paddingHorizontal: s.lg }]}> 
        <Pressable onPress={() => router.back()} style={[styles.backButton, { backgroundColor: c.surface }]}> 
          <TabBarIcon name="chevron-back" color={c.text} size={24} />
        </Pressable>
        <Text style={[styles.title, { color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.xl }]}> 
          My Workout Plan
        </Text>
        <Pressable
          onPress={() => setShowHistory(!showHistory)}
          style={[styles.backButton, { backgroundColor: showHistory ? c.primary : c.surface }]}
        >
          <TabBarIcon name="time-outline" color={showHistory ? c.bg : c.text} size={20} />
        </Pressable>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: s.lg, paddingBottom: insets.bottom + s.xl }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} tintColor={c.primary} />}
      >
        <View style={[styles.planCard, { backgroundColor: c.surface, borderRadius: r.lg, padding: s.lg, marginBottom: s.lg }]}> 
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: c.primary, fontFamily: ty.mono.family, fontSize: ty.sizes.xs }}>
                v{workoutPlan.version} • Week {workoutPlan.current_week || 1}
              </Text>
              <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.lg, marginTop: s.xs }}>
                {workoutPlan.name}
              </Text>
              <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.sm, marginTop: s.xs }}>
                {workoutPlan.days_per_week} days/week • {workoutPlan.total_weeks ? `${workoutPlan.total_weeks} weeks` : 'Ongoing'}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: s.sm }}>
                {workoutPlan.programMeta?.programFamilyKey ? (
                  <View style={[styles.badge, { backgroundColor: c.surface2, borderRadius: r.sm }]}>
                    <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs }}>
                      {workoutPlan.programMeta.programFamilyKey.replaceAll('_', ' ')}
                    </Text>
                  </View>
                ) : null}
                {workoutPlan.programMeta?.progressionModel ? (
                  <View style={[styles.badge, { backgroundColor: c.surface2, borderRadius: r.sm }]}>
                    <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs }}>
                      {workoutPlan.programMeta.progressionModel.replaceAll('_', ' ')}
                    </Text>
                  </View>
                ) : null}
                <View style={[styles.badge, { backgroundColor: c.surface2, borderRadius: r.sm }]}>
                  <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs }}>
                    {workoutPlan.programMeta?.sourceModel === 'custom_builder'
                      ? 'Custom'
                      : workoutPlan.programMeta?.sourceModel === 'v2_template'
                        ? 'Template'
                        : workoutPlan.programMeta?.sourceModel === 'legacy_template'
                          ? 'Legacy'
                          : 'Generated'}
                  </Text>
                </View>
              </View>
              {workoutPlan.weeklyLayoutSummary ? (
                <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.xs, marginTop: s.sm }}>
                  Weekly layout: {workoutPlan.weeklyLayoutSummary}
                </Text>
              ) : null}
            </View>
            <View style={[styles.badge, { backgroundColor: workoutPlan.is_active ? c.success : c.surface2, borderRadius: r.sm }]}> 
              <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs }}>
                {workoutPlan.is_active ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>
        </View>

        {shouldShowRepairBanner ? (
          <View
            style={[
              styles.planCard,
              {
                backgroundColor: `${c.warning || '#f59e0b'}12`,
                borderRadius: r.lg,
                padding: s.lg,
                marginBottom: s.lg,
                borderWidth: 1,
                borderColor: `${c.warning || '#f59e0b'}55`,
                gap: s.sm,
              },
            ]}
          >
            <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.md }}>
              This plan has exercises that do not match their workout days.
            </Text>
            <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.sm }}>
              Review a repair preview before starting these workouts so each day matches its intended focus.
            </Text>
            {repairPreviewMutation.isPending ? (
              <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.xs }}>
                Building a repair preview now...
              </Text>
            ) : null}
            <View style={{ flexDirection: 'row', gap: s.sm }}>
              <Pressable
                style={[
                  styles.secondaryActionButton,
                  {
                    flex: 1,
                    borderColor: c.primary,
                    backgroundColor: c.primary,
                    borderRadius: r.md,
                  },
                ]}
                onPress={handleOpenRepairPreview}
              >
                <Text style={{ color: c.bg, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm }}>
                  Review Repair Preview
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.secondaryActionButton,
                  {
                    flex: 1,
                    borderColor: c.border,
                    backgroundColor: c.surface,
                    borderRadius: r.md,
                  },
                ]}
                onPress={() => setRepairDismissed(true)}
              >
                <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm }}>
                  Keep Current Plan For Now
                </Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {showHistory ? (
          <View>
            <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.md, marginBottom: s.md }}>
              Plan History
            </Text>
            {planHistory && planHistory.length > 0 ? (
              planHistory.map((plan: any) => (
                <Pressable
                  key={plan.id}
                  style={[
                    styles.historyCard,
                    {
                      backgroundColor: plan.is_active ? c.surface2 : c.surface,
                      borderRadius: r.md,
                      padding: s.md,
                      marginBottom: s.sm,
                      borderWidth: plan.is_active ? 1 : 0,
                      borderColor: c.primary,
                    },
                  ]}
                  onPress={() => !plan.is_active && handleReactivatePlan(plan.id, plan.version)}
                  disabled={plan.is_active}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View>
                      <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.md }}>
                        v{plan.version} - {plan.name || 'Workout Plan'}
                      </Text>
                      <Text style={{ color: c.textMuted, fontFamily: ty.mono.family, fontSize: ty.sizes.xs, marginTop: 2 }}>
                        {new Date(plan.created_at).toLocaleDateString()}
                      </Text>
                    </View>
                    {plan.is_active ? (
                      <View style={[styles.badge, { backgroundColor: c.primary, borderRadius: r.sm }]}> 
                        <Text style={{ color: c.bg, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs }}>
                          Current
                        </Text>
                      </View>
                    ) : (
                      <TabBarIcon name="refresh" color={c.textMuted} size={18} />
                    )}
                  </View>
                </Pressable>
              ))
            ) : (
              <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.sm }}>
                No plan history yet.
              </Text>
            )}
          </View>
        ) : (
          <View>
            <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.md, marginBottom: s.md }}>
              Monthly Schedule Overview
            </Text>

            <View style={[styles.planCard, { backgroundColor: c.surface, borderRadius: r.md, padding: s.md, marginBottom: s.lg }]}> 
              {scheduleLoading ? (
                <ActivityIndicator color={c.primary} />
              ) : (
                <View style={{ gap: s.xs }}>
                  <Text style={{ color: c.text, fontFamily: ty.body.family, fontSize: ty.sizes.sm }}>
                    Planned Workouts: {scheduleStats.plannedWorkouts}
                  </Text>
                  <Text style={{ color: c.text, fontFamily: ty.body.family, fontSize: ty.sizes.sm }}>
                    Recovery / Conditioning: {scheduleStats.recoveryDays}
                  </Text>
                  <Text style={{ color: c.text, fontFamily: ty.body.family, fontSize: ty.sizes.sm }}>
                    Rest Days: {scheduleStats.restDays}
                  </Text>
                  <Text style={{ color: c.text, fontFamily: ty.body.family, fontSize: ty.sizes.sm }}>
                    Completed Sessions: {scheduleStats.completed}
                  </Text>
                </View>
              )}
            </View>

            <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.md, marginBottom: s.md }}>
              Template Days
            </Text>

            {workoutPlan.days && workoutPlan.days.length > 0 ? (
              workoutPlan.days
                .sort((a: any, b: any) => a.day_number - b.day_number)
                .map((day: any) => (
                  <Pressable
                    key={day.id}
                    style={[styles.dayCard, { backgroundColor: c.surface, borderRadius: r.md, padding: s.md, marginBottom: s.sm }]}
                    onPress={() => {
                      router.push({
                        pathname: '/(tabs)/workout/day-preview',
                        params: { dayId: day.id, dayNumber: String(day.day_number), dayName: day.name },
                      });
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                        <View style={[styles.dayBadge, { backgroundColor: day.is_completed ? c.success : c.primary, borderRadius: r.sm, marginRight: s.md }]}> 
                          <Text style={{ color: c.bg, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.sm }}>
                            {day.day_number}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.md }}>
                            {day.name || `Day ${day.day_number}`}
                          </Text>
                          <Text style={{ color: c.textMuted, fontFamily: ty.mono.family, fontSize: ty.sizes.xs, marginTop: 2 }}>
                            {day.exercises?.length || 0} exercises • {day.focus || 'Full Body'}
                          </Text>
                        </View>
                      </View>
                      {day.is_completed ? (
                        <TabBarIcon name="checkmark-circle" color={c.success} size={24} />
                      ) : (
                        <TabBarIcon name="chevron-forward" color={c.textMuted} size={20} />
                      )}
                    </View>
                  </Pressable>
                ))
            ) : (
              <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.sm }}>
                No workout days in this plan.
              </Text>
            )}
          </View>
        )}

        <View style={{ marginTop: s.xl, gap: s.sm }}>
          <Pressable
            style={[
              styles.regenerateButton,
              {
                backgroundColor: c.surface,
                borderRadius: r.md,
                borderWidth: 1,
                borderColor: c.primary,
              },
            ]}
            onPress={handleOpenRegeneration}
          >
            <TabBarIcon name="sparkles" color={c.primary} size={18} />
            <Text style={{ color: c.primary, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.md, marginLeft: s.sm }}>
              Regenerate with AI
            </Text>
          </Pressable>

          <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.xs, textAlign: 'center' }}>
            AI will ask what is not working before building a replacement preview.
          </Text>

          <View style={{ flexDirection: 'row', gap: s.sm }}>
            <Pressable
              style={[
                styles.secondaryActionButton,
                {
                  flex: 1,
                  borderColor: c.border,
                  backgroundColor: c.surface2,
                  borderRadius: r.md,
                },
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
                {
                  flex: 1,
                  borderColor: c.border,
                  backgroundColor: c.surface2,
                  borderRadius: r.md,
                },
              ]}
              onPress={handleOpenImport}
            >
              <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm }}>
                Import Existing Plan
              </Text>
            </Pressable>
          </View>

          <Text style={{ color: c.textMuted, fontFamily: ty.mono.family, fontSize: ty.sizes.xs, textAlign: 'center', marginTop: s.xs }}>
            Free: 1/hour • Elite: 3/hour
          </Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    letterSpacing: -0.3,
  },
  placeholder: {
    width: 40,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyCard: {
    alignItems: 'center',
  },
  generateButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  secondaryActionButton: {
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planCard: {},
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  historyCard: {},
  dayCard: {},
  dayBadge: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  regenerateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
});
