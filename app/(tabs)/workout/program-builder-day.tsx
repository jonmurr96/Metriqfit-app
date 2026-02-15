import { useMemo, useState } from 'react';
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
import { useTokens } from '../../../lib/theme';
import { TabBarIcon } from '../../../components/navigation/TabBarIcon';
import { useActiveWorkoutPlan } from '../../../hooks/usePlan';
import {
  useAddBlockExercise,
  useAddPlanDayBlock,
  usePlanDayBlocks,
  usePublishWorkoutProgram,
  useRemovePlanDayBlock,
} from '../../../hooks/useWorkoutBuilder';
import { useExercises } from '../../../hooks/useWorkout';

const BLOCK_OPTIONS = [
  'normal',
  'superset',
  'giant_set',
  'drop_set',
  'rest_pause',
  'amrap',
  'warmup_protocol',
] as const;

export default function ProgramBuilderDayScreen() {
  const { c, s, ty, r } = useTokens();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ planId?: string; dayId?: string }>();

  const { data: activePlan } = useActiveWorkoutPlan();
  const planId = params.planId || activePlan?.id;
  const [selectedDayId, setSelectedDayId] = useState<string | null>(params.dayId || null);
  const [selectedBlockType, setSelectedBlockType] = useState<(typeof BLOCK_OPTIONS)[number]>('normal');
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [selectedBlockForExercise, setSelectedBlockForExercise] = useState<string | null>(null);

  const days = useMemo(() => {
    if (!activePlan || activePlan.id !== planId) return (activePlan?.days || []);
    return activePlan.days || [];
  }, [activePlan, planId]);

  const resolvedDayId = selectedDayId || days?.[0]?.id || null;
  const { data: structure, isLoading: structureLoading } = usePlanDayBlocks(resolvedDayId || undefined);
  const addBlock = useAddPlanDayBlock();
  const removeBlock = useRemovePlanDayBlock();
  const addExercise = useAddBlockExercise();
  const publishPlan = usePublishWorkoutProgram();
  const { data: exerciseOptions = [], isLoading: exercisesLoading } = useExercises({ search: exerciseSearch });

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
    try {
      await publishPlan.mutateAsync(planId);
      Alert.alert('Plan published', 'Your updated workout plan is now active.');
      router.replace('/(tabs)/workout');
    } catch (error: any) {
      Alert.alert('Failed to publish', error.message || 'Try again.');
    }
  };

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

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: s.lg, gap: 8 }}>
        {days.map((day) => {
          const selected = day.id === resolvedDayId;
          return (
            <Pressable
              key={day.id}
              onPress={() => setSelectedDayId(day.id)}
              style={[styles.dayChip, { borderRadius: r.pill, borderColor: selected ? c.primary : c.border, backgroundColor: selected ? `${c.primary}20` : c.surface }]}
            >
              <Text style={{ color: selected ? c.primary : c.textMuted, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs }}>
                {`Day ${day.day_number}: ${day.name}`}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView contentContainerStyle={{ padding: s.lg, paddingBottom: insets.bottom + 120 }}>
        <View style={{ backgroundColor: c.surface, borderRadius: r.lg, borderWidth: 1, borderColor: c.border, padding: s.lg }}>
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
            {(structure?.blocks || []).map((block) => {
              const blockExercises = exercisesByBlock.get(block.id) || [];
              return (
                <View key={block.id} style={{ backgroundColor: c.surface, borderRadius: r.lg, borderWidth: 1, borderColor: c.border, padding: s.lg }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View>
                      <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.md }}>
                        {block.title || block.block_type.replaceAll('_', ' ')}
                      </Text>
                      <Text style={{ color: c.textMuted, fontFamily: ty.mono.family, fontSize: ty.sizes.xs }}>{block.block_type}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
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
                          style={{ backgroundColor: c.surface2, borderRadius: r.md, padding: s.sm }}
                        >
                          <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm }}>
                            {exercise.exercise?.name || 'Exercise'}
                          </Text>
                          <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.xs }}>
                            {exercise.sets_target} x {exercise.reps_min}-{exercise.reps_max} • {exercise.technique_type || 'standard'}
                          </Text>
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
              {(exerciseOptions || []).slice(0, 12).map((exercise) => (
                <Pressable
                  key={exercise.id}
                  onPress={() => onAddExercise(exercise.id)}
                  style={{ backgroundColor: c.surface2, borderRadius: r.md, padding: s.sm }}
                >
                  <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm }}>{exercise.name}</Text>
                  <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.xs }}>
                    {exercise.category} • tap to add to selected block
                  </Text>
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
