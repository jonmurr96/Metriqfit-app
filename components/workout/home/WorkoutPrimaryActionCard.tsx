import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { GlassCard } from '../../premium/GlassCard';
import { TabBarIcon } from '../../navigation/TabBarIcon';
import { useTokens } from '../../../lib/theme';
import type { WorkoutDashboardPrimaryCardState } from '../../../lib/workout/dashboard-state';

type Props = {
  state: WorkoutDashboardPrimaryCardState;
  onPress: () => void;
  disabled?: boolean;
};

export function WorkoutPrimaryActionCard({ state, onPress, disabled = false }: Props) {
  const { c, s, ty, r } = useTokens();

  const tone = {
    accent: {
      border: `${c.primary}66`,
      fill: `${c.primary}14`,
      icon: c.primary,
    },
    primary: {
      border: `${c.primary}52`,
      fill: `${c.primary}14`,
      icon: c.primary,
    },
    success: {
      border: `${c.success}60`,
      fill: `${c.success}14`,
      icon: c.success,
    },
  }[state.tone];

  return (
    <Pressable disabled={disabled} onPress={onPress}>
      {({ pressed }) => (
        <GlassCard
          intensity="medium"
          animated
          style={{
            minHeight: 148,
            borderRadius: r.xl,
            borderWidth: 1,
            borderColor: tone.border,
            transform: [{ scale: pressed ? 0.992 : 1 }],
          }}
        >
          <View
            style={{
              position: 'absolute',
              top: -56,
              right: -18,
              width: 176,
              height: 176,
              borderRadius: 88,
              backgroundColor: tone.fill,
            }}
          />

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: s.md, flex: 1 }}>
            <View style={{ flex: 1, gap: s.xs }}>
              <Text
                style={{
                  color: c.primary,
                  fontFamily: ty.body.familySemibold,
                  fontSize: ty.sizes.xs,
                  letterSpacing: 1.1,
                }}
              >
                {state.actionLabel.toUpperCase()}
              </Text>

              <Text
                style={{
                  color: c.text,
                  fontFamily: ty.heading.familySemibold,
                  fontSize: ty.sizes.h2,
                  lineHeight: 44,
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

              <Text
                style={{
                  color: c.textMuted,
                  fontFamily: ty.body.familySemibold,
                  fontSize: ty.sizes.xs,
                  letterSpacing: 0.8,
                  marginTop: s.sm,
                }}
              >
                {state.meta}
              </Text>
            </View>

            <View
              style={{
                width: 76,
                height: 76,
                borderRadius: 38,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 2,
                borderColor: tone.icon,
                backgroundColor: `${tone.icon}14`,
              }}
            >
              <TabBarIcon name={state.actionIcon as any} color={tone.icon} size={30} />
            </View>
          </View>
        </GlassCard>
      )}
    </Pressable>
  );
}
