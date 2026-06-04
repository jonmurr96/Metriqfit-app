/**
 * Achievements Screen
 * Displays all user achievements in a filterable grid
 * Premium glassmorphic design with smooth animations
 */

import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import Animated, {
  FadeIn,
  FadeInDown,
  Layout,
} from 'react-native-reanimated';

import { useTokens } from '../lib/theme';
import { PremiumBackground } from '../components/premium/PremiumBackground';
import { GlassCard } from '../components/premium/GlassCard';
import { useUserAchievements, useAchievementStats } from '../hooks/useGamification';
import type { Achievement } from '../types/gamification';
import { PressableScale } from '@/components/common/PressableScale';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_PADDING = 16;
const CARD_GAP = 12;
const NUM_COLUMNS = 3;
const CARD_SIZE = (SCREEN_WIDTH - CARD_PADDING * 2 - CARD_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;

type CategoryFilter = 'all' | 'milestone' | 'streak' | 'consistency' | 'pr' | 'nutrition' | 'transformation' | 'elite';

const CATEGORY_LABELS: Record<CategoryFilter, string> = {
  all: 'All',
  milestone: 'Milestones',
  streak: 'Streaks',
  consistency: 'Consistency',
  pr: 'PRs',
  nutrition: 'Nutrition',
  transformation: 'Body',
  elite: 'Elite',
};

const RARITY_COLORS = {
  common: '#88E6EA',
  rare: '#6B8AFF',
  epic: '#B24BF3',
  legendary: '#FFD700',
};

const RARITY_GLOW = {
  common: 'rgba(136, 230, 234, 0.3)',
  rare: 'rgba(107, 138, 255, 0.4)',
  epic: 'rgba(178, 75, 243, 0.5)',
  legendary: 'rgba(255, 215, 0, 0.6)',
};

export default function AchievementsScreen() {
  const { c, s, ty, r } = useTokens();
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('all');

  const { data: achievements, isLoading } = useUserAchievements();
  const { data: stats } = useAchievementStats();

  const filteredAchievements = useMemo(() => {
    if (!achievements) return [];
    if (selectedCategory === 'all') return achievements;
    return achievements.filter((a) => a.category === selectedCategory);
  }, [achievements, selectedCategory]);

  const unlockedCount = achievements?.filter((a) => a.unlocked_at).length || 0;
  const totalCount = achievements?.length || 0;
  const progressPercent = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

  const categoryFilters: CategoryFilter[] = ['all', 'milestone', 'streak', 'consistency', 'pr', 'nutrition', 'transformation', 'elite'];

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
              Achievements
            </Text>
            <View style={styles.progressRow}>
              <Ionicons name="trophy" size={16} color={c.primary} />
              <Text
                style={{
                  color: c.textMuted,
                  fontFamily: ty.body.familyMedium,
                  fontSize: ty.sizes.sm,
                  marginLeft: s.xs,
                }}
              >
                {unlockedCount} / {totalCount} ({progressPercent}%)
              </Text>
            </View>
          </View>
        </MotiView>

        {/* Stats Overview */}
        {stats && (
          <MotiView
            from={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'timing', duration: 400, delay: 100 }}
            style={[styles.statsContainer, { paddingHorizontal: s.xl, marginBottom: s.lg }]}
          >
            <GlassCard intensity="light">
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text
                    style={{
                      color: c.primary,
                      fontFamily: ty.body.familyBold,
                      fontSize: ty.sizes.xl,
                    }}
                  >
                    {stats.total_xp_from_achievements.toLocaleString()}
                  </Text>
                  <Text
                    style={{
                      color: c.textMuted,
                      fontFamily: ty.body.family,
                      fontSize: ty.sizes.xs,
                      marginTop: s.xs,
                    }}
                  >
                    XP Earned
                  </Text>
                </View>

                <View style={[styles.statDivider, { backgroundColor: c.border }]} />

                <View style={styles.statItem}>
                  <View style={styles.rarityRow}>
                    <View style={[styles.rarityDot, { backgroundColor: RARITY_COLORS.epic }]} />
                    <Text
                      style={{
                        color: c.text,
                        fontFamily: ty.body.familyBold,
                        fontSize: ty.sizes.xl,
                      }}
                    >
                      {stats.epic_count + stats.legendary_count}
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
                    Rare Unlocks
                  </Text>
                </View>

                <View style={[styles.statDivider, { backgroundColor: c.border }]} />

                <View style={styles.statItem}>
                  <Text
                    style={{
                      color: c.text,
                      fontFamily: ty.body.familyBold,
                      fontSize: ty.sizes.xl,
                    }}
                  >
                    {stats.recent_unlocks_7d}
                  </Text>
                  <Text
                    style={{
                      color: c.textMuted,
                      fontFamily: ty.body.family,
                      fontSize: ty.sizes.xs,
                      marginTop: s.xs,
                    }}
                  >
                    This Week
                  </Text>
                </View>
              </View>
            </GlassCard>
          </MotiView>
        )}

        {/* Category Filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.filterScrollContent, { paddingHorizontal: s.xl, gap: s.sm }]}
          style={[styles.filterScroll, { marginBottom: s.lg }]}
        >
          {categoryFilters.map((category, index) => {
            const isSelected = category === selectedCategory;
            const count =
              category === 'all'
                ? totalCount
                : achievements?.filter((a) => a.category === category).length || 0;

            return (
              <MotiView
                key={category}
                from={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'timing', duration: 300, delay: 200 + index * 50 }}
              >
                <PressableScale
                  onPress={() => setSelectedCategory(category)}
                  style={(pressed) => [
                    styles.filterChip,
                    {
                      backgroundColor: isSelected ? c.primary : c.surfaceSubtle,
                      borderRadius: r.pill,
                      borderWidth: 1,
                      borderColor: isSelected ? c.primary : c.border,
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: isSelected ? c.bg : c.text,
                      fontFamily: ty.body.familySemibold,
                      fontSize: ty.sizes.sm,
                    }}
                  >
                    {CATEGORY_LABELS[category]}
                  </Text>
                  {count > 0 && (
                    <View
                      style={[
                        styles.filterBadge,
                        {
                          backgroundColor: isSelected ? `${c.bg}40` : `${c.primary}20`,
                          borderRadius: r.pill,
                          marginLeft: s.xs,
                        },
                      ]}
                    >
                      <Text
                        style={{
                          color: isSelected ? c.bg : c.primary,
                          fontFamily: ty.mono.family,
                          fontSize: 11,
                        }}
                      >
                        {count}
                      </Text>
                    </View>
                  )}
                </PressableScale>
              </MotiView>
            );
          })}
        </ScrollView>

        {/* Achievements Grid */}
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
                Loading achievements...
              </Text>
            </View>
          ) : filteredAchievements.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="trophy-outline" size={64} color={c.textMuted} />
              <Text
                style={{
                  color: c.text,
                  fontFamily: ty.body.familyBold,
                  fontSize: ty.sizes.lg,
                  marginTop: s.lg,
                }}
              >
                No achievements yet
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
                Start completing workouts and logging meals to unlock achievements!
              </Text>
            </View>
          ) : (
            <View style={styles.grid}>
              {filteredAchievements.map((achievement, index) => (
                <AchievementCard
                  key={achievement.id}
                  achievement={achievement}
                  index={index}
                  cardSize={CARD_SIZE}
                />
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </PremiumBackground>
  );
}

type AchievementCardProps = {
  achievement: Achievement;
  index: number;
  cardSize: number;
};

function AchievementCard({ achievement, index, cardSize }: AchievementCardProps) {
  const { c, s, ty, r } = useTokens();
  const isUnlocked = Boolean(achievement.unlocked_at);
  const isHidden = achievement.is_hidden && !isUnlocked;

  const rarityColor = RARITY_COLORS[achievement.rarity];
  const rarityGlow = RARITY_GLOW[achievement.rarity];

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 30)
        .duration(400)
        .springify()
        .damping(15)}
      layout={Layout.springify().damping(15)}
      style={{ width: cardSize }}
    >
      <PressableScale
        style={(pressed) => [
          styles.achievementCard,
          {
            backgroundColor: isUnlocked ? c.surfaceSubtle : `${c.surfaceSubtle}60`,
            borderRadius: r.lg,
            borderWidth: isUnlocked ? 2 : 1,
            borderColor: isUnlocked ? rarityColor : c.border,
            opacity: pressed ? 0.8 : 1,
            shadowColor: isUnlocked ? rarityGlow : 'transparent',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: isUnlocked ? 1 : 0,
            shadowRadius: 12,
          },
        ]}
      >
        {/* Icon */}
        <View
          style={[
            styles.iconContainer,
            {
              backgroundColor: isUnlocked ? `${rarityColor}20` : c.surfaceActive,
              borderRadius: r.full,
            },
          ]}
        >
          <Ionicons
            name={isHidden ? 'help' : (achievement.icon_name as any) || 'trophy'}
            size={32}
            color={isUnlocked ? rarityColor : c.textMuted}
          />
        </View>

        {/* Name */}
        <Text
          numberOfLines={2}
          style={{
            color: isUnlocked ? c.text : c.textMuted,
            fontFamily: ty.body.familyBold,
            fontSize: 11,
            textAlign: 'center',
            marginTop: s.sm,
            lineHeight: 14,
          }}
        >
          {isHidden ? '???' : achievement.name}
        </Text>

        {/* XP Reward */}
        {isUnlocked && (
          <View
            style={[
              styles.xpBadge,
              {
                backgroundColor: `${rarityColor}20`,
                borderRadius: r.pill,
                marginTop: s.xs,
              },
            ]}
          >
            <Text
              style={{
                color: rarityColor,
                fontFamily: ty.mono.family,
                fontSize: 10,
              }}
            >
              +{achievement.xp_reward} XP
            </Text>
          </View>
        )}

        {/* Lock Icon */}
        {!isUnlocked && !isHidden && (
          <View style={styles.lockOverlay}>
            <Ionicons name="lock-closed" size={16} color={c.textMuted} />
          </View>
        )}
      </PressableScale>
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
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  statsContainer: {},
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 40,
  },
  rarityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rarityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  filterScroll: {
    maxHeight: 50,
  },
  filterScrollContent: {
    paddingVertical: 4,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
    justifyContent: 'center',
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CARD_GAP,
  },
  achievementCard: {
    padding: 12,
    alignItems: 'center',
    aspectRatio: 1,
    justifyContent: 'center',
    position: 'relative',
  },
  iconContainer: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  xpBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  lockOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
});
