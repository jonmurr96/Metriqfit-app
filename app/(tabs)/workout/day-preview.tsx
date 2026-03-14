import { StyleSheet, View, Text, Pressable, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTokens } from '../../../lib/theme';
import { TabBarIcon } from '../../../components/navigation/TabBarIcon';
import { useWorkoutPlanDay } from '../../../hooks/usePlan';
import { useStartSession, useTemplateDay } from '../../../hooks/useWorkout';

export default function DayPreviewScreen() {
  const { c, s, ty, r } = useTokens();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();

  const dayId = Array.isArray(params.dayId) ? params.dayId[0] : params.dayId;
  const dayName = Array.isArray(params.dayName) ? params.dayName[0] : params.dayName;

  const { data: planDay, isLoading: isPlanDayLoading } = useWorkoutPlanDay(dayId as string);
  const { data: templateDay, isLoading: isTemplateDayLoading } = useTemplateDay(params.templateDayId as string);

  const day = planDay || templateDay;
  const isLoading = isPlanDayLoading || isTemplateDayLoading;

  const startSessionMutation = useStartSession();

  const handleStartWorkout = async () => {
    if (!day) return;

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
                  <View
                    style={[
                      styles.exerciseNumber,
                      { backgroundColor: c.surface2, borderRadius: r.sm },
                    ]}
                  >
                    <Text style={{ color: c.primary, fontFamily: ty.mono.family, fontSize: ty.sizes.sm }}>
                      {blockIndex + 1}.{index + 1}
                    </Text>
                  </View>
                  <View style={styles.exerciseInfo}>
                    <Text style={{ color: c.text, fontFamily: ty.body.familyMedium, fontSize: ty.sizes.md }}>
                      {planExercise.exercise?.name || 'Unknown Exercise'}
                    </Text>
                    <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.sm, marginTop: 2 }}>
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
                    </View>
                    {(planExercise.user_notes || planExercise.notes) && (
                      <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.xs, marginTop: 4, fontStyle: 'italic' }}>
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
        <Pressable
          style={[
            styles.startButton,
            {
              backgroundColor: 'is_completed' in day && day.is_completed ? c.surface2 : c.primary,
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
                color: 'is_completed' in day && day.is_completed ? c.textMuted : c.bg,
                fontFamily: ty.heading.familySemibold,
                fontSize: ty.sizes.lg,
              }}
            >
              {'is_completed' in day && day.is_completed ? 'Workout Completed' : 'Start Workout'}
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
