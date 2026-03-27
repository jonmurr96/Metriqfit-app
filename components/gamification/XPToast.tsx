/**
 * XPToast Component
 * Small XP gain notification that appears at bottom of screen
 * Auto-dismisses after 3 seconds
 */

import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withDelay,
  runOnJS,
} from 'react-native-reanimated';

import { useTokens } from '../../lib/theme';

type XPToastProps = {
  xp: number;
  message: string;
  onDismiss?: () => void;
};

export function XPToast({ xp, message, onDismiss }: XPToastProps) {
  const { c, s, ty, r } = useTokens();

  const translateY = useSharedValue(100);
  const opacity = useSharedValue(0);

  useEffect(() => {
    // Slide up and fade in
    translateY.value = withSpring(0, { damping: 15, stiffness: 100 });
    opacity.value = withSpring(1, { damping: 15 });

    // Auto dismiss after 3 seconds
    const timer = setTimeout(() => {
      translateY.value = withSpring(100, { damping: 15, stiffness: 100 });
      opacity.value = withSpring(0, { damping: 15 });

      if (onDismiss) {
        setTimeout(onDismiss, 300); // Wait for animation to complete
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.container,
        animatedStyle,
        {
          backgroundColor: c.surfaceSubtle,
          borderColor: c.primary,
          borderWidth: 1.5,
          borderRadius: r.lg,
          shadowColor: c.primary,
        },
      ]}
    >
      <View style={styles.iconContainer}>
        <Ionicons name="star" size={20} color={c.primary} />
      </View>

      <View style={styles.textContainer}>
        <Text
          style={{
            color: c.primary,
            fontFamily: ty.body.familyBold,
            fontSize: ty.sizes.md,
          }}
        >
          +{xp} XP
        </Text>
        <Text
          style={{
            color: c.text,
            fontFamily: ty.body.family,
            fontSize: ty.sizes.sm,
            marginTop: 2,
          }}
        >
          {message}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  iconContainer: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
});
