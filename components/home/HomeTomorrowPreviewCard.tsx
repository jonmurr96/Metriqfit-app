import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { useTokens } from '../../lib/theme';
import { TabBarIcon } from '../navigation/TabBarIcon';
import { GlassCard } from '../premium/GlassCard';
import { PressableScale } from '@/components/common/PressableScale';

type HomeTomorrowPreviewCardProps = {
  title: string;
  subtitle: string;
  icon: string;
  onPress: () => void;
  delay?: number;
};

export function HomeTomorrowPreviewCard({
  title,
  subtitle,
  icon,
  onPress,
  delay = 0,
}: HomeTomorrowPreviewCardProps) {
  const { c, s, ty, r } = useTokens();

  return (
    <GlassCard intensity="light" animated delay={delay}>
      <PressableScale
        onPress={onPress}
        style={(pressed) => [
          styles.row,
          {
            transform: [{ scale: pressed ? 0.99 : 1 }],
          },
        ]}
      >
        <View style={styles.copy}>
          <View style={styles.header}>
            <View
              style={[
                styles.iconWrap,
                {
                  backgroundColor: `${c.primary}16`,
                  borderRadius: r.md,
                  borderColor: `${c.primary}2c`,
                },
              ]}
            >
              <TabBarIcon name={icon as any} color={c.primary} size={18} />
            </View>
            <Text
              style={{
                color: c.primary,
                fontFamily: ty.body.familySemibold,
                fontSize: ty.sizes.xs,
                letterSpacing: 1.2,
              }}
            >
              TOMORROW
            </Text>
          </View>

          <Text
            style={{
              color: c.text,
              fontFamily: ty.heading.familySemibold,
              fontSize: ty.sizes.md,
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
              marginTop: s.xs,
            }}
          >
            {subtitle}
          </Text>
        </View>

        <View
          style={[
            styles.arrowWrap,
            {
              borderRadius: r.pill,
              borderColor: `${c.primary}2c`,
              backgroundColor: Platform.OS === 'web' ? `${c.primary}08` : 'transparent',
            },
          ]}
        >
          <TabBarIcon name="arrow-forward" color={c.primary} size={16} />
        </View>
      </PressableScale>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  copy: {
    flex: 1,
  },
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
  arrowWrap: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});
