import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTokens } from '../../lib/theme';
import { TabBarIcon } from '../../components/navigation/TabBarIcon';
import {
  useActiveWorkoutPlan,
  useSwapExercise,
  useUpdateExerciseTargets,
  useAddWorkoutPlanExercise,
  useRemoveWorkoutPlanExercise,
  useMoveWorkoutPlanExercise,
} from '../../hooks/usePlan';
import { useExercises } from '../../hooks/useWorkout';
import { useOnboardingAnswers } from '../../hooks/useUser';
import {
  useAddReviewWorkoutDay,
  useRemoveReviewWorkoutDay,
  useSetReviewSectionAccepted,
  useUpdateReviewWorkoutPlan,
} from '../../hooks/useOnboardingReview';
import { trackEvent } from '../../lib/analytics';
import {
  exerciseMatchesWorkoutFocus,
  inferWorkoutFocusTags,
  STRICT_WORKOUT_FOCUS_TAGS,
  type WorkoutFocusTag,
} from '../../lib/workout/focusCoherence';

const WEEKDAYS = [
  { key: 'mon', label: 'Mon' },
  { key: 'tue', label: 'Tue' },
  { key: 'wed', label: 'Wed' },
  { key: 'thu', label: 'Thu' },
  { key: 'fri', label: 'Fri' },
  { key: 'sat', label: 'Sat' },
  { key: 'sun', label: 'Sun' },
] as const;

const MINUTE_OPTIONS = ['30', '45', '60', '90_plus'];

type ExerciseEditFields = {
  sets_target: string;
  reps_min: string;
  reps_max: string;
  rest_seconds: string;
};

type OriginalExerciseSnapshot = {
  exerciseId: string | null;
  sets_target: number;
  reps_min: number;
  reps_max: number;
  rest_seconds: number;
};

function parseNumber(text: string, fallback: number) {
  const n = Number(text);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeWeekdayToken(value: unknown): string | null {
  const token = String(value || '').trim().toLowerCase();
  const map: Record<string, string> = {
    mon: 'mon',
    monday: 'mon',
    tue: 'tue',
    tues: 'tue',
    tuesday: 'tue',
    wed: 'wed',
    weds: 'wed',
    wednesday: 'wed',
    thu: 'thu',
    thur: 'thu',
    thurs: 'thu',
    thursday: 'thu',
    fri: 'fri',
    friday: 'fri',
    sat: 'sat',
    saturday: 'sat',
    sun: 'sun',
    sunday: 'sun',
  };
  return map[token] || null;
}

function normalizeDaysOff(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  return Array.from(
    new Set(
      values
        .map((value) => normalizeWeekdayToken(value))
        .filter((value): value is string => Boolean(value)),
    ),
  );
}

function toExerciseFields(exercise: any): ExerciseEditFields {
  return {
    sets_target: String(exercise?.sets_target ?? 3),
    reps_min: String(exercise?.reps_min ?? 8),
    reps_max: String(exercise?.reps_max ?? 12),
    rest_seconds: String(exercise?.rest_seconds ?? 90),
  };
}

export default function EditWorkoutPlanScreen() {
  const { c, s, ty, r } = useTokens();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ runId?: string }>();
  const runId = typeof params.runId === 'string' ? params.runId : null;

  const { data: workoutPlan, isLoading: workoutLoading } = useActiveWorkoutPlan();
  const { data: onboardingAnswers, isLoading: onboardingLoading } = useOnboardingAnswers();
  const updateWorkout = useUpdateReviewWorkoutPlan();
  const setSectionAccepted = useSetReviewSectionAccepted();
  const addWorkoutDayMutation = useAddReviewWorkoutDay();
  const removeWorkoutDayMutation = useRemoveReviewWorkoutDay();
  const updateExerciseTargetsMutation = useUpdateExerciseTargets();
  const swapExerciseMutation = useSwapExercise();
  const addExerciseMutation = useAddWorkoutPlanExercise();
  const removeExerciseMutation = useRemoveWorkoutPlanExercise();
  const moveExerciseMutation = useMoveWorkoutPlanExercise();

  const answers = (onboardingAnswers?.answers || {}) as Record<string, any>;

  const [name, setName] = useState(workoutPlan?.name || 'MetriqFit Workout Plan');
  const [description, setDescription] = useState(workoutPlan?.description || '');
  const [daysPerWeek, setDaysPerWeek] = useState(String(workoutPlan?.days_per_week || answers.training_days_per_week || 4));
  const [minutesPerWorkout, setMinutesPerWorkout] = useState(String(answers.minutes_per_workout || '60'));
  const [daysOff, setDaysOff] = useState<string[]>(normalizeDaysOff(answers.preferred_days_off));

  const [exerciseEdits, setExerciseEdits] = useState<Record<string, ExerciseEditFields>>({});
  const [exerciseSwapSelection, setExerciseSwapSelection] = useState<Record<string, string>>({});
  const [expandedDayIds, setExpandedDayIds] = useState<string[]>([]);
  const [swapTarget, setSwapTarget] = useState<{ planExerciseId: string; exerciseName: string; currentExerciseId: string | null } | null>(null);
  const [addTargetDay, setAddTargetDay] = useState<{ dayId: string; dayName: string } | null>(null);
  const [swapSearch, setSwapSearch] = useState('');

  const { data: swapCandidates, isLoading: swapLoading } = useExercises({ search: swapSearch });
  const orderedDays = useMemo(() => {
    return [...(workoutPlan?.days || [])].sort((a, b) => a.day_number - b.day_number);
  }, [workoutPlan?.days]);

  const pickerTargetDay = useMemo(() => {
    if (swapTarget) {
      return orderedDays.find((day) => (day.exercises || []).some((exercise) => exercise.id === swapTarget.planExerciseId)) || null;
    }
    if (addTargetDay) {
      return orderedDays.find((day) => day.id === addTargetDay.dayId) || null;
    }
    return null;
  }, [addTargetDay, orderedDays, swapTarget]);

  const pickerFocusTags = useMemo<WorkoutFocusTag[]>(() => {
    if (!pickerTargetDay) return [];
    return inferWorkoutFocusTags(pickerTargetDay.name || '', pickerTargetDay.focus || null).filter((tag) =>
      STRICT_WORKOUT_FOCUS_TAGS.has(tag),
    );
  }, [pickerTargetDay]);

  const basePickerCandidates = useMemo(() => {
    const pool = swapCandidates || [];
    return pool.filter((exercise) => (swapTarget ? exercise.id !== swapTarget.currentExerciseId : true));
  }, [swapCandidates, swapTarget]);

  const focusMatchedPickerCandidates = useMemo(() => {
    if (!pickerFocusTags.length) return basePickerCandidates;
    return basePickerCandidates.filter((exercise) =>
      exerciseMatchesWorkoutFocus(
        {
          name: exercise.name,
          category: exercise.category,
          primary_muscle: exercise.primary_muscle,
          pattern: exercise.pattern,
        },
        pickerFocusTags,
      ),
    );
  }, [basePickerCandidates, pickerFocusTags]);

  const showFallbackCandidates = pickerFocusTags.length > 0 && focusMatchedPickerCandidates.length === 0;
  const displayedPickerCandidates = (showFallbackCandidates ? basePickerCandidates : focusMatchedPickerCandidates).slice(0, 30);

  const originalExerciseMap = useMemo(() => {
    const map: Record<string, OriginalExerciseSnapshot> = {};
    for (const day of workoutPlan?.days || []) {
      for (const exercise of day.exercises || []) {
        map[exercise.id] = {
          exerciseId: exercise.exercise?.id || null,
          sets_target: Number(exercise.sets_target || 0),
          reps_min: Number(exercise.reps_min || 0),
          reps_max: Number(exercise.reps_max || 0),
          rest_seconds: Number(exercise.rest_seconds || 0),
        };
      }
    }
    return map;
  }, [workoutPlan?.days]);

  useEffect(() => {
    if (workoutLoading || onboardingLoading || !workoutPlan) return;

    setName(workoutPlan?.name || 'MetriqFit Workout Plan');
    setDescription(workoutPlan?.description || '');
    setDaysPerWeek(String(workoutPlan?.days_per_week || answers.training_days_per_week || 4));
    setMinutesPerWorkout(String(answers.minutes_per_workout || '60'));
    setDaysOff(normalizeDaysOff(answers.preferred_days_off));

    const nextExerciseEdits: Record<string, ExerciseEditFields> = {};
    for (const day of workoutPlan.days || []) {
      for (const exercise of day.exercises || []) {
        nextExerciseEdits[exercise.id] = toExerciseFields(exercise);
      }
    }
    setExerciseEdits(nextExerciseEdits);

    const firstDayId = workoutPlan.days?.[0]?.id;
    setExpandedDayIds(firstDayId ? [firstDayId] : []);
    setExerciseSwapSelection({});
  }, [
    answers.minutes_per_workout,
    answers.preferred_days_off,
    answers.training_days_per_week,
    onboardingLoading,
    workoutLoading,
    workoutPlan,
  ]);

  const availableDaysOff = useMemo(() => {
    const days = Math.max(2, Math.min(6, parseNumber(daysPerWeek, 4)));
    return Math.max(0, 7 - days);
  }, [daysPerWeek]);

  const isSaving =
    updateWorkout.isPending
    || updateExerciseTargetsMutation.isPending
    || swapExerciseMutation.isPending
    || addExerciseMutation.isPending
    || removeExerciseMutation.isPending
    || moveExerciseMutation.isPending
    || addWorkoutDayMutation.isPending
    || removeWorkoutDayMutation.isPending;

  const toggleDayOff = (day: string) => {
    setDaysOff((prev) => {
      const exists = prev.includes(day);
      if (exists) {
        return prev.filter((entry) => entry !== day);
      }
      if (prev.length >= availableDaysOff) {
        return prev;
      }
      return [...prev, day];
    });
  };

  const toggleDayExpanded = (dayId: string) => {
    setExpandedDayIds((prev) => {
      if (prev.includes(dayId)) {
        return prev.filter((id) => id !== dayId);
      }
      return [...prev, dayId];
    });
  };

  const updateExerciseField = (planExerciseId: string, field: keyof ExerciseEditFields, value: string) => {
    setExerciseEdits((prev) => ({
      ...prev,
      [planExerciseId]: {
        ...prev[planExerciseId],
        [field]: value,
      },
    }));
  };

  const openSwapPicker = (planExerciseId: string, currentExerciseId: string | null, exerciseName: string) => {
    setSwapTarget({ planExerciseId, currentExerciseId, exerciseName });
    setAddTargetDay(null);
    setSwapSearch('');
  };

  const selectedSwapName = (planExerciseId: string) => {
    const selectedId = exerciseSwapSelection[planExerciseId];
    if (!selectedId) return null;
    const fromCurrentResults = (swapCandidates || []).find((exercise) => exercise.id === selectedId);
    if (fromCurrentResults) return fromCurrentResults.name;

    const currentPlanExercise = orderedDays
      .flatMap((day) => day.exercises || [])
      .find((exercise) => exercise.id === planExerciseId);

    if (currentPlanExercise?.exercise?.id === selectedId) {
      return currentPlanExercise.exercise?.name || null;
    }

    return 'Selected replacement';
  };

  const markWorkoutSectionDirty = async () => {
    if (!runId) return;
    try {
      await setSectionAccepted.mutateAsync({ runId, section: 'workout_plan', accepted: false });
    } catch {
      // Non-blocking: user can still continue editing if review-state write fails.
    }
  };

  const openAddExercisePicker = (dayId: string, dayName: string) => {
    setAddTargetDay({ dayId, dayName });
    setSwapTarget(null);
    setSwapSearch('');
  };

  const handleAddWorkoutDay = async () => {
    try {
      await addWorkoutDayMutation.mutateAsync({
        preferred_days_off: daysOff as any,
      });
      await markWorkoutSectionDirty();
    } catch (error: any) {
      Alert.alert('Add day failed', error?.message || 'Unable to add workout day.');
    }
  };

  const handleRemoveWorkoutDay = (planDayId: string, dayName: string) => {
    const runRemoval = async () => {
      try {
        await removeWorkoutDayMutation.mutateAsync({
          planDayId,
          preferred_days_off: daysOff as any,
        });
        await markWorkoutSectionDirty();
      } catch (error: any) {
        Alert.alert('Remove day failed', error?.message || 'Unable to remove workout day.');
      }
    };

    if (Platform.OS === 'web') {
      runRemoval();
      return;
    }

    Alert.alert(
      'Remove workout day',
      `This removes "${dayName}" and rebalances your workout schedule.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: runRemoval },
      ],
    );
  };

  const handleMoveExercise = async (planExerciseId: string, direction: 'up' | 'down') => {
    try {
      await moveExerciseMutation.mutateAsync({ planExerciseId, direction });
      await markWorkoutSectionDirty();
    } catch (error: any) {
      Alert.alert('Move failed', error?.message || 'Unable to reorder exercise.');
    }
  };

  const handleRemoveExercise = (planExerciseId: string) => {
    const runRemoval = async () => {
      try {
        await removeExerciseMutation.mutateAsync({ planExerciseId });
        await markWorkoutSectionDirty();
      } catch (error: any) {
        Alert.alert('Remove failed', error?.message || 'Unable to remove exercise.');
      }
    };

    if (Platform.OS === 'web') {
      runRemoval();
      return;
    }

    Alert.alert(
      'Remove Exercise',
      'This will remove the exercise from this training day.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: runRemoval,
        },
      ],
    );
  };

  const save = async () => {
    const normalizedDays = Math.max(2, Math.min(6, parseNumber(daysPerWeek, 4)));

    if (!name.trim()) {
      Alert.alert('Name required', 'Please provide a workout plan name.');
      return;
    }

    if (daysOff.length > Math.max(0, 7 - normalizedDays)) {
      Alert.alert('Too many days off', 'Reduce days off or lower your workout frequency.');
      return;
    }

    try {
      await updateWorkout.mutateAsync({
        name: name.trim(),
        description: description.trim() || null,
        days_per_week: normalizedDays,
        preferred_days_off: daysOff as any,
        minutes_per_workout: minutesPerWorkout,
      });

      for (const [planExerciseId, replacementExerciseId] of Object.entries(exerciseSwapSelection)) {
        const original = originalExerciseMap[planExerciseId];
        if (!original?.exerciseId || !replacementExerciseId || original.exerciseId === replacementExerciseId) {
          continue;
        }

        await swapExerciseMutation.mutateAsync({
          planExerciseId,
          newExerciseId: replacementExerciseId,
        });
      }

      for (const [planExerciseId, values] of Object.entries(exerciseEdits)) {
        const original = originalExerciseMap[planExerciseId];
        if (!original) continue;

        const setsTarget = Math.max(1, Math.min(10, parseNumber(values.sets_target, original.sets_target || 3)));
        const repsMin = Math.max(1, Math.min(30, parseNumber(values.reps_min, original.reps_min || 8)));
        const repsMaxCandidate = Math.max(1, Math.min(40, parseNumber(values.reps_max, original.reps_max || 12)));
        const repsMax = Math.max(repsMin, repsMaxCandidate);
        const restSeconds = Math.max(10, Math.min(360, parseNumber(values.rest_seconds, original.rest_seconds || 90)));

        const hasChange =
          setsTarget !== original.sets_target
          || repsMin !== original.reps_min
          || repsMax !== original.reps_max
          || restSeconds !== original.rest_seconds;

        if (!hasChange) continue;

        await updateExerciseTargetsMutation.mutateAsync({
          planExerciseId,
          updates: {
            sets_target: setsTarget,
            reps_min: repsMin,
            reps_max: repsMax,
            rest_seconds: restSeconds,
          },
        });
      }

      await markWorkoutSectionDirty();

      trackEvent('plan_review_section_edited', { section: 'workout_plan', generation_run_id: runId });
      router.replace({ pathname: '/(onboarding)/plan-review', params: runId ? { runId } : undefined });
    } catch (error: any) {
      Alert.alert('Save failed', error?.message || 'Unable to save workout plan changes.');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: c.bg, paddingTop: insets.top + s.md }]}> 
      <View style={[styles.header, { paddingHorizontal: s.lg }]}> 
        <Pressable style={[styles.iconButton, { backgroundColor: c.surface, borderColor: c.border, borderRadius: r.md }]} onPress={() => router.back()}>
          <TabBarIcon name="chevron-back" color={c.text} size={22} />
        </Pressable>
        <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.lg }}>Edit Workout Plan</Text>
        <View style={{ width: 42 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: s.lg, paddingBottom: insets.bottom + s.xl }}>
        <View style={styles.fieldWrap}>
          <Text style={[styles.label, { color: c.text, fontFamily: ty.body.familySemibold }]}>Plan name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.surface, borderRadius: r.md, fontFamily: ty.body.family }]}
          />
        </View>

        <View style={styles.fieldWrap}>
          <Text style={[styles.label, { color: c.text, fontFamily: ty.body.familySemibold }]}>Description</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            style={[styles.textArea, { color: c.text, borderColor: c.border, backgroundColor: c.surface, borderRadius: r.md, fontFamily: ty.body.family }]}
          />
        </View>

        <View style={styles.fieldWrap}>
          <Text style={[styles.label, { color: c.text, fontFamily: ty.body.familySemibold }]}>Days per week</Text>
          <TextInput
            value={daysPerWeek}
            onChangeText={setDaysPerWeek}
            keyboardType="numeric"
            style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.surface, borderRadius: r.md, fontFamily: ty.body.family }]}
          />
        </View>

        <View style={styles.fieldWrap}>
          <Text style={[styles.label, { color: c.text, fontFamily: ty.body.familySemibold }]}>Minutes per workout</Text>
          <View style={styles.rowWrap}>
            {MINUTE_OPTIONS.map((option) => {
              const selected = minutesPerWorkout === option;
              return (
                <Pressable
                  key={option}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: selected ? c.primary : c.surface,
                      borderColor: selected ? c.primary : c.border,
                      borderRadius: r.pill,
                    },
                  ]}
                  onPress={() => setMinutesPerWorkout(option)}
                >
                  <Text style={{ color: selected ? c.bg : c.text, fontFamily: ty.body.familySemibold }}>
                    {option === '90_plus' ? '90+' : `${option} min`}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.fieldWrap}>
          <Text style={[styles.label, { color: c.text, fontFamily: ty.body.familySemibold }]}>Preferred days off ({daysOff.length}/{availableDaysOff})</Text>
          <View style={styles.rowWrap}>
            {WEEKDAYS.map((day) => {
              const selected = daysOff.includes(day.key);
              const disabled = !selected && daysOff.length >= availableDaysOff;
              return (
                <Pressable
                  key={day.key}
                  style={[
                    styles.dayChip,
                    {
                      backgroundColor: selected ? c.primary : c.surface,
                      borderColor: selected ? c.primary : c.border,
                      borderRadius: r.md,
                      opacity: disabled ? 0.5 : 1,
                    },
                  ]}
                  onPress={() => toggleDayOff(day.key)}
                  disabled={disabled}
                >
                  <Text style={{ color: selected ? c.bg : c.text, fontFamily: ty.body.familySemibold }}>{day.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={[styles.advancedCard, { borderColor: c.border, backgroundColor: c.surface, borderRadius: r.lg }]}> 
          <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.md }}>
            Exercise-Level Customization
          </Text>
          <Text style={{ color: c.textMuted, fontFamily: ty.body.family, marginTop: 4, marginBottom: 10, fontSize: 12 }}>
            Expand each workout day to edit sets/reps/rest, reorder exercises, remove blocks, and add new movements.
          </Text>

          <View style={styles.dayActionRow}>
            <Pressable
              style={[
                styles.dayActionButton,
                {
                  borderColor: c.primary,
                  borderRadius: r.pill,
                  opacity: orderedDays.length >= 6 || isSaving ? 0.5 : 1,
                },
              ]}
              onPress={handleAddWorkoutDay}
              disabled={orderedDays.length >= 6 || isSaving}
            >
              <TabBarIcon name="add" color={c.primary} size={14} />
              <Text style={{ color: c.primary, fontFamily: ty.body.familySemibold, fontSize: 11 }}>
                Add workout day
              </Text>
            </Pressable>
            <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: 11 }}>
              {orderedDays.length}/6 days configured
            </Text>
          </View>

          {orderedDays.map((day) => {
            const isExpanded = expandedDayIds.includes(day.id);
            const dayExercises = day.exercises || [];
            const canRemoveDay = orderedDays.length > 2;
            return (
              <View key={day.id} style={[styles.dayCard, { borderColor: c.border, borderRadius: r.md, backgroundColor: c.bg }]}> 
                <Pressable style={styles.dayHeader} onPress={() => toggleDayExpanded(day.id)}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: c.text, fontFamily: ty.body.familySemibold }}>
                      Day {day.day_number}: {day.name || 'Workout Day'}
                    </Text>
                    {day.focus ? (
                      <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: 12, marginTop: 2 }}>
                        {day.focus}
                      </Text>
                    ) : null}
                  </View>
                  <View style={styles.dayHeaderRight}>
                    <Pressable
                      style={[
                        styles.dayRemoveButton,
                        {
                          borderColor: c.border,
                          borderRadius: r.pill,
                          opacity: canRemoveDay && !isSaving ? 1 : 0.45,
                        },
                      ]}
                      onPress={(event) => {
                        event?.stopPropagation?.();
                        handleRemoveWorkoutDay(day.id, day.name || `Day ${day.day_number}`);
                      }}
                      disabled={!canRemoveDay || isSaving}
                    >
                      <TabBarIcon name="trash-outline" color={c.textMuted} size={12} />
                    </Pressable>
                    <TabBarIcon name={isExpanded ? 'chevron-up' : 'chevron-down'} color={c.textMuted} size={16} />
                  </View>
                </Pressable>

                {isExpanded ? (
                  <View style={styles.exerciseList}>
                    <View style={styles.dayActionRow}>
                      <Pressable
                        style={[styles.dayActionButton, { borderColor: c.primary, borderRadius: r.pill }]}
                        onPress={() => openAddExercisePicker(day.id, day.name || `Day ${day.day_number}`)}
                        disabled={isSaving}
                      >
                        <TabBarIcon name="add" color={c.primary} size={14} />
                        <Text style={{ color: c.primary, fontFamily: ty.body.familySemibold, fontSize: 11 }}>
                          Add exercise
                        </Text>
                      </Pressable>
                    </View>

                    {dayExercises.map((exercise, idx) => {
                      const fields = exerciseEdits[exercise.id] || toExerciseFields(exercise);
                      const pendingSwapName = selectedSwapName(exercise.id);

                      return (
                        <View key={exercise.id} style={[styles.exerciseCard, { borderColor: c.border, borderRadius: r.md, backgroundColor: c.surface2 }]}> 
                          <View style={styles.exerciseHeader}>
                            <View style={{ flex: 1 }}>
                              <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: 13 }}>
                                {exercise.exercise?.name || 'Exercise'}
                              </Text>
                              {pendingSwapName ? (
                                <Text style={{ color: c.primary, fontFamily: ty.body.family, fontSize: 11, marginTop: 2 }}>
                                  Replacement selected: {pendingSwapName}
                                </Text>
                              ) : null}
                            </View>
                            <Pressable
                              style={[styles.swapButton, { borderColor: c.primary, borderRadius: r.pill }]}
                              onPress={() => openSwapPicker(exercise.id, exercise.exercise?.id || null, exercise.exercise?.name || 'Exercise')}
                              disabled={isSaving}
                            >
                              <Text style={{ color: c.primary, fontFamily: ty.body.familySemibold, fontSize: 11 }}>Swap</Text>
                            </Pressable>
                          </View>

                          <View style={styles.exerciseToolsRow}>
                            <Pressable
                              style={[styles.toolButton, { borderColor: c.border, borderRadius: r.sm, opacity: idx === 0 ? 0.4 : 1 }]}
                              onPress={() => handleMoveExercise(exercise.id, 'up')}
                              disabled={idx === 0 || isSaving}
                            >
                              <TabBarIcon name="chevron-up" color={c.textMuted} size={14} />
                            </Pressable>
                            <Pressable
                              style={[styles.toolButton, { borderColor: c.border, borderRadius: r.sm, opacity: idx === dayExercises.length - 1 ? 0.4 : 1 }]}
                              onPress={() => handleMoveExercise(exercise.id, 'down')}
                              disabled={idx === dayExercises.length - 1 || isSaving}
                            >
                              <TabBarIcon name="chevron-down" color={c.textMuted} size={14} />
                            </Pressable>
                            <Pressable
                              style={[styles.toolButton, { borderColor: c.border, borderRadius: r.sm }]}
                              onPress={() => handleRemoveExercise(exercise.id)}
                              disabled={isSaving}
                            >
                              <TabBarIcon name="trash-outline" color={c.textMuted} size={14} />
                            </Pressable>
                          </View>

                          <View style={styles.metricRow}>
                            <View style={styles.metricCol}>
                              <Text style={[styles.metricLabel, { color: c.textMuted, fontFamily: ty.mono.family }]}>Sets</Text>
                              <TextInput
                                value={fields.sets_target}
                                onChangeText={(value) => updateExerciseField(exercise.id, 'sets_target', value)}
                                keyboardType="numeric"
                                style={[styles.metricInput, { color: c.text, borderColor: c.border, backgroundColor: c.bg, borderRadius: r.sm, fontFamily: ty.body.family }]}
                              />
                            </View>
                            <View style={styles.metricCol}>
                              <Text style={[styles.metricLabel, { color: c.textMuted, fontFamily: ty.mono.family }]}>Rep Min</Text>
                              <TextInput
                                value={fields.reps_min}
                                onChangeText={(value) => updateExerciseField(exercise.id, 'reps_min', value)}
                                keyboardType="numeric"
                                style={[styles.metricInput, { color: c.text, borderColor: c.border, backgroundColor: c.bg, borderRadius: r.sm, fontFamily: ty.body.family }]}
                              />
                            </View>
                            <View style={styles.metricCol}>
                              <Text style={[styles.metricLabel, { color: c.textMuted, fontFamily: ty.mono.family }]}>Rep Max</Text>
                              <TextInput
                                value={fields.reps_max}
                                onChangeText={(value) => updateExerciseField(exercise.id, 'reps_max', value)}
                                keyboardType="numeric"
                                style={[styles.metricInput, { color: c.text, borderColor: c.border, backgroundColor: c.bg, borderRadius: r.sm, fontFamily: ty.body.family }]}
                              />
                            </View>
                            <View style={styles.metricCol}>
                              <Text style={[styles.metricLabel, { color: c.textMuted, fontFamily: ty.mono.family }]}>Rest (s)</Text>
                              <TextInput
                                value={fields.rest_seconds}
                                onChangeText={(value) => updateExerciseField(exercise.id, 'rest_seconds', value)}
                                keyboardType="numeric"
                                style={[styles.metricInput, { color: c.text, borderColor: c.border, backgroundColor: c.bg, borderRadius: r.sm, fontFamily: ty.body.family }]}
                              />
                            </View>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>

        <Pressable style={[styles.saveButton, { backgroundColor: c.primary, borderRadius: r.md, opacity: isSaving ? 0.7 : 1 }]} onPress={save} disabled={isSaving}>
          {isSaving ? (
            <ActivityIndicator color={c.bg} size="small" />
          ) : (
            <Text style={{ color: c.bg, fontFamily: ty.heading.familySemibold }}>Save Workout Customizations</Text>
          )}
        </Pressable>
      </ScrollView>

      {(swapTarget || addTargetDay) ? (
        <View style={styles.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => { setSwapTarget(null); setAddTargetDay(null); }} />
          <View style={[styles.swapCard, { backgroundColor: c.surface, borderColor: c.border, borderRadius: r.lg }]}> 
            <View style={styles.swapHeader}>
              <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.md, flex: 1 }}>
                {swapTarget ? `Replace ${swapTarget.exerciseName}` : `Add Exercise: ${addTargetDay?.dayName || ''}`}
              </Text>
              <Pressable onPress={() => { setSwapTarget(null); setAddTargetDay(null); }}>
                <TabBarIcon name="close" color={c.textMuted} size={18} />
              </Pressable>
            </View>

            <TextInput
              value={swapSearch}
              onChangeText={setSwapSearch}
              placeholder="Search exercise"
              placeholderTextColor={c.textMuted}
              style={[styles.searchInput, { color: c.text, borderColor: c.border, backgroundColor: c.bg, borderRadius: r.md, fontFamily: ty.body.family }]}
              autoFocus
            />

            <ScrollView style={styles.swapList}>
              {swapLoading ? (
                <ActivityIndicator color={c.primary} style={{ marginTop: 20 }} />
              ) : (
                <>
                  {pickerFocusTags.length > 0 ? (
                    <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: 11, marginBottom: 8 }}>
                      Showing exercises aligned to {pickerTargetDay?.name || 'this day'} focus.
                    </Text>
                  ) : null}
                  {showFallbackCandidates ? (
                    <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: 11, marginBottom: 8 }}>
                      No exact focus matches found for this search. Showing all exercises.
                    </Text>
                  ) : null}
                  {displayedPickerCandidates.map((exercise) => (
                    <Pressable
                      key={exercise.id}
                      style={[styles.swapOption, { borderColor: c.border }]}
                      onPress={async () => {
                        if (swapTarget) {
                          setExerciseSwapSelection((prev) => ({
                            ...prev,
                            [swapTarget.planExerciseId]: exercise.id,
                          }));
                          setSwapTarget(null);
                          return;
                        }

                        if (!addTargetDay) return;

                        try {
                          await addExerciseMutation.mutateAsync({
                            planDayId: addTargetDay.dayId,
                            exerciseId: exercise.id,
                          });
                          await markWorkoutSectionDirty();
                          setAddTargetDay(null);
                        } catch (error: any) {
                          Alert.alert('Add failed', error?.message || 'Unable to add exercise.');
                        }
                      }}
                    >
                      <Text style={{ color: c.text, fontFamily: ty.body.familySemibold }}>{exercise.name}</Text>
                      <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: 11 }}>
                        {exercise.category || 'General'}
                      </Text>
                    </Pressable>
                  ))}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldWrap: { marginBottom: 12 },
  label: {
    fontSize: 13,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    height: 48,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    minHeight: 92,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    textAlignVertical: 'top',
  },
  rowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayChip: {
    borderWidth: 1,
    width: 58,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  advancedCard: {
    borderWidth: 1,
    padding: 12,
    marginTop: 4,
  },
  dayCard: {
    borderWidth: 1,
    marginTop: 8,
    overflow: 'hidden',
  },
  dayHeader: {
    minHeight: 48,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  dayHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dayRemoveButton: {
    borderWidth: 1,
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exerciseList: {
    paddingHorizontal: 8,
    paddingBottom: 8,
    gap: 8,
  },
  dayActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dayActionButton: {
    borderWidth: 1,
    minHeight: 30,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  exerciseCard: {
    borderWidth: 1,
    padding: 10,
    gap: 8,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  swapButton: {
    borderWidth: 1,
    minWidth: 62,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  exerciseToolsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  toolButton: {
    borderWidth: 1,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricRow: {
    flexDirection: 'row',
    gap: 6,
  },
  metricCol: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 10,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  metricInput: {
    borderWidth: 1,
    height: 38,
    paddingHorizontal: 8,
    fontSize: 14,
  },
  saveButton: {
    marginTop: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    padding: 12,
  },
  swapCard: {
    borderWidth: 1,
    maxHeight: '72%',
    padding: 12,
  },
  swapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 8,
  },
  searchInput: {
    borderWidth: 1,
    height: 44,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  swapList: {
    maxHeight: 340,
  },
  swapOption: {
    borderBottomWidth: 1,
    paddingVertical: 10,
    gap: 2,
  },
});
