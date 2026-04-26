import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TabBarIcon } from '../../../components/navigation/TabBarIcon';
import { ExerciseMediaHero } from '../../../components/workout/media/ExerciseMediaHero';
import {
  useMovePlanDayExercise,
  usePlanDayBlocks,
  useRemoveBlockExercise,
  useUpdateBlockExercise,
} from '../../../hooks/useWorkoutBuilder';
import { useTokens } from '../../../lib/theme';

const TECHNIQUES = ['none', 'tempo', 'pause_reps', 'superset', 'drop_set', 'rest_pause', 'amrap'] as const;
const SET_STYLES = ['straight', 'pyramid', 'top_set_backoff', 'wave'] as const;

export default function ProgramBuilderExerciseScreen() {
  const { c, s, ty, r } = useTokens();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ planDayId?: string; planExerciseId?: string }>();

  const planDayId = params.planDayId || '';
  const planExerciseId = params.planExerciseId || '';
  const { data } = usePlanDayBlocks(planDayId);
  const updateMutation = useUpdateBlockExercise();
  const moveMutation = useMovePlanDayExercise();
  const removeMutation = useRemoveBlockExercise();

  const exercise = useMemo(() => (data?.exercises || []).find((item) => item.id === planExerciseId), [data?.exercises, planExerciseId]);

  const [setsTarget, setSetsTarget] = useState('3');
  const [repsMin, setRepsMin] = useState('8');
  const [repsMax, setRepsMax] = useState('12');
  const [restSeconds, setRestSeconds] = useState('90');
  const [tempo, setTempo] = useState('');
  const [technique, setTechnique] = useState<(typeof TECHNIQUES)[number]>('none');
  const [setStyle, setSetStyle] = useState<(typeof SET_STYLES)[number]>('straight');
  const [rirMin, setRirMin] = useState('');
  const [rirMax, setRirMax] = useState('');
  const [rpeMin, setRpeMin] = useState('');
  const [rpeMax, setRpeMax] = useState('');
  const [pauseSeconds, setPauseSeconds] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  useEffect(() => {
    if (!exercise) {
      return;
    }

    setSetsTarget(String(exercise.sets_target || 3));
    setRepsMin(String(exercise.reps_min || 8));
    setRepsMax(String(exercise.reps_max || 12));
    setRestSeconds(String(exercise.rest_seconds || 90));
    setTempo(exercise.tempo || '');
    setTechnique((exercise.technique_type || 'none') as (typeof TECHNIQUES)[number]);
    setSetStyle((exercise.set_style || 'straight') as (typeof SET_STYLES)[number]);
    setRirMin(exercise.rir_target_min === null || exercise.rir_target_min === undefined ? '' : String(exercise.rir_target_min));
    setRirMax(exercise.rir_target_max === null || exercise.rir_target_max === undefined ? '' : String(exercise.rir_target_max));
    setRpeMin(exercise.rpe_target_min === null || exercise.rpe_target_min === undefined ? '' : String(exercise.rpe_target_min));
    setRpeMax(exercise.rpe_target_max === null || exercise.rpe_target_max === undefined ? '' : String(exercise.rpe_target_max));
    setPauseSeconds(exercise.pause_seconds === null || exercise.pause_seconds === undefined ? '' : String(exercise.pause_seconds));
    setNotes(exercise.user_notes || '');
    setSelectedBlockId(exercise.block_id || null);
  }, [exercise]);

  const onSave = async () => {
    if (!planExerciseId) return;
    try {
      await updateMutation.mutateAsync({
        planExerciseId,
        planDayId,
        updates: {
          block_id: selectedBlockId,
          sets_target: Number(setsTarget || 3),
          reps_min: Number(repsMin || 1),
          reps_max: Number(repsMax || Number(repsMin || 1)),
          rest_seconds: Number(restSeconds || 90),
          tempo: tempo.trim() || null,
          technique_type: technique === 'none' ? null : technique,
          set_style: setStyle,
          rir_target_min: rirMin === '' ? null : Number(rirMin),
          rir_target_max: rirMax === '' ? null : Number(rirMax),
          rpe_target_min: rpeMin === '' ? null : Number(rpeMin),
          rpe_target_max: rpeMax === '' ? null : Number(rpeMax),
          pause_seconds: pauseSeconds === '' ? null : Number(pauseSeconds),
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

  const onMove = async (direction: 'up' | 'down') => {
    try {
      await moveMutation.mutateAsync({ planDayId, planExerciseId, direction });
    } catch (error: any) {
      Alert.alert('Unable to move exercise', error.message || 'Try again.');
    }
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
          Advanced prescription controls, block placement, and movement preview.
        </Text>

        <View style={{ marginTop: s.lg }}>
          <ExerciseMediaHero
            exerciseId={exercise?.exercise?.id}
            videoUrl={exercise?.exercise?.video_url}
            gifUrl={exercise?.exercise?.gif_url}
            imageUrl={exercise?.exercise?.image_url}
            posterUrl={exercise?.exercise?.poster_url}
            hasMedia={exercise?.exercise?.has_media}
            height={190}
            fit="contain"
          />
        </View>

        <View style={{ flexDirection: 'row', gap: 10, marginTop: s.lg }}>
          <Pressable onPress={() => onMove('up')} style={{ flex: 1, backgroundColor: c.surface2, borderRadius: r.md, paddingVertical: 10, alignItems: 'center' }}>
            <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs }}>Move Up</Text>
          </Pressable>
          <Pressable onPress={() => onMove('down')} style={{ flex: 1, backgroundColor: c.surface2, borderRadius: r.md, paddingVertical: 10, alignItems: 'center' }}>
            <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs }}>Move Down</Text>
          </Pressable>
        </View>

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
          <Field label="Tempo" value={tempo} onChange={setTempo} c={c} ty={ty} r={r} />
          <Field label="Pause seconds" value={pauseSeconds} onChange={setPauseSeconds} keyboardType="number-pad" c={c} ty={ty} r={r} />
        </View>

        <Text style={{ color: c.textMuted, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs, marginTop: s.lg }}>
          BLOCK
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginTop: s.sm }}>
          <Pressable
            onPress={() => setSelectedBlockId(null)}
            style={[styles.techChip, { borderRadius: r.pill, borderColor: selectedBlockId === null ? c.primary : c.border, backgroundColor: selectedBlockId === null ? `${c.primary}20` : c.surface2 }]}
          >
            <Text style={{ color: selectedBlockId === null ? c.primary : c.textMuted, fontFamily: ty.mono.family, fontSize: ty.sizes.xs }}>
              unassigned
            </Text>
          </Pressable>
          {(data?.blocks || []).map((block) => (
            <Pressable
              key={block.id}
              onPress={() => setSelectedBlockId(block.id)}
              style={[styles.techChip, { borderRadius: r.pill, borderColor: selectedBlockId === block.id ? c.primary : c.border, backgroundColor: selectedBlockId === block.id ? `${c.primary}20` : c.surface2 }]}
            >
              <Text style={{ color: selectedBlockId === block.id ? c.primary : c.textMuted, fontFamily: ty.mono.family, fontSize: ty.sizes.xs }}>
                {(block.title || block.block_type).replaceAll('_', ' ')}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <Text style={{ color: c.textMuted, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs, marginTop: s.lg }}>
          TECHNIQUE
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginTop: s.sm }}>
          {TECHNIQUES.map((option) => (
            <Pressable
              key={option}
              onPress={() => setTechnique(option)}
              style={[styles.techChip, { borderRadius: r.pill, borderColor: technique === option ? c.primary : c.border, backgroundColor: technique === option ? `${c.primary}20` : c.surface2 }]}
            >
              <Text style={{ color: technique === option ? c.primary : c.textMuted, fontFamily: ty.mono.family, fontSize: ty.sizes.xs }}>
                {option}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <Text style={{ color: c.textMuted, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs, marginTop: s.lg }}>
          SET STYLE
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginTop: s.sm }}>
          {SET_STYLES.map((option) => (
            <Pressable
              key={option}
              onPress={() => setSetStyle(option)}
              style={[styles.techChip, { borderRadius: r.pill, borderColor: setStyle === option ? c.primary : c.border, backgroundColor: setStyle === option ? `${c.primary}20` : c.surface2 }]}
            >
              <Text style={{ color: setStyle === option ? c.primary : c.textMuted, fontFamily: ty.mono.family, fontSize: ty.sizes.xs }}>
                {option.replaceAll('_', ' ')}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={{ marginTop: s.lg, gap: s.sm }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Field label="RIR min" value={rirMin} onChange={setRirMin} keyboardType="number-pad" c={c} ty={ty} r={r} />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="RIR max" value={rirMax} onChange={setRirMax} keyboardType="number-pad" c={c} ty={ty} r={r} />
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Field label="RPE min" value={rpeMin} onChange={setRpeMin} keyboardType="number-pad" c={c} ty={ty} r={r} />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="RPE max" value={rpeMax} onChange={setRpeMax} keyboardType="number-pad" c={c} ty={ty} r={r} />
            </View>
          </View>
        </View>

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
