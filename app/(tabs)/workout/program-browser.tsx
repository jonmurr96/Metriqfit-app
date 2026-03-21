import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TabBarIcon } from '../../../components/navigation/TabBarIcon';
import { useTokens } from '../../../lib/theme';
import { buildBlueprintSummary } from '../../../lib/workout/program-catalog';
import { useWorkoutProgramFamilies } from '../../../hooks/useWorkoutBuilder';
import { usePrograms } from '../../../hooks/useWorkout';
import { trackWorkoutProgramFamilySelected } from '../../../lib/analytics';

export default function ProgramBrowserScreen() {
  const { c, s, ty, r } = useTokens();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { data: families = [] } = useWorkoutProgramFamilies();
  const { data: programs = [], isLoading } = usePrograms();

  const [familyFilter, setFamilyFilter] = useState<string>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<'all' | 'beginner' | 'intermediate' | 'advanced'>('all');
  const [daysFilter, setDaysFilter] = useState<'all' | 2 | 3 | 4 | 5 | 6>('all');
  const [progressionFilter, setProgressionFilter] = useState<'all' | string>('all');
  const [styleFilter, setStyleFilter] = useState<'all' | string>('all');

  const progressionOptions = useMemo(() => {
    const tags = new Set<string>();
    programs.forEach((program) => {
      if (program.progressionModel) tags.add(program.progressionModel);
    });
    return Array.from(tags).sort();
  }, [programs]);

  const trainingStyleOptions = useMemo(() => {
    const tags = new Set<string>();
    programs.forEach((program) => {
      (program.trainingStyleTags || []).forEach((tag) => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, [programs]);

  const filteredPrograms = useMemo(() => {
    return [...programs]
      .filter((program) => {
        if (familyFilter !== 'all' && program.familyKey !== familyFilter) return false;
        if (difficultyFilter !== 'all' && (program.difficulty || '').toLowerCase() !== difficultyFilter) return false;
        if (daysFilter !== 'all' && program.daysPerWeek !== daysFilter) return false;
        if (progressionFilter !== 'all' && program.progressionModel !== progressionFilter) return false;
        if (styleFilter !== 'all' && !(program.trainingStyleTags || []).includes(styleFilter)) return false;
        return true;
      })
      .sort((a, b) => {
        if (familyFilter !== 'all') {
          const aMatch = a.familyKey === familyFilter ? 0 : 1;
          const bMatch = b.familyKey === familyFilter ? 0 : 1;
          if (aMatch !== bMatch) return aMatch - bMatch;
        }

        if (daysFilter !== 'all') {
          const aDistance = Math.abs(a.daysPerWeek - Number(daysFilter));
          const bDistance = Math.abs(b.daysPerWeek - Number(daysFilter));
          if (aDistance !== bDistance) return aDistance - bDistance;
        }

        const difficultyRank = { beginner: 0, intermediate: 1, advanced: 2 };
        const aDifficulty = difficultyRank[(a.difficulty || 'intermediate') as keyof typeof difficultyRank] ?? 1;
        const bDifficulty = difficultyRank[(b.difficulty || 'intermediate') as keyof typeof difficultyRank] ?? 1;
        if (aDifficulty !== bDifficulty) return aDifficulty - bDifficulty;

        return a.name.localeCompare(b.name);
      });
  }, [daysFilter, difficultyFilter, familyFilter, progressionFilter, programs, styleFilter]);

  const selectFamilyFilter = (nextFamily: string) => {
    setFamilyFilter(nextFamily);
    trackWorkoutProgramFamilySelected({
      source: 'program_browser',
      family_key: nextFamily,
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: c.bg, paddingTop: insets.top }]}>
      <View style={[styles.header, { paddingHorizontal: s.lg }]}>
        <Pressable onPress={() => router.back()} style={[styles.backButton, { backgroundColor: c.surface }]}>
          <TabBarIcon name="chevron-back" color={c.text} size={24} />
        </Pressable>
        <Text style={[styles.title, { color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.xl }]}>
          Programs
        </Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={{ padding: s.lg, paddingBottom: insets.bottom + 120 }}>
        <Text style={{ color: c.textMuted, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs, marginBottom: s.sm }}>
          FAMILY
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          <FilterChip
            label="All"
            active={familyFilter === 'all'}
            onPress={() => selectFamilyFilter('all')}
          />
          {families.map((family) => (
            <FilterChip
              key={family.id}
              label={family.display_name}
              active={familyFilter === family.external_key}
              onPress={() => selectFamilyFilter(family.external_key)}
            />
          ))}
        </ScrollView>

        <View style={{ marginTop: s.lg }}>
          <Text style={{ color: c.textMuted, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs, marginBottom: s.sm }}>
            DIFFICULTY
          </Text>
          <View style={styles.filterRow}>
            {(['all', 'beginner', 'intermediate', 'advanced'] as const).map((level) => (
              <FilterChip
                key={level}
                label={level === 'all' ? 'All' : level[0].toUpperCase() + level.slice(1)}
                active={difficultyFilter === level}
                onPress={() => setDifficultyFilter(level)}
              />
            ))}
          </View>
        </View>

        <View style={{ marginTop: s.lg }}>
          <Text style={{ color: c.textMuted, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs, marginBottom: s.sm }}>
            DAYS PER WEEK
          </Text>
          <View style={styles.filterRow}>
            {(['all', 2, 3, 4, 5, 6] as const).map((value) => (
              <FilterChip
                key={String(value)}
                label={value === 'all' ? 'All' : `${value}d`}
                active={daysFilter === value}
                onPress={() => setDaysFilter(value)}
              />
            ))}
          </View>
        </View>

        {progressionOptions.length > 0 ? (
          <View style={{ marginTop: s.lg }}>
            <Text style={{ color: c.textMuted, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs, marginBottom: s.sm }}>
              PROGRESSION
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
              <FilterChip label="All" active={progressionFilter === 'all'} onPress={() => setProgressionFilter('all')} />
              {progressionOptions.map((progression) => (
                <FilterChip
                  key={progression}
                  label={progression.replaceAll('_', ' ')}
                  active={progressionFilter === progression}
                  onPress={() => setProgressionFilter(progression)}
                />
              ))}
            </ScrollView>
          </View>
        ) : null}

        {trainingStyleOptions.length > 0 ? (
          <View style={{ marginTop: s.lg }}>
            <Text style={{ color: c.textMuted, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs, marginBottom: s.sm }}>
              TRAINING STYLE
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
              <FilterChip label="All" active={styleFilter === 'all'} onPress={() => setStyleFilter('all')} />
              {trainingStyleOptions.map((style) => (
                <FilterChip
                  key={style}
                  label={style.replaceAll('_', ' ')}
                  active={styleFilter === style}
                  onPress={() => setStyleFilter(style)}
                />
              ))}
            </ScrollView>
          </View>
        ) : null}

        <View style={{ marginTop: s.xl, gap: s.sm }}>
          {isLoading ? (
            <View style={{ paddingVertical: s.xl, alignItems: 'center' }}>
              <ActivityIndicator color={c.primary} />
            </View>
          ) : filteredPrograms.map((program) => (
            <Pressable
              key={program.id}
              onPress={() => router.push({
                pathname: '/(tabs)/workout/program-detail',
                params: { programId: program.id, source: 'program_browser' },
              })}
              style={[
                styles.card,
                {
                  backgroundColor: c.surface,
                  borderColor: c.border,
                  borderRadius: r.lg,
                  padding: s.lg,
                },
              ]}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: s.sm }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: c.primary, fontFamily: ty.mono.family, fontSize: ty.sizes.xs }}>
                    {(program.familyDisplayName || 'Custom').toUpperCase()}
                  </Text>
                  <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.lg, marginTop: s.xs }}>
                    {program.name}
                  </Text>
                  <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.sm, marginTop: s.xs }}>
                    {program.daysPerWeek} days/week • {program.durationWeeks || 8} weeks
                  </Text>
                  <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.sm, marginTop: s.sm }}>
                    {buildBlueprintSummary(program.dayBlueprint) || program.description || 'Structured training split'}
                  </Text>
                </View>

                <View style={{ alignItems: 'flex-end', gap: 6 }}>
                  <Tag label={(program.difficulty || 'general').toUpperCase()} subtle />
                  {program.sourceModel === 'legacy_template' ? <Tag label="Legacy" accent="warning" /> : null}
                </View>
              </View>

              <View style={[styles.filterRow, { marginTop: s.md }]}>
                {program.progressionModel ? <Tag label={program.progressionModel.replaceAll('_', ' ')} /> : null}
                {(program.trainingStyleTags || []).slice(0, 2).map((tag) => (
                  <Tag key={`${program.id}-${tag}`} label={tag.replaceAll('_', ' ')} subtle />
                ))}
                {(program.goalTags || []).slice(0, 2).map((tag) => (
                  <Tag key={`${program.id}-goal-${tag}`} label={tag.replaceAll('_', ' ')} subtle />
                ))}
              </View>
            </Pressable>
          ))}

          {!isLoading && filteredPrograms.length === 0 ? (
            <Text style={{ color: c.textMuted, textAlign: 'center', marginTop: s.lg }}>
              No programs match the selected filters.
            </Text>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );

  function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
    return (
      <Pressable
        onPress={onPress}
        style={[
          styles.filterChip,
          {
            backgroundColor: active ? c.primary : c.surface2,
            borderColor: active ? c.primary : c.border,
            borderRadius: r.pill,
          },
        ]}
      >
        <Text style={{ color: active ? c.bg : c.textMuted, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs }}>
          {label}
        </Text>
      </Pressable>
    );
  }

  function Tag({ label, subtle = false, accent }: { label: string; subtle?: boolean; accent?: 'warning' }) {
    const borderColor = accent === 'warning' ? (c.macros?.carbs || c.primary) : c.border;
    const textColor = accent === 'warning' ? (c.macros?.carbs || c.primary) : subtle ? c.textMuted : c.primary;

    return (
      <View
        style={{
          borderWidth: 1,
          borderColor,
          backgroundColor: subtle ? c.surface2 : `${c.primary}14`,
          borderRadius: r.pill,
          paddingHorizontal: 8,
          paddingVertical: 4,
        }}
      >
        <Text style={{ color: textColor, fontFamily: ty.mono.family, fontSize: ty.sizes.xs }}>
          {label}
        </Text>
      </View>
    );
  }
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
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  filterChip: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  card: {
    borderWidth: 1,
  },
});
