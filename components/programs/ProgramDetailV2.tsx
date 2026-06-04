/**
 * ProgramDetailV2.tsx
 * 
 * Enhanced program detail with day previews and exercise breakdown.
 * Shows strict exercise selection and movement pattern balance.
 */

import React, { useMemo } from 'react';
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
import { 
  getProgramById,
  type ProgramBlueprint,
  type DayBlueprint 
} from '../../lib/workout/program-blueprints';
import { FUNDAMENTAL_EXERCISES } from '../../lib/workout/fundamental-exercises';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface ProgramDetailV2Props {
  programId: string;
}

export default function ProgramDetailV2({ programId }: ProgramDetailV2Props) {
  const { c, s, ty, r, animation } = useTokens();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const program = useMemo(() => getProgramById(programId), [programId]);

  if (!program) {
    return (
      <View style={[styles.container, { backgroundColor: c.bg, paddingTop: insets.top }]}>
        <Text style={{ color: c.text }}>Program not found</Text>
      </View>
    );
  }

  const experienceColor = {
    beginner: c.macros?.protein || c.success,
    intermediate: c.macros?.carbs || c.primary,
    advanced: c.macros?.fat || c.accent,
  }[program.experience];

  const avgSessionDuration = Math.round(
    program.days.reduce((sum, d) => sum + d.estimatedDurationMin, 0) / program.days.length
  );

  const startProgram = () => {
    // Navigate to program activation or preview
    router.push({
      pathname: '/(tabs)/workout/program-builder',
      params: {
        templateId: program.id,
        templateName: program.name,
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
        <Text 
          numberOfLines={1}
          style={[styles.title, { 
            color: c.text, 
            fontFamily: ty.heading.familySemibold, 
            fontSize: ty.sizes.lg,
            flex: 1,
            textAlign: 'center',
            marginHorizontal: s.sm,
          }]}
        >
          {program.name}
        </Text>
        <View style={styles.placeholder} />
      </MotiView>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={{ 
          padding: s.lg, 
          paddingBottom: insets.bottom + 100 
        }}
      >
        {/* Hero Card */}
        <MotiView
          from={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'timing', duration: animation.duration.normal }}
          style={[styles.heroCard, { 
            backgroundColor: c.surface,
            borderColor: c.border,
            borderRadius: r.xl,
          }]}
        >
          {/* Badges */}
          <View style={{ flexDirection: 'row', gap: s.xs, marginBottom: s.md }}>
            <View style={[styles.badge, { backgroundColor: `${experienceColor}20` }]}>
              <Text style={{ 
                color: experienceColor, 
                fontFamily: ty.mono.family, 
                fontSize: ty.sizes.xs 
              }}>
                {program.experience.toUpperCase()}
              </Text>
            </View>
            <View style={[styles.badge, { backgroundColor: `${c.primary}14` }]}>
              <Text style={{ 
                color: c.primary, 
                fontFamily: ty.mono.family, 
                fontSize: ty.sizes.xs 
              }}>
                {program.split.toUpperCase().replace('_', '/')}
              </Text>
            </View>
          </View>

          {/* Title & Description */}
          <Text style={{ 
            color: c.text, 
            fontFamily: ty.heading.family, 
            fontSize: ty.sizes.h3,
            marginBottom: s.sm,
          }}>
            {program.name}
          </Text>
          
          <Text style={{ 
            color: c.textMuted, 
            fontFamily: ty.body.family, 
            fontSize: ty.sizes.md,
            lineHeight: 24,
            marginBottom: s.lg,
          }}>
            {program.description}
          </Text>

          {/* Quick Stats Grid */}
          <View style={styles.statsGrid}>
            <StatBox 
              label="Duration"
              value={`${program.durationWeeks} weeks`}
              icon="calendar-outline"
            />
            <StatBox 
              label="Frequency"
              value={`${program.daysPerWeek} days/week`}
              icon="repeat-outline"
            />
            <StatBox 
              label="Session Time"
              value={`~${avgSessionDuration} min`}
              icon="time-outline"
            />
            <StatBox 
              label="Periodization"
              value={program.periodization === 'dup' ? 'DUP' : program.periodization.charAt(0).toUpperCase() + program.periodization.slice(1)}
              icon="trending-up-outline"
            />
          </View>

          {/* Ideal For */}
          <View style={{ marginTop: s.lg }}>
            <Text style={{ 
              color: c.textMuted, 
              fontFamily: ty.body.familySemibold, 
              fontSize: ty.sizes.xs,
              marginBottom: s.xs,
              textTransform: 'uppercase',
              letterSpacing: 1,
            }}>
              Ideal For
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: s.xs }}>
              {program.idealFor.map((item, i) => (
                <View 
                  key={i}
                  style={{
                    backgroundColor: c.surface2,
                    borderRadius: r.pill,
                    paddingHorizontal: s.sm,
                    paddingVertical: s.xs,
                  }}
                >
                  <Text style={{ 
                    color: c.text, 
                    fontFamily: ty.body.family, 
                    fontSize: ty.sizes.xs 
                  }}>
                    {item}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </MotiView>

        {/* Weekly Schedule */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ delay: 100, type: 'timing', duration: animation.duration.normal }}
          style={{ marginTop: s.xl }}
        >
          <Text style={{ 
            color: c.text, 
            fontFamily: ty.heading.familySemibold, 
            fontSize: ty.sizes.lg,
            marginBottom: s.md,
          }}>
            Weekly Schedule
          </Text>

          <View style={{ gap: s.md }}>
            {program.days.map((day, index) => (
              <DayCard 
                key={day.dayNumber}
                day={day}
                index={index}
                onPress={() => router.push({
                  pathname: '/(tabs)/workout/day-detail',
                  params: { 
                    programId: program.id,
                    dayNumber: day.dayNumber 
                  },
                })}
              />
            ))}
          </View>
        </MotiView>

        {/* Exercise Philosophy */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ delay: 200, type: 'timing', duration: animation.duration.normal }}
          style={[styles.philosophyCard, { 
            backgroundColor: c.surface,
            borderColor: c.border,
            borderRadius: r.lg,
            marginTop: s.xl,
          }]}
        >
          <Text style={{ 
            color: c.text, 
            fontFamily: ty.heading.familySemibold, 
            fontSize: ty.sizes.md,
            marginBottom: s.md,
          }}>
            Exercise Selection Philosophy
          </Text>

          <View style={{ gap: s.md }}>
            <PhilosophyItem 
              icon="barbell-outline"
              title="Fundamental Movements Only"
              description="Every exercise is a high-ROI compound or carefully selected isolation. No redundant variations."
            />
            <PhilosophyItem 
              icon="git-compare-outline"
              title="Structural Balance"
              description="Push:Pull ratios maintained. Every pressing day has pulling work for shoulder health."
            />
            <PhilosophyItem 
              icon="trending-up-outline"
              title="Periodized Progression"
              description={`${program.periodization === 'dup' ? 'Daily Undulating Periodization (DUP) for advanced adaptation' : 'Linear periodization with progressive overload for consistent gains'}`}
            />
            <PhilosophyItem 
              icon="fitness-outline"
              title="Experience-Appropriate"
              description={`${program.experience} level complexity. ${program.experience === 'beginner' ? 'Foundational movements with technique emphasis' : program.experience === 'intermediate' ? 'Barbell compounds with progressive loading' : 'Advanced techniques and periodization'}`}
            />
          </View>
        </MotiView>
      </ScrollView>

      {/* Start Button */}
      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ delay: 300, type: 'timing', duration: animation.duration.normal }}
        style={[{
          position: 'absolute',
          bottom: insets.bottom + s.md,
          left: s.lg,
          right: s.lg,
        }]}
      >
        <Pressable
          onPress={startProgram}
          style={{
            backgroundColor: c.primary,
            borderRadius: r.xl,
            paddingVertical: s.md,
            alignItems: 'center',
          }}
        >
          <Text style={{ 
            color: c.bg, 
            fontFamily: ty.heading.familySemibold, 
            fontSize: ty.sizes.md 
          }}>
            Start This Program
          </Text>
        </Pressable>
      </MotiView>
    </View>
  );

  function StatBox({ label, value, icon }: { label: string; value: string; icon: string }) {
    return (
      <View style={{
        backgroundColor: c.surface2,
        borderRadius: r.md,
        padding: s.md,
        flex: 1,
        minWidth: '46%',
        maxWidth: '50%',
      }}>
        <TabBarIcon name={icon as any} color={c.primary} size={18} />
        <Text 
          numberOfLines={1}
          style={{ 
            color: c.text, 
            fontFamily: ty.heading.familySemibold, 
            fontSize: ty.sizes.sm,
            marginTop: s.xs,
          }}
        >
          {value}
        </Text>
        <Text style={{ 
          color: c.textMuted, 
          fontFamily: ty.body.family, 
          fontSize: 10 
        }}>
          {label}
        </Text>
      </View>
    );
  }

  function PhilosophyItem({ icon, title, description }: { icon: string; title: string; description: string }) {
    return (
      <View style={{ flexDirection: 'row', gap: s.md }}>
        <View style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: `${c.primary}14`,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <TabBarIcon name={icon as any} color={c.primary} size={20} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ 
            color: c.text, 
            fontFamily: ty.body.familySemibold, 
            fontSize: ty.sizes.sm,
            marginBottom: 2,
          }}>
            {title}
          </Text>
          <Text style={{ 
            color: c.textMuted, 
            fontFamily: ty.body.family, 
            fontSize: ty.sizes.xs,
            lineHeight: 18,
          }}>
            {description}
          </Text>
        </View>
      </View>
    );
  }

  function DayCard({ day, index, onPress }: { day: DayBlueprint; index: number; onPress: () => void }) {
    return (
      <MotiView
        from={{ opacity: 0, translateX: -20 }}
        animate={{ opacity: 1, translateX: 0 }}
        transition={{ delay: 150 + index * 50, type: 'timing', duration: animation.duration.normal }}
      >
        <Pressable
          onPress={onPress}
          style={{
            backgroundColor: c.surface,
            borderColor: c.border,
            borderWidth: 1,
            borderRadius: r.lg,
            padding: s.md,
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          <View style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: c.surface2,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: s.md,
          }}>
            <Text style={{ 
              color: c.primary, 
              fontFamily: ty.heading.familySemibold, 
              fontSize: ty.sizes.md 
            }}>
              {day.dayNumber}
            </Text>
          </View>

          <View style={{ flex: 1, minWidth: 0 }}>
            <Text 
              numberOfLines={1}
              style={{ 
                color: c.text, 
                fontFamily: ty.heading.familySemibold, 
                fontSize: ty.sizes.md,
                marginBottom: 2,
              }}
            >
              {day.name}
            </Text>
            <Text 
              numberOfLines={1}
              style={{ 
                color: c.textMuted, 
                fontFamily: ty.body.family, 
                fontSize: ty.sizes.xs,
              }}
            >
              {day.exercises.length} exercises • ~{day.estimatedDurationMin} min
            </Text>
            <View style={{ flexDirection: 'row', gap: s.xs, marginTop: s.xs }}>
              {day.focus.slice(0, 3).map((f, i) => (
                <View 
                  key={i}
                  style={{
                    backgroundColor: c.surface2,
                    borderRadius: r.sm,
                    paddingHorizontal: s.xs,
                    paddingVertical: 2,
                  }}
                >
                  <Text style={{ 
                    color: c.textMuted, 
                    fontFamily: ty.body.family, 
                    fontSize: 10,
                    textTransform: 'capitalize',
                  }}>
                    {f}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <TabBarIcon name="chevron-forward" color={c.textMuted} size={20} />
        </Pressable>
      </MotiView>
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
  heroCard: {
    borderWidth: 1,
    padding: 20,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  philosophyCard: {
    borderWidth: 1,
    padding: 20,
  },
});
