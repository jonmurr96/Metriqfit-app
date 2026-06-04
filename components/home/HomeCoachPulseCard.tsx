import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { useTokens } from '../../lib/theme';
import { TabBarIcon } from '../navigation/TabBarIcon';
import { GlassCard } from '../premium/GlassCard';
import { PressableScale } from '@/components/common/PressableScale';

type HomeCoachPulseCardProps = {
  title: string;
  message: string;
  icon: string;
  ctaLabel: string;
  onPress: () => void;
  delay?: number;
};

export function HomeCoachPulseCard({
  title,
  message,
  icon,
  ctaLabel,
  onPress,
  delay = 0,
}: HomeCoachPulseCardProps) {
  const { c, s, ty, r } = useTokens();

  return (
    <GlassCard intensity="light" animated delay={delay}>
      <View style={styles.header}>
        <View
          style={[
            styles.iconWrap,
            {
              backgroundColor: `${c.accent}16`,
              borderRadius: r.md,
              borderColor: `${c.accent}30`,
            },
          ]}
        >
          <TabBarIcon name={icon as any} color={c.accent} size={18} />
        </View>
        <Text
          style={{
            color: c.accent,
            fontFamily: ty.body.familySemibold,
            fontSize: ty.sizes.xs,
            letterSpacing: 1.3,
          }}
        >
          COACH PULSE
        </Text>
      </View>

      <Text
        style={{
          color: c.text,
          fontFamily: ty.heading.familySemibold,
          fontSize: ty.sizes.lg,
          marginTop: s.md,
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          color: c.textMuted,
          fontFamily: ty.body.family,
          fontSize: ty.sizes.sm,
          lineHeight: 20,
          marginTop: s.sm,
        }}
      >
        {message}
      </Text>

      <PressableScale
        onPress={onPress}
        style={(pressed) => [
          styles.cta,
          {
            marginTop: s.lg,
            borderRadius: r.pill,
            borderColor: `${c.accent}36`,
            backgroundColor: pressed ? `${c.accent}12` : 'transparent',
          },
          Platform.OS === 'web'
            ? ({ boxShadow: `0 0 16px ${c.accent}18` } as any)
            : null,
        ]}
      >
        <Text
          style={{
            color: c.accent,
            fontFamily: ty.body.familySemibold,
            fontSize: ty.sizes.sm,
          }}
        >
          {ctaLabel}
        </Text>
        <TabBarIcon name="arrow-forward" color={c.accent} size={15} />
      </PressableScale>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconWrap: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
});
