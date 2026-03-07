import { useMemo, useState } from 'react';
import { StyleSheet, View, Text, Pressable, ScrollView, TextInput, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTokens } from '../../../lib/theme';
import { TabBarIcon } from '../../../components/navigation/TabBarIcon';
import { useExercises } from '../../../hooks/useWorkout';

type LibraryScope = 'all' | 'program' | 'reference';

export default function ExerciseLibraryScreen() {
  const { c, s, ty, r } = useTokens();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [scope, setScope] = useState<LibraryScope>('all');

  const filters = useMemo(() => {
    const referenceOnly = scope === 'all' ? undefined : scope === 'reference';
    return { search, referenceOnly };
  }, [search, scope]);

  const { data: exercises, isLoading } = useExercises(filters);

  const scopeCountLabel = useMemo(() => {
    const total = exercises?.length ?? 0;
    if (scope === 'all') return `ALL (${total})`;
    if (scope === 'program') return `PROGRAM (${total})`;
    return `REFERENCE (${total})`;
  }, [exercises?.length, scope]);

  return (
    <View style={[styles.container, { backgroundColor: c.bg, paddingTop: insets.top }]}>
      <View style={[styles.header, { paddingHorizontal: s.lg }]}>
        <Pressable
          onPress={() => router.back()}
          style={[styles.backButton, { backgroundColor: c.surface }]}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <TabBarIcon name="chevron-back" color={c.text} size={24} />
        </Pressable>
        <Text
          style={[
            styles.title,
            {
              color: c.text,
              fontFamily: ty.heading.familySemibold,
              fontSize: ty.sizes.xl,
            },
          ]}
        >
          Exercise Library
        </Text>
        <View style={styles.placeholder} />
      </View>

      <View style={[styles.searchContainer, { paddingHorizontal: s.lg }]}>
        <View
          style={[
            styles.searchBar,
            {
              backgroundColor: c.surface,
              borderRadius: r.md,
              borderWidth: 1,
              borderColor: c.border,
            },
          ]}
        >
          <TabBarIcon name="search" color={c.textMuted} size={20} />
          <TextInput
            style={{
              flex: 1,
              color: c.text,
              marginLeft: s.sm,
              fontFamily: ty.body.family,
              height: 40,
            }}
            placeholder="Search exercises..."
            placeholderTextColor={c.textSubtle}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      <View style={[styles.segmentRow, { paddingHorizontal: s.lg }]}>
        {(['all', 'program', 'reference'] as const).map((item) => {
          const active = scope === item;
          const label = item === 'all' ? 'All' : item === 'program' ? 'Program' : 'Reference';
          return (
            <Pressable
              key={item}
              onPress={() => setScope(item)}
              style={[
                styles.segment,
                {
                  borderColor: active ? c.primary : c.border,
                  backgroundColor: active ? `${c.primary}22` : c.surface,
                },
              ]}
            >
              <Text
                style={{
                  color: active ? c.primary : c.textMuted,
                  fontFamily: ty.body.familySemibold,
                  fontSize: 12,
                }}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={{ padding: s.lg, paddingBottom: 100 }}>
        {isLoading ? (
          <ActivityIndicator color={c.primary} />
        ) : (
          <View>
            <Text style={{ color: c.textMuted, marginBottom: 8, fontSize: 12, letterSpacing: 1 }}>{scopeCountLabel}</Text>
            {exercises?.map((ex) => (
              <Pressable
                key={ex.id}
                style={[
                  styles.exerciseCard,
                  {
                    backgroundColor: c.surface,
                    borderRadius: r.md,
                  },
                ]}
                onPress={() => router.push(`/(tabs)/workout/exercise-detail?id=${ex.id}`)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ color: c.text, fontFamily: ty.body.familySemibold }}>{ex.name}</Text>
                  <Text style={{ color: c.textMuted, fontSize: 12, marginTop: 2 }}>
                    {ex.category} • {ex.primary_muscle || 'Unknown'}
                  </Text>
                  <View style={styles.badgesRow}>
                    {ex.is_reference_only ? (
                      <View style={[styles.badge, { backgroundColor: `${c.primary}22`, borderColor: `${c.primary}66` }]}>
                        <Text style={{ color: c.primary, fontSize: 10, fontFamily: ty.body.familySemibold }}>Reference</Text>
                      </View>
                    ) : null}
                    {!ex.has_media ? (
                      <View style={[styles.badge, { backgroundColor: `${c.danger}1A`, borderColor: `${c.danger}55` }]}>
                        <Text style={{ color: c.danger, fontSize: 10, fontFamily: ty.body.familySemibold }}>No media</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
                <TabBarIcon name="chevron-forward" color={c.textMuted} size={16} />
              </Pressable>
            ))}

            {exercises?.length === 0 ? (
              <Text style={{ color: c.textMuted, textAlign: 'center', marginTop: 20 }}>
                No exercises found.
              </Text>
            ) : null}
          </View>
        )}
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
  searchContainer: {
    marginBottom: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  segment: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderRadius: 999,
  },
  scrollView: {
    flex: 1,
  },
  exerciseCard: {
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
  },
  badge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
});

