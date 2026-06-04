/**
 * day-detail.tsx
 * 
 * Shows complete exercise breakdown for a specific day in a program.
 * Demonstrates strict exercise selection - no redundant movements.
 */

import React, { useMemo } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotiView } from 'moti';

import { TabBarIcon } from '../../../components/navigation/TabBarIcon';
import { useTokens } from '../../../lib/theme';
import { getProgramById } from '../../../lib/workout/program-blueprints';
import { FUNDAMENTAL_EXERCISES } from '../../../lib/workout/fundamental-exercises';

export default function DayDetailScreen() {
  const { c, s, ty, r, animation } = useTokens();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { programId, dayNumber } = useLocalSearchParams<{ 
    programId?: string; 
    dayNumber?: string;
  }>();

  const day = useMemo(() => {
    if (!programId || !dayNumber) return null;
    const program = getProgramById(programId);
    if (!program) return null;
    return program.days.find(d => d.dayNumber === parseInt(dayNumber, 10));
  }, [programId, dayNumber]);

  const program = useMemo(() => {
    if (!programId) return null;
    return getProgramById(programId);
  }, [programId]);

  // Calculate push/pull ratio for this day
  const pushPullStats = useMemo(() => {
    let pushSets = 0;
    let pullSets = 0;
    let legSets = 0;

    if (!day) return { pushSets, pullSets, legSets, ratio: 0 };

    for (const exercise of day.exercises) {
      const exerciseData = FUNDAMENTAL_EXERCISES.find(e => e.id === exercise.exerciseId);
      if (!exerciseData) continue;

      const pattern = exerciseData.pattern;
      if (['horizontal_push', 'vertical_push'].includes(pattern)) {
        pushSets += exercise.sets;
      } else if (['horizontal_pull', 'vertical_pull'].includes(pattern)) {
        pullSets += exercise.sets;
      } else if (['compound_squat', 'compound_hinge', 'single_leg', 'leg_extension', 'leg_curl'].includes(pattern)) {
        legSets += exercise.sets;
      }
    }

    return { pushSets, pullSets, legSets, ratio: pullSets > 0 ? pushSets / pullSets : 0 };
  }, [day]);

  if (!day || !program) {
    return (
      <View style={[styles.container, { backgroundColor: c.bg, paddingTop: insets.top }]}>
        <Text style={{ color: c.text }}>Day not found</Text>
      </View>
    );
  }

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
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{ 
            color: c.textMuted, 
            fontFamily: ty.body.family, 
            fontSize: ty.sizes.xs,
            textTransform: 'uppercase',
            letterSpacing: 1,
          }}>
            Day {day.dayNumber}
          </Text>
          <Text 
            numberOfLines={1}
            style={{ 
              color: c.text, 
              fontFamily: ty.heading.familySemibold, 
              fontSize: ty.sizes.lg,
            }}
          >
            {day.name}
          </Text>
        </View>
        <View style={styles.placeholder} />
      </MotiView>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={{ 
          padding: s.lg, 
          paddingBottom: insets.bottom + 100 
        }}
      >
        {/* Day Overview Card */}
        <MotiView
          from={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'timing', duration: animation.duration.normal }}
          style={[styles.overviewCard, { 
            backgroundColor: c.surface,
            borderColor: c.border,
            borderRadius: r.xl,
          }]}
        >
          {/* Focus Tags */}
          <View style={{ flexDirection: 'row', gap: s.xs, marginBottom: s.md, flexWrap: 'wrap' }}>
            {day.focus.map((f, i) => (
              <View 
                key={i}
                style={{
                  backgroundColor: `${c.primary}14`,
                  borderRadius: r.pill,
                  paddingHorizontal: s.sm,
                  paddingVertical: s.xs,
                }}
              >
                <Text style={{ 
                  color: c.primary, 
                  fontFamily: ty.body.familySemibold, 
                  fontSize: ty.sizes.xs,
                  textTransform: 'capitalize',
                }}>
                  {f}
                </Text>
              </View>
            ))}
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={[styles.statItem, { flex: 1 }]}>
              <Text style={{ 
                color: c.text, 
                fontFamily: ty.heading.familySemibold, 
                fontSize: ty.sizes.h3 
              }}>
                {day.exercises.length}
              </Text>
              <Text style={{ 
                color: c.textMuted, 
                fontFamily: ty.body.family, 
                fontSize: ty.sizes.xs 
              }}>
                Exercises
              </Text>
            </View>
            <View style={[styles.statItem, { flex: 1 }]}>
              <Text style={{ 
                color: c.text, 
                fontFamily: ty.heading.familySemibold, 
                fontSize: ty.sizes.h3 
              }}>
                {day.exercises.reduce((sum, e) => sum + e.sets, 0)}
              </Text>
              <Text style={{ 
                color: c.textMuted, 
                fontFamily: ty.body.family, 
                fontSize: ty.sizes.xs 
              }}>
                Total Sets
              </Text>
            </View>
            <View style={[styles.statItem, { flex: 1 }]}>
              <Text style={{ 
                color: c.text, 
                fontFamily: ty.heading.familySemibold, 
                fontSize: ty.sizes.h3 
              }}>
                ~{day.estimatedDurationMin}
              </Text>
              <Text style={{ 
                color: c.textMuted, 
                fontFamily: ty.body.family, 
                fontSize: ty.sizes.xs 
              }}>
                Minutes
              </Text>
            </View>
          </View>

          {/* Push/Pull/Leg Balance */}
          {(pushPullStats.pushSets > 0 || pushPullStats.pullSets > 0) && (
            <View style={{ 
              marginTop: s.md,
              paddingTop: s.md,
              borderTopWidth: 1,
              borderTopColor: c.border,
            }}>
              <Text style={{ 
                color: c.textMuted, 
                fontFamily: ty.body.familySemibold, 
                fontSize: ty.sizes.xs,
                marginBottom: s.xs,
                textTransform: 'uppercase',
                letterSpacing: 1,
              }}>
                Movement Balance
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: s.sm }}>
                {pushPullStats.pushSets > 0 && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: s.xs, marginRight: s.sm }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.macros?.carbs || c.primary }} />
                    <Text style={{ color: c.text, fontFamily: ty.body.family, fontSize: ty.sizes.xs }}>
                      Push: {pushPullStats.pushSets}
                    </Text>
                  </View>
                )}
                {pushPullStats.pullSets > 0 && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: s.xs, marginRight: s.sm }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.macros?.protein || c.success }} />
                    <Text style={{ color: c.text, fontFamily: ty.body.family, fontSize: ty.sizes.xs }}>
                      Pull: {pushPullStats.pullSets}
                    </Text>
                  </View>
                )}
                {pushPullStats.legSets > 0 && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: s.xs }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.macros?.fat || c.accent }} />
                    <Text style={{ color: c.text, fontFamily: ty.body.family, fontSize: ty.sizes.xs }}>
                      Legs: {pushPullStats.legSets}
                    </Text>
                  </View>
                )}
              </View>
              {pushPullStats.pushSets > 0 && pushPullStats.pullSets > 0 && (
                <Text style={{ 
                  color: pushPullStats.ratio >= 0.8 && pushPullStats.ratio <= 1.2 ? c.success : c.macros?.carbs,
                  fontFamily: ty.body.family, 
                  fontSize: ty.sizes.xs,
                  marginTop: s.xs,
                }}>
                  Push:Pull ratio = {pushPullStats.ratio.toFixed(1)}:1 {' '}
                  {pushPullStats.ratio >= 0.8 && pushPullStats.ratio <= 1.2 ? '✓ Balanced' : '⚠ Imbalanced'}
                </Text>
              )}
            </View>
          )}
        </MotiView>

        {/* Exercises List */}
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
            Exercises
          </Text>

          <View style={{ gap: s.md }}>
            {day.exercises.map((exercise, index) => {
              const exerciseData = FUNDAMENTAL_EXERCISES.find(e => e.id === exercise.exerciseId);
              if (!exerciseData) return null;

              return (
                <MotiView
                  key={index}
                  from={{ opacity: 0, translateX: -20 }}
                  animate={{ opacity: 1, translateX: 0 }}
                  transition={{ delay: 150 + index * 50, type: 'timing', duration: animation.duration.normal }}
                >
                  <View style={{
                    backgroundColor: c.surface,
                    borderColor: c.border,
                    borderWidth: 1,
                    borderRadius: r.lg,
                    padding: s.md,
                  }}>
                    {/* Exercise Number & Name */}
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: s.sm }}>
                      <View style={{
                        width: 28,
                        height: 28,
                        borderRadius: 14,
                        backgroundColor: c.primary,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: s.sm,
                      }}>
                        <Text style={{ 
                          color: c.bg, 
                          fontFamily: ty.heading.familySemibold, 
                          fontSize: ty.sizes.xs 
                        }}>
                          {index + 1}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ 
                          color: c.text, 
                          fontFamily: ty.heading.familySemibold, 
                          fontSize: ty.sizes.md,
                        }}>
                          {exerciseData.name}
                        </Text>
                        <Text style={{ 
                          color: c.textMuted, 
                          fontFamily: ty.body.family, 
                          fontSize: ty.sizes.xs,
                          textTransform: 'capitalize',
                        }}>
                          {exerciseData.pattern.replace('_', ' ')}
                        </Text>
                      </View>
                    </View>

                    {/* Sets x Reps */}
                    <View style={{ 
                      flexDirection: 'row', 
                      flexWrap: 'wrap',
                      gap: s.sm, 
                      marginBottom: s.sm,
                      paddingVertical: s.xs,
                      borderTopWidth: 1,
                      borderBottomWidth: 1,
                      borderColor: c.border,
                    }}>
                      <View style={{ minWidth: 50, flex: 1 }}>
                        <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: 10 }}>
                          SETS
                        </Text>
                        <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.sm }}>
                          {exercise.sets}
                        </Text>
                      </View>
                      <View style={{ minWidth: 50, flex: 1 }}>
                        <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: 10 }}>
                          REPS
                        </Text>
                        <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.sm }}>
                          {exercise.reps}
                        </Text>
                      </View>
                      <View style={{ minWidth: 50, flex: 1 }}>
                        <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: 10 }}>
                          REST
                        </Text>
                        <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.sm }}>
                          {Math.round(exercise.restSeconds / 60)}m
                        </Text>
                      </View>
                      {exercise.rpe && (
                        <View style={{ minWidth: 40, flex: 1 }}>
                          <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: 10 }}>
                            RPE
                          </Text>
                          <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.sm }}>
                            {exercise.rpe}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Coaching Cue */}
                    <View style={{
                      backgroundColor: c.surface2,
                      borderRadius: r.md,
                      padding: s.sm,
                    }}>
                      <Text style={{ 
                        color: c.textMuted, 
                        fontFamily: ty.body.familySemibold, 
                        fontSize: 10,
                        marginBottom: 2,
                      }}>
                        COACHING CUE
                      </Text>
                      <Text style={{ 
                        color: c.text, 
                        fontFamily: ty.body.family, 
                        fontSize: ty.sizes.xs,
                        lineHeight: 16,
                      }}>
                        {exercise.technique || exerciseData.coachingCue}
                      </Text>
                    </View>

                    {/* Equipment */}
                    <View style={{ flexDirection: 'row', gap: s.xs, marginTop: s.sm }}>
                      {exerciseData.equipment.map((eq, i) => (
                        <View 
                          key={i}
                          style={{
                            backgroundColor: `${c.primary}14`,
                            borderRadius: r.sm,
                            paddingHorizontal: s.xs,
                            paddingVertical: 2,
                          }}
                        >
                          <Text style={{ 
                            color: c.primary, 
                            fontFamily: ty.body.family, 
                            fontSize: 10,
                            textTransform: 'capitalize',
                          }}>
                            {eq}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </MotiView>
              );
            })}
          </View>
        </MotiView>

        {/* Scientific Note */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ delay: 300, type: 'timing', duration: animation.duration.normal }}
          style={{
            backgroundColor: `${c.success}10`,
            borderColor: `${c.success}30`,
            borderWidth: 1,
            borderRadius: r.lg,
            padding: s.md,
            marginTop: s.xl,
          }}
        >
          <View style={{ flexDirection: 'row', gap: s.sm, alignItems: 'flex-start' }}>
            <TabBarIcon name="checkmark-circle" color={c.success} size={20} />
            <View style={{ flex: 1 }}>
              <Text style={{ 
                color: c.text, 
                fontFamily: ty.heading.familySemibold, 
                fontSize: ty.sizes.sm,
                marginBottom: s.xs,
              }}>
                Scientific Exercise Selection
              </Text>
              <Text style={{ 
                color: c.textMuted, 
                fontFamily: ty.body.family, 
                fontSize: ty.sizes.xs,
                lineHeight: 18,
              }}>
                This session uses fundamental movement patterns with no redundant exercises. 
                Each movement was selected for maximum training efficiency and structural balance.
              </Text>
            </View>
          </View>
        </MotiView>
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
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  overviewCard: {
    borderWidth: 1,
    padding: 20,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
});
