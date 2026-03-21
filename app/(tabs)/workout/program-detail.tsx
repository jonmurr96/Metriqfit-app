import { useEffect } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TabBarIcon } from '../../../components/navigation/TabBarIcon';
import { useProgramDetails } from '../../../hooks/useWorkout';
import { useTokens } from '../../../lib/theme';
import { trackWorkoutProgramTemplateViewed } from '../../../lib/analytics';

export default function ProgramDetailScreen() {
  const { c, s, ty, r } = useTokens();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { programId, source } = useLocalSearchParams<{ programId?: string; source?: string }>();

  const { data: program, isLoading } = useProgramDetails(String(programId || ''));

  useEffect(() => {
    if (!program) {
      return;
    }

    trackWorkoutProgramTemplateViewed({
      source: source || 'program_detail',
      program_id: program.id,
      family_key: program.familyKey,
      source_model: program.sourceModel,
    });
  }, [program, source]);

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: c.bg, paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  if (!program) {
    return (
      <View style={[styles.container, { backgroundColor: c.bg, paddingTop: insets.top }]}>
        <View style={[styles.header, { paddingHorizontal: s.lg }]}>
          <Pressable onPress={() => router.back()} style={[styles.backButton, { backgroundColor: c.surface }]}>
            <TabBarIcon name="chevron-back" color={c.text} size={24} />
          </Pressable>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: c.textMuted }}>Program not found</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: c.bg, paddingTop: insets.top }]}>
      <View style={[styles.header, { paddingHorizontal: s.lg }]}>
        <Pressable onPress={() => router.back()} style={[styles.backButton, { backgroundColor: c.surface }]}>
          <TabBarIcon name="chevron-back" color={c.text} size={24} />
        </Pressable>
        <Text style={[styles.title, { color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.xl }]}>
          Program Details
        </Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={{ padding: s.lg, paddingBottom: insets.bottom + s.xl }}>
        <View style={[styles.heroCard, { backgroundColor: c.surface, borderColor: c.border, borderRadius: r.lg, padding: s.xl }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: s.md }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: c.primary, fontFamily: ty.mono.family, fontSize: ty.sizes.xs }}>
                {(program.familyDisplayName || 'Custom').toUpperCase()}
              </Text>
              <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.h2, marginTop: s.xs }}>
                {program.name}
              </Text>
              <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.md, marginTop: s.sm, lineHeight: 22 }}>
                {program.description || 'Structured program template.'}
              </Text>
            </View>

            {program.sourceModel === 'legacy_template' ? (
              <View style={[styles.badge, { borderColor: c.macros?.carbs || c.primary, borderRadius: r.pill }]}>
                <Text style={{ color: c.macros?.carbs || c.primary, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs }}>
                  Legacy
                </Text>
              </View>
            ) : null}
          </View>

          <View style={[styles.metaRow, { marginTop: s.lg }]}>
            <MetaChip label={`${program.daysPerWeek} days/week`} />
            <MetaChip label={`${program.durationWeeks || 8} weeks`} />
            <MetaChip label={(program.difficulty || 'general').replaceAll('_', ' ')} />
            {program.progressionModel ? <MetaChip label={program.progressionModel.replaceAll('_', ' ')} /> : null}
          </View>

          {program.targetAudience ? (
            <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.sm, marginTop: s.md }}>
              Audience: {program.targetAudience}
            </Text>
          ) : null}
        </View>

        <Section title="Split Blueprint">
          {program.dayBlueprint.map((day) => (
            <View key={day.id} style={[styles.blueprintRow, { backgroundColor: c.surface, borderColor: c.border, borderRadius: r.md, padding: s.md }]}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm }}>
                  Day {day.sequenceIndex} · {day.name}
                </Text>
                <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.sm, marginTop: 4 }}>
                  {day.focus || day.dayType} • {day.exerciseCount} exercises • {day.estimatedDurationMin || 60} min
                </Text>
              </View>
              <View style={[styles.dayTypeChip, { backgroundColor: day.dayType === 'workout' ? `${c.primary}18` : c.surface2, borderRadius: r.pill }]}>
                <Text style={{ color: day.dayType === 'workout' ? c.primary : c.textMuted, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs }}>
                  {day.dayType.replaceAll('_', ' ')}
                </Text>
              </View>
            </View>
          ))}
        </Section>

        {(program.trainingStyleTags || []).length > 0 ? (
          <Section title="Training Style">
            <View style={styles.metaRow}>
              {program.trainingStyleTags.map((tag) => <MetaChip key={tag} label={tag.replaceAll('_', ' ')} />)}
            </View>
          </Section>
        ) : null}

        {(program.goalTags || []).length > 0 ? (
          <Section title="Goal Tags">
            <View style={styles.metaRow}>
              {program.goalTags.map((tag) => <MetaChip key={tag} label={tag.replaceAll('_', ' ')} />)}
            </View>
          </Section>
        ) : null}

        <Section title="Workout Schedule">
          {(program.days || []).map((day) => (
            <Pressable
              key={day.id}
              style={[styles.dayCard, { backgroundColor: c.surface, borderColor: c.border, borderRadius: r.md, padding: s.lg }]}
              onPress={() => router.push({
                pathname: '/(tabs)/workout/day-preview',
                params: { templateDayId: day.id, dayName: day.name },
              })}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: s.md }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.md }}>
                    Day {day.day_number} · {day.name}
                  </Text>
                  <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.sm, marginTop: 4 }}>
                    {(day.day_type || 'workout').replaceAll('_', ' ')} • {day.focus || 'Workout'} • {day.estimated_duration_min || 60} min • {day.exercises?.length || 0} exercises
                  </Text>
                </View>
                <TabBarIcon name="chevron-forward" color={c.textMuted} size={20} />
              </View>
            </Pressable>
          ))}
        </Section>
      </ScrollView>
    </View>
  );

  function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
      <View style={{ marginTop: s.xl }}>
        <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.lg, marginBottom: s.md }}>
          {title}
        </Text>
        <View style={{ gap: s.sm }}>{children}</View>
      </View>
    );
  }

  function MetaChip({ label }: { label: string }) {
    return (
      <View style={[styles.badge, { borderColor: c.border, borderRadius: r.pill }]}>
        <Text style={{ color: c.textMuted, fontFamily: ty.mono.family, fontSize: ty.sizes.xs }}>
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
  heroCard: {
    borderWidth: 1,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  badge: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  blueprintRow: {
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dayTypeChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  dayCard: {
    borderWidth: 1,
  },
});
