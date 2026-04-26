import { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ViewToken,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TabBarIcon } from '../../../components/navigation/TabBarIcon';
import { ExerciseMediaPreview } from '../../../components/workout/media/ExerciseMediaPreview';
import { useTokens } from '../../../lib/theme';
import { useExercises } from '../../../hooks/useWorkout';
import {
  trackExerciseDetailOpenedFromPreview,
  trackExerciseMediaPreviewExpanded,
} from '../../../lib/analytics';

type LibraryScope = 'all' | 'program' | 'reference';

export default function ExerciseLibraryScreen() {
  const { c, s, ty, r } = useTokens();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [scope, setScope] = useState<LibraryScope>('all');
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [equipment, setEquipment] = useState<string | undefined>(undefined);
  const [provider, setProvider] = useState<string | undefined>(undefined);
  const [hasMedia, setHasMedia] = useState<boolean | undefined>(undefined);
  const [visibleIds, setVisibleIds] = useState<string[]>([]);

  const baseScopeFilter = useMemo(() => {
    const referenceOnly = scope === 'all' ? undefined : scope === 'reference';
    return { referenceOnly };
  }, [scope]);

  const { data: exerciseCatalog = [] } = useExercises(baseScopeFilter);
  const { data: exercises = [], isLoading } = useExercises({
    search,
    category,
    sourceProvider: provider,
    hasMedia,
    equipment: equipment ? [equipment] : undefined,
    referenceOnly: baseScopeFilter.referenceOnly,
  });

  const categoryOptions = useMemo(
    () => Array.from(new Set(exerciseCatalog.map((item) => item.category).filter(Boolean))).sort(),
    [exerciseCatalog],
  );
  const equipmentOptions = useMemo(
    () => Array.from(new Set(exerciseCatalog.flatMap((item) => item.equipment_required || []).filter(Boolean))).sort(),
    [exerciseCatalog],
  );
  const providerOptions = useMemo(
    () => Array.from(new Set(exerciseCatalog.map((item) => item.source_provider).filter(Boolean))).sort(),
    [exerciseCatalog],
  );

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      setVisibleIds(
        viewableItems
          .map((item) => item.item?.id)
          .filter(Boolean),
      );
    },
  ).current;

  const scopeCountLabel = useMemo(() => {
    const total = exercises.length;
    if (scope === 'all') return `ALL (${total})`;
    if (scope === 'program') return `PROGRAM (${total})`;
    return `REFERENCE (${total})`;
  }, [exercises.length, scope]);

  const openExerciseDetail = (exerciseId: string) => {
    trackExerciseMediaPreviewExpanded({
      source: 'exercise_library',
      exercise_id: exerciseId,
    });
    trackExerciseDetailOpenedFromPreview({
      source: 'exercise_library',
      exercise_id: exerciseId,
    });
    router.push({
      pathname: '/(tabs)/workout/exercise-detail',
      params: { id: exerciseId, source: 'library_preview' },
    });
  };

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

      <FlatList
        data={exercises}
        keyExtractor={(item) => item.id}
        viewabilityConfig={{ itemVisiblePercentThreshold: 65 }}
        onViewableItemsChanged={onViewableItemsChanged}
        ListHeaderComponent={
          <View style={{ paddingHorizontal: s.lg, paddingTop: s.md }}>
            <Text style={{ color: c.textMuted, marginBottom: s.sm, fontSize: 12, letterSpacing: 1 }}>
              {scopeCountLabel}
            </Text>

            <FilterRow
              label="Category"
              options={categoryOptions}
              selected={category}
              onSelect={setCategory}
            />
            <FilterRow
              label="Equipment"
              options={equipmentOptions}
              selected={equipment}
              onSelect={setEquipment}
            />
            <FilterRow
              label="Source"
              options={providerOptions}
              selected={provider}
              onSelect={setProvider}
            />
            <FilterRow
              label="Media"
              options={['with_media', 'without_media']}
              selected={
                hasMedia === undefined ? undefined : hasMedia ? 'with_media' : 'without_media'
              }
              onSelect={(value) => {
                if (!value) {
                  setHasMedia(undefined);
                  return;
                }
                setHasMedia(value === 'with_media');
              }}
            />
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            style={[
              styles.exerciseCard,
              {
                backgroundColor: c.surface,
                borderRadius: r.md,
                borderColor: c.border,
                marginHorizontal: s.lg,
              },
            ]}
            onPress={() => openExerciseDetail(item.id)}
          >
            <ExerciseMediaPreview
              exerciseId={item.id}
              videoUrl={item.video_url}
              gifUrl={item.gif_url}
              imageUrl={item.image_url}
              posterUrl={item.poster_url}
              hasMedia={item.has_media}
              autoplay={visibleIds.includes(item.id)}
              fit="contain"
              height={92}
              borderRadius={r.md}
              analyticsSource="exercise_library"
              analyticsExerciseId={item.id}
            />
            <View style={{ flex: 1 }}>
              <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm }}>
                {item.name}
              </Text>
              <Text style={{ color: c.textMuted, fontSize: ty.sizes.xs, marginTop: 2 }}>
                {item.category} • {item.primary_muscle || 'Unknown'}
              </Text>
              <Text style={{ color: c.textMuted, fontSize: ty.sizes.xs, marginTop: 4 }} numberOfLines={1}>
                {(item.equipment_required || []).slice(0, 3).join(' • ') || 'No equipment listed'}
              </Text>
              <View style={styles.badgesRow}>
                {item.is_reference_only ? (
                  <View style={[styles.badge, { backgroundColor: `${c.primary}22`, borderColor: `${c.primary}66` }]}>
                    <Text style={{ color: c.primary, fontSize: 10, fontFamily: ty.body.familySemibold }}>Reference</Text>
                  </View>
                ) : null}
                {!item.has_media ? (
                  <View style={[styles.badge, { backgroundColor: `${c.danger}1A`, borderColor: `${c.danger}55` }]}>
                    <Text style={{ color: c.danger, fontSize: 10, fontFamily: ty.body.familySemibold }}>No media</Text>
                  </View>
                ) : null}
                {item.source_provider ? (
                  <View style={[styles.badge, { backgroundColor: c.surface2, borderColor: c.border }]}>
                    <Text style={{ color: c.textMuted, fontSize: 10, fontFamily: ty.body.familySemibold }}>{item.source_provider}</Text>
                  </View>
                ) : null}
              </View>
            </View>
            <TabBarIcon name="chevron-forward" color={c.textMuted} size={16} />
          </Pressable>
        )}
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator color={c.primary} style={{ marginTop: s.xl }} />
          ) : (
            <Text style={{ color: c.textMuted, textAlign: 'center', marginTop: s.xl }}>
              No exercises found.
            </Text>
          )
        }
        contentContainerStyle={{ paddingBottom: insets.bottom + 100, gap: s.sm }}
      />
    </View>
  );
}

function FilterRow({
  label,
  options,
  selected,
  onSelect,
}: {
  label: string;
  options: string[];
  selected?: string;
  onSelect: (value: string | undefined) => void;
}) {
  const { c, s, ty, r } = useTokens();

  if (!options.length) {
    return null;
  }

  return (
    <View style={{ marginBottom: s.sm }}>
      <Text style={{ color: c.textMuted, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs, marginBottom: 6 }}>
        {label.toUpperCase()}
      </Text>
      <FlatList
        horizontal
        data={['all', ...options]}
        keyExtractor={(item) => item}
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => {
          const active = (selected || 'all') === item;
          const display = item === 'all' ? 'All' : item.replaceAll('_', ' ');
          return (
            <Pressable
              onPress={() => onSelect(item === 'all' ? undefined : item)}
              style={[
                styles.filterChip,
                {
                  marginRight: 8,
                  borderRadius: r.pill,
                  borderColor: active ? c.primary : c.border,
                  backgroundColor: active ? `${c.primary}22` : c.surface,
                },
              ]}
            >
              <Text
                style={{
                  color: active ? c.primary : c.textMuted,
                  fontFamily: ty.body.familySemibold,
                  fontSize: ty.sizes.xs,
                }}
              >
                {display}
              </Text>
            </Pressable>
          );
        }}
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
  exerciseCard: {
    padding: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  badge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  filterChip: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
});
