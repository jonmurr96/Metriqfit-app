import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { MotiView } from 'moti';
import { useTokens } from '../../lib/theme';
import { TabBarIcon } from '../../components/navigation/TabBarIcon';
import { GlassCard } from '../../components/premium/GlassCard';

interface GoalForecastCardProps {
  startWeight?: number;
  currentWeight?: number;
  goalWeight?: number;
  targetDate?: string;
  onViewProjection?: () => void;
}

/**
 * Goal forecast card with unified glass + ring design system.
 */
export function GoalForecastCard({
  startWeight = 210,
  currentWeight = 188,
  goalWeight = 180,
  targetDate = 'Feb 15',
  onViewProjection,
}: GoalForecastCardProps) {
  const { c, s, ty, r } = useTokens();

  const totalToLose = startWeight - goalWeight;
  const lostSoFar = startWeight - currentWeight;
  const progressPercent = Math.min((lostSoFar / totalToLose) * 100, 100);

  const isLosingWeight = goalWeight < startWeight;
  const trendIcon = isLosingWeight ? 'trending-down' : 'trending-up';

  return (
    <GlassCard glowEffect animated delay={100}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text
            style={[
              styles.title,
              {
                color: c.text,
                fontFamily: ty.heading.familySemibold,
                fontSize: ty.sizes.lg,
              },
            ]}
          >
            Goal Forecast
          </Text>
          <Text
            style={[
              styles.subtitle,
              {
                color: c.textMuted,
                fontFamily: ty.body.family,
                fontSize: ty.sizes.sm,
              },
            ]}
          >
            On track to hit {goalWeight}lbs by{' '}
            <Text style={{ color: c.primary, fontFamily: ty.body.familySemibold }}>
              {targetDate}
            </Text>
          </Text>
        </View>
        {/* Ring icon container - NOT filled background */}
        <View
          style={[
            styles.iconWrapper,
            {
              borderWidth: 2,
              borderColor: c.primary,
              backgroundColor: 'transparent',
            },
          ]}
        >
          <TabBarIcon name={trendIcon} color={c.primary} size={22} />
        </View>
      </View>

      <View style={styles.progressSection}>
        <View
          style={[
            styles.progressTrack,
            { backgroundColor: `${c.primary}15` },
          ]}
        >
          <MotiView
            from={{ width: '0%' }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ type: 'timing', duration: 800, delay: 300 }}
            style={[
              styles.progressFill,
              {
                backgroundColor: c.primary,
                shadowColor: c.primary,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.8,
                shadowRadius: 8,
              },
              Platform.OS === 'web' && {
                boxShadow: `0 0 12px ${c.primary}80`,
              } as any,
            ]}
          />
        </View>

        <View style={styles.progressLabels}>
          <Text style={[styles.label, { color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.xs }]}>
            Start: {startWeight} lbs
          </Text>
          <Text style={[styles.label, { color: c.primary, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs }]}>
            Current: {currentWeight} lbs
          </Text>
          <Text style={[styles.label, { color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.xs }]}>
            Goal: {goalWeight} lbs
          </Text>
        </View>
      </View>

      {/* Glow CTA button */}
      <Pressable
        style={({ pressed }) => [
          styles.ctaButton,
          {
            backgroundColor: c.primary,
            borderRadius: r.md,
            transform: [{ scale: pressed ? 0.98 : 1 }],
            shadowColor: c.primary,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.4,
            shadowRadius: 12,
          },
          Platform.OS === 'web' && {
            boxShadow: `0 4px 20px ${c.primary}50, 0 0 30px ${c.primary}30`,
          } as any,
        ]}
        onPress={onViewProjection}
      >
        <Text
          style={[
            styles.ctaText,
            {
              color: c.bg,
              fontFamily: ty.body.familySemibold,
              fontSize: ty.sizes.sm,
            },
          ]}
        >
          View Full Projection
        </Text>
      </Pressable>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerLeft: {
    flex: 1,
    gap: 4,
  },
  title: {},
  subtitle: {
    marginTop: 2,
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressSection: {
    marginBottom: 16,
  },
  progressTrack: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {},
  ctaButton: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  ctaText: {},
});
