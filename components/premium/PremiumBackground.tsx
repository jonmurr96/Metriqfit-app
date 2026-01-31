import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { useTokens } from '../../lib/theme';

interface PremiumBackgroundProps {
  children: React.ReactNode;
  variant?: 'default' | 'glow' | 'subtle';
}

const { width, height } = Dimensions.get('window');

export function PremiumBackground({
  children,
  variant = 'default',
}: PremiumBackgroundProps) {
  const { c, gradients } = useTokens();

  const animationValue = useSharedValue(0);

  useEffect(() => {
    animationValue.value = withRepeat(
      withTiming(1, { duration: 8000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  const orb1Style = useAnimatedStyle(() => {
    const translateX = interpolate(animationValue.value, [0, 1], [-50, 50]);
    const translateY = interpolate(animationValue.value, [0, 1], [-30, 30]);
    const scale = interpolate(animationValue.value, [0, 0.5, 1], [1, 1.2, 1]);

    return {
      transform: [{ translateX }, { translateY }, { scale }],
    };
  });

  const orb2Style = useAnimatedStyle(() => {
    const translateX = interpolate(animationValue.value, [0, 1], [30, -30]);
    const translateY = interpolate(animationValue.value, [0, 1], [20, -40]);
    const scale = interpolate(animationValue.value, [0, 0.5, 1], [1.1, 0.9, 1.1]);

    return {
      transform: [{ translateX }, { translateY }, { scale }],
    };
  });

  if (variant === 'subtle') {
    return (
      <View style={[styles.container, { backgroundColor: c.bg }]}>
        <LinearGradient
          colors={[`${c.primary}05`, 'transparent', `${c.accent}05`]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {children}
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      <Animated.View style={[styles.orb, styles.orb1, orb1Style]} pointerEvents="none">
        <LinearGradient
          colors={[`${c.primary}25`, `${c.primary}08`, `${c.primary}00`]}
          style={styles.orbGradient}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
      </Animated.View>

      <Animated.View style={[styles.orb, styles.orb2, orb2Style]} pointerEvents="none">
        <LinearGradient
          colors={[`${c.accent}25`, `${c.accent}08`, `${c.accent}00`]}
          style={styles.orbGradient}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
      </Animated.View>

      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <LinearGradient
          colors={[c.bg, 'rgba(5, 5, 5, 0.95)', c.bg]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />
      </View>

      {variant === 'glow' && (
        <View style={styles.glowContainer} pointerEvents="none">
          <View style={[styles.glow, { backgroundColor: `${c.primary}18` }]} />
        </View>
      )}

      <View style={{ flex: 1, zIndex: 1 }}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  orb: {
    position: 'absolute',
    borderRadius: 999,
    overflow: 'hidden',
  },
  orb1: {
    top: -100,
    left: -50,
    width: 400,
    height: 400,
  },
  orb2: {
    bottom: 100,
    right: -100,
    width: 350,
    height: 350,
  },
  orbGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
  },
  glowContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 300,
    alignItems: 'center',
    overflow: 'hidden',
  },
  glow: {
    width: 600,
    height: 300,
    borderRadius: 300,
    transform: [{ scaleX: 1.5 }],
  },
});
