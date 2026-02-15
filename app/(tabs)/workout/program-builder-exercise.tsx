import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTokens } from '../../../lib/theme';
import { TabBarIcon } from '../../../components/navigation/TabBarIcon';
import { usePlanDayBlocks, useRemoveBlockExercise, useUpdateBlockExercise } from '../../../hooks/useWorkoutBuilder';

const TECHNIQUES = ['none', 'tempo', 'pause_reps', 'superset', 'drop_set', 'rest_pause', 'amrap'];

export default function ProgramBuilderExerciseScreen() {
  const { c, s, ty, r } = useTokens();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ planDayId?: string; planExerciseId?: string }>();

  const planDayId = params.planDayId || '';
  const planExerciseId = params.planExerciseId || '';
  const { data } = usePlanDayBlocks(planDayId);
  const updateMutation = useUpdateBlockExercise();
  const removeMutation = useRemoveBlockExercise();

  const exercise = useMemo(() => (data?.exercises || []).find((item) => item.id === planExerciseId), [data?.exercises, planExerciseId]);

  const [setsTarget, setSetsTarget] = useState(exercise?.sets_target?.toString() || '3');
  const [repsMin, setRepsMin] = useState(exercise?.reps_min?.toString() || '8');
  const [repsMax, setRepsMax] = useState(exercise?.reps_max?.toString() || '12');
  const [restSeconds, setRestSeconds] = useState((exercise?.rest_seconds || 90).toString());
  const [tempo, setTempo] = useState(exercise?.tempo || '');
  const [technique, setTechnique] = useState(exercise?.technique_type || 'none');
  const [notes, setNotes] = useState(exercise?.user_notes || '');

  const onSave = async () => {
    if (!planExerciseId) return;
    try {
      await updateMutation.mutateAsync({
        planExerciseId,
        planDayId,
        updates: {
          sets_target: Number(setsTarget || 3),
          reps_min: Number(repsMin || 1),
          reps_max: Number(repsMax || Number(repsMin || 1)),
          rest_seconds: Number(restSeconds || 90),
          tempo: tempo.trim() || null,
          technique_type: technique === 'none' ? null : technique,
          user_notes: notes.trim() || null,
        },
      });
      router.back();
    } catch (error: any) {
      Alert.alert('Unable to save', error.message || 'Try again.');
    }
  };

  const onDelete = async () => {
    Alert.alert('Remove exercise', 'This exercise will be removed from the workout day.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await removeMutation.mutateAsync(planExerciseId);
            router.back();
          } catch (error: any) {
            Alert.alert('Unable to remove', error.message || 'Try again.');
          }
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: c.bg, paddingTop: insets.top }]}>
      <View style={[styles.header, { paddingHorizontal: s.lg }]}>
        <Pressable onPress={() => router.back()} style={[styles.iconBtn, { backgroundColor: c.surface, borderRadius: r.pill }]}>
          <TabBarIcon name="chevron-back" color={c.text} size={20} />
        </Pressable>
        <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.xl }}>Exercise Editor</Text>
        <Pressable onPress={onSave} style={[styles.iconBtn, { backgroundColor: c.surface2, borderRadius: r.pill }]}>
          <TabBarIcon name="checkmark" color={c.success} size={18} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: s.lg, paddingBottom: insets.bottom + 120 }}>
        <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.lg }}>
          {exercise?.exercise?.name || 'Exercise'}
        </Text>
        <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.sm, marginTop: s.xs }}>
          Configure set targets, intensity style, and technique metadata.
        </Text>

        <View style={{ marginTop: s.lg, gap: s.sm }}>
          <Field label="Sets target" value={setsTarget} onChange={setSetsTarget} keyboardType="number-pad" c={c} ty={ty} r={r} />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Field label="Reps min" value={repsMin} onChange={setRepsMin} keyboardType="number-pad" c={c} ty={ty} r={r} />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Reps max" value={repsMax} onChange={setRepsMax} keyboardType="number-pad" c={c} ty={ty} r={r} />
            </View>
          </View>
          <Field label="Rest seconds" value={restSeconds} onChange={setRestSeconds} keyboardType="number-pad" c={c} ty={ty} r={r} />
          <Field label="Tempo (e.g. 3-1-1)" value={tempo} onChange={setTempo} c={c} ty={ty} r={r} />
        </View>

        <Text style={{ color: c.textMuted, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs, marginTop: s.lg }}>
          TECHNIQUE
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginTop: s.sm }}>
          {TECHNIQUES.map((option) => (
            <Pressable
              key={option}
              onPress={() => setTechnique(option)}
              style={[
                styles.techChip,
                {
                  borderRadius: r.pill,
                  borderColor: technique === option ? c.primary : c.border,
                  backgroundColor: technique === option ? `${c.primary}20` : c.surface2,
                },
              ]}
            >
              <Text style={{ color: technique === option ? c.primary : c.textMuted, fontFamily: ty.mono.family, fontSize: ty.sizes.xs }}>
                {option}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={{ marginTop: s.lg }}>
          <Text style={{ color: c.textMuted, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs }}>NOTES</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Coaching notes, cues, substitutions..."
            placeholderTextColor={c.textMuted}
            multiline
            style={{
              borderWidth: 1,
              borderColor: c.border,
              borderRadius: r.md,
              marginTop: s.sm,
              minHeight: 90,
              padding: 12,
              color: c.text,
              fontFamily: ty.body.family,
              textAlignVertical: 'top',
            }}
          />
        </View>

        <Pressable onPress={onSave} style={{ marginTop: s.lg, backgroundColor: c.primary, borderRadius: r.md, paddingVertical: 12, alignItems: 'center' }}>
          <Text style={{ color: c.bg, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.md }}>Save Changes</Text>
        </Pressable>

        <Pressable onPress={onDelete} style={{ marginTop: s.sm, backgroundColor: c.surface2, borderRadius: r.md, paddingVertical: 12, alignItems: 'center' }}>
          <Text style={{ color: c.error || '#ef4444', fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm }}>Remove Exercise</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function Field({
  label,
  value,
  onChange,
  keyboardType,
  c,
  ty,
  r,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  keyboardType?: 'default' | 'number-pad';
  c: any;
  ty: any;
  r: any;
}) {
  return (
    <View>
      <Text style={{ color: c.textMuted, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs }}>{label.toUpperCase()}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType={keyboardType}
        placeholderTextColor={c.textMuted}
        style={{ marginTop: 6, borderWidth: 1, borderColor: c.border, borderRadius: r.md, paddingHorizontal: 12, paddingVertical: 10, color: c.text, fontFamily: ty.body.family }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  techChip: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
});
