import React from 'react';
import { Pressable, Text, View } from 'react-native';

import type { ActiveSetRowViewModel } from '../../../lib/workout/logging-state';
import { GlassCard } from '../../premium/GlassCard';
import { useTokens } from '../../../lib/theme';
import { SetLogRow } from './SetLogRow';

interface SetLogListProps {
  rows: ActiveSetRowViewModel[];
  exerciseComplete: boolean;
  hasNextExercise: boolean;
  isFinalExercise: boolean;
  onSelectSet: (setNumber: number) => void;
  onDraftChange: (setNumber: number, field: 'weight' | 'reps' | 'rpe' | 'isWarmup', value: string | boolean) => void;
  onLogSet: (setNumber: number) => void;
  onRepeatLast: (setNumber: number) => void;
  onRepeatPlusFive: (setNumber: number) => void;
  onEditCompleted: (setNumber: number) => void;
  onDeleteCompleted: (setNumber: number) => void;
  onAddSet: () => void;
  onNextExercise: () => void;
  onFinishWorkout: () => void;
  onOpenPlateCalculator: (setNumber: number) => void;
}

export function SetLogList(props: SetLogListProps) {
  const { c, s, ty, r } = useTokens();

  return (
    <GlassCard glowEffect intensity="strong" style={{ gap: s.md }}>
      <View style={{ gap: s.sm }}>
        {props.rows.map((row) => (
          <SetLogRow
            key={row.setNumber}
            row={row}
            onSelect={() => props.onSelectSet(row.setNumber)}
            onDraftChange={(field, value) => props.onDraftChange(row.setNumber, field, value)}
            onLogSet={() => props.onLogSet(row.setNumber)}
            onRepeatLast={() => props.onRepeatLast(row.setNumber)}
            onRepeatPlusFive={() => props.onRepeatPlusFive(row.setNumber)}
            onEditCompleted={() => props.onEditCompleted(row.setNumber)}
            onDeleteCompleted={() => props.onDeleteCompleted(row.setNumber)}
            onOpenPlateCalculator={() => props.onOpenPlateCalculator(row.setNumber)}
          />
        ))}
      </View>

      <View style={{ gap: s.sm }}>
        <Pressable
          onPress={props.onAddSet}
          style={{
            borderRadius: r.pill,
            borderWidth: 1,
            borderColor: c.border,
            backgroundColor: c.surface,
            paddingVertical: s.sm,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: c.primary, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm }}>
            + Add Set
          </Text>
        </Pressable>

        {props.exerciseComplete ? (
          <Pressable
            onPress={props.isFinalExercise ? props.onFinishWorkout : props.onNextExercise}
            style={{
              borderRadius: r.pill,
              backgroundColor: `${c.primary}20`,
              paddingVertical: s.sm,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: c.primary, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm }}>
              {props.isFinalExercise ? 'Finish Workout' : props.hasNextExercise ? 'Next Exercise' : 'Finish Workout'}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </GlassCard>
  );
}
