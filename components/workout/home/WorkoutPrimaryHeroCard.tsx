import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { GlassCard } from '../../premium/GlassCard';
import { TabBarIcon } from '../../navigation/TabBarIcon';
import { useTokens } from '../../../lib/theme';
import type { WorkoutDashboardPrimaryHeroState } from '../../../lib/workout/dashboard-state';

type Props = {
  state: WorkoutDashboardPrimaryHeroState;
  contextLabel?: string | null;
  onPrimaryPress: () => void;
  onSecondaryPress?: () => void;
  disabled?: boolean;
};

export function WorkoutPrimaryHeroCard({ state, contextLabel, onPrimaryPress, onSecondaryPress, disabled = false }: Props) {
  const { c, s, ty, r } = useTokens();

  const tone = {
    accent: {
      border: `${c.primary}66`,
      fill: `${c.primary}14`,
      icon: c.primary,
      chipBg: `${c.primary}16`,
      chipText: c.primary,
    },
    primary: {
      border: `${c.primary}55`,
      fill: `${c.surface2}99`,
      icon: c.primary,
      chipBg: `${c.primary}12`,
      chipText: c.primary,
    },
    success: {
      border: `${c.success}66`,
      fill: `${c.success}12`,
      icon: c.success,
      chipBg: `${c.success}16`,
      chipText: c.success,
    },
  }[state.tone];

  return (
    <GlassCard
      intensity="medium"
      animated
      style={{
        borderRadius: r.xl,
        borderWidth: 1,
        borderColor: tone.border,
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          position: 'absolute',
          top: -48,
          right: -24,
          width: 168,
          height: 168,
          borderRadius: 84,
          backgroundColor: tone.fill,
        }}
      />

      <View style={{ gap: s.md }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: s.md }}>
          <View style={{ flex: 1, gap: s.sm }}>
            <View
              style={{
                alignSelf: 'flex-start',
                paddingHorizontal: s.sm,
                paddingVertical: s.xs,
                borderRadius: r.pill,
                backgroundColor: tone.chipBg,
                borderWidth: 1,
                borderColor: tone.border,
              }}
            >
              <Text
                style={{
                  color: tone.chipText,
                  fontFamily: ty.body.familySemibold,
                  fontSize: ty.sizes.xs,
                  letterSpacing: 1,
                }}
              >
                {state.chipLabel}
              </Text>
            </View>

            <Text
              style={{
                color: c.text,
                fontFamily: ty.heading.familySemibold,
                fontSize: ty.sizes.h3,
                lineHeight: 32,
              }}
            >
              {state.title}
            </Text>

            <Text
              style={{
                color: c.textMuted,
                fontFamily: ty.body.family,
                fontSize: ty.sizes.sm,
                lineHeight: 20,
              }}
            >
              {state.subtitle}
            </Text>

            {contextLabel ? (
              <Text
                style={{
                  color: c.primary,
                  fontFamily: ty.mono.family,
                  fontSize: ty.sizes.xs,
                }}
              >
                {contextLabel}
              </Text>
            ) : null}
          </View>

          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: 26,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: tone.fill,
              borderWidth: 1,
              borderColor: tone.border,
            }}
          >
            <TabBarIcon name={state.icon as any} size={24} color={tone.icon} />
          </View>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: s.sm }}>
          {state.metrics.map((metric) => (
            <View
              key={metric.label}
              style={{
                flexGrow: 1,
                flexBasis: state.metrics.length >= 3 ? '31%' : '48%',
                minWidth: state.metrics.length >= 3 ? 92 : 0,
                borderRadius: r.lg,
                paddingVertical: s.sm,
                paddingHorizontal: s.md,
                backgroundColor: `${c.surface2}bb`,
                borderWidth: 1,
                borderColor: `${c.border}aa`,
              }}
            >
              <Text
                style={{
                  color: c.textMuted,
                  fontFamily: ty.body.familySemibold,
                  fontSize: ty.sizes.xs,
                  letterSpacing: 0.8,
                }}
              >
                {metric.label.toUpperCase()}
              </Text>
              <Text
                style={{
                  color: c.text,
                  fontFamily: ty.body.familySemibold,
                  fontSize: ty.sizes.sm,
                  marginTop: 4,
                }}
              >
                {metric.value}
              </Text>
            </View>
          ))}
        </View>

        {state.progress.totalExercises > 0 && (
          <View
            style={{
              borderRadius: r.lg,
              padding: s.md,
              backgroundColor: `${c.bg}66`,
              borderWidth: 1,
              borderColor: `${c.border}bb`,
              gap: s.xs,
            }}
          >
            <Text
              style={{
                color: c.textMuted,
                fontFamily: ty.body.familySemibold,
                fontSize: ty.sizes.xs,
                letterSpacing: 0.8,
              }}
            >
              SESSION PROGRESS
            </Text>
            <Text
              style={{
                color: c.text,
                fontFamily: ty.heading.familySemibold,
                fontSize: ty.sizes.md,
              }}
            >
              {state.progress.completedExercises}/{state.progress.totalExercises} exercises logged
            </Text>
            {state.progress.currentExerciseName ? (
              <Text
                style={{
                  color: c.textMuted,
                  fontFamily: ty.body.family,
                  fontSize: ty.sizes.sm,
                }}
              >
                Up next: {state.progress.currentExerciseName}
              </Text>
            ) : null}
          </View>
        )}

        <View style={{ flexDirection: 'row', gap: s.sm }}>
          <Pressable
            disabled={disabled}
            onPress={onPrimaryPress}
            style={({ pressed }) => ({
              flex: 1,
              minHeight: 48,
              borderRadius: r.pill,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: tone.icon,
              opacity: disabled ? 0.5 : pressed ? 0.92 : 1,
            })}
          >
            <Text
              style={{
                color: c.bg,
                fontFamily: ty.body.familySemibold,
                fontSize: ty.sizes.sm,
              }}
            >
              {state.primaryLabel}
            </Text>
          </Pressable>

          {state.secondaryLabel && onSecondaryPress ? (
            <Pressable
              disabled={disabled}
              onPress={onSecondaryPress}
              style={({ pressed }) => ({
                paddingHorizontal: s.lg,
                minHeight: 48,
                borderRadius: r.pill,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: tone.border,
                backgroundColor: `${c.bg}55`,
                opacity: disabled ? 0.5 : pressed ? 0.92 : 1,
              })}
            >
              <Text
                style={{
                  color: c.text,
                  fontFamily: ty.body.familySemibold,
                  fontSize: ty.sizes.sm,
                }}
              >
                {state.secondaryLabel}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </GlassCard>
  );
}
