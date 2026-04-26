/**
 * SupersetPairDisplay
 *
 * Displays and manages a superset pair (two exercises performed back-to-back).
 * Features:
 * - Shows both exercises in superset with visual connector
 * - Tracks rounds (e.g., "Round 2 of 3")
 * - Custom rest timers (short between exercises, normal between rounds)
 * - Auto-advances from Exercise A → Exercise B
 * - Educational tooltip explaining supersets
 */

import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { TabBarIcon } from '../../navigation/TabBarIcon';
import { useTokens } from '../../../lib/theme';

export interface SupersetExercise {
  id: string;
  name: string;
  setsTarget: number;
  repsTarget: string;
  setsCompleted: number;
  currentReps?: number;
  currentWeight?: number;
  currentRPE?: number;
}

export interface SupersetConfig {
  superset_type: 'antagonist' | 'pre_exhaust' | 'post_exhaust' | 'compound';
  rest_between_exercises_sec: number; // e.g., 15 seconds
  rest_between_rounds_sec: number; // e.g., 90 seconds
}

interface SupersetPairDisplayProps {
  exerciseA: SupersetExercise;
  exerciseB: SupersetExercise;
  config: SupersetConfig;
  currentRound: number; // 1-indexed
  totalRounds: number;
  activeExercise: 'A' | 'B' | null; // which exercise is currently active
  onStartExercise: (exercise: 'A' | 'B') => void;
  onCompleteExercise: (exercise: 'A' | 'B') => void;
  onShowInfo: () => void;
}

export function SupersetPairDisplay({
  exerciseA,
  exerciseB,
  config,
  currentRound,
  totalRounds,
  activeExercise,
  onStartExercise,
  onCompleteExercise,
  onShowInfo,
}: SupersetPairDisplayProps) {
  const { c, s, ty, r } = useTokens();
  const [showTooltip, setShowTooltip] = useState(false);

  // Calculate overall progress
  const totalSetsNeeded = totalRounds * 2; // A + B per round
  const totalSetsCompleted = exerciseA.setsCompleted + exerciseB.setsCompleted;
  const progressPercent = (totalSetsCompleted / totalSetsNeeded) * 100;

  // Determine superset type label
  const supersetTypeLabel = {
    antagonist: 'Antagonist Superset',
    pre_exhaust: 'Pre-Exhaust Superset',
    post_exhaust: 'Post-Exhaust Superset',
    compound: 'Compound Superset',
  }[config.superset_type];

  return (
    <View
      style={{
        backgroundColor: c.surface,
        borderRadius: r.md,
        borderWidth: 1,
        borderColor: c.primary,
        padding: s.md,
        marginBottom: s.md,
      }}
    >
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: s.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: s.xs }}>
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: c.opacity.primaryLight,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <TabBarIcon name="git-compare-outline" size={16} color={c.primary} />
          </View>
          <Text
            style={{
              color: c.primary,
              fontFamily: ty.body.familySemibold,
              fontSize: ty.sizes.xs,
              textTransform: 'uppercase',
            }}
          >
            {supersetTypeLabel}
          </Text>
        </View>
        <Pressable onPress={() => setShowTooltip(!showTooltip)}>
          <TabBarIcon name="information-circle-outline" size={20} color={c.textMuted} />
        </Pressable>
      </View>

      {/* Educational Tooltip */}
      {showTooltip && (
        <View
          style={{
            backgroundColor: c.bg,
            borderRadius: r.sm,
            padding: s.sm,
            marginBottom: s.sm,
          }}
        >
          <Text
            style={{
              color: c.textMuted,
              fontFamily: ty.body.family,
              fontSize: ty.sizes.xs,
              lineHeight: 18,
            }}
          >
            <Text style={{ fontFamily: ty.body.familySemibold, color: c.text }}>What is a superset?</Text>
            {'\n'}
            Two exercises performed back-to-back with minimal rest. Increases workout density and efficiency.
            {config.superset_type === 'antagonist' && '\n\nAntagonist: Opposing muscle groups (e.g., chest + back).'}
            {config.superset_type === 'pre_exhaust' && '\n\nPre-Exhaust: Isolation → Compound (e.g., flyes → bench press).'}
            {config.superset_type === 'post_exhaust' && '\n\nPost-Exhaust: Compound → Isolation (e.g., bench press → flyes).'}
          </Text>
        </View>
      )}

      {/* Round Progress */}
      <View style={{ marginBottom: s.md }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <Text
            style={{
              color: c.textMuted,
              fontFamily: ty.body.familySemibold,
              fontSize: ty.sizes.xs,
            }}
          >
            Round {currentRound} of {totalRounds}
          </Text>
          <Text
            style={{
              color: c.primary,
              fontFamily: ty.mono.family,
              fontSize: ty.sizes.xs,
            }}
          >
            {Math.round(progressPercent)}% Complete
          </Text>
        </View>
        {/* Progress Bar */}
        <View
          style={{
            height: 4,
            backgroundColor: c.surface2,
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              height: '100%',
              width: `${progressPercent}%`,
              backgroundColor: c.primary,
            }}
          />
        </View>
      </View>

      {/* Exercise Pair */}
      <View style={{ gap: s.sm }}>
        {/* Exercise A */}
        <ExerciseCard
          label="A"
          exercise={exerciseA}
          isActive={activeExercise === 'A'}
          isCompleted={exerciseA.setsCompleted >= currentRound}
          onStart={() => onStartExercise('A')}
          onComplete={() => onCompleteExercise('A')}
        />

        {/* Connector */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 4 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: c.border }} />
          <View
            style={{
              marginHorizontal: s.sm,
              paddingHorizontal: s.xs,
              paddingVertical: 2,
              borderRadius: r.sm,
              backgroundColor: c.surface2,
            }}
          >
            <Text
              style={{
                color: c.textMuted,
                fontFamily: ty.mono.family,
                fontSize: 11,
              }}
            >
              {config.rest_between_exercises_sec}s rest
            </Text>
          </View>
          <View style={{ flex: 1, height: 1, backgroundColor: c.border }} />
        </View>

        {/* Exercise B */}
        <ExerciseCard
          label="B"
          exercise={exerciseB}
          isActive={activeExercise === 'B'}
          isCompleted={exerciseB.setsCompleted >= currentRound}
          onStart={() => onStartExercise('B')}
          onComplete={() => onCompleteExercise('B')}
        />
      </View>

      {/* Rest Between Rounds Info */}
      {exerciseA.setsCompleted >= currentRound && exerciseB.setsCompleted >= currentRound && currentRound < totalRounds && (
        <View
          style={{
            marginTop: s.md,
            paddingTop: s.md,
            borderTopWidth: 1,
            borderTopColor: c.border,
            flexDirection: 'row',
            alignItems: 'center',
            gap: s.xs,
          }}
        >
          <TabBarIcon name="timer-outline" size={16} color={c.primary} />
          <Text
            style={{
              color: c.textMuted,
              fontFamily: ty.body.family,
              fontSize: ty.sizes.xs,
            }}
          >
            Rest {config.rest_between_rounds_sec}s between rounds
          </Text>
        </View>
      )}
    </View>
  );
}

interface ExerciseCardProps {
  label: 'A' | 'B';
  exercise: SupersetExercise;
  isActive: boolean;
  isCompleted: boolean;
  onStart: () => void;
  onComplete: () => void;
}

function ExerciseCard({
  label,
  exercise,
  isActive,
  isCompleted,
  onStart,
  onComplete,
}: ExerciseCardProps) {
  const { c, s, ty, r } = useTokens();

  const cardStyle = isActive
    ? { backgroundColor: c.opacity.primaryLight, borderColor: c.primary }
    : isCompleted
    ? { backgroundColor: c.opacity.successLight, borderColor: c.success }
    : { backgroundColor: c.surface2, borderColor: c.border };

  return (
    <View
      style={{
        borderRadius: r.md,
        borderWidth: 1,
        borderColor: cardStyle.borderColor,
        backgroundColor: cardStyle.backgroundColor,
        padding: s.sm,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Exercise Info */}
        <View style={{ flex: 1, marginRight: s.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: s.xs, marginBottom: 4 }}>
            <View
              style={{
                width: 20,
                height: 20,
                borderRadius: 10,
                backgroundColor: isActive ? c.primary : isCompleted ? c.success : c.surface3,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                style={{
                  color: isActive || isCompleted ? c.bg : c.textMuted,
                  fontFamily: ty.mono.family,
                  fontSize: 11,
                }}
              >
                {label}
              </Text>
            </View>
            <Text
              style={{
                color: c.text,
                fontFamily: ty.body.familySemibold,
                fontSize: ty.sizes.sm,
                flex: 1,
              }}
              numberOfLines={1}
            >
              {exercise.name}
            </Text>
          </View>
          <Text
            style={{
              color: c.textMuted,
              fontFamily: ty.body.family,
              fontSize: ty.sizes.xs,
            }}
          >
            Target: {exercise.repsTarget} reps × {exercise.setsTarget} sets
          </Text>
        </View>

        {/* Action/Status */}
        {isCompleted ? (
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: c.success,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <TabBarIcon name="checkmark" size={18} color={c.bg} />
          </View>
        ) : (
          <Pressable
            onPress={isActive ? onComplete : onStart}
            style={{
              paddingHorizontal: s.sm,
              paddingVertical: s.xs,
              borderRadius: r.md,
              backgroundColor: isActive ? c.primary : c.surface3,
            }}
          >
            <Text
              style={{
                color: isActive ? c.bg : c.textMuted,
                fontFamily: ty.body.familySemibold,
                fontSize: ty.sizes.xs,
              }}
            >
              {isActive ? 'Complete' : 'Start'}
            </Text>
          </Pressable>
        )}
      </View>

      {/* Current Stats (if active) */}
      {isActive && (exercise.currentWeight || exercise.currentReps) && (
        <View
          style={{
            marginTop: s.xs,
            paddingTop: s.xs,
            borderTopWidth: 1,
            borderTopColor: c.border,
            flexDirection: 'row',
            gap: s.md,
          }}
        >
          {exercise.currentWeight && (
            <Text
              style={{
                color: c.text,
                fontFamily: ty.mono.family,
                fontSize: ty.sizes.xs,
              }}
            >
              {exercise.currentWeight} lbs
            </Text>
          )}
          {exercise.currentReps && (
            <Text
              style={{
                color: c.text,
                fontFamily: ty.mono.family,
                fontSize: ty.sizes.xs,
              }}
            >
              {exercise.currentReps} reps
            </Text>
          )}
          {exercise.currentRPE && (
            <Text
              style={{
                color: c.text,
                fontFamily: ty.mono.family,
                fontSize: ty.sizes.xs,
              }}
            >
              RPE {exercise.currentRPE}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}
