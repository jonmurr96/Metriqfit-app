/**
 * ProgramBrowserV2.tsx
 * 
 * New program browser with scientific filtering and strict exercise selection.
 * Shows only programs using fundamental exercises with proper balance.
 */

import React, { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotiView } from 'moti';

import { TabBarIcon } from '../navigation/TabBarIcon';
import { useTokens } from '../../lib/theme';
import { trackWorkoutProgramFamilySelected } from '../../lib/analytics';
import { 
  PROGRAM_BLUEPRINTS, 
  getAllSplits,
  type ProgramBlueprint,
  type SplitType 
} from '../../lib/workout/program-blueprints';
import type { ExperienceLevel } from '../../lib/workout/training-profile';

// ---------------------------------------------------------------------------
// Filter Types
// ---------------------------------------------------------------------------

type FilterState = {
  split: SplitType | 'all';
  experience: ExperienceLevel | 'all';
  daysPerWeek: number | 'all';
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ProgramBrowserV2() {
  const { c, s, ty, r, animation } = useTokens();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [filters, setFilters] = useState<FilterState>({
    split: 'all',
    experience: 'all',
    daysPerWeek: 'all',
  });

  const splits = useMemo(() => getAllSplits(), []);

  // Filter programs based on selection
  const filteredPrograms = useMemo(() => {
    return PROGRAM_BLUEPRINTS.filter((program) => {
      if (filters.split !== 'all' && program.split !== filters.split) return false;
      if (filters.experience !== 'all' && program.experience !== filters.experience) return false;
      if (filters.daysPerWeek !== 'all' && program.daysPerWeek !== filters.daysPerWeek) return false;
      return true;
    }).sort((a, b) => {
      // Sort by experience level
      const expOrder = { beginner: 0, intermediate: 1, advanced: 2 };
      if (expOrder[a.experience] !== expOrder[b.experience]) {
        return expOrder[a.experience] - expOrder[b.experience];
      }
      return a.daysPerWeek - b.daysPerWeek;
    });
  }, [filters]);

  const selectSplit = (split: SplitType | 'all') => {
    setFilters(prev => ({ ...prev, split }));
    if (split !== 'all') {
      trackWorkoutProgramFamilySelected({
        source: 'program_browser_v2',
        family_key: split,
      });
    }
  };

  const selectProgram = (program: ProgramBlueprint) => {
    router.push({
      pathname: '/(tabs)/workout/program-detail',
      params: { 
        programId: program.id,
        source: 'program_browser_v2' 
      },
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: c.bg, paddingTop: insets.top }]}>
      {/* Header */}
      <MotiView
        from={{ opacity: 0, translateY: -10 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: animation.duration.normal }}
        style={[styles.header, { paddingHorizontal: s.lg }]}
      >
        <Pressable 
          onPress={() => router.back()} 
          style={[styles.backButton, { backgroundColor: c.surface }]}
        >
          <TabBarIcon name="chevron-back" color={c.text} size={24} />
        </Pressable>
        <Text style={[styles.title, { 
          color: c.text, 
          fontFamily: ty.heading.familySemibold, 
          fontSize: ty.sizes.xl 
        }]}>
          Training Programs
        </Text>
        <View style={styles.placeholder} />
      </MotiView>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={{ 
          padding: s.lg, 
          paddingBottom: insets.bottom + 120 
        }}
      >
        {/* Split Filter */}
        <MotiView
          from={{ opacity: 0, translateX: -20 }}
          animate={{ opacity: 1, translateX: 0 }}
          transition={{ delay: 100, type: 'timing', duration: animation.duration.normal }}
        >
          <Text style={[styles.filterLabel, { 
            color: c.textMuted, 
            fontFamily: ty.body.familySemibold, 
            fontSize: ty.sizes.xs,
            marginBottom: s.sm 
          }]}>
            SPLIT TYPE
          </Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            contentContainerStyle={[styles.filterRow, { paddingRight: s.lg }]}
          >
            <FilterChip
              label="All"
              active={filters.split === 'all'}
              onPress={() => selectSplit('all')}
            />
            <FilterChip
              label="Full Body"
              active={filters.split === 'full_body'}
              onPress={() => selectSplit('full_body')}
            />
            <FilterChip
              label="Upper/Lower"
              active={filters.split === 'upper_lower'}
              onPress={() => selectSplit('upper_lower')}
            />
            <FilterChip
              label="PPL"
              active={filters.split === 'ppl'}
              onPress={() => selectSplit('ppl')}
            />
            <FilterChip
              label="Arnold"
              active={filters.split === 'arnold'}
              onPress={() => selectSplit('arnold')}
            />
            <FilterChip
              label="Bro Split"
              active={filters.split === 'bro_split'}
              onPress={() => selectSplit('bro_split')}
            />
          </ScrollView>
        </MotiView>

        {/* Experience Filter */}
        <MotiView
          from={{ opacity: 0, translateX: -20 }}
          animate={{ opacity: 1, translateX: 0 }}
          transition={{ delay: 150, type: 'timing', duration: animation.duration.normal }}
          style={{ marginTop: s.lg }}
        >
          <Text style={[styles.filterLabel, { 
            color: c.textMuted, 
            fontFamily: ty.body.familySemibold, 
            fontSize: ty.sizes.xs,
            marginBottom: s.sm 
          }]}>
            EXPERIENCE LEVEL
          </Text>
          <View style={styles.filterRow}>
            {(['all', 'beginner', 'intermediate', 'advanced'] as const).map((level) => (
              <FilterChip
                key={level}
                label={level === 'all' ? 'All Levels' : level[0].toUpperCase() + level.slice(1)}
                active={filters.experience === level}
                onPress={() => setFilters(prev => ({ ...prev, experience: level }))}
              />
            ))}
          </View>
        </MotiView>

        {/* Days Per Week Filter */}
        <MotiView
          from={{ opacity: 0, translateX: -20 }}
          animate={{ opacity: 1, translateX: 0 }}
          transition={{ delay: 200, type: 'timing', duration: animation.duration.normal }}
          style={{ marginTop: s.lg }}
        >
          <Text style={[styles.filterLabel, { 
            color: c.textMuted, 
            fontFamily: ty.body.familySemibold, 
            fontSize: ty.sizes.xs,
            marginBottom: s.sm 
          }]}>
            DAYS PER WEEK
          </Text>
          <View style={styles.filterRow}>
            {(['all', 2, 3, 4, 5, 6] as const).map((days) => (
              <FilterChip
                key={String(days)}
                label={days === 'all' ? 'Any' : `${days} Days`}
                active={filters.daysPerWeek === days}
                onPress={() => setFilters(prev => ({ ...prev, daysPerWeek: days }))}
              />
            ))}
          </View>
        </MotiView>

        {/* Programs List */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ delay: 250, type: 'timing', duration: animation.duration.normal }}
          style={{ marginTop: s.xl }}
        >
          <Text style={[styles.filterLabel, { 
            color: c.textMuted, 
            fontFamily: ty.body.familySemibold, 
            fontSize: ty.sizes.xs,
            marginBottom: s.md 
          }]}>
            {filteredPrograms.length} PROGRAM{filteredPrograms.length !== 1 ? 'S' : ''} AVAILABLE
          </Text>

          <View style={{ gap: s.md }}>
            {filteredPrograms.map((program, index) => (
              <MotiView
                key={program.id}
                from={{ opacity: 0, translateY: 20 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ 
                  delay: 300 + index * 50, 
                  type: 'timing', 
                  duration: animation.duration.normal 
                }}
              >
                <ProgramCard 
                  program={program} 
                  onPress={() => selectProgram(program)}
                />
              </MotiView>
            ))}

            {filteredPrograms.length === 0 && (
              <View style={{ paddingVertical: s.xl, alignItems: 'center' }}>
                <Text style={{ color: c.textMuted, fontFamily: ty.body.family }}>
                  No programs match your filters.
                </Text>
                <Text style={{ color: c.textMuted, fontFamily: ty.body.family, marginTop: s.sm }}>
                  Try adjusting your criteria.
                </Text>
              </View>
            )}
          </View>
        </MotiView>
      </ScrollView>
    </View>
  );

  function FilterChip({ 
    label, 
    active, 
    onPress 
  }: { 
    label: string; 
    active: boolean; 
    onPress: () => void;
  }) {
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
        <Text style={{ 
          color: active ? c.bg : c.textMuted, 
          fontFamily: ty.body.familySemibold, 
          fontSize: ty.sizes.xs 
        }}>
          {label}
        </Text>
      </Pressable>
    );
  }

  function ProgramCard({ 
    program, 
    onPress 
  }: { 
    program: ProgramBlueprint; 
    onPress: () => void;
  }) {
    const experienceColor = {
      beginner: c.macros?.protein || c.success,
      intermediate: c.macros?.carbs || c.primary,
      advanced: c.macros?.fat || c.accent,
    }[program.experience];

    return (
      <Pressable
        onPress={onPress}
        style={[
          styles.card,
          {
            backgroundColor: c.surface,
            borderColor: c.border,
            borderRadius: r.lg,
          },
        ]}
      >
        {/* Header */}
        <View style={{ padding: s.lg }}>
          {/* Tags Row */}
          <View style={{ flexDirection: 'row', gap: s.xs, marginBottom: s.sm }}>
            <View style={[
              styles.badge,
              { backgroundColor: `${experienceColor}20` }
            ]}>
              <Text style={{ 
                color: experienceColor, 
                fontFamily: ty.mono.family, 
                fontSize: ty.sizes.xs 
              }}>
                {program.experience.toUpperCase()}
              </Text>
            </View>
            <View style={[
              styles.badge,
              { backgroundColor: `${c.primary}14` }
            ]}>
              <Text style={{ 
                color: c.primary, 
                fontFamily: ty.mono.family, 
                fontSize: ty.sizes.xs 
              }}>
                {program.daysPerWeek} DAYS/WEEK
              </Text>
            </View>
          </View>

          {/* Name */}
          <Text style={{ 
            color: c.text, 
            fontFamily: ty.heading.familySemibold, 
            fontSize: ty.sizes.lg,
            marginBottom: s.xs
          }}>
            {program.name}
          </Text>

          {/* Description */}
          <Text style={{ 
            color: c.textMuted, 
            fontFamily: ty.body.family, 
            fontSize: ty.sizes.sm,
            lineHeight: 20,
          }}>
            {program.description}
          </Text>

          {/* Week Preview */}
          <View style={{ marginTop: s.md }}>
            <Text style={{ 
              color: c.textMuted, 
              fontFamily: ty.body.familySemibold, 
              fontSize: ty.sizes.xs,
              marginBottom: s.xs
            }}>
              WEEK STRUCTURE
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: s.xs }}>
              {program.days.map((day, i) => (
                <View 
                  key={i}
                  style={{
                    backgroundColor: c.surface2,
                    borderRadius: r.md,
                    paddingHorizontal: s.sm,
                    paddingVertical: s.xs,
                  }}
                >
                  <Text style={{ 
                    color: c.text, 
                    fontFamily: ty.body.familySemibold, 
                    fontSize: ty.sizes.xs 
                  }}>
                    Day {day.dayNumber}: {day.name}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Key Stats */}
          <View style={{ 
            flexDirection: 'row', 
            flexWrap: 'wrap',
            gap: s.md, 
            marginTop: s.md,
            paddingTop: s.md,
            borderTopWidth: 1,
            borderTopColor: c.border
          }}>
            <View style={{ minWidth: 80, flex: 1 }}>
              <Text style={{ 
                color: c.textMuted, 
                fontFamily: ty.body.family, 
                fontSize: ty.sizes.xs 
              }}>
                Duration
              </Text>
              <Text style={{ 
                color: c.text, 
                fontFamily: ty.heading.familySemibold, 
                fontSize: ty.sizes.sm 
              }}>
                {program.durationWeeks} wks
              </Text>
            </View>
            <View style={{ minWidth: 80, flex: 1 }}>
              <Text style={{ 
                color: c.textMuted, 
                fontFamily: ty.body.family, 
                fontSize: ty.sizes.xs 
              }}>
                Session
              </Text>
              <Text style={{ 
                color: c.text, 
                fontFamily: ty.heading.familySemibold, 
                fontSize: ty.sizes.sm 
              }}>
                ~{Math.round(program.days.reduce((sum, d) => sum + d.estimatedDurationMin, 0) / program.days.length)} min
              </Text>
            </View>
            <View style={{ minWidth: 80, flex: 1 }}>
              <Text style={{ 
                color: c.textMuted, 
                fontFamily: ty.body.family, 
                fontSize: ty.sizes.xs 
              }}>
                Periodization
              </Text>
              <Text 
                numberOfLines={1}
                style={{ 
                  color: c.text, 
                  fontFamily: ty.heading.familySemibold, 
                  fontSize: ty.sizes.sm 
                }}
              >
                {program.periodization === 'dup' ? 'DUP' : program.periodization.charAt(0).toUpperCase() + program.periodization.slice(1)}
              </Text>
            </View>
          </View>
        </View>

        {/* Footer / CTA */}
        <View style={{
          backgroundColor: c.surface2,
          padding: s.md,
          borderBottomLeftRadius: r.lg,
          borderBottomRightRadius: r.lg,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: s.sm,
        }}>
          <Text 
            numberOfLines={1}
            style={{ 
              color: c.textMuted, 
              fontFamily: ty.body.family, 
              fontSize: ty.sizes.xs,
              flex: 1,
              flexShrink: 1,
            }}
          >
            {program.idealFor.slice(0, 2).join(' • ')}
          </Text>
          <View style={{
            backgroundColor: c.primary,
            borderRadius: r.md,
            paddingHorizontal: s.md,
            paddingVertical: s.xs,
            flexShrink: 0,
          }}>
            <Text style={{ 
              color: c.bg, 
              fontFamily: ty.body.familySemibold, 
              fontSize: ty.sizes.xs 
            }}>
              View
            </Text>
          </View>
        </View>
      </Pressable>
    );
  }
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

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
  filterLabel: {
    textTransform: 'uppercase',
    letterSpacing: 1,
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
    overflow: 'hidden',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
});
