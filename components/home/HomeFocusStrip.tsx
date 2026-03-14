import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTokens } from '../../lib/theme';
import { TabBarIcon } from '../navigation/TabBarIcon';
import { GlassCard } from '../premium/GlassCard';

export type HomeFocusMetric = {
  label: string;
  value: string;
};

type HomeFocusStripProps = {
  title: string;
  subtitle: string;
  icon: string;
  ctaLabel: string;
  onPress: () => void;
  secondaryLabel?: string;
  onSecondaryPress?: () => void;
  metrics?: HomeFocusMetric[];
  eyebrow?: string;
  tone?: 'primary' | 'success' | 'accent';
  delay?: number;
};

export function HomeFocusStrip({
  title,
  subtitle,
  icon,
  ctaLabel,
  onPress,
  secondaryLabel,
  onSecondaryPress,
  metrics = [],
  eyebrow = "TODAY'S FOCUS",
  tone = 'primary',
  delay = 0,
}: HomeFocusStripProps) {
  const { c, s, ty, r } = useTokens();
  const accentColor = tone === 'success' ? c.success : tone === 'accent' ? c.accent : c.primary;

  return (
    <GlassCard intensity="medium" animated delay={delay} glowEffect>
      <View style={styles.header}>
        <View
          style={[
            styles.iconWrap,
            {
              backgroundColor: `${accentColor}18`,
              borderRadius: r.md,
              borderColor: `${accentColor}30`,
            },
          ]}
        >
          <TabBarIcon name={icon as any} color={accentColor} size={20} />
        </View>
        <Text
          style={{
            color: accentColor,
            fontFamily: ty.body.familySemibold,
            fontSize: ty.sizes.xs,
            letterSpacing: 1.3,
            flex: 1,
          }}
        >
          {eyebrow}
        </Text>
      </View>

      <Text
        style={{
          color: c.text,
          fontFamily: ty.heading.familySemibold,
          fontSize: ty.sizes.xl,
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
        {subtitle}
      </Text>

      {metrics.length > 0 ? (
        <View style={[styles.metricsRow, { gap: s.sm, marginTop: s.md }]}>
          {metrics.map((metric) => (
            <View
              key={metric.label}
              style={[
                styles.metricPill,
                {
                  borderRadius: r.pill,
                  borderColor: `${accentColor}22`,
                  backgroundColor: c.surface2,
                },
              ]}
            >
              <Text
                style={{
                  color: c.textSubtle,
                  fontFamily: ty.body.familySemibold,
                  fontSize: 10,
                  letterSpacing: 1,
                }}
              >
                {metric.label}
              </Text>
              <Text
                style={{
                  color: c.text,
                  fontFamily: ty.body.familySemibold,
                  fontSize: ty.sizes.sm,
                  marginTop: 2,
                }}
              >
                {metric.value}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={[styles.actionsRow, { marginTop: s.lg, gap: s.md }]}>
        <Pressable
          onPress={onPress}
          style={({ pressed }) => [
            styles.primaryAction,
            {
              backgroundColor: accentColor,
              borderRadius: r.pill,
              opacity: pressed ? 0.9 : 1,
            },
            Platform.OS === 'web'
              ? ({ boxShadow: `0 0 18px ${accentColor}30` } as any)
              : {
                  shadowColor: accentColor,
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.28,
                  shadowRadius: 16,
                },
          ]}
        >
          <TabBarIcon name="arrow-forward" color={c.bg} size={16} />
          <Text
            style={{
              color: c.bg,
              fontFamily: ty.body.familySemibold,
              fontSize: ty.sizes.sm,
              marginLeft: s.xs,
            }}
          >
            {ctaLabel}
          </Text>
        </Pressable>

        {secondaryLabel && onSecondaryPress ? (
          <Pressable
            onPress={onSecondaryPress}
            style={({ pressed }) => [
              styles.secondaryAction,
              {
                borderRadius: r.pill,
                borderColor: c.border,
                backgroundColor: pressed ? c.surface2 : 'transparent',
              },
            ]}
          >
            <Text
              style={{
                color: c.textMuted,
                fontFamily: ty.body.familySemibold,
                fontSize: ty.sizes.sm,
              }}
            >
              {secondaryLabel}
            </Text>
          </Pressable>
        ) : null}
      </View>
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
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  metricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  metricPill: {
    minWidth: 120,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  primaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  secondaryAction: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
});
