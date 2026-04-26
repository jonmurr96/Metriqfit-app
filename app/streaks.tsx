/**
 * Streaks Screen
 * Displays all user streaks with detailed analytics
 * Premium glassmorphic design with calendar visualization
 */

import React, { useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import Animated, {
  FadeInDown,
  Layout,
} from 'react-native-reanimated';

import { useTokens } from '../lib/theme';
import { PremiumBackground } from '../components/premium/PremiumBackground';
import { GlassCard } from '../components/premium/GlassCard';
import { useUserStreaks, useStreakHistory } from '../hooks/useGamification';
import type { UserStreak } from '../types/gamification';

const STREAK_ICONS: Record<string, string> = {
  fitness: 'pulse',
  workout: 'barbell',
  nutrition: 'restaurant',
  hydration: 'water',
  weigh_in: 'scale',
};

const STREAK_LABELS: Record<string, string> = {
  fitness: 'Fitness Master',
  workout: 'Workout',
  nutrition: 'Nutrition',
  hydration: 'Hydration',
  weigh_in: 'Weigh-In',
};

const STREAK_DESCRIPTIONS: Record<string, string> = {
  fitness: 'Complete workouts OR log 3+ meals daily',
  workout: 'Complete scheduled workouts',
  nutrition: 'Log 3+ meals with 500+ calories',
  hydration: 'Hit 80%+ of daily water target',
  weigh_in: 'Log weight once per week',
};

const STREAK_COLORS: Record<string, string> = {
  fitness: '#88E6EA',
  workout: '#FF6B9D',
  nutrition: '#FFD60A',
  hydration: '#64D2FF',
  weigh_in: '#BF5AF2',
};

export default function StreaksScreen() {
  const { c, s, ty, r } = useTokens();
  const router = useRouter();

  const { data: streaks, isLoading } = useUserStreaks();

  const highestStreak = useMemo(() => {
    if (!streaks || streaks.length === 0) return null;
    return streaks.reduce((max, streak) =>
      streak.current_streak > max.current_streak ? streak : max
    );
  }, [streaks]);

  const totalFreezeTokens = streaks?.reduce((sum, s) => sum + s.freeze_tokens, 0) || 0;

  return (
    <PremiumBackground>
      <StatusBar style="light" />
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <MotiView
          from={{ opacity: 0, translateY: -20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 400 }}
          style={[styles.header, { paddingHorizontal: s.xl, paddingBottom: s.lg }]}
        >
          <Pressable
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/(tabs)/home');
              }
            }}
            style={[
              styles.backButton,
              {
                backgroundColor: c.surfaceSubtle,
                borderRadius: r.full,
                borderWidth: 1,
                borderColor: c.border,
              },
            ]}
          >
            <Ionicons name="chevron-back" size={24} color={c.text} />
          </Pressable>

          <View style={styles.headerContent}>
            <Text
              style={{
                color: c.text,
                fontFamily: ty.heading.family,
                fontSize: ty.sizes.h2,
                letterSpacing: -0.5,
              }}
            >
              Streaks
            </Text>
            <View style={styles.subtitleRow}>
              <Ionicons name="flame" size={16} color={c.primary} />
              <Text
                style={{
                  color: c.textMuted,
                  fontFamily: ty.body.familyMedium,
                  fontSize: ty.sizes.sm,
                  marginLeft: s.xs,
                }}
              >
                Build momentum through consistency
              </Text>
            </View>
          </View>
        </MotiView>

        {/* Highest Streak Banner */}
        {highestStreak && highestStreak.current_streak > 0 && (
          <MotiView
            from={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'timing', duration: 400, delay: 100 }}
            style={[styles.bannerContainer, { paddingHorizontal: s.xl, marginBottom: s.xl }]}
          >
            <GlassCard intensity="medium">
              <View style={styles.bannerContent}>
                <View style={styles.bannerIcon}>
                  <Ionicons
                    name="flame"
                    size={48}
                    color={STREAK_COLORS[highestStreak.streak_type]}
                  />
                </View>
                <View style={styles.bannerText}>
                  <Text
                    style={{
                      color: c.textMuted,
                      fontFamily: ty.body.familyMedium,
                      fontSize: ty.sizes.sm,
                      textTransform: 'uppercase',
                      letterSpacing: 1.2,
                    }}
                  >
                    Current Best
                  </Text>
                  <Text
                    style={{
                      color: c.text,
                      fontFamily: ty.heading.family,
                      fontSize: ty.sizes.h1,
                      marginTop: s.xs,
                    }}
                  >
                    {highestStreak.current_streak} Days
                  </Text>
                  <Text
                    style={{
                      color: c.primary,
                      fontFamily: ty.body.familySemibold,
                      fontSize: ty.sizes.md,
                      marginTop: s.xs,
                    }}
                  >
                    {STREAK_LABELS[highestStreak.streak_type]}
                  </Text>
                </View>
              </View>
            </GlassCard>
          </MotiView>
        )}

        {/* Freeze Tokens Summary */}
        <MotiView
          from={{ opacity: 0, translateY: 10 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 400, delay: 200 }}
          style={[styles.freezeTokensContainer, { paddingHorizontal: s.xl, marginBottom: s.lg }]}
        >
          <GlassCard intensity="light">
            <View style={styles.freezeTokensRow}>
              <Ionicons name="snow" size={24} color={c.primary} />
              <View style={styles.freezeTokensText}>
                <Text
                  style={{
                    color: c.text,
                    fontFamily: ty.body.familyBold,
                    fontSize: ty.sizes.md,
                  }}
                >
                  {totalFreezeTokens} Freeze {totalFreezeTokens === 1 ? 'Token' : 'Tokens'}
                </Text>
                <Text
                  style={{
                    color: c.textMuted,
                    fontFamily: ty.body.family,
                    fontSize: ty.sizes.xs,
                    marginTop: 2,
                  }}
                >
                  Use to preserve streaks on rest days
                </Text>
              </View>
              <Ionicons name="information-circle-outline" size={20} color={c.textMuted} />
            </View>
          </GlassCard>
        </MotiView>

        {/* Streaks List */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingHorizontal: s.xl, paddingBottom: 100 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={c.primary} />
              <Text
                style={{
                  color: c.textMuted,
                  fontFamily: ty.body.family,
                  fontSize: ty.sizes.sm,
                  marginTop: s.lg,
                }}
              >
                Loading streaks...
              </Text>
            </View>
          ) : !streaks || streaks.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="flame-outline" size={64} color={c.textMuted} />
              <Text
                style={{
                  color: c.text,
                  fontFamily: ty.body.familyBold,
                  fontSize: ty.sizes.lg,
                  marginTop: s.lg,
                }}
              >
                No streaks yet
              </Text>
              <Text
                style={{
                  color: c.textMuted,
                  fontFamily: ty.body.family,
                  fontSize: ty.sizes.sm,
                  marginTop: s.sm,
                  textAlign: 'center',
                }}
              >
                Start completing workouts and logging meals to build streaks!
              </Text>
            </View>
          ) : (
            <View style={styles.streaksList}>
              {streaks.map((streak, index) => (
                <StreakCard key={streak.id} streak={streak} index={index} />
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </PremiumBackground>
  );
}

type StreakCardProps = {
  streak: UserStreak;
  index: number;
};

function StreakCard({ streak, index }: StreakCardProps) {
  const { c, s, ty, r } = useTokens();

  const streakColor = STREAK_COLORS[streak.streak_type];
  const isActive = streak.current_streak > 0;

  const nextMilestone = useMemo(() => {
    const milestones = [3, 7, 14, 30, 60, 90, 180, 365];
    return milestones.find((m) => m > streak.current_streak) || null;
  }, [streak.current_streak]);

  const daysToMilestone = nextMilestone ? nextMilestone - streak.current_streak : 0;

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 80)
        .duration(400)
        .springify()
        .damping(15)}
      layout={Layout.springify().damping(15)}
    >
      <GlassCard intensity="light" animated delay={300 + index * 80}>
        <View style={styles.streakCardContent}>
          {/* Icon & Title */}
          <View style={styles.streakHeader}>
            <View
              style={[
                styles.streakIconContainer,
                {
                  backgroundColor: `${streakColor}20`,
                  borderRadius: r.md,
                  borderWidth: 1.5,
                  borderColor: isActive ? streakColor : c.border,
                },
              ]}
            >
              <Ionicons
                name={STREAK_ICONS[streak.streak_type] as any}
                size={24}
                color={isActive ? streakColor : c.textMuted}
              />
            </View>

            <View style={styles.streakTitleContainer}>
              <Text
                style={{
                  color: c.text,
                  fontFamily: ty.body.familyBold,
                  fontSize: ty.sizes.md,
                }}
              >
                {STREAK_LABELS[streak.streak_type]}
              </Text>
              <Text
                style={{
                  color: c.textMuted,
                  fontFamily: ty.body.family,
                  fontSize: ty.sizes.xs,
                  marginTop: 2,
                }}
              >
                {STREAK_DESCRIPTIONS[streak.streak_type]}
              </Text>
            </View>
          </View>

          {/* Divider */}
          <View style={[styles.divider, { backgroundColor: c.border, marginVertical: s.md }]} />

          {/* Stats */}
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text
                style={{
                  color: isActive ? streakColor : c.textMuted,
                  fontFamily: ty.heading.family,
                  fontSize: ty.sizes.h2,
                }}
              >
                {streak.current_streak}
              </Text>
              <Text
                style={{
                  color: c.textMuted,
                  fontFamily: ty.body.family,
                  fontSize: ty.sizes.xs,
                  marginTop: s.xs,
                }}
              >
                Current
              </Text>
            </View>

            <View style={styles.statBox}>
              <Text
                style={{
                  color: c.text,
                  fontFamily: ty.heading.family,
                  fontSize: ty.sizes.h2,
                }}
              >
                {streak.longest_streak}
              </Text>
              <Text
                style={{
                  color: c.textMuted,
                  fontFamily: ty.body.family,
                  fontSize: ty.sizes.xs,
                  marginTop: s.xs,
                }}
              >
                Best
              </Text>
            </View>

            <View style={styles.statBox}>
              <View style={styles.freezeTokenBadge}>
                <Ionicons name="snow" size={16} color={c.primary} />
                <Text
                  style={{
                    color: c.primary,
                    fontFamily: ty.body.familyBold,
                    fontSize: ty.sizes.lg,
                    marginLeft: s.xs,
                  }}
                >
                  {streak.freeze_tokens}
                </Text>
              </View>
              <Text
                style={{
                  color: c.textMuted,
                  fontFamily: ty.body.family,
                  fontSize: ty.sizes.xs,
                  marginTop: s.xs,
                }}
              >
                Freezes
              </Text>
            </View>
          </View>

          {/* Next Milestone */}
          {isActive && nextMilestone && (
            <View
              style={[
                styles.milestoneBar,
                {
                  backgroundColor: `${streakColor}10`,
                  borderRadius: r.md,
                  marginTop: s.md,
                },
              ]}
            >
              <Ionicons name="flag" size={14} color={streakColor} />
              <Text
                style={{
                  color: c.text,
                  fontFamily: ty.body.familyMedium,
                  fontSize: ty.sizes.xs,
                  marginLeft: s.sm,
                }}
              >
                {daysToMilestone} {daysToMilestone === 1 ? 'day' : 'days'} to {nextMilestone}-day milestone
              </Text>
            </View>
          )}

          {!isActive && (
            <View
              style={[
                styles.inactiveBar,
                {
                  backgroundColor: c.surfaceActive,
                  borderRadius: r.md,
                  marginTop: s.md,
                },
              ]}
            >
              <Ionicons name="alert-circle-outline" size={14} color={c.textMuted} />
              <Text
                style={{
                  color: c.textMuted,
                  fontFamily: ty.body.family,
                  fontSize: ty.sizes.xs,
                  marginLeft: s.sm,
                }}
              >
                Start a new streak today!
              </Text>
            </View>
          )}
        </View>
      </GlassCard>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    flex: 1,
    marginLeft: 12,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  bannerContainer: {},
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bannerIcon: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerText: {
    flex: 1,
    marginLeft: 16,
  },
  freezeTokensContainer: {},
  freezeTokensRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  freezeTokensText: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  streaksList: {
    gap: 16,
  },
  streakCardContent: {},
  streakHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  streakIconContainer: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakTitleContainer: {
    flex: 1,
    marginLeft: 12,
  },
  divider: {
    height: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  freezeTokenBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  milestoneBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  inactiveBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
});
