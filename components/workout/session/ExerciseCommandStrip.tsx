import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { GlassCard } from '../../premium/GlassCard';
import { TabBarIcon } from '../../navigation/TabBarIcon';
import { useTokens } from '../../../lib/theme';

interface ExerciseCommandStripProps {
  currentExerciseIndex: number;
  totalExercises: number;
  exerciseName: string;
  activeSetNumber: number | null;
  totalPlannedSets: number;
  targetRepLabel: string | null;
  lastWorkingSetLabel: string | null;
  restSeconds: number;
  exerciseComplete: boolean;
  canGoPrevious: boolean;
  canGoNext: boolean;
  onPrevExercise: () => void;
  onNextExercise: () => void;
  onOpenQueue: () => void;
  onOpenInfo: () => void;
  onOpenSwap: () => void;
}

export function ExerciseCommandStrip(props: ExerciseCommandStripProps) {
  const { c, s, ty, r } = useTokens();
  const progressLabel = props.exerciseComplete
    ? `All ${props.totalPlannedSets} planned sets logged`
    : `Set ${props.activeSetNumber ?? props.totalPlannedSets} of ${props.totalPlannedSets}`;

  return (
    <GlassCard intensity="strong" style={{ marginBottom: s.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Pressable
          onPress={props.onPrevExercise}
          disabled={!props.canGoPrevious}
          style={{ opacity: props.canGoPrevious ? 1 : 0.35, padding: s.xs }}
        >
          <TabBarIcon name="chevron-back" color={c.text} size={22} />
        </Pressable>

        <Pressable onPress={props.onOpenQueue} style={{ alignItems: 'center', flex: 1 }}>
          <Text
            style={{
              color: c.primary,
              fontFamily: ty.body.familySemibold,
              fontSize: ty.sizes.xs,
              letterSpacing: 1,
            }}
          >
            EXERCISE {props.currentExerciseIndex + 1}/{props.totalExercises}
          </Text>
          <Text
            style={{
              marginTop: 4,
              color: c.text,
              fontFamily: ty.heading.familySemibold,
              fontSize: ty.sizes.lg,
              textAlign: 'center',
            }}
          >
            {props.exerciseName}
          </Text>
        </Pressable>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: s.xs }}>
          <Pressable onPress={props.onOpenInfo} style={{ padding: s.xs }}>
            <Ionicons name="information-circle-outline" size={20} color={c.textMuted} />
          </Pressable>
          <Pressable onPress={props.onOpenSwap} style={{ padding: s.xs }}>
            <Ionicons name="swap-horizontal" size={18} color={c.textMuted} />
          </Pressable>
          <Pressable
            onPress={props.onNextExercise}
            disabled={!props.canGoNext}
            style={{ opacity: props.canGoNext ? 1 : 0.35, padding: s.xs }}
          >
            <TabBarIcon name="chevron-forward" color={c.text} size={22} />
          </Pressable>
        </View>
      </View>

      <View
        style={{
          marginTop: s.md,
          padding: s.md,
          borderRadius: r.lg,
          backgroundColor: c.surface,
          gap: s.xs,
        }}
      >
        <Text
          style={{
            color: c.text,
            fontFamily: ty.body.familySemibold,
            fontSize: ty.sizes.sm,
          }}
        >
          {progressLabel}
        </Text>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: s.xs }}>
          {props.targetRepLabel ? (
            <View
              style={{
                paddingHorizontal: s.sm,
                paddingVertical: 6,
                borderRadius: r.pill,
                backgroundColor: `${c.primary}18`,
              }}
            >
              <Text style={{ color: c.primary, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs }}>
                {props.targetRepLabel}
              </Text>
            </View>
          ) : null}

          <View
            style={{
              paddingHorizontal: s.sm,
              paddingVertical: 6,
              borderRadius: r.pill,
              backgroundColor: c.surface2,
            }}
          >
            <Text style={{ color: c.textMuted, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs }}>
              Rest {props.restSeconds}s
            </Text>
          </View>

          {props.lastWorkingSetLabel ? (
            <View
              style={{
                paddingHorizontal: s.sm,
                paddingVertical: 6,
                borderRadius: r.pill,
                backgroundColor: c.surface2,
              }}
            >
              <Text style={{ color: c.textMuted, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs }}>
                Last: {props.lastWorkingSetLabel}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </GlassCard>
  );
}
