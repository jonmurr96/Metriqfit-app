/**
 * Level Progress Screen
 * Displays full 30-level progression ladder with tier visualization
 * Premium glassmorphic design with smooth animations
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
  FadeInUp,
  Layout,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withDelay,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

import { useTokens } from '../lib/theme';
import { PremiumBackground } from '../components/premium/PremiumBackground';
import { GlassCard } from '../components/premium/GlassCard';
import { useUserLevel } from '../hooks/useGamification';
import {
  getLevelInfo,
  getProgressPercentage,
  LEVEL_THRESHOLDS,
  getLevelName,
  getLevelDescription,
  getTierName,
} from '../lib/gamification/levels';

// Build level progression array from helper functions
const LEVEL_PROGRESSION = Array.from({ length: 30 }, (_, i) => {
  const level = i + 1;
  const tierName = getTierName(level).toUpperCase();
  return {
    level,
    level_name: getLevelName(level),
    description: getLevelDescription(level),
    xp_threshold: LEVEL_THRESHOLDS[i] ?? 0,
    tier_name: tierName,
  };
});

const TIER_COLORS: Record<string, string> = {
  ROOKIE: '#64D2FF',
  BUILDER: '#FFD60A',
  ATHLETE: '#FF6B9D',
  ELITE: '#88E6EA',
  LEGEND: '#BF5AF2',
  MASTER: '#FFD700',
};

export default function LevelProgressScreen() {
  const { c, s, ty, r, gradients, shadow } = useTokens();
  const router = useRouter();

  const { data: userXPLevel, isLoading } = useUserLevel();

  // Derive full level info from the UserXPLevel record
  const userLevel = useMemo(() => {
    if (!userXPLevel) return null;
    const info = getLevelInfo(userXPLevel.current_level);
    const progressPct = getProgressPercentage(userXPLevel.current_xp, userXPLevel.current_level);
    const xpToNext = info.xp_for_next_level - (LEVEL_THRESHOLDS[userXPLevel.current_level - 1] ?? 0);
    return {
      ...info,
      current_xp: userXPLevel.current_xp,
      total_xp_earned: userXPLevel.total_xp_earned,
      progress_percentage: progressPct,
      xp_to_next_level: xpToNext,
      tier_name_upper: info.tier_name.toUpperCase(),
    };
  }, [userXPLevel]);

  const currentLevelIndex = userXPLevel ? userXPLevel.current_level - 1 : 0;

  const progressWidth = useSharedValue(0);

  React.useEffect(() => {
    if (userLevel) {
      progressWidth.value = withDelay(
        400,
        withSpring(userLevel.progress_percentage, {
          damping: 15,
          stiffness: 90,
        })
      );
    }
  }, [userLevel]);

  const progressBarStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
  }));

  // Group levels by tier
  const tiers = useMemo(() => {
    const grouped: Record<string, typeof LEVEL_PROGRESSION> = {};
    LEVEL_PROGRESSION.forEach((level) => {
      if (!grouped[level.tier_name]) {
        grouped[level.tier_name] = [];
      }
      grouped[level.tier_name].push(level);
    });
    return grouped;
  }, []);

  const tierOrder = ['ROOKIE', 'BUILDER', 'ATHLETE', 'ELITE', 'LEGEND', 'MASTER'];

  const tierColor = userLevel ? (TIER_COLORS[userLevel.tier_name_upper] ?? c.primary) : c.primary;

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
                backgroundColor: c.surface2,
                borderRadius: r.pill,
              },
            ]}
          >
            <Ionicons name="chevron-back" size={24} color={c.text} />
          </Pressable>

          <View style={styles.headerContent}>
            <Text
              style={{
                color: c.text,
                fontFamily: ty.heading.familySemibold,
                fontSize: 32,
                letterSpacing: -1,
              }}
            >
              System Rank
            </Text>
            <View style={styles.subtitleRow}>
              <Ionicons name="hardware-chip-outline" size={14} color={gradients.brand[0]} />
              <Text
                style={{
                  color: gradients.brand[0],
                  fontFamily: ty.mono.family,
                  fontSize: 10,
                  marginLeft: s.xs,
                  textTransform: 'uppercase',
                  letterSpacing: 2,
                }}
              >
                30 Levels // 6 Tiers
              </Text>
            </View>
          </View>
        </MotiView>
        
        <View style={{ height: 1, backgroundColor: c.border, opacity: 0.5, marginHorizontal: s.xl, marginBottom: s.xl }} />

        {/* Current Level Card */}
        {userLevel && (
          <MotiView
            from={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'timing', duration: 400, delay: 100 }}
            style={[styles.currentLevelContainer, { paddingHorizontal: s.xl, marginBottom: s.xl }]}
          >
            <GlassCard intensity="medium">
              <View style={styles.currentLevelContent}>
                {/* Tier Badge */}
                  <View
                    style={[
                      styles.tierBadge,
                      {
                        backgroundColor: `${tierColor}15`,
                        borderRadius: r.pill,
                        borderWidth: 1.5,
                        borderColor: `${tierColor}50`,
                        ...shadow.glow,
                        shadowColor: tierColor,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: tierColor,
                        fontFamily: ty.heading.familySemibold,
                        fontSize: 10,
                        textTransform: 'uppercase',
                        letterSpacing: 1.5,
                      }}
                    >
                      {userLevel.tier_name}
                    </Text>
                  </View>

                  {/* Current Level */}
                  <View style={[styles.currentLevelRow, { marginTop: s.lg }]}>
                    <View style={styles.levelNumberBadge}>
                      <Ionicons
                        name="flash"
                        size={28}
                        color={tierColor}
                        style={{ ...shadow.glow, shadowColor: tierColor }}
                      />
                      <Text
                        style={{
                          color: c.text,
                          fontFamily: ty.heading.family,
                          fontSize: 36,
                          marginLeft: s.sm,
                        }}
                      >
                        {userLevel.level}
                      </Text>
                    </View>
                    <View style={styles.levelNameContainer}>
                      <Text
                        style={{
                          color: c.text,
                          fontFamily: ty.heading.familySemibold,
                          fontSize: ty.sizes.lg,
                          letterSpacing: -0.5,
                        }}
                      >
                        {userLevel.level_name}
                      </Text>
                    <Text
                      style={{
                        color: c.textMuted,
                        fontFamily: ty.body.family,
                        fontSize: ty.sizes.sm,
                        marginTop: 2,
                      }}
                    >
                      {userLevel.description}
                    </Text>
                  </View>
                </View>

                {/* Progress Bar */}
                {!userLevel.is_max_level && (
                  <>
                    <View
                      style={[
                        styles.progressBarTrack,
                        { backgroundColor: c.bg, borderRadius: r.pill, marginTop: s.xl, borderWidth: 1, borderColor: c.border },
                      ]}
                    >
                      <AnimatedLinearGradient
                        colors={gradients.brand as [string, string, ...string[]]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[
                          progressBarStyle,
                          {
                            height: '100%',
                            borderRadius: r.pill,
                            ...shadow.glow,
                          },
                        ]}
                      />
                    </View>

                    {/* XP Stats */}
                    <View style={[styles.xpRow, { marginTop: s.md }]}>
                      <View style={styles.xpStat}>
                        <Text
                          style={{
                            color: c.textMuted,
                            fontFamily: ty.mono.family,
                            fontSize: 10,
                            textTransform: 'uppercase',
                            letterSpacing: 0.5,
                          }}
                        >
                          Current XP
                        </Text>
                        <Text
                          style={{
                            color: c.text,
                            fontFamily: ty.mono.family,
                            fontSize: ty.sizes.md,
                            marginTop: 4,
                          }}
                        >
                          {userLevel.current_xp.toLocaleString()}
                        </Text>
                      </View>

                      <View style={[styles.xpDivider, { backgroundColor: c.border }]} />

                      <View style={styles.xpStat}>
                        <Text
                          style={{
                            color: c.textMuted,
                            fontFamily: ty.mono.family,
                            fontSize: 10,
                            textTransform: 'uppercase',
                            letterSpacing: 0.5,
                          }}
                        >
                          XP Needed
                        </Text>
                        <Text
                          style={{
                            color: c.primary,
                            fontFamily: ty.mono.family,
                            fontSize: ty.sizes.md,
                            marginTop: 4,
                            ...shadow.glow,
                            shadowOpacity: 0.5,
                          }}
                        >
                          {userLevel.xp_needed.toLocaleString()}
                        </Text>
                      </View>

                      <View style={[styles.xpDivider, { backgroundColor: c.border }]} />

                      <View style={styles.xpStat}>
                        <Text
                          style={{
                            color: c.textMuted,
                            fontFamily: ty.mono.family,
                            fontSize: 10,
                            textTransform: 'uppercase',
                            letterSpacing: 0.5,
                          }}
                        >
                          Total Earned
                        </Text>
                        <Text
                          style={{
                            color: c.text,
                            fontFamily: ty.mono.family,
                            fontSize: ty.sizes.md,
                            marginTop: 4,
                          }}
                        >
                          {userLevel.total_xp_earned.toLocaleString()}
                        </Text>
                      </View>
                    </View>
                  </>
                )}

                {userLevel.is_max_level && (
                  <View
                    style={[
                      styles.maxLevelBadge,
                      {
                        backgroundColor: `${TIER_COLORS.MASTER}20`,
                        borderRadius: r.lg,
                        marginTop: s.lg,
                      },
                    ]}
                  >
                    <Ionicons name="trophy" size={24} color={TIER_COLORS.MASTER} />
                    <Text
                      style={{
                        color: TIER_COLORS.MASTER,
                        fontFamily: ty.body.familySemibold,
                        fontSize: ty.sizes.md,
                        marginLeft: s.md,
                      }}
                    >
                      Max Level Achieved!
                    </Text>
                  </View>
                )}
              </View>
            </GlassCard>
          </MotiView>
        )}

        {/* Level Ladder */}
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
                Loading levels...
              </Text>
            </View>
          ) : (
            <View style={styles.tiersList}>
              {tierOrder.map((tierName, tierIndex) => {
                const tierLevels = tiers[tierName] || [];
                if (tierLevels.length === 0) return null;

                return (
                  <TierSection
                    key={tierName}
                    tierName={tierName}
                    levels={tierLevels}
                    currentLevelIndex={currentLevelIndex}
                    tierIndex={tierIndex}
                  />
                );
              })}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </PremiumBackground>
  );
}

type LevelEntry = {
  level: number;
  level_name: string;
  description: string;
  xp_threshold: number;
  tier_name: string;
};

type TierSectionProps = {
  tierName: string;
  levels: LevelEntry[];
  currentLevelIndex: number;
  tierIndex: number;
};

function TierSection({ tierName, levels, currentLevelIndex, tierIndex }: TierSectionProps) {
  const { c, s, ty, r, shadow } = useTokens();

  const tierColor = TIER_COLORS[tierName] ?? c.primary;

  return (
    <Animated.View
      entering={FadeInUp.delay(tierIndex * 100)
        .duration(500)
        .springify()
        .damping(15)}
      layout={Layout.springify().damping(15)}
      style={[styles.tierSection, { marginBottom: s.xl }]}
    >
      {/* Tier Header */}
      <View
        style={[
          styles.tierHeader,
          {
            backgroundColor: `${tierColor}10`,
            borderRadius: 40,
            borderWidth: 1,
            borderColor: `${tierColor}30`,
            marginBottom: s.lg,
            paddingVertical: 16,
          },
        ]}
      >
        <Text
          style={{
            color: tierColor,
            fontFamily: ty.heading.familySemibold,
            fontSize: 16,
            textTransform: 'uppercase',
            letterSpacing: 3,
            ...shadow.glow,
            shadowColor: tierColor,
            shadowOpacity: 0.3,
          }}
        >
          {tierName}
        </Text>
        <Text
          style={{
            color: c.textMuted,
            fontFamily: ty.mono.family,
            fontSize: 10,
            marginTop: 4,
            letterSpacing: 2,
            textTransform: 'uppercase',
          }}
        >
          Levels {levels[0].level} - {levels[levels.length - 1].level}
        </Text>
      </View>

      {/* Levels in Tier */}
      <View style={styles.levelsGrid}>
        {levels.map((level, index) => {
          const isCurrentLevel = level.level - 1 === currentLevelIndex;
          const isPastLevel = level.level - 1 < currentLevelIndex;

          return (
            <GlassCard
              key={level.level}
              intensity={isCurrentLevel ? 'medium' : 'light'}
              animated
              delay={tierIndex * 100 + index * 50}
            >
              <View
                style={[
                  styles.levelCard,
                  {
                    padding: 20,
                  },
                ]}
              >
                <View style={{ flexDirection: 'row' }}>
                  {/* Left accent line */}
                  <View 
                    style={{ 
                      width: 2, 
                      backgroundColor: isCurrentLevel ? tierColor : isPastLevel ? c.primary : `${c.border}80`, 
                      borderRadius: 2, 
                      marginRight: 16,
                      shadowColor: isCurrentLevel ? tierColor : 'transparent',
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: isCurrentLevel ? 0.5 : 0,
                      shadowRadius: 4,
                    }} 
                  />
                  
                  {/* Content Container */}
                  <View style={{ flex: 1 }}>
                    <View style={styles.levelHeader}>
                      <View style={styles.levelBadge}>
                        <Ionicons
                          name={isPastLevel ? 'checkmark-circle' : isCurrentLevel ? 'star' : 'lock-closed'}
                          size={13}
                          color={isCurrentLevel ? tierColor : isPastLevel ? c.primary : c.textMuted}
                        />
                        <Text
                          style={{
                            color: isCurrentLevel ? tierColor : isPastLevel ? c.text : c.textMuted,
                            fontFamily: ty.heading.familySemibold,
                            fontSize: 11,
                            marginLeft: 6,
                            letterSpacing: 1,
                            textTransform: 'uppercase',
                          }}
                        >
                          Level {level.level}
                        </Text>
                      </View>

                      {isCurrentLevel && (
                        <View
                          style={[
                            styles.currentBadge,
                            {
                              backgroundColor: `${tierColor}20`,
                              borderRadius: r.pill,
                              borderWidth: 1,
                              borderColor: `${tierColor}50`,
                            },
                          ]}
                        >
                          <Text
                            style={{
                              color: tierColor,
                              fontFamily: ty.heading.familySemibold,
                              fontSize: 9,
                              textTransform: 'uppercase',
                              letterSpacing: 1,
                            }}
                          >
                            Current
                          </Text>
                        </View>
                      )}
                    </View>

                    <Text
                      style={{
                        color: isPastLevel || isCurrentLevel ? c.text : c.textMuted,
                        fontFamily: ty.heading.familySemibold,
                        fontSize: 18,
                        marginTop: 10,
                        letterSpacing: -0.5,
                      }}
                    >
                      {level.level_name}
                    </Text>

                    <Text
                      style={{
                        color: c.textMuted,
                        fontFamily: ty.body.family,
                        fontSize: 13,
                        marginTop: 4,
                      }}
                    >
                      {level.description}
                    </Text>

                    <View style={[styles.xpRequirement, { marginTop: 14 }]}>
                      <Ionicons name="flash" size={12} color={c.textMuted} />
                      <Text
                        style={{
                          color: c.textMuted,
                          fontFamily: ty.mono.family,
                          fontSize: 11,
                          marginLeft: 6,
                          letterSpacing: 0.5,
                        }}
                      >
                        {level.xp_threshold.toLocaleString()} XP
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </GlassCard>
          );
        })}
      </View>
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
  currentLevelContainer: {},
  currentLevelContent: {},
  tierBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  currentLevelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  levelNumberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  levelNameContainer: {
    flex: 1,
    marginLeft: 16,
  },
  progressBarTrack: {
    height: 10,
    width: '100%',
    overflow: 'hidden',
  },
  xpRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  xpStat: {
    flex: 1,
    alignItems: 'center',
  },
  xpDivider: {
    width: 1,
    height: 32,
  },
  maxLevelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
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
  tiersList: {},
  tierSection: {},
  tierHeader: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  levelsGrid: {
    gap: 12,
  },
  levelCard: {
    // Left padding removed as it's now internal
  },
  levelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currentBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  xpRequirement: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
