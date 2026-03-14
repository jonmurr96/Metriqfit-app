import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { GlassCard } from '../../premium/GlassCard';
import { TabBarIcon } from '../../navigation/TabBarIcon';
import { useTokens } from '../../../lib/theme';
import type { WorkoutTomorrowPreviewState } from '../../../lib/workout/dashboard-state';

type Props = {
  state: WorkoutTomorrowPreviewState;
  onPress: () => void;
};

export function WorkoutTomorrowPreviewCard({ state, onPress }: Props) {
  const { c, s, ty, r } = useTokens();

  return (
    <Pressable onPress={onPress}>
      {({ pressed }) => (
        <GlassCard
          intensity="light"
          animated
          style={{
            borderRadius: r.xl,
            borderWidth: 1,
            borderColor: `${c.primary}33`,
            transform: [{ scale: pressed ? 0.99 : 1 }],
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: s.md }}>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: `${c.primary}14`,
                borderWidth: 1,
                borderColor: `${c.primary}44`,
              }}
            >
              <TabBarIcon name={state.icon as any} color={c.primary} size={20} />
            </View>

            <View style={{ flex: 1, gap: 4 }}>
              <Text
                style={{
                  color: c.textMuted,
                  fontFamily: ty.body.familySemibold,
                  fontSize: ty.sizes.xs,
                  letterSpacing: 1.1,
                }}
              >
                TOMORROW
              </Text>
              <Text
                style={{
                  color: c.text,
                  fontFamily: ty.heading.familySemibold,
                  fontSize: ty.sizes.md,
                }}
              >
                {state.title}
              </Text>
              <Text
                style={{
                  color: c.textMuted,
                  fontFamily: ty.body.family,
                  fontSize: ty.sizes.sm,
                  lineHeight: 19,
                }}
              >
                {state.subtitle}
              </Text>
            </View>

            <TabBarIcon name="chevron-forward" color={c.textMuted} size={18} />
          </View>
        </GlassCard>
      )}
    </Pressable>
  );
}
