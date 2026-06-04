/**
 * AchievementUnlockModal Component
 * Full-screen celebration modal for achievement unlocks and level-ups
 * Shows confetti animation, badge/level icon, name, description, and XP reward
 */

import React, { useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  Pressable,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withDelay,
  withSequence,
} from 'react-native-reanimated';

import { useTokens } from '../../lib/theme';
import type { Achievement, AchievementRarity } from '../../types/gamification';
import { getRarityBorderColor } from '../../types/gamification';
import { PressableScale } from '@/components/common/PressableScale';

const { width, height } = Dimensions.get('window');

type AchievementUnlockModalProps = {
  visible: boolean;
  type: 'achievement' | 'level_up';
  achievement?: Achievement;
  newLevel?: number;
  newLevelName?: string;
  newTier?: string;
  onDismiss: () => void;
};

export function AchievementUnlockModal({
  visible,
  type,
  achievement,
  newLevel,
  newLevelName,
  newTier,
  onDismiss,
}: AchievementUnlockModalProps) {
  const tokens = useTokens();
  const { c, s, ty, r } = tokens;

  const scale = useSharedValue(0.8);
  const opacity = useSharedValue(0);
  const badgeScale = useSharedValue(0.5);

  useEffect(() => {
    if (visible) {
      // Fade in modal
      opacity.value = withSpring(1, { damping: 15 });

      // Scale in container
      scale.value = withDelay(
        100,
        withSpring(1, { damping: 12, stiffness: 100 })
      );

      // Bounce badge
      badgeScale.value = withDelay(
        200,
        withSequence(
          withSpring(1.2, { damping: 8, stiffness: 200 }),
          withSpring(1, { damping: 10, stiffness: 150 })
        )
      );
    } else {
      // Reset values
      scale.value = 0.8;
      opacity.value = 0;
      badgeScale.value = 0.5;
    }
  }, [visible]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const badgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: badgeScale.value }],
  }));

  if (!visible) return null;

  const isAchievement = type === 'achievement' && achievement;
  const isLevelUp = type === 'level_up' && newLevel && newLevelName;

  const title = isAchievement ? 'Achievement Unlocked!' : 'Level Up!';
  const subtitle = isAchievement ? achievement.name : newLevelName || '';
  const description = isAchievement ? achievement.description : `You've reached ${newLevelName}!`;
  const xpReward = isAchievement ? achievement.xp_reward : 0;
  const rarity: AchievementRarity = isAchievement ? achievement.rarity : 'legendary';
  const rarityColor = getRarityBorderColor(rarity, tokens);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onDismiss}
    >
      <BlurView intensity={50} style={styles.blurContainer}>
        <Pressable style={styles.overlay} onPress={onDismiss}>
          <Animated.View
            style={[
              styles.container,
              containerStyle,
              {
                backgroundColor: c.surface,
                borderRadius: r.xl,
                borderWidth: 2,
                borderColor: rarityColor,
              },
            ]}
          >
            {/* Header */}
            <Text
              style={{
                color: c.primary,
                fontFamily: ty.body.familyBold,
                fontSize: ty.sizes.xs,
                letterSpacing: 2,
                textAlign: 'center',
                marginBottom: s.md,
              }}
            >
              {title.toUpperCase()}
            </Text>

            {/* Badge/Icon */}
            <Animated.View
              style={[
                badgeStyle,
                styles.badgeContainer,
                {
                  backgroundColor: c.surfaceSubtle,
                  borderRadius: r.full,
                  borderWidth: 3,
                  borderColor: rarityColor,
                },
              ]}
            >
              <Ionicons
                name={isAchievement ? 'trophy' : 'star'}
                size={64}
                color={rarityColor}
              />
            </Animated.View>

            {/* Name */}
            <Text
              style={{
                color: c.text,
                fontFamily: ty.body.familyBold,
                fontSize: ty.sizes.xxl,
                textAlign: 'center',
                marginTop: s.xl,
                marginBottom: s.sm,
              }}
            >
              {subtitle}
            </Text>

            {/* Description */}
            <Text
              style={{
                color: c.textMuted,
                fontFamily: ty.body.family,
                fontSize: ty.sizes.md,
                textAlign: 'center',
                marginBottom: s.lg,
                paddingHorizontal: s.lg,
              }}
            >
              {description}
            </Text>

            {/* XP Reward (for achievements) */}
            {isAchievement && xpReward > 0 && (
              <View
                style={[
                  styles.xpBadge,
                  {
                    backgroundColor: c.surfaceActive,
                    borderRadius: r.md,
                    marginBottom: s.lg,
                  },
                ]}
              >
                <Ionicons name="star" size={18} color={c.primary} />
                <Text
                  style={{
                    color: c.primary,
                    fontFamily: ty.body.familyBold,
                    fontSize: ty.sizes.md,
                    marginLeft: s.xs,
                  }}
                >
                  +{xpReward} XP
                </Text>
              </View>
            )}

            {/* Tier Badge (for level-ups) */}
            {isLevelUp && newTier && (
              <View
                style={[
                  styles.tierBadge,
                  {
                    backgroundColor: c.surfaceActive,
                    borderRadius: r.md,
                    marginBottom: s.lg,
                  },
                ]}
              >
                <Text
                  style={{
                    color: c.primary,
                    fontFamily: ty.body.familyBold,
                    fontSize: ty.sizes.sm,
                  }}
                >
                  {newTier} Tier
                </Text>
              </View>
            )}

            {/* Claim Button */}
            <PressableScale
              onPress={onDismiss}
              style={(pressed) => [
                styles.claimButton,
                {
                  backgroundColor: pressed ? c.primaryActive : c.primary,
                  borderRadius: r.lg,
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
            >
              <Text
                style={{
                  color: c.bg,
                  fontFamily: ty.body.familyBold,
                  fontSize: ty.sizes.md,
                }}
              >
                Claim Reward
              </Text>
            </PressableScale>
          </Animated.View>
        </Pressable>
      </BlurView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  blurContainer: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  container: {
    width: width * 0.85,
    maxWidth: 400,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  badgeContainer: {
    width: 140,
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
  },
  xpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  tierBadge: {
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  claimButton: {
    paddingVertical: 16,
    paddingHorizontal: 48,
    width: '100%',
    alignItems: 'center',
  },
});
