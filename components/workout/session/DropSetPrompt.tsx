/**
 * DropSetPrompt
 *
 * Guides users through drop set execution with weight reduction calculator.
 * Features:
 * - Shows target weight reduction (e.g., "Reduce weight by 20%")
 * - Calculator helper: "185 lbs → 148 lbs"
 * - Tracks multi-weight sets (e.g., Set 3: 185x8, 148x10)
 * - Progress indicator: "Drop phase 2 of 3"
 * - Educational tooltip explaining drop sets
 */

import React, { useState, useMemo } from 'react';
import { View, Text, Pressable } from 'react-native';
import { TabBarIcon } from '../../navigation/TabBarIcon';
import { useTokens } from '../../../lib/theme';

export interface DropSetConfig {
  drop_count: number; // Number of drops (e.g., 2 = working set + 2 drops)
  drop_percentage: number; // Weight reduction per drop (e.g., 20)
  rest_between_drops_sec: number; // Typically 0 or 5 seconds
}

interface DropSetPromptProps {
  exerciseName: string;
  workingSetWeight: number; // Starting weight
  workingSetReps: number; // Reps completed on working set
  config: DropSetConfig;
  currentDropPhase: number; // 0 = working set, 1 = first drop, 2 = second drop, etc.
  onCompleteDropPhase: (weight: number, reps: number) => void;
  onSkipRemainingDrops: () => void;
  onShowInfo: () => void;
}

export function DropSetPrompt({
  exerciseName,
  workingSetWeight,
  workingSetReps,
  config,
  currentDropPhase,
  onCompleteDropPhase,
  onSkipRemainingDrops,
  onShowInfo,
}: DropSetPromptProps) {
  const { c, s, ty, r } = useTokens();
  const [showTooltip, setShowTooltip] = useState(false);
  const [repsInput, setRepsInput] = useState('');

  // Calculate target weight for current drop phase
  const targetWeight = useMemo(() => {
    if (currentDropPhase === 0) return workingSetWeight;

    const reductionPercent = config.drop_percentage * currentDropPhase;
    const reducedWeight = workingSetWeight * (1 - reductionPercent / 100);

    // Round to nearest 2.5 lbs
    return Math.round(reducedWeight / 2.5) * 2.5;
  }, [workingSetWeight, currentDropPhase, config.drop_percentage]);

  // Calculate all drop weights for preview
  const allDropWeights = useMemo(() => {
    const weights: number[] = [workingSetWeight];
    for (let i = 1; i <= config.drop_count; i++) {
      const reductionPercent = config.drop_percentage * i;
      const reducedWeight = workingSetWeight * (1 - reductionPercent / 100);
      weights.push(Math.round(reducedWeight / 2.5) * 2.5);
    }
    return weights;
  }, [workingSetWeight, config.drop_count, config.drop_percentage]);

  const isWorkingSet = currentDropPhase === 0;
  const isLastDrop = currentDropPhase === config.drop_count;

  return (
    <View
      style={{
        backgroundColor: c.surface,
        borderRadius: r.md,
        borderWidth: 1,
        borderColor: c.warning,
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
              backgroundColor: c.opacity.warningLight,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <TabBarIcon name="trending-down" size={16} color={c.warning} />
          </View>
          <Text
            style={{
              color: c.warning,
              fontFamily: ty.body.familySemibold,
              fontSize: ty.sizes.xs,
              textTransform: 'uppercase',
            }}
          >
            Drop Set - Phase {currentDropPhase + 1} of {config.drop_count + 1}
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
            <Text style={{ fontFamily: ty.body.familySemibold, color: c.text }}>What is a drop set?</Text>
            {'\n'}
            After reaching failure, immediately reduce weight and continue without rest to maximize muscle fatigue and metabolic stress.
            {'\n\n'}
            <Text style={{ fontFamily: ty.body.familySemibold }}>Tip:</Text> Control the descent and push to near-failure on each drop.
          </Text>
        </View>
      )}

      {/* Exercise Name */}
      <Text
        style={{
          color: c.text,
          fontFamily: ty.body.familySemibold,
          fontSize: ty.sizes.md,
          marginBottom: s.sm,
        }}
      >
        {exerciseName}
      </Text>

      {/* Weight Progression Visual */}
      <View
        style={{
          backgroundColor: c.surface2,
          borderRadius: r.sm,
          padding: s.sm,
          marginBottom: s.md,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: s.xs }}>
          {allDropWeights.map((weight, idx) => (
            <React.Fragment key={idx}>
              <View
                style={{
                  paddingHorizontal: s.sm,
                  paddingVertical: s.xs,
                  borderRadius: r.sm,
                  backgroundColor: idx === currentDropPhase ? c.warning : c.surface3,
                  borderWidth: 1,
                  borderColor: idx === currentDropPhase ? c.warning : c.border,
                }}
              >
                <Text
                  style={{
                    color: idx === currentDropPhase ? c.bg : c.textMuted,
                    fontFamily: ty.mono.family,
                    fontSize: ty.sizes.xs,
                  }}
                >
                  {weight} lbs
                </Text>
              </View>
              {idx < allDropWeights.length - 1 && (
                <TabBarIcon name="chevron-forward" size={12} color={c.textMuted} />
              )}
            </React.Fragment>
          ))}
        </View>
      </View>

      {/* Current Phase Instructions */}
      {isWorkingSet ? (
        <View
          style={{
            backgroundColor: c.opacity.primaryLight,
            borderRadius: r.sm,
            padding: s.md,
            marginBottom: s.md,
          }}
        >
          <Text
            style={{
              color: c.text,
              fontFamily: ty.body.familySemibold,
              fontSize: ty.sizes.sm,
              marginBottom: 4,
            }}
          >
            Working Set
          </Text>
          <Text
            style={{
              color: c.textMuted,
              fontFamily: ty.body.family,
              fontSize: ty.sizes.xs,
              lineHeight: 18,
            }}
          >
            Perform your working set at {workingSetWeight} lbs. Push to near-failure, then immediately reduce weight for drop sets.
          </Text>
        </View>
      ) : (
        <View
          style={{
            backgroundColor: c.opacity.warningLight,
            borderRadius: r.sm,
            padding: s.md,
            marginBottom: s.md,
          }}
        >
          <Text
            style={{
              color: c.text,
              fontFamily: ty.body.familySemibold,
              fontSize: ty.sizes.lg,
              textAlign: 'center',
              marginBottom: s.xs,
            }}
          >
            Reduce to {targetWeight} lbs
          </Text>
          <Text
            style={{
              color: c.textMuted,
              fontFamily: ty.body.family,
              fontSize: ty.sizes.xs,
              textAlign: 'center',
              lineHeight: 18,
            }}
          >
            -{config.drop_percentage}% from {allDropWeights[currentDropPhase - 1]} lbs{' '}
            {config.rest_between_drops_sec > 0
              ? `• Rest ${config.rest_between_drops_sec}s`
              : '• No rest'}
          </Text>
        </View>
      )}

      {/* Previous Phase Summary (if not first) */}
      {!isWorkingSet && (
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingVertical: s.xs,
            paddingHorizontal: s.sm,
            backgroundColor: c.bg,
            borderRadius: r.sm,
            marginBottom: s.md,
          }}
        >
          <Text
            style={{
              color: c.textMuted,
              fontFamily: ty.body.family,
              fontSize: ty.sizes.xs,
            }}
          >
            {isWorkingSet ? 'Working set' : `Drop ${currentDropPhase}`} completed
          </Text>
          <Text
            style={{
              color: c.text,
              fontFamily: ty.mono.family,
              fontSize: ty.sizes.xs,
            }}
          >
            {allDropWeights[currentDropPhase - 1]} lbs × {workingSetReps} reps
          </Text>
        </View>
      )}

      {/* Action Buttons */}
      <View style={{ flexDirection: 'row', gap: s.sm }}>
        <Pressable
          onPress={() => {
            // For now, allow manual completion - in real implementation, this would
            // integrate with the set logging flow
            const reps = parseInt(repsInput) || workingSetReps;
            onCompleteDropPhase(targetWeight, reps);
            setRepsInput('');
          }}
          style={{
            flex: 1,
            paddingVertical: s.md,
            borderRadius: r.md,
            backgroundColor: c.warning,
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              color: c.bg,
              fontFamily: ty.body.familySemibold,
              fontSize: ty.sizes.sm,
            }}
          >
            {isWorkingSet ? 'Start Drop Set' : isLastDrop ? 'Complete Drop Set' : 'Next Drop'}
          </Text>
        </Pressable>

        {!isWorkingSet && (
          <Pressable
            onPress={onSkipRemainingDrops}
            style={{
              paddingHorizontal: s.md,
              paddingVertical: s.md,
              borderRadius: r.md,
              backgroundColor: c.surface2,
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                color: c.textMuted,
                fontFamily: ty.body.family,
                fontSize: ty.sizes.xs,
              }}
            >
              Skip
            </Text>
          </Pressable>
        )}
      </View>

      {/* Helper Text */}
      <Text
        style={{
          color: c.textMuted,
          fontFamily: ty.body.family,
          fontSize: 11,
          textAlign: 'center',
          marginTop: s.sm,
        }}
      >
        {isWorkingSet
          ? `After this set, reduce weight ${config.drop_count} times to complete the drop set`
          : isLastDrop
          ? 'This is your final drop - push to failure!'
          : `${config.drop_count - currentDropPhase} more ${config.drop_count - currentDropPhase === 1 ? 'drop' : 'drops'} remaining`}
      </Text>
    </View>
  );
}
