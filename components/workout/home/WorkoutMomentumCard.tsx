import React from 'react';
import { Text, View } from 'react-native';

import { GlassCard } from '../../premium/GlassCard';
import { TabBarIcon } from '../../navigation/TabBarIcon';
import { useTokens } from '../../../lib/theme';
import type { WorkoutMomentumState } from '../../../lib/workout/dashboard-state';

type Props = {
  state: WorkoutMomentumState;
};

export function WorkoutMomentumCard({ state }: Props) {
  const { c, s, ty, r } = useTokens();

  return (
    <GlassCard
      intensity="light"
      animated
      style={{
        borderRadius: r.xl,
        borderWidth: 1,
        borderColor: `${c.primary}24`,
      }}
    >
      <View style={{ gap: s.md }}>
        <View style={{ gap: 4 }}>
          <Text
            style={{
              color: c.textMuted,
              fontFamily: ty.body.familySemibold,
              fontSize: ty.sizes.xs,
              letterSpacing: 1,
            }}
          >
            WEEKLY MOMENTUM
          </Text>
          <Text
            style={{
              color: c.text,
              fontFamily: ty.heading.familySemibold,
              fontSize: ty.sizes.lg,
            }}
          >
            Recent wins
          </Text>
          <Text
            style={{
              color: c.textMuted,
              fontFamily: ty.body.family,
              fontSize: ty.sizes.sm,
              lineHeight: 20,
            }}
          >
            {state.summary}
          </Text>
        </View>

        <View style={{ gap: s.sm }}>
          {state.items.map((item) => (
            <View
              key={item.label}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: s.md,
                borderRadius: r.lg,
                padding: s.md,
                backgroundColor: `${c.surface2}bb`,
                borderWidth: 1,
                borderColor: `${c.border}aa`,
              }}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor:
                    item.tone === 'success'
                      ? `${c.success}16`
                      : item.tone === 'primary'
                        ? `${c.primary}16`
                        : `${c.textMuted}16`,
                }}
              >
                <TabBarIcon
                  name={item.icon as any}
                  color={item.tone === 'success' ? c.success : item.tone === 'primary' ? c.primary : c.textMuted}
                  size={18}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: c.textMuted,
                    fontFamily: ty.body.familySemibold,
                    fontSize: ty.sizes.xs,
                    letterSpacing: 0.8,
                  }}
                >
                  {item.label.toUpperCase()}
                </Text>
                <Text
                  style={{
                    color: c.text,
                    fontFamily: ty.heading.familySemibold,
                    fontSize: ty.sizes.md,
                    marginTop: 2,
                  }}
                >
                  {item.value}
                </Text>
              </View>

              <Text
                style={{
                  color: c.textMuted,
                  fontFamily: ty.body.family,
                  fontSize: ty.sizes.sm,
                  flexShrink: 1,
                  textAlign: 'right',
                }}
              >
                {item.detail}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </GlassCard>
  );
}
