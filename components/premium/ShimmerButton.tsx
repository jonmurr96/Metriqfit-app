import React, { useEffect } from 'react';
import { Text, Pressable, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { MotiPressable } from 'moti/interactions';
import { useTokens } from '../../lib/theme';

interface ShimmerButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  disabled?: boolean;
  style?: ViewStyle;
}

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

export function ShimmerButton({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  disabled = false,
  style,
}: ShimmerButtonProps) {
  const { c, ty, r, gradients, shadow, components } = useTokens();

  const shimmerPosition = useSharedValue(-1);

  useEffect(() => {
    if (variant === 'primary' && !disabled) {
      shimmerPosition.value = withRepeat(
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        -1,
        false
      );
    }
  }, [variant, disabled]);

  const shimmerStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: shimmerPosition.value * 200 }],
    };
  });

  const sizeStyles: Record<string, { height: number; paddingHorizontal: number; fontSize: number }> = {
    sm: { height: 40, paddingHorizontal: 16, fontSize: ty.sizes.sm },
    md: { height: components.button.height, paddingHorizontal: 24, fontSize: ty.sizes.md },
    lg: { height: 60, paddingHorizontal: 32, fontSize: ty.sizes.lg },
  };

  const { height, paddingHorizontal, fontSize } = sizeStyles[size];

  const buttonStyle: ViewStyle = {
    height,
    paddingHorizontal,
    borderRadius: r.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    overflow: 'hidden',
    ...(variant === 'primary' ? shadow.premium : {}),
  };

  const textStyle: TextStyle = {
    fontSize,
    fontFamily: ty.body.familySemibold,
    letterSpacing: 0.3,
  };

  if (variant === 'primary') {
    return (
      <MotiPressable
        onPress={onPress}
        disabled={disabled}
        animate={({ pressed }: { pressed: boolean }) => {
          'worklet';
          return {
            scale: pressed ? 0.97 : 1,
            opacity: disabled ? 0.5 : 1,
          };
        }}
        transition={{ type: 'timing', duration: 100 }}
        style={[buttonStyle, style]}
      >
        <LinearGradient
          colors={disabled ? [c.surface2, c.surface2] : (gradients.brand as [string, string, ...string[]])}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {!disabled && (
          <Animated.View style={[styles.shimmerOverlay, shimmerStyle]}>
            <LinearGradient
              colors={['transparent', 'rgba(255,255,255,0.25)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.shimmerGradient}
            />
          </Animated.View>
        )}

        {icon}
        <Text style={[textStyle, { color: c.bg }]}>{label}</Text>
      </MotiPressable>
    );
  }

  if (variant === 'secondary') {
    return (
      <MotiPressable
        onPress={onPress}
        disabled={disabled}
        animate={({ pressed }: { pressed: boolean }) => {
          'worklet';
          return {
            scale: pressed ? 0.97 : 1,
            opacity: disabled ? 0.5 : 1,
          };
        }}
        transition={{ type: 'timing', duration: 100 }}
        style={[
          buttonStyle,
          {
            backgroundColor: c.surface,
            borderWidth: 1,
            borderColor: c.borderStrong,
          },
          style,
        ]}
      >
        {icon}
        <Text style={[textStyle, { color: c.text }]}>{label}</Text>
      </MotiPressable>
    );
  }

  return (
    <MotiPressable
      onPress={onPress}
      disabled={disabled}
      animate={({ pressed }: { pressed: boolean }) => {
        'worklet';
        return {
          scale: pressed ? 0.97 : 1,
          opacity: disabled ? 0.5 : pressed ? 0.7 : 1,
        };
      }}
      transition={{ type: 'timing', duration: 100 }}
      style={[buttonStyle, { backgroundColor: 'transparent' }, style]}
    >
      {icon}
      <Text style={[textStyle, { color: c.primary }]}>{label}</Text>
    </MotiPressable>
  );
}

const styles = StyleSheet.create({
  shimmerOverlay: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  shimmerGradient: {
    width: 100,
    height: '100%',
  },
});
