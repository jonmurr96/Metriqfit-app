import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { MotiView } from 'moti';
import { useTokens } from '../../lib/theme';
import { TabBarIcon } from '../../components/navigation/TabBarIcon';
import { GlassCard } from '../../components/premium/GlassCard';

interface PRHighlightCardProps {
  exercise?: string;
  value?: number;
  unit?: string;
  previousBest?: number;
  improvement?: number;
  date?: string;
  isNew?: boolean;
}

/**
 * PR highlight card with unified glass + ring design system.
 */
export function PRHighlightCard({
  exercise = 'Bench Press (1 Rep Max)',
  value = 225,
  unit = 'lbs',
  previousBest = 215,
  improvement = 4.6,
  date = '2 days ago',
  isNew = true,
}: PRHighlightCardProps) {
  const { c, s, ty, r } = useTokens();

  return (
    <GlassCard glowEffect animated delay={400}>
      <View style={styles.header}>
        {isNew && (
          // Ring badge style
          <View
            style={[
              styles.badge,
              {
                backgroundColor: 'transparent',
                borderWidth: 2,
                borderColor: c.warning,
              },
              Platform.OS === 'web' && {
                boxShadow: `0 0 12px ${c.warning}40`,
              } as any,
            ]}
          >
            <TabBarIcon name="trophy" color={c.warning} size={12} />
            <Text
              style={[
                styles.badgeText,
                {
                  color: c.warning,
                  fontFamily: ty.body.familySemibold,
                  fontSize: 10,
                },
              ]}
            >
              NEW PR
            </Text>
          </View>
        )}
        <Text
          style={[
            styles.date,
            {
              color: c.textMuted,
              fontFamily: ty.body.family,
              fontSize: ty.sizes.xs,
            },
          ]}
        >
          {date}
        </Text>
      </View>

      <View style={styles.mainContent}>
        <View style={styles.valueRow}>
          <Text
            style={[
              styles.mainValue,
              {
                color: c.text,
                fontFamily: ty.mono.family,
                fontSize: 48,
              },
            ]}
          >
            {value}
          </Text>
          <Text
            style={[
              styles.unit,
              {
                color: c.textMuted,
                fontFamily: ty.body.familySemibold,
                fontSize: ty.sizes.xl,
              },
            ]}
          >
            {unit}
          </Text>
        </View>
        <Text
          style={[
            styles.exercise,
            {
              color: c.primary,
              fontFamily: ty.body.familySemibold,
              fontSize: ty.sizes.sm,
            },
          ]}
        >
          {exercise.toUpperCase()}
        </Text>
      </View>

      <View style={[styles.divider, { backgroundColor: `${c.primary}30` }]} />

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text
            style={[
              styles.statLabel,
              {
                color: c.textMuted,
                fontFamily: ty.body.familySemibold,
                fontSize: 10,
              },
            ]}
          >
            PREVIOUS BEST
          </Text>
          <Text
            style={[
              styles.statValue,
              {
                color: c.text,
                fontFamily: ty.mono.family,
                fontSize: ty.sizes.lg,
              },
            ]}
          >
            {previousBest} {unit}
          </Text>
        </View>
        <View style={[styles.stat, { alignItems: 'flex-end' }]}>
          <Text
            style={[
              styles.statLabel,
              {
                color: c.textMuted,
                fontFamily: ty.body.familySemibold,
                fontSize: 10,
              },
            ]}
          >
            IMPROVEMENT
          </Text>
          <View style={styles.improvementRow}>
            <Text
              style={[
                styles.statValue,
                {
                  color: c.success,
                  fontFamily: ty.mono.family,
                  fontSize: ty.sizes.lg,
                },
              ]}
            >
              +{improvement}%
            </Text>
            {/* Ring icon */}
            <View
              style={[
                styles.trendIcon,
                {
                  borderWidth: 2,
                  borderColor: c.success,
                  borderRadius: 12,
                },
              ]}
            >
              <TabBarIcon name="trending-up" color={c.success} size={14} />
            </View>
          </View>
        </View>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeText: {
    letterSpacing: 0.5,
  },
  date: {},
  mainContent: {
    marginTop: 20,
    marginBottom: 16,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  mainValue: {
    letterSpacing: -2,
  },
  unit: {},
  exercise: {
    letterSpacing: 1,
    marginTop: 4,
  },
  divider: {
    height: 1,
    marginVertical: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stat: {},
  statLabel: {
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  statValue: {},
  improvementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trendIcon: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
