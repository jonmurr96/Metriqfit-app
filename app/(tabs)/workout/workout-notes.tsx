import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTokens } from '../../../lib/theme';
import { TabBarIcon } from '../../../components/navigation/TabBarIcon';
import {
  useUpdateSessionExerciseNote,
  useUpdateSessionNotes,
  useWorkoutNotesFeed,
} from '../../../hooks/useWorkout';
import {
  trackWorkoutNoteCreated,
  trackWorkoutNoteDeleted,
  trackWorkoutNoteUpdated,
} from '../../../lib/analytics';

type DatePreset = '7d' | '30d' | 'all';

function getFromDate(preset: DatePreset) {
  if (preset === 'all') return undefined;
  const date = new Date();
  date.setDate(date.getDate() - (preset === '7d' ? 7 : 30));
  return date.toISOString();
}

export default function WorkoutNotesScreen() {
  const { c, s, ty, r } = useTokens();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [search, setSearch] = useState('');
  const [datePreset, setDatePreset] = useState<DatePreset>('30d');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  const from = useMemo(() => getFromDate(datePreset), [datePreset]);

  const { data: notes, isLoading, refetch } = useWorkoutNotesFeed({
    limit: 120,
    search,
    from,
  });

  const updateExerciseNote = useUpdateSessionExerciseNote();
  const updateSessionNote = useUpdateSessionNotes();

  const startEdit = (item: any) => {
    setEditingId(item.id);
    setDraft(item.note);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft('');
  };

  const saveEdit = async (item: any) => {
    const value = draft.trim();
    const next = value.length > 0 ? value : null;
    try {
      if (item.type === 'exercise') {
        await updateExerciseNote.mutateAsync({ sessionExerciseId: item.id.replace('exercise:', ''), notes: next });
      } else {
        await updateSessionNote.mutateAsync({ sessionId: item.sessionId, notes: next });
      }

      if (next) {
        trackWorkoutNoteUpdated({ type: item.type, session_id: item.sessionId });
        if (!item.note || String(item.note).trim().length === 0) {
          trackWorkoutNoteCreated({ type: item.type, session_id: item.sessionId });
        }
      } else {
        trackWorkoutNoteDeleted({ type: item.type, session_id: item.sessionId });
      }

      cancelEdit();
      refetch();
    } catch (error) {
      console.warn('Failed to save note', error);
    }
  };

  const removeNote = async (item: any) => {
    try {
      if (item.type === 'exercise') {
        await updateExerciseNote.mutateAsync({ sessionExerciseId: item.id.replace('exercise:', ''), notes: null });
      } else {
        await updateSessionNote.mutateAsync({ sessionId: item.sessionId, notes: null });
      }
      trackWorkoutNoteDeleted({ type: item.type, session_id: item.sessionId });
      refetch();
    } catch (error) {
      console.warn('Failed to delete note', error);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: c.bg, paddingTop: insets.top }]}> 
      <View style={[styles.header, { paddingHorizontal: s.lg }]}> 
        <Pressable onPress={() => router.back()} style={[styles.backButton, { backgroundColor: c.surface }]}> 
          <TabBarIcon name="chevron-back" color={c.text} size={22} />
        </Pressable>
        <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.xl }}>Workout Notes</Text>
        <View style={styles.backButton} />
      </View>

      <View style={{ paddingHorizontal: s.lg, gap: s.sm }}> 
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            borderRadius: r.md,
            borderWidth: 1,
            borderColor: c.border,
            backgroundColor: c.surface,
            paddingHorizontal: s.sm,
          }}
        >
          <TabBarIcon name="search" color={c.textMuted} size={16} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search notes, workouts, or exercises"
            placeholderTextColor={c.textMuted}
            style={{
              flex: 1,
              color: c.text,
              fontFamily: ty.body.family,
              fontSize: ty.sizes.sm,
              paddingVertical: 10,
              marginLeft: s.xs,
            }}
          />
        </View>

        <View style={{ flexDirection: 'row', gap: s.sm }}>
          {(['7d', '30d', 'all'] as DatePreset[]).map((preset) => (
            <Pressable
              key={preset}
              onPress={() => setDatePreset(preset)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: r.pill,
                borderWidth: 1,
                borderColor: datePreset === preset ? `${c.primary}99` : c.border,
                backgroundColor: datePreset === preset ? `${c.primary}16` : c.surface,
              }}
            >
              <Text style={{ color: datePreset === preset ? c.primary : c.textMuted, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs }}>
                {preset === 'all' ? 'All' : preset.toUpperCase()}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={c.primary} />
        </View>
      ) : (
        <FlatList
          data={notes || []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: s.lg, paddingBottom: insets.bottom + 100, gap: s.md }}
          renderItem={({ item }) => {
            const isEditing = editingId === item.id;
            return (
              <View
                style={{
                  backgroundColor: c.surface,
                  borderWidth: 1,
                  borderColor: c.border,
                  borderRadius: r.lg,
                  padding: s.md,
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: s.sm }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: c.primary, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs, letterSpacing: 0.8 }}>
                      {item.type === 'session' ? 'SESSION NOTE' : 'EXERCISE NOTE'}
                    </Text>
                    <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.md, marginTop: 2 }}>
                      {item.sessionName}
                    </Text>
                    {!!item.exerciseName && (
                      <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.sm, marginTop: 2 }}>
                        {item.exerciseName}
                      </Text>
                    )}
                    <Text style={{ color: c.textSubtle, fontFamily: ty.body.family, fontSize: ty.sizes.xs, marginTop: 4 }}>
                      {new Date(item.logDate).toLocaleString()}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: s.xs }}>
                    <Pressable onPress={() => startEdit(item)} style={{ padding: 6 }}>
                      <TabBarIcon name="create-outline" color={c.textMuted} size={16} />
                    </Pressable>
                    <Pressable onPress={() => removeNote(item)} style={{ padding: 6 }}>
                      <TabBarIcon name="trash-outline" color={c.error || '#ef4444'} size={16} />
                    </Pressable>
                  </View>
                </View>

                {isEditing ? (
                  <View style={{ marginTop: s.sm }}>
                    <TextInput
                      multiline
                      value={draft}
                      onChangeText={setDraft}
                      placeholder="Write note..."
                      placeholderTextColor={c.textMuted}
                      style={{
                        minHeight: 80,
                        borderWidth: 1,
                        borderColor: c.border,
                        borderRadius: r.md,
                        backgroundColor: c.bg,
                        color: c.text,
                        fontFamily: ty.body.family,
                        fontSize: ty.sizes.sm,
                        padding: s.sm,
                        textAlignVertical: 'top',
                      }}
                    />
                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: s.sm, marginTop: s.sm }}>
                      <Pressable onPress={cancelEdit} style={{ paddingHorizontal: 12, paddingVertical: 8 }}>
                        <Text style={{ color: c.textMuted, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm }}>Cancel</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => saveEdit(item)}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          borderRadius: r.pill,
                          backgroundColor: c.primary,
                        }}
                      >
                        <Text style={{ color: c.bg, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm }}>Save</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <Text
                    style={{
                      marginTop: s.sm,
                      color: c.text,
                      fontFamily: ty.body.family,
                      fontSize: ty.sizes.sm,
                      lineHeight: 20,
                    }}
                  >
                    {item.note}
                  </Text>
                )}
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={{ marginTop: s.xl, alignItems: 'center' }}>
              <TabBarIcon name="document-text-outline" color={c.textMuted} size={28} />
              <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.sm, marginTop: s.sm, textAlign: 'center' }}>
                No notes found for this range.
              </Text>
            </View>
          }
        />
      )}
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
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
  },
});
