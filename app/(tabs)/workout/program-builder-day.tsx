import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TabBarIcon } from '../../../components/navigation/TabBarIcon';
import { ExerciseMediaTile } from '../../../components/workout/media/ExerciseMediaTile';
import { useActiveWorkoutPlan } from '../../../hooks/usePlan';
import {
  useAddBlockExercise,
  useAddPlanDayBlock,
  useAddWorkoutPlanDay,
  useMovePlanDayBlock,
  useMoveWorkoutPlanDay,
  usePlanDayBlocks,
  usePublishWorkoutProgram,
  useRemovePlanDayBlock,
  useRemoveWorkoutPlanDay,
  useSaveWorkoutPlanWeeklyLayout,
  useUpdateWorkoutPlanDay,
} from '../../../hooks/useWorkoutBuilder';
import { useExercises } from '../../../hooks/useWorkout';
import { useTokens } from '../../../lib/theme';
import type { WeeklyLayoutAssignment } from '../../../lib/workout/program-catalog';
import {
  trackWorkoutProgramPublishBlocked,
  trackWorkoutProgramWeeklyLayoutUpdated,
} from '../../../lib/analytics';

const BLOCK_OPTIONS = [
  'normal',
  'superset',
  'giant_set',
  'drop_set',
  'rest_pause',
  'amrap',
  'warmup_protocol',
] as const;

const DAY_TYPES = ['workout', 'rest', 'conditioning', 'recovery', 'active_recovery'] as const;

export default function ProgramBuilderDayScreen() {
  const { c, s, ty, r } = useTokens();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ planId?: string; dayId?: string }>();

  const { data: activePlan } = useActiveWorkoutPlan();
  const planId = params.planId || activePlan?.id;
  const plan = activePlan && activePlan.id === planId ? activePlan : null;

  const [selectedDayId, setSelectedDayId] = useState<string | null>(params.dayId || null);
  const [selectedBlockType, setSelectedBlockType] = useState<(typeof BLOCK_OPTIONS)[number]>('normal');
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [selectedBlockForExercise, setSelectedBlockForExercise] = useState<string | null>(null);
  const [dayNameDraft, setDayNameDraft] = useState('');
  const [dayFocusDraft, setDayFocusDraft] = useState('');
  const [dayDurationDraft, setDayDurationDraft] = useState('60');
  const [dayTypeDraft, setDayTypeDraft] = useState<(typeof DAY_TYPES)[number]>('workout');
  const [weeklyLayoutDraft, setWeeklyLayoutDraft] = useState<
    WeeklyLayoutAssignment[]
  >([]);

  const days = useMemo(() => plan?.days || [], [plan?.days]);
  const resolvedDayId = selectedDayId || days?.[0]?.id || null;
  const resolvedDay = useMemo(
    () => days.find((day: any) => day.id === resolvedDayId) || null,
    [days, resolvedDayId],
  );

  const { data: structure, isLoading: structureLoading } = usePlanDayBlocks(resolvedDayId || undefined);
  const addDay = useAddWorkoutPlanDay();
  const updateDay = useUpdateWorkoutPlanDay();
  const removeDay = useRemoveWorkoutPlanDay();
  const moveDay = useMoveWorkoutPlanDay();
  const saveWeeklyLayout = useSaveWorkoutPlanWeeklyLayout();
  const addBlock = useAddPlanDayBlock();
  const moveBlock = useMovePlanDayBlock();
  const removeBlock = useRemovePlanDayBlock();
  const addExercise = useAddBlockExercise();
  const publishPlan = usePublishWorkoutProgram();
  const { data: exerciseOptions = [], isLoading: exercisesLoading } = useExercises({ search: exerciseSearch, hasMedia: true });

  useEffect(() => {
    if (!resolvedDay) {
      return;
    }

    setDayNameDraft(resolvedDay.name || '');
    setDayFocusDraft(resolvedDay.focus || '');
    setDayDurationDraft(String(resolvedDay.estimated_duration_min ?? 60));
    setDayTypeDraft((resolvedDay.day_type || 'workout') as (typeof DAY_TYPES)[number]);
  }, [resolvedDay]);

  useEffect(() => {
    if (!plan?.programMeta?.weeklyLayout) {
      return;
    }

    setWeeklyLayoutDraft(
      plan.programMeta.weeklyLayout.map((entry) => ({
        weekday: entry.weekday,
        planDayId: entry.planDayId,
        sessionType: entry.sessionType,
      })),
    );
  }, [plan?.programMeta?.weeklyLayout]);

  const exercisesByBlock = useMemo(() => {
    const bucket = new Map<string, any[]>();
    for (const item of structure?.exercises || []) {
      const key = item.block_id || 'unassigned';
      const list = bucket.get(key) || [];
      list.push(item);
      bucket.set(key, list);
    }
    return bucket;
  }, [structure?.exercises]);

  const selectedDayExerciseCount = (structure?.exercises || []).length;
  const selectedDayFocusScore = useMemo(() => {
    if (!resolvedDay?.focus || !(structure?.exercises || []).length) {
      return null;
    }

    const normalizedFocus = resolvedDay.focus.toLowerCase();
    const aligned = (structure?.exercises || []).filter((exercise) => {
      const category = String(exercise.exercise?.category || '').toLowerCase();
      const muscle = String(exercise.exercise?.primary_muscle || '').toLowerCase();
      const name = String(exercise.exercise?.name || '').toLowerCase();
      return (
        category.includes(normalizedFocus)
        || muscle.includes(normalizedFocus)
        || name.includes(normalizedFocus)
      );
    }).length;

    return aligned / Math.max(1, (structure?.exercises || []).length);
  }, [resolvedDay?.focus, structure?.exercises]);

  const layoutIssues = useMemo(() => {
    if (!plan) {
      return [];
    }

    const issues: string[] = [];
    const assignedIds = weeklyLayoutDraft.map((entry) => entry.planDayId).filter(Boolean) as string[];
    const uniqueAssigned = new Set(assignedIds);
    const workoutDays = days.filter((day: any) => (day.day_type || 'workout') !== 'rest');

    if (assignedIds.length < Math.min(plan.days_per_week, workoutDays.length)) {
      issues.push('Assign more training days to the weekly layout.');
    }
    if (uniqueAssigned.size !== assignedIds.length) {
      issues.push('Each weekday should map to a unique plan day.');
    }
    if (selectedDayFocusScore !== null && selectedDayFocusScore < 0.8) {
      issues.push('Selected day focus coherence is below the publish threshold.');
    }

    return issues;
  }, [days, plan, selectedDayFocusScore, weeklyLayoutDraft]);

  const onAddDay = async () => {
    if (!planId) {
      return;
    }

    try {
      const result = await addDay.mutateAsync({
        planId,
        name: `Day ${days.length + 1}`,
        focus: null,
        dayType: 'workout',
        estimatedDurationMin: 60,
      });
      setSelectedDayId(result.id);
    } catch (error: any) {
      Alert.alert('Unable to add day', error.message || 'Try again.');
    }
  };

  const onSaveDay = async () => {
    if (!resolvedDayId) {
      return;
    }

    try {
      await updateDay.mutateAsync({
        planDayId: resolvedDayId,
        updates: {
          name: dayNameDraft.trim() || resolvedDay?.name || 'Workout Day',
          focus: dayFocusDraft.trim() || null,
          day_type: dayTypeDraft,
          estimated_duration_min: Number(dayDurationDraft || 60),
        },
      });
    } catch (error: any) {
      Alert.alert('Unable to save day', error.message || 'Try again.');
    }
  };

  const onRemoveDay = async () => {
    if (!resolvedDayId) {
      return;
    }

    Alert.alert('Remove day', 'This will remove the day and its exercises from the plan.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await removeDay.mutateAsync(resolvedDayId);
            setSelectedDayId(null);
          } catch (error: any) {
            Alert.alert('Unable to remove day', error.message || 'Try again.');
          }
        },
      },
    ]);
  };

  const onMoveDay = async (direction: 'up' | 'down') => {
    if (!planId || !resolvedDayId) {
      return;
    }

    try {
      await moveDay.mutateAsync({ planId, planDayId: resolvedDayId, direction });
    } catch (error: any) {
      Alert.alert('Unable to move day', error.message || 'Try again.');
    }
  };

  const onCycleWeekday = (weekday: WeeklyLayoutAssignment['weekday']) => {
    setWeeklyLayoutDraft((current) => {
      const existing = current.find((entry) => entry.weekday === weekday);
      const order = [null, ...days.map((day: any) => day.id)];
      const currentIndex = order.findIndex((value) => value === existing?.planDayId);
      const nextPlanDayId = order[(currentIndex + 1) % order.length];
      const nextDay = days.find((day: any) => day.id === nextPlanDayId);
      const nextSessionType: WeeklyLayoutAssignment['sessionType'] =
        nextDay?.day_type === 'conditioning'
          ? 'conditioning'
          : nextDay?.day_type === 'recovery' || nextDay?.day_type === 'active_recovery'
            ? 'active_recovery'
            : nextDay?.day_type === 'rest'
              ? 'rest'
              : nextPlanDayId
                ? 'workout'
                : 'rest';

      const nextEntry: WeeklyLayoutAssignment = {
        weekday,
        planDayId: nextPlanDayId,
        sessionType: nextSessionType,
      };

      return current.map((entry) => (entry.weekday === weekday ? nextEntry : entry));
    });
  };

  const onSaveWeeklyLayout = async () => {
    if (!planId) {
      return;
    }

    try {
      await saveWeeklyLayout.mutateAsync({
        planId,
        layout: weeklyLayoutDraft,
      });
      trackWorkoutProgramWeeklyLayoutUpdated({
        source: 'program_builder_day',
        plan_id: planId,
        assignment_count: weeklyLayoutDraft.length,
      });
    } catch (error: any) {
      Alert.alert('Unable to save layout', error.message || 'Try again.');
    }
  };

  const onAddBlock = async () => {
    if (!resolvedDayId) return;
    try {
      const result = await addBlock.mutateAsync({
        planDayId: resolvedDayId,
        input: {
          blockType: selectedBlockType,
          title: `${selectedBlockType.replaceAll('_', ' ')} block`,
        },
      });
      setSelectedBlockForExercise(result.id);
    } catch (error: any) {
      Alert.alert('Unable to add block', error.message || 'Try again.');
    }
  };

  const onRemoveBlock = async (blockId: string) => {
    Alert.alert('Remove block', 'All exercises in this block will be detached. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await removeBlock.mutateAsync(blockId);
          } catch (error: any) {
            Alert.alert('Unable to remove block', error.message || 'Try again.');
          }
        },
      },
    ]);
  };

  const onAddExercise = async (exerciseId: string) => {
    if (!resolvedDayId) return;
    try {
      await addExercise.mutateAsync({
        planDayId: resolvedDayId,
        input: {
          blockId: selectedBlockForExercise,
          exerciseId,
        },
      });
    } catch (error: any) {
      Alert.alert('Unable to add exercise', error.message || 'Try again.');
    }
  };

  const onPublish = async () => {
    if (!planId) return;
    if (layoutIssues.length > 0) {
      trackWorkoutProgramPublishBlocked({
        source: 'program_builder_day',
        plan_id: planId,
        issue_count: layoutIssues.length,
        issues: layoutIssues,
      });
      Alert.alert('Publish blocked', layoutIssues.join('\n'));
      return;
    }

    try {
      await publishPlan.mutateAsync(planId);
      Alert.alert('Plan published', 'Your updated workout plan is now active.');
      router.replace('/(tabs)/workout');
    } catch (error: any) {
      Alert.alert('Failed to publish', error.message || 'Try again.');
    }
  };

  if (!plan) {
    return (
      <View style={[styles.container, { backgroundColor: c.bg, justifyContent: 'center', alignItems: 'center', paddingTop: insets.top }]}>
        <ActivityIndicator color={c.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: c.bg, paddingTop: insets.top }]}>
      <View style={[styles.header, { paddingHorizontal: s.lg }]}>
        <Pressable onPress={() => router.back()} style={[styles.iconBtn, { backgroundColor: c.surface, borderRadius: r.pill }]}>
          <TabBarIcon name="chevron-back" color={c.text} size={20} />
        </Pressable>
        <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.xl }}>Edit Program</Text>
        <Pressable onPress={onPublish} style={[styles.iconBtn, { backgroundColor: c.surface2, borderRadius: r.pill }]}>
          {publishPlan.isPending ? (
            <ActivityIndicator color={c.text} size="small" />
          ) : (
            <TabBarIcon name="checkmark" color={c.success} size={18} />
          )}
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: s.lg, paddingBottom: insets.bottom + 120 }}>
        <View style={{ backgroundColor: c.surface, borderRadius: r.lg, borderWidth: 1, borderColor: c.border, padding: s.lg }}>
          <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.lg }}>
            {plan.name}
          </Text>
          <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.sm, marginTop: s.xs }}>
            {(plan.programMeta?.programFamilyKey || 'custom').replaceAll('_', ' ')} • {plan.programMeta?.progressionModel?.replaceAll('_', ' ') || 'manual progression'}
          </Text>
          <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.xs, marginTop: s.sm }}>
            Weekly layout: {plan.weeklyLayoutSummary || 'Not assigned yet'}
          </Text>
        </View>

        <View style={{ marginTop: s.lg }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: s.sm }}>
            <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.md }}>Days</Text>
            <Pressable onPress={onAddDay}>
              <Text style={{ color: c.primary, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm }}>+ Add Day</Text>
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {days.map((day: any) => {
              const selected = day.id === resolvedDayId;
              return (
                <Pressable
                  key={day.id}
                  onPress={() => setSelectedDayId(day.id)}
                  style={[
                    styles.dayChip,
                    {
                      borderRadius: r.pill,
                      borderColor: selected ? c.primary : c.border,
                      backgroundColor: selected ? `${c.primary}20` : c.surface,
                    },
                  ]}
                >
                  <Text style={{ color: selected ? c.primary : c.textMuted, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs }}>
                    {`Day ${day.day_number}: ${day.name}`}
                  </Text>
                  <Text style={{ color: selected ? c.text : c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.xs, marginTop: 2 }}>
                    {(day.day_type || 'workout').replaceAll('_', ' ')}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {resolvedDay ? (
          <View style={{ marginTop: s.lg, backgroundColor: c.surface, borderRadius: r.lg, borderWidth: 1, borderColor: c.border, padding: s.lg }}>
            <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.md }}>Day Settings</Text>
            <TextInput
              value={dayNameDraft}
              onChangeText={setDayNameDraft}
              placeholder="Day name"
              placeholderTextColor={c.textMuted}
              style={[styles.input, { marginTop: s.md, borderColor: c.border, borderRadius: r.md, color: c.text, fontFamily: ty.body.family }]}
            />
            <TextInput
              value={dayFocusDraft}
              onChangeText={setDayFocusDraft}
              placeholder="Focus"
              placeholderTextColor={c.textMuted}
              style={[styles.input, { marginTop: s.sm, borderColor: c.border, borderRadius: r.md, color: c.text, fontFamily: ty.body.family }]}
            />
            <TextInput
              value={dayDurationDraft}
              onChangeText={setDayDurationDraft}
              placeholder="Estimated duration"
              placeholderTextColor={c.textMuted}
              keyboardType="number-pad"
              style={[styles.input, { marginTop: s.sm, borderColor: c.border, borderRadius: r.md, color: c.text, fontFamily: ty.body.family }]}
            />

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginTop: s.sm }}>
              {DAY_TYPES.map((option) => (
                <Pressable
                  key={option}
                  onPress={() => setDayTypeDraft(option)}
                  style={[
                    styles.smallChip,
                    {
                      borderRadius: r.pill,
                      borderColor: dayTypeDraft === option ? c.primary : c.border,
                      backgroundColor: dayTypeDraft === option ? `${c.primary}20` : c.surface2,
                    },
                  ]}
                >
                  <Text style={{ color: dayTypeDraft === option ? c.primary : c.textMuted, fontFamily: ty.mono.family, fontSize: ty.sizes.xs }}>
                    {option.replaceAll('_', ' ')}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: s.md }}>
              <Pressable onPress={() => onMoveDay('up')} style={{ flex: 1, backgroundColor: c.surface2, borderRadius: r.md, paddingVertical: 10, alignItems: 'center' }}>
                <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs }}>Move Up</Text>
              </Pressable>
              <Pressable onPress={() => onMoveDay('down')} style={{ flex: 1, backgroundColor: c.surface2, borderRadius: r.md, paddingVertical: 10, alignItems: 'center' }}>
                <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs }}>Move Down</Text>
              </Pressable>
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: s.sm }}>
              <Pressable onPress={onSaveDay} style={{ flex: 1, backgroundColor: c.primary, borderRadius: r.md, paddingVertical: 12, alignItems: 'center' }}>
                <Text style={{ color: c.bg, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm }}>Save Day</Text>
              </Pressable>
              <Pressable onPress={onRemoveDay} style={{ flex: 1, backgroundColor: c.surface2, borderRadius: r.md, paddingVertical: 12, alignItems: 'center' }}>
                <Text style={{ color: c.error || '#ef4444', fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm }}>Remove Day</Text>
              </Pressable>
            </View>

            <View style={{ marginTop: s.md, backgroundColor: c.surface2, borderRadius: r.md, padding: s.md }}>
              <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm }}>
                Focus coherence
              </Text>
              <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.xs, marginTop: 4 }}>
                {selectedDayFocusScore === null
                  ? 'Add a focus and exercises to evaluate alignment.'
                  : `${Math.round(selectedDayFocusScore * 100)}% of exercises match the current focus.`}
              </Text>
              <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.xs, marginTop: 2 }}>
                {selectedDayExerciseCount} exercises in this day
              </Text>
            </View>
          </View>
        ) : null}

        <View style={{ marginTop: s.lg, backgroundColor: c.surface, borderRadius: r.lg, borderWidth: 1, borderColor: c.border, padding: s.lg }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.md }}>Weekly Layout</Text>
            <Pressable onPress={onSaveWeeklyLayout}>
              <Text style={{ color: c.primary, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm }}>Save Layout</Text>
            </Pressable>
          </View>
          <View style={{ gap: 8, marginTop: s.md }}>
            {weeklyLayoutDraft.map((entry) => {
              const assignedDay = days.find((day: any) => day.id === entry.planDayId);
              return (
                <Pressable
                  key={entry.weekday}
                  onPress={() => onCycleWeekday(entry.weekday)}
                  style={{ backgroundColor: c.surface2, borderRadius: r.md, padding: s.md, borderWidth: 1, borderColor: c.border }}
                >
                  <Text style={{ color: c.textMuted, fontFamily: ty.mono.family, fontSize: ty.sizes.xs }}>
                    {entry.weekday.toUpperCase()}
                  </Text>
                  <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm, marginTop: 4 }}>
                    {assignedDay ? assignedDay.name : 'Rest'}
                  </Text>
                  <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.xs, marginTop: 2 }}>
                    {assignedDay ? (assignedDay.day_type || 'workout').replaceAll('_', ' ') : 'tap to cycle'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {layoutIssues.length ? (
            <View style={{ marginTop: s.md, backgroundColor: `${c.primary}15`, borderRadius: r.md, padding: s.md }}>
              {layoutIssues.map((issue) => (
                <Text key={issue} style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.xs, marginBottom: 4 }}>
                  {issue}
                </Text>
              ))}
            </View>
          ) : null}
        </View>

        <View style={{ marginTop: s.lg, backgroundColor: c.surface, borderRadius: r.lg, borderWidth: 1, borderColor: c.border, padding: s.lg }}>
          <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.md }}>Add Block</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginTop: s.sm }}>
            {BLOCK_OPTIONS.map((option) => (
              <Pressable
                key={option}
                onPress={() => setSelectedBlockType(option)}
                style={[styles.smallChip, { borderRadius: r.pill, borderColor: selectedBlockType === option ? c.primary : c.border, backgroundColor: selectedBlockType === option ? `${c.primary}20` : c.surface2 }]}
              >
                <Text style={{ color: selectedBlockType === option ? c.primary : c.textMuted, fontFamily: ty.mono.family, fontSize: ty.sizes.xs }}>
                  {option}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          <Pressable onPress={onAddBlock} style={{ marginTop: s.sm, alignSelf: 'flex-start' }}>
            <Text style={{ color: c.primary, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm }}>+ Add selected block</Text>
          </Pressable>
        </View>

        {structureLoading ? (
          <View style={{ marginTop: s.lg, alignItems: 'center' }}>
            <ActivityIndicator color={c.primary} />
          </View>
        ) : (
          <View style={{ marginTop: s.lg, gap: s.md }}>
            {(structure?.blocks || []).map((block, blockIndex) => {
              const blockExercises = exercisesByBlock.get(block.id) || [];
              return (
                <View key={block.id} style={{ backgroundColor: c.surface, borderRadius: r.lg, borderWidth: 1, borderColor: c.border, padding: s.lg }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flex: 1, paddingRight: s.sm }}>
                      <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.md }}>
                        {block.title || block.block_type.replaceAll('_', ' ')}
                      </Text>
                      <Text style={{ color: c.textMuted, fontFamily: ty.mono.family, fontSize: ty.sizes.xs }}>
                        {block.block_type}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <Pressable onPress={() => moveBlock.mutate({ blockId: block.id, direction: 'up' })}>
                        <TabBarIcon name="chevron-up" color={c.textMuted} size={18} />
                      </Pressable>
                      <Pressable onPress={() => moveBlock.mutate({ blockId: block.id, direction: 'down' })}>
                        <TabBarIcon name="chevron-down" color={c.textMuted} size={18} />
                      </Pressable>
                      <Pressable onPress={() => setSelectedBlockForExercise(block.id)}>
                        <Text style={{ color: c.primary, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs }}>Add exercise</Text>
                      </Pressable>
                      <Pressable onPress={() => onRemoveBlock(block.id)}>
                        <TabBarIcon name="trash-outline" color={c.textMuted} size={16} />
                      </Pressable>
                    </View>
                  </View>
                  <View style={{ marginTop: s.sm, gap: 8 }}>
                    {blockExercises.length === 0 ? (
                      <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.sm }}>No exercises yet.</Text>
                    ) : (
                      blockExercises.map((exercise) => (
                        <Pressable
                          key={exercise.id}
                          onPress={() =>
                            router.push({
                              pathname: '/(tabs)/workout/program-builder-exercise',
                              params: { planDayId: resolvedDayId || '', planExerciseId: exercise.id },
                            })
                          }
                          style={{ backgroundColor: c.surface2, borderRadius: r.md, padding: s.sm, flexDirection: 'row', alignItems: 'center', gap: 10 }}
                        >
                          <ExerciseMediaTile
                            exerciseId={exercise.exercise?.id}
                            title={exercise.exercise?.name || 'Exercise'}
                            subtitle={exercise.exercise?.primary_muscle || exercise.exercise?.category || 'Movement'}
                            videoUrl={exercise.exercise?.video_url}
                            gifUrl={exercise.exercise?.gif_url}
                            imageUrl={exercise.exercise?.image_url}
                            posterUrl={exercise.exercise?.poster_url}
                            hasMedia={exercise.exercise?.has_media}
                            shouldPlay
                            size={72}
                          />
                          <View style={{ flex: 1 }}>
                            <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm }}>
                              {exercise.exercise?.name || 'Exercise'}
                            </Text>
                            <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.xs }}>
                              {exercise.sets_target} x {exercise.reps_min}-{exercise.reps_max} • {exercise.technique_type || 'standard'}
                            </Text>
                          </View>
                        </Pressable>
                      ))
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View style={{ marginTop: s.xl, backgroundColor: c.surface, borderRadius: r.lg, borderWidth: 1, borderColor: c.border, padding: s.lg }}>
          <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.md }}>Exercise Library</Text>
          <TextInput
            value={exerciseSearch}
            onChangeText={setExerciseSearch}
            placeholder="Search exercises"
            placeholderTextColor={c.textMuted}
            style={[styles.input, { borderRadius: r.md, borderColor: c.border, color: c.text, marginTop: s.sm, fontFamily: ty.body.family }]}
          />
          {exercisesLoading ? (
            <ActivityIndicator color={c.primary} style={{ marginTop: s.sm }} />
          ) : (
            <View style={{ marginTop: s.sm, gap: 8 }}>
              {(exerciseOptions || []).slice(0, 10).map((exercise) => (
                <Pressable
                  key={exercise.id}
                  onPress={() => onAddExercise(exercise.id)}
                  style={{ backgroundColor: c.surface2, borderRadius: r.md, padding: s.sm, flexDirection: 'row', alignItems: 'center', gap: 10 }}
                >
                  <ExerciseMediaTile
                    exerciseId={exercise.id}
                    title={exercise.name}
                    subtitle={exercise.primary_muscle || exercise.category}
                    videoUrl={exercise.video_url}
                    gifUrl={exercise.gif_url}
                    imageUrl={exercise.image_url}
                    posterUrl={exercise.poster_url}
                    hasMedia={exercise.has_media}
                    shouldPlay
                    size={70}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm }}>{exercise.name}</Text>
                    <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.xs }}>
                      {exercise.category} • tap to add to selected block
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          )}
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
    paddingVertical: 14,
  },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayChip: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  smallChip: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  input: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
});
