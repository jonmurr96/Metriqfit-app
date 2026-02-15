import React from 'react';
import { Text, View } from 'react-native';

import { GlassCard } from '../../premium/GlassCard';
import { TabBarIcon } from '../../navigation/TabBarIcon';
import { useTokens } from '../../../lib/theme';

export type WorkoutInsight = {
  title: string;
  tip: string;
  icon: string;
};

type Props = {
  insight: WorkoutInsight;
};

export function WorkoutInsightCard({ insight }: Props) {
  const { c, s, ty, r } = useTokens();

  return (
    <View>
      <Text
        style={{
          color: c.textMuted,
          fontFamily: ty.body.familySemibold,
          fontSize: ty.sizes.sm,
          letterSpacing: 1.3,
          marginBottom: s.sm,
        }}
      >
        DAILY INSIGHT
      </Text>
      <GlassCard intensity="medium" animated>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: s.md }}>
          <View
            style={{
              width: 34,
              height: 34,
              borderRadius: r.md,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: `${c.primary}66`,
              backgroundColor: `${c.primary}18`,
            }}
          >
            <TabBarIcon name={insight.icon as any} color={c.primary} size={18} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.md }}>
              {insight.title}
            </Text>
            <Text
              style={{
                marginTop: s.xs,
                color: c.textMuted,
                fontFamily: ty.body.family,
                fontSize: ty.sizes.sm,
                lineHeight: 20,
              }}
            >
              {insight.tip}
            </Text>
          </View>
        </View>
      </GlassCard>
    </View>
  );
}
