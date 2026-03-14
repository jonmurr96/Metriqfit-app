import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTokens } from '../../lib/theme';
import { TabBarIcon } from '../navigation/TabBarIcon';
import { GlassCard } from '../premium/GlassCard';

export type HomeMomentumItem = {
  label: string;
  value: string;
  detail: string;
  icon: string;
  tone?: 'primary' | 'success' | 'accent';
};

type HomeWeeklyMomentumCardProps = {
  summary: string;
  items: HomeMomentumItem[];
  delay?: number;
};

export function HomeWeeklyMomentumCard({
  summary,
  items,
  delay = 0,
}: HomeWeeklyMomentumCardProps) {
  const { c, s, ty, r } = useTokens();

  const getToneColor = (tone: HomeMomentumItem['tone']) => {
    if (tone === 'success') return c.success;
    if (tone === 'accent') return c.accent;
    return c.primary;
  };

  return (
    <GlassCard intensity="light" animated delay={delay}>
      <Text
        style={{
          color: c.text,
          fontFamily: ty.heading.familySemibold,
          fontSize: ty.sizes.lg,
        }}
      >
        Weekly Momentum
      </Text>
      <Text
        style={{
          color: c.textMuted,
          fontFamily: ty.body.family,
          fontSize: ty.sizes.sm,
          lineHeight: 20,
          marginTop: s.xs,
        }}
      >
        {summary}
      </Text>

      <View style={[styles.grid, { gap: s.sm, marginTop: s.lg }]}>
        {items.map((item) => {
          const accentColor = getToneColor(item.tone);

          return (
            <View
              key={item.label}
              style={[
                styles.tile,
                {
                  backgroundColor: c.surface2,
                  borderRadius: r.lg,
                  borderColor: `${accentColor}22`,
                },
              ]}
            >
              <View
                style={[
                  styles.tileIcon,
                  {
                    backgroundColor: `${accentColor}18`,
                    borderRadius: r.md,
                  },
                ]}
              >
                <TabBarIcon name={item.icon as any} color={accentColor} size={16} />
              </View>
              <Text
                style={{
                  color: c.textSubtle,
                  fontFamily: ty.body.familySemibold,
                  fontSize: ty.sizes.xs,
                  letterSpacing: 1.1,
                  marginTop: s.md,
                }}
              >
                {item.label}
              </Text>
              <Text
                style={{
                  color: c.text,
                  fontFamily: ty.heading.familySemibold,
                  fontSize: ty.sizes.xl,
                  marginTop: s.xs,
                }}
              >
                {item.value}
              </Text>
              <Text
                style={{
                  color: c.textMuted,
                  fontFamily: ty.body.family,
                  fontSize: ty.sizes.xs,
                  marginTop: s.xs,
                }}
              >
                {item.detail}
              </Text>
            </View>
          );
        })}
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tile: {
    flexBasis: '31%',
    flexGrow: 1,
    minWidth: 96,
    borderWidth: 1,
    padding: 14,
  },
  tileIcon: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
