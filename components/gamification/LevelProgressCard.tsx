/**
 * LevelProgressCard Component
 * Displays user's current level and XP progress
 * Shows in Home dashboard below MacroDashboard
 */

import React from 'react';
import { StyleSheet, Text, View, ActivityIndicator, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withDelay,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

import { useTokens } from '../../lib/theme';
import { GlassCard } from '../premium/GlassCard';
import { useLevelProgressDisplay } from '../../hooks/useGamification';

type LevelProgressCardProps = {
  delay?: number;
};

export function LevelProgressCard({ delay = 0 }: LevelProgressCardProps) {
  const { c, s, ty, r, gradients, shadow } = useTokens();
  const router = useRouter();
  const { data: levelProgress, isLoading, isError } = useLevelProgressDisplay();

  const progressWidth = useSharedValue(0);

  React.useEffect(() => {
    if (levelProgress) {
      progressWidth.value = withDelay(
        delay + 300,
        withSpring(levelProgress.progress_percentage, {
          damping: 15,
          stiffness: 90,
        })
      );
    }
  }, [levelProgress, delay]);

  const progressBarStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
  }));

  const handlePress = () => {
    router.push('/level-progress');
  };

  // Don't show anything if there's an error
  if (isError) {
    return null;
  }

  // Show loading state
  if (isLoading || !levelProgress) {
    return null;
  }

  const { level_name, tier_name, current_level, current_xp, xp_to_next_level, is_max_level } = levelProgress;

  return (
    <Pressable onPress={handlePress}>
      <Animated.View
        style={[
          styles.container,
          {
            borderColor: c.primary,
            borderWidth: 1.5,
            borderRadius: 32, // Large pill-like aesthetic
            padding: 18,
            backgroundColor: 'transparent',
            ...shadow.glow,
            shadowColor: c.primary,
            shadowOpacity: 0.15,
          },
        ]}
      >
        {/* Top Header Row */}
        <View style={styles.headerRow}>
          <Text
            style={{
              color: c.text,
              fontFamily: ty.heading.familySemibold,
              fontSize: 20, // Slightly more compact header
              letterSpacing: -0.5,
            }}
          >
            {tier_name}
          </Text>

          <LinearGradient
            colors={gradients.brand as [string, string, ...string[]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[
              {
                borderRadius: r.pill,
                paddingHorizontal: 12,
                paddingVertical: 4,
                flexDirection: 'row',
                alignItems: 'center',
                ...shadow.glow,
                shadowOpacity: 0.4,
              },
            ]}
          >
             <Text
                style={{
                  color: c.bg, // Dark text on bright neon background
                  fontFamily: ty.heading.familySemibold,
                  fontSize: 11,
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                }}
             >
               Level {current_level}
             </Text>
          </LinearGradient>
        </View>

        {/* Middle Stats Row */}
        <View style={styles.statsRow}>
           <Text
             style={{
               color: c.textSubtle,
               fontFamily: ty.mono.family,
               fontSize: 10,
               textTransform: 'uppercase',
               letterSpacing: 1.5,
             }}
           >
             Progress
           </Text>
           <Text
             style={{
               color: c.textMuted,
               fontFamily: ty.mono.family,
               fontSize: 10,
               textTransform: 'uppercase',
             }}
           >
             <Text style={{ color: c.text }}>{current_xp.toLocaleString()} XP</Text> of {(current_xp + xp_to_next_level).toLocaleString()} XP
           </Text>
        </View>

        {/* Bottom Progress Bar Row */}
        <View
          style={[
            styles.progressBarContainer,
            {
              borderWidth: 1.5,
              borderColor: `${c.primary}60`,
              borderRadius: r.pill,
              padding: 3,
            },
          ]}
        >
          <AnimatedLinearGradient
            colors={gradients.brand as [string, string, ...string[]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[
              progressBarStyle,
              {
                height: 6, // Slim inner line matching the mockup
                borderRadius: r.pill,
                ...shadow.glow,
              },
            ]}
          />
        </View>

        {is_max_level && (
          <View style={[styles.maxLevelBadge, { backgroundColor: `${c.primary}15`, borderRadius: r.lg, marginTop: s.lg, borderWidth: 1, borderColor: `${c.primary}30` }]}>
            <Ionicons name="trophy" size={20} color={c.primary} />
            <Text
              style={{
                color: c.primary,
                fontFamily: ty.heading.familySemibold,
                fontSize: ty.sizes.sm,
                marginLeft: s.sm,
                letterSpacing: 0.5,
              }}
            >
              Max Level Reached!
            </Text>
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    position: 'relative',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 6,
  },
  progressBarContainer: {
    width: '100%',
    overflow: 'hidden',
  },
  maxLevelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
});
