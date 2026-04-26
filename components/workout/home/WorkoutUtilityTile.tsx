import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { GlassCard } from '../../premium/GlassCard';
import { TabBarIcon } from '../../navigation/TabBarIcon';
import { useTokens } from '../../../lib/theme';
import type { WorkoutDashboardUtilityTileState } from '../../../lib/workout/dashboard-state';

type Props = {
  state: WorkoutDashboardUtilityTileState;
  onPress: () => void;
};

export function WorkoutUtilityTile({ state, onPress }: Props) {
  const { c, s, ty, r } = useTokens();

  return (
    <Pressable style={{ flex: 1 }} onPress={onPress}>
      {({ pressed }) => (
        <GlassCard
          intensity="light"
          animated
          style={{
            minHeight: 118,
            borderRadius: r.xl,
            borderWidth: 1,
            borderColor: pressed ? `${c.primary}6a` : `${c.primary}36`,
            transform: [{ scale: pressed ? 0.99 : 1 }],
          }}
        >
          <View style={{ gap: s.md, flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: s.sm }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: `${c.primary}14`,
                  borderWidth: 1,
                  borderColor: `${c.primary}44`,
                }}
              >
                <TabBarIcon name={state.icon as any} color={c.primary} size={18} />
              </View>

              <View style={{ flex: 1, minWidth: 0 }}>
                <Text
                  style={{
                    color: c.text,
                    fontFamily: ty.body.familySemibold,
                    fontSize: ty.sizes.md,
                  }}
                >
                  {state.title}
                </Text>
              </View>

              {state.badgeLabel ? (
                <View
                  style={{
                    minWidth: 24,
                    height: 24,
                    borderRadius: 12,
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingHorizontal: s.xs,
                    backgroundColor: `${c.primary}18`,
                    borderWidth: 1,
                    borderColor: `${c.primary}4f`,
                  }}
                >
                  <Text
                    style={{
                      color: c.primary,
                      fontFamily: ty.body.familySemibold,
                      fontSize: ty.sizes.xs,
                    }}
                  >
                    {state.badgeLabel}
                  </Text>
                </View>
              ) : null}
            </View>

            <Text
              style={{
                color: c.textMuted,
                fontFamily: ty.body.family,
                fontSize: ty.sizes.sm,
                lineHeight: 19,
              }}
              numberOfLines={2}
            >
              {state.subtitle}
            </Text>
          </View>
        </GlassCard>
      )}
    </Pressable>
  );
}
