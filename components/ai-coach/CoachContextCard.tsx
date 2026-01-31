import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { MotiView } from 'moti';
import { useTokens } from '../../lib/theme';
import { TabBarIcon } from '../../components/navigation/TabBarIcon';
import { GlassCard } from '../../components/premium/GlassCard';

interface ContextStat {
  label: string;
  value: string | number;
  unit?: string;
}

interface CoachContextCardProps {
  caloriesRemaining?: number;
  proteinRemaining?: number;
  workoutsThisWeek?: number;
  isOnboarded?: boolean;
}

/**
 * Coach context card with unified ring + glass design.
 */
export function CoachContextCard({
  caloriesRemaining = 847,
  proteinRemaining = 42,
  workoutsThisWeek = 3,
  isOnboarded = true,
}: CoachContextCardProps) {
  const { c, s, ty, r } = useTokens();

  const stats: ContextStat[] = [
    { label: 'Calories Left', value: caloriesRemaining, unit: 'kcal' },
    { label: 'Protein Left', value: proteinRemaining, unit: 'g' },
    { label: 'Workouts', value: workoutsThisWeek, unit: '/wk' },
  ];

  if (!isOnboarded) {
    return (
      <GlassCard glowEffect animated delay={100}>
        <View style={styles.notOnboardedContent}>
          {/* Ring icon */}
          <View
            style={[
              styles.iconContainer,
              {
                borderWidth: 2,
                borderColor: c.primary,
                backgroundColor: 'transparent',
              },
            ]}
          >
            <TabBarIcon name="sparkles" color={c.primary} size={28} />
          </View>
          <View style={styles.textContainer}>
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
              Complete Your Profile
            </Text>
            <Text
              style={[
                styles.subtitle,
                {
                  color: c.textMuted,
                  fontFamily: ty.body.family,
                  fontSize: ty.sizes.sm,
                  marginTop: s.xs,
                  lineHeight: 20,
                },
              ]}
            >
              Set up your goals so I can give personalized advice.
            </Text>
          </View>
        </View>
      </GlassCard>
    );
  }

  return (
    <GlassCard glowEffect animated delay={100}>
      <View style={styles.header}>
        {/* Ring icon container */}
        <View
          style={[
            styles.iconContainer,
            {
              borderWidth: 2,
              borderColor: c.primary,
              backgroundColor: 'transparent',
            },
            Platform.OS === 'web' && {
              boxShadow: `0 0 12px ${c.primary}40`,
            } as any,
          ]}
        >
          <MotiView
            from={{ rotate: '0deg' }}
            animate={{ rotate: '360deg' }}
            transition={{
              type: 'timing' as const,
              duration: 20000,
              loop: true,
            } as any}
          >
            <TabBarIcon name="sparkles" color={c.primary} size={22} />
          </MotiView>
        </View>
        <View style={styles.headerText}>
          <Text
            style={{
              color: c.text,
              fontFamily: ty.heading.familySemibold,
              fontSize: ty.sizes.lg,
            }}
          >
            Your Context
          </Text>
          <Text
            style={{
              color: c.textMuted,
              fontFamily: ty.body.family,
              fontSize: ty.sizes.xs,
              marginTop: 2,
            }}
          >
            Data grounding my responses
          </Text>
        </View>
        {/* Ring LIVE badge */}
        <View
          style={[
            styles.liveBadge,
            {
              backgroundColor: 'transparent',
              borderWidth: 2,
              borderColor: c.success,
            },
          ]}
        >
          <View style={[styles.liveDot, { backgroundColor: c.success }]} />
          <Text
            style={{
              color: c.success,
              fontFamily: ty.body.familySemibold,
              fontSize: 10,
              letterSpacing: 0.5,
            }}
          >
            LIVE
          </Text>
        </View>
      </View>

      <View style={[styles.statsRow, { marginTop: s.lg }]}>
        {stats.map((stat, index) => (
          <MotiView
            key={stat.label}
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing' as const, duration: 300, delay: 200 + index * 100 } as any}
            style={styles.statItem}
          >
            <Text
              style={{
                color: c.text,
                fontFamily: ty.mono.family,
                fontSize: ty.sizes.xl,
              }}
            >
              {stat.value}
              {stat.unit && (
                <Text
                  style={{
                    color: c.textMuted,
                    fontFamily: ty.body.family,
                    fontSize: ty.sizes.xs,
                  }}
                >
                  {' '}{stat.unit}
                </Text>
              )}
            </Text>
            <Text
              style={{
                color: c.textMuted,
                fontFamily: ty.body.family,
                fontSize: ty.sizes.xs,
                marginTop: 2,
              }}
            >
              {stat.label}
            </Text>
          </MotiView>
        ))}
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    marginLeft: 12,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  notOnboardedContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
    marginLeft: 14,
  },
  title: {},
  subtitle: {},
});
