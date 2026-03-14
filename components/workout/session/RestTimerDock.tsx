import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { useTokens } from '../../../lib/theme';

function formatRestTime(remainingSeconds: number) {
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

interface RestTimerDockProps {
  visible: boolean;
  remainingSeconds: number;
  exerciseName: string;
  bottomOffset: number;
  showNextExercise: boolean;
  onSkip: () => void;
  onAddThirtySeconds: () => void;
  onNextExercise: () => void;
}

export function RestTimerDock(props: RestTimerDockProps) {
  const { c, s, ty, r } = useTokens();

  if (!props.visible) {
    return null;
  }

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: s.lg,
        right: s.lg,
        bottom: props.bottomOffset + s.md,
        zIndex: 40,
        borderRadius: r.xl,
        backgroundColor: c.surface,
        borderWidth: 1,
        borderColor: `${c.primary}40`,
        padding: s.md,
        shadowColor: '#000000',
        shadowOpacity: 0.2,
        shadowRadius: 16,
        elevation: 10,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: s.md }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: c.textMuted, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs, letterSpacing: 1 }}>
            REST TIMER
          </Text>
          <Text style={{ color: c.text, fontFamily: ty.mono.family, fontSize: ty.sizes.h3, marginTop: 4 }}>
            {formatRestTime(props.remainingSeconds)}
          </Text>
          <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.xs, marginTop: 2 }}>
            {props.exerciseName}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: s.xs, flexWrap: 'wrap', maxWidth: '58%' }}>
          {props.showNextExercise ? (
            <Pressable
              onPress={props.onNextExercise}
              style={{
                paddingHorizontal: s.md,
                paddingVertical: s.xs,
                borderRadius: r.pill,
                backgroundColor: `${c.primary}18`,
                minHeight: 34,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: c.primary, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs }}>
                Next Exercise
              </Text>
            </Pressable>
          ) : null}

          <Pressable
            onPress={props.onAddThirtySeconds}
            style={{
              paddingHorizontal: s.md,
              paddingVertical: s.xs,
              borderRadius: r.pill,
              backgroundColor: c.surface2,
              minHeight: 34,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs }}>
              +30s
            </Text>
          </Pressable>

          <Pressable
            onPress={props.onSkip}
            style={{
              paddingHorizontal: s.md,
              paddingVertical: s.xs,
              borderRadius: r.pill,
              backgroundColor: c.surface2,
              minHeight: 34,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs }}>
              Skip
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
