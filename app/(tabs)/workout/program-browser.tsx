import { useMemo, useState } from 'react';
import { StyleSheet, View, Text, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTokens } from '../../../lib/theme';
import { TabBarIcon } from '../../../components/navigation/TabBarIcon';
import { usePrograms } from '../../../hooks/useWorkout';
import { WorkoutTemplate } from '../../../services/workoutService';

export default function ProgramBrowserScreen() {
  const { c, s, ty, r } = useTokens();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { data: programs, isLoading } = usePrograms();
  const [difficultyFilter, setDifficultyFilter] = useState<'all' | 'beginner' | 'intermediate' | 'advanced'>('all');
  const [daysFilter, setDaysFilter] = useState<'all' | 2 | 3 | 4 | 5 | 6>('all');
  const [goalFilter, setGoalFilter] = useState<'all' | string>('all');
  const [equipmentFilter, setEquipmentFilter] = useState<'all' | string>('all');
  const [sortMode, setSortMode] = useState<'name' | 'frequency'>('name');

  const goalOptions = useMemo(() => {
    const tags = new Set<string>();
    (programs || []).forEach((program: WorkoutTemplate) => {
      (program.goal_tags || []).forEach((tag) => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, [programs]);

  const equipmentOptions = useMemo(() => {
    const tags = new Set<string>();
    (programs || []).forEach((program: WorkoutTemplate) => {
      (program.equipment_required || []).forEach((tag) => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, [programs]);

  const filteredPrograms = useMemo(() => {
    const base = (programs || []).filter((program: WorkoutTemplate) => {
      if (difficultyFilter !== 'all' && (program.difficulty || '').toLowerCase() !== difficultyFilter) return false;
      if (daysFilter !== 'all' && program.days_per_week !== daysFilter) return false;
      if (goalFilter !== 'all' && !(program.goal_tags || []).includes(goalFilter)) return false;
      if (equipmentFilter !== 'all' && !(program.equipment_required || []).includes(equipmentFilter)) return false;
      return true;
    });

    const sorted = base.slice();
    if (sortMode === 'frequency') {
      sorted.sort((a, b) => (a.days_per_week || 0) - (b.days_per_week || 0));
      return sorted;
    }

    sorted.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    return sorted;
  }, [programs, difficultyFilter, daysFilter, goalFilter, equipmentFilter, sortMode]);

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
          Programs
        </Text>
        <View style={styles.placeholder} />
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ padding: s.lg, paddingBottom: 100 }}
      >
        <View style={{ marginBottom: s.lg }}>
          <Text style={{ color: c.textMuted, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs, marginBottom: s.sm }}>
            FILTER BY DIFFICULTY
          </Text>
          <View style={styles.filterRow}>
            {(['all', 'beginner', 'intermediate', 'advanced'] as const).map((level) => (
              <Pressable
                key={level}
                onPress={() => setDifficultyFilter(level)}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: difficultyFilter === level ? c.primary : c.surface2,
                    borderColor: difficultyFilter === level ? c.primary : c.border,
                    borderRadius: r.pill,
                  },
                ]}
              >
                <Text style={{ color: difficultyFilter === level ? c.bg : c.textMuted, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs }}>
                  {level === 'all' ? 'All' : level[0].toUpperCase() + level.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={{ color: c.textMuted, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs, marginBottom: s.sm, marginTop: s.md }}>
            DAYS PER WEEK
          </Text>
          <View style={styles.filterRow}>
            {(['all', 2, 3, 4, 5, 6] as const).map((value) => (
              <Pressable
                key={String(value)}
                onPress={() => setDaysFilter(value)}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: daysFilter === value ? c.primary : c.surface2,
                    borderColor: daysFilter === value ? c.primary : c.border,
                    borderRadius: r.pill,
                  },
                ]}
              >
                <Text style={{ color: daysFilter === value ? c.bg : c.textMuted, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs }}>
                  {value === 'all' ? 'All' : `${value}d`}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={{ color: c.textMuted, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs, marginBottom: s.sm, marginTop: s.md }}>
            GOAL TAG
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.filterRow}>
              <Pressable
                onPress={() => setGoalFilter('all')}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: goalFilter === 'all' ? c.primary : c.surface2,
                    borderColor: goalFilter === 'all' ? c.primary : c.border,
                    borderRadius: r.pill,
                  },
                ]}
              >
                <Text style={{ color: goalFilter === 'all' ? c.bg : c.textMuted, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs }}>
                  All
                </Text>
              </Pressable>
              {goalOptions.map((tag) => (
                <Pressable
                  key={tag}
                  onPress={() => setGoalFilter(tag)}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: goalFilter === tag ? c.primary : c.surface2,
                      borderColor: goalFilter === tag ? c.primary : c.border,
                      borderRadius: r.pill,
                    },
                  ]}
                >
                  <Text style={{ color: goalFilter === tag ? c.bg : c.textMuted, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs }}>
                    {tag.replaceAll('_', ' ')}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          <Text style={{ color: c.textMuted, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs, marginBottom: s.sm, marginTop: s.md }}>
            EQUIPMENT
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.filterRow}>
              <Pressable
                onPress={() => setEquipmentFilter('all')}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: equipmentFilter === 'all' ? c.primary : c.surface2,
                    borderColor: equipmentFilter === 'all' ? c.primary : c.border,
                    borderRadius: r.pill,
                  },
                ]}
              >
                <Text style={{ color: equipmentFilter === 'all' ? c.bg : c.textMuted, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs }}>
                  All
                </Text>
              </Pressable>
              {equipmentOptions.map((tag) => (
                <Pressable
                  key={tag}
                  onPress={() => setEquipmentFilter(tag)}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: equipmentFilter === tag ? c.primary : c.surface2,
                      borderColor: equipmentFilter === tag ? c.primary : c.border,
                      borderRadius: r.pill,
                    },
                  ]}
                >
                  <Text style={{ color: equipmentFilter === tag ? c.bg : c.textMuted, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs }}>
                    {tag.replaceAll('_', ' ')}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          <Text style={{ color: c.textMuted, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs, marginBottom: s.sm, marginTop: s.md }}>
            SORT
          </Text>
          <View style={styles.filterRow}>
            {([
              { value: 'name', label: 'Name' },
              { value: 'frequency', label: 'Frequency' },
            ] as const).map((item) => (
              <Pressable
                key={item.value}
                onPress={() => setSortMode(item.value)}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: sortMode === item.value ? c.primary : c.surface2,
                    borderColor: sortMode === item.value ? c.primary : c.border,
                    borderRadius: r.pill,
                  },
                ]}
              >
                <Text style={{ color: sortMode === item.value ? c.bg : c.textMuted, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs }}>
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {isLoading ? (
          <View style={{ padding: s.xl, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={c.primary} />
          </View>
        ) : filteredPrograms.map((program: WorkoutTemplate) => {
          // Determine colors based on difficulty
          let badgeColor = c.primary; // Default Blue (Beginner)
          let badgeText = 'Beginner';

          const diff = (program.difficulty || 'beginner').toLowerCase();

          if (diff === 'intermediate') {
            badgeColor = c.macros?.carbs || '#F5A623'; // Orange
            badgeText = 'Intermediate';
          } else if (diff === 'advanced' || diff === 'expert') {
            badgeColor = c.macros?.fat || '#BD10E0'; // Purple
            badgeText = 'Advanced';
          } else {
            // Beginner
            badgeColor = c.primary; // Blue
            badgeText = 'Beginner';
          }

          return (
            <Pressable
              key={program.name}
              style={[
                styles.programCard,
                {
                  backgroundColor: c.surface,
                  borderRadius: r.lg,
                  borderWidth: 1,
                  borderColor: c.border,
                  marginBottom: s.md,
                },
              ]}
              onPress={() => router.push({
                pathname: '/(tabs)/workout/program-detail',
                params: { programId: program.id }
              })}
            >
              {/* Title Row */}
              <View style={styles.programHeader}>
                <Text
                  style={{
                    color: c.text,
                    fontFamily: ty.heading.familySemibold,
                    fontSize: ty.sizes.lg,
                    lineHeight: 24,
                  }}
                >
                  {program.name}
                </Text>
              </View>

              {/* Meta Row: Badge + Duration */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: s.sm }}>
                <View
                  style={[
                    styles.levelBadge,
                    {
                      backgroundColor: c.surface2,
                      borderRadius: r.sm,
                      borderWidth: 1,
                      borderColor: badgeColor + '40',
                      marginRight: s.md,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: badgeColor,
                      fontFamily: ty.body.familySemibold,
                      fontSize: ty.sizes.xs,
                    }}
                  >
                    {badgeText}
                  </Text>
                </View>

                <Text
                  style={{
                    color: c.textMuted,
                    fontFamily: ty.body.family,
                    fontSize: ty.sizes.sm,
                    flex: 1,
                  }}
                >
                  {program.duration_weeks} weeks • {program.days_per_week} days/week
                </Text>
              </View>
            </Pressable>
          )
        })}

        {filteredPrograms.length === 0 ? (
          <View style={[styles.comingSoonCard, { backgroundColor: c.surface, borderRadius: r.lg, borderWidth: 1, borderColor: c.border }]}>
            <Text style={{ color: c.textMuted, fontFamily: ty.body.familyMedium, fontSize: ty.sizes.md, textAlign: 'center' }}>
              No programs match your current filters
            </Text>
          </View>
        ) : null}

        <View
          style={[
            styles.comingSoonCard,
            {
              backgroundColor: c.surface,
              borderRadius: r.lg,
              borderWidth: 1,
              borderColor: c.border,
              borderStyle: 'dashed',
            },
          ]}
        >
          <Text
            style={{
              color: c.textMuted,
              fontFamily: ty.body.familyMedium,
              fontSize: ty.sizes.md,
              textAlign: 'center',
            }}
          >
            More programs coming soon
          </Text>
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
  programCard: {
    padding: 18,
  },
  programHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start', // Align tops if wrapping, or center if single line
    justifyContent: 'space-between',
    marginBottom: 4, // Add some breathing room
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
  },
  levelBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  comingSoonCard: {
    padding: 24,
    alignItems: 'center',
  },
});
