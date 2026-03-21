import { StyleSheet, View, Text, Pressable, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTokens } from '../../../lib/theme';
import { TabBarIcon } from '../../../components/navigation/TabBarIcon';
import { ExerciseMediaPreview } from '../../../components/workout/media/ExerciseMediaPreview';
import { useActiveWorkoutPlan, useWorkoutPlanCoherence, useWorkoutPlanDay, useWorkoutPlanPreview } from '../../../hooks/usePlan';
import { useStartSession, useTemplateDay } from '../../../hooks/useWorkout';
import {
  trackExerciseDetailOpenedFromPreview,
  trackExerciseMediaPreviewExpanded,
} from '../../../lib/analytics';

export default function DayPreviewScreen() {
  const { c, s, ty, r } = useTokens();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();

  const dayId = Array.isArray(params.dayId) ? params.dayId[0] : params.dayId;
  const dayName = Array.isArray(params.dayName) ? params.dayName[0] : params.dayName;

  const { data: planDay, isLoading: isPlanDayLoading } = useWorkoutPlanDay(dayId as string);
  const { data: templateDay, isLoading: isTemplateDayLoading } = useTemplateDay(params.templateDayId as string);
  const { data: activePlan } = useActiveWorkoutPlan();
  const { data: coherenceReport } = useWorkoutPlanCoherence(activePlan?.id, {
    enabled: !!activePlan?.id,
  });
  const { data: repairPreview } = useWorkoutPlanPreview(activePlan?.id, {
    enabled: !!activePlan?.id,
  });

  const day = planDay || templateDay;
  const isLoading = isPlanDayLoading || isTemplateDayLoading;
  const requiresRepairPreview = !!planDay
    && !!activePlan?.id
    && planDay.plan_id === activePlan.id
    && !!coherenceReport?.hasHardViolations
    && !!coherenceReport?.canRepair;

  const startSessionMutation = useStartSession();

  const openExerciseDetail = (exerciseId?: string | null) => {
    if (!exerciseId) {
      return;
    }

    trackExerciseMediaPreviewExpanded({
      source: 'day_preview',
      exercise_id: exerciseId,
    });
    trackExerciseDetailOpenedFromPreview({
      source: 'day_preview',
      exercise_id: exerciseId,
    });
    router.push({
      pathname: '/(tabs)/workout/exercise-detail',
      params: {
        id: exerciseId,
        source: 'day_preview_media',
      },
    });
  };

  const handleStartWorkout = async () => {
    if (!day) return;
    if (requiresRepairPreview) {
      router.push({ pathname: '/(tabs)/workout/regenerate-plan', params: { mode: 'repair' } });
      return;
    }

    try {
      await startSessionMutation.mutateAsync({
        planDayId: planDay ? day.id : undefined,
        templateDayId: templateDay ? day.id : undefined,
        name: day.name || dayName || 'My Workout',
      });
      router.push('/(tabs)/workout/active-session');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to start workout');
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: c.bg, paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  if (!day) {
    return (
      <View style={[styles.container, { backgroundColor: c.bg, paddingTop: insets.top }]}>
        <View style={[styles.header, { paddingHorizontal: s.lg }]}>
          <Pressable onPress={() => router.back()} style={[styles.backButton, { backgroundColor: c.surface }]}>
            <TabBarIcon name="chevron-back" color={c.text} size={24} />
          </Pressable>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: c.textMuted }}>Day not found</Text>
        </View>
      </View>
    );
  }

  // Sort exercises by order and group into blocks when block_id exists.
  const exercises = day.exercises?.sort((a: any, b: any) => a.order_index - b.order_index) || [];
  const groupedBlocks = (() => {
    const map = new Map<string, { key: string; label: string; exercises: any[] }>();
    for (const exercise of exercises) {
      const blockKey = exercise.block_id || 'standard';
      if (!map.has(blockKey)) {
        map.set(blockKey, {
          key: blockKey,
          label: exercise.block_id ? `Block ${map.size + 1}` : 'Standard Block',
          exercises: [],
        });
      }
      map.get(blockKey)!.exercises.push(exercise);
    }
    return Array.from(map.values());
  })();

  return (
    <View style={[styles.container, { backgroundColor: c.bg, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, { paddingHorizontal: s.lg }]}>
        <Pressable
          onPress={() => router.back()}
          style={[styles.backButton, { backgroundColor: c.surface }]}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <TabBarIcon name="chevron-back" color={c.text} size={24} />
        </Pressable>
        <Text style={[styles.title, { color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.xl }]}>
          Day Preview
        </Text>
        <View style={styles.placeholder} />
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ padding: s.lg, paddingBottom: s.xl }}
      >
        {/* Day Info */}
        <View
          style={[
            styles.dayInfo,
            {
              position: 'relative',
              backgroundColor: c.surface,
              borderRadius: r.lg,
              padding: s.xl,
              borderWidth: 1,
              borderColor: c.border,
              marginBottom: s.lg,
            },
          ]}
        >
          <View style={{ paddingRight: 'is_completed' in day && day.is_completed ? 104 : 0 }}>
            <View style={{ minWidth: 0 }}>
              <Text style={{ color: c.primary, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs, letterSpacing: 1 }}>
                {day.day_number ? `DAY ${day.day_number}` : 'WORKOUT'}
              </Text>
              <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.h3, marginTop: s.xs }}>
                {day.name || dayName || 'Workout Day'}
              </Text>
              <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.sm, marginTop: s.xs }}>
                {day.focus ? `${day.focus} • ` : ''}{exercises.length} exercises
              </Text>
            </View>
          </View>
          {'is_completed' in day && day.is_completed && (
            <View
              style={{
                position: 'absolute',
                top: s.lg,
                right: s.lg,
                backgroundColor: c.success,
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: r.sm,
              }}
            >
              <Text style={{ color: c.bg, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs }}>
                Completed
              </Text>
            </View>
          )}
        </View>

        {/* Exercise List */}
        {groupedBlocks.map((block, blockIndex) => (
          <View key={block.key} style={{ marginBottom: s.md }}>
            <View
              style={{
                backgroundColor: c.surface2,
                borderRadius: r.md,
                borderWidth: 1,
                borderColor: c.border,
                paddingHorizontal: s.md,
                paddingVertical: s.sm,
                marginBottom: s.sm,
              }}
            >
              <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm }}>
                {block.label}
              </Text>
            </View>

            {block.exercises.map((planExercise: any, index: number) => (
              <View
                key={planExercise.id}
                style={[
                  styles.exerciseCard,
                  {
                    backgroundColor: c.surface,
                    borderRadius: r.md,
                    padding: s.lg,
                    borderWidth: 1,
                    borderColor: c.border,
                    marginBottom: s.sm,
                  },
                ]}
              >
                <View style={styles.exerciseHeader}>
                  <Pressable
                    onPress={() => openExerciseDetail(planExercise.exercise?.id)}
                    style={{ width: 104, marginRight: s.md }}
                  >
                    <ExerciseMediaPreview
                      exerciseId={planExercise.exercise?.id}
                      videoUrl={planExercise.exercise?.video_url}
                      gifUrl={planExercise.exercise?.gif_url}
                      imageUrl={planExercise.exercise?.image_url}
                      posterUrl={planExercise.exercise?.poster_url}
                      hasMedia={planExercise.exercise?.has_media}
                      autoplay
                      fit="contain"
                      height={104}
                      borderRadius={r.md}
                      analyticsSource="day_preview"
                      analyticsExerciseId={planExercise.exercise?.id || undefined}
                    />
                  </Pressable>
                  <View style={styles.exerciseInfo}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                      <View
                        style={[
                          styles.exerciseNumber,
                          { backgroundColor: c.surface2, borderRadius: r.sm, marginRight: 10 },
                        ]}
                      >
                        <Text style={{ color: c.primary, fontFamily: ty.mono.family, fontSize: ty.sizes.sm }}>
                          {blockIndex + 1}.{index + 1}
                        </Text>
                      </View>
                      <Text style={{ color: c.text, fontFamily: ty.body.familyMedium, fontSize: ty.sizes.md, flex: 1 }}>
                        {planExercise.exercise?.name || 'Unknown Exercise'}
                      </Text>
                    </View>
                    <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.xs }}>
                      {planExercise.exercise?.category || 'Movement'} • {planExercise.exercise?.primary_muscle || 'Unknown muscle'}
                    </Text>
                    <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.sm, marginTop: 4 }}>
                      {planExercise.sets_target || 3} sets × {planExercise.reps_min}-{planExercise.reps_max} reps
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: s.xs }}>
                      {!!planExercise.technique_type && (
                        <View style={{ backgroundColor: `${c.primary}20`, borderRadius: r.pill, paddingHorizontal: 8, paddingVertical: 2 }}>
                          <Text style={{ color: c.primary, fontFamily: ty.mono.family, fontSize: ty.sizes.xs }}>
                            {String(planExercise.technique_type).replaceAll('_', ' ')}
                          </Text>
                        </View>
                      )}
                      {!!planExercise.tempo && (
                        <View style={{ backgroundColor: c.surface2, borderRadius: r.pill, paddingHorizontal: 8, paddingVertical: 2 }}>
                          <Text style={{ color: c.textMuted, fontFamily: ty.mono.family, fontSize: ty.sizes.xs }}>
                            Tempo {planExercise.tempo}
                          </Text>
                        </View>
                      )}
                      {!!planExercise.rest_seconds && (
                        <View style={{ backgroundColor: c.surface2, borderRadius: r.pill, paddingHorizontal: 8, paddingVertical: 2 }}>
                          <Text style={{ color: c.textMuted, fontFamily: ty.mono.family, fontSize: ty.sizes.xs }}>
                            Rest {planExercise.rest_seconds}s
                          </Text>
                        </View>
                      )}
                    </View>
                    {(planExercise.user_notes || planExercise.notes) && (
                      <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.xs, marginTop: 6, fontStyle: 'italic' }}>
                        Note: {planExercise.user_notes || planExercise.notes}
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>

      {/* Start Button */}
      <View
        style={[
          styles.footer,
          {
            backgroundColor: c.bg,
            paddingHorizontal: s.lg,
            paddingBottom: insets.bottom + s.md,
            paddingTop: s.lg,
            borderTopWidth: 1,
            borderTopColor: c.border,
          },
        ]}
      >
        {requiresRepairPreview ? (
          <Text
            style={{
              color: c.textMuted,
              fontFamily: ty.body.family,
              fontSize: ty.sizes.xs,
              textAlign: 'center',
              marginBottom: s.sm,
            }}
          >
            {repairPreview
              ? 'Review the repair preview to fix this day before starting.'
              : 'This workout day needs a repair preview before you can start it.'}
          </Text>
        ) : null}
        <Pressable
          style={[
            styles.startButton,
            {
              backgroundColor: requiresRepairPreview
                ? c.surface2
                : ('is_completed' in day && day.is_completed ? c.surface2 : c.primary),
              borderRadius: r.md,
              opacity: startSessionMutation.isPending ? 0.7 : 1,
              cursor: 'pointer',
            } as any,
          ]}
          onPress={handleStartWorkout}
          disabled={('is_completed' in day && day.is_completed) || startSessionMutation.isPending}
        >
          {startSessionMutation.isPending ? (
            <ActivityIndicator color={c.bg} />
          ) : (
            <Text
              style={{
                color: requiresRepairPreview
                  ? c.text
                  : ('is_completed' in day && day.is_completed ? c.textMuted : c.bg),
                fontFamily: ty.heading.familySemibold,
                fontSize: ty.sizes.lg,
              }}
            >
              {requiresRepairPreview
                ? 'Review Repair Preview'
                : ('is_completed' in day && day.is_completed ? 'Workout Completed' : 'Start Workout')}
            </Text>
          )}
        </Pressable>
      </View>
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
  scrollView: {
    flex: 1,
  },
  dayInfo: {},
  exerciseCard: {},
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  exerciseNumber: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  exerciseInfo: {
    flex: 1,
  },
  footer: {
    width: '100%',
  },
  startButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
});
