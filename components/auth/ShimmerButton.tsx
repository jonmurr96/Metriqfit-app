import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import { useTokens } from '../../lib/theme';

interface ShimmerButtonProps {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  accessibilityHint?: string;
  style?: ViewStyle;
}

export function ShimmerButton({
  label,
  onPress,
  loading = false,
  disabled = false,
  accessibilityHint,
  style,
}: ShimmerButtonProps) {
  const { c, ty, r } = useTokens();
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [
        styles.wrap,
        isDisabled ? { opacity: 0.55 } : null,
        pressed ? { transform: [{ scale: 0.98 }] } : null,
        style,
      ]}
    >
      {/* Base gradient */}
      <LinearGradient
        colors={['#22D3EE', '#06B6D4', '#0891B2']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.button, { borderRadius: r.md }]}
      />

      {/* Ambient glow shadow */}
      {!isDisabled && (
        <View
          style={[
            StyleSheet.absoluteFill,
            styles.glow,
            { borderRadius: r.md },
          ]}
          pointerEvents="none"
        />
      )}

      {/* Shimmer sweep */}
      {!isDisabled && (
        <MotiView
          from={{ translateX: -200 }}
          animate={{ translateX: 400 }}
          transition={{
            type: 'timing',
            duration: 2500,
            loop: true,
            repeatReverse: false,
            delay: 1000,
          }}
          style={styles.shimmerBar}
        />
      )}

      {/* Content */}
      {loading ? (
        <ActivityIndicator color="#050510" />
      ) : (
        <Text style={[styles.label, { color: '#050510', fontFamily: ty.body.familySemibold }]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  button: {
    ...StyleSheet.absoluteFillObject,
  },
  glow: {
    shadowColor: '#22D3EE',
    shadowOpacity: 0.35,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
    elevation: 12,
  },
  shimmerBar: {
    position: 'absolute',
    width: 120,
    height: '200%',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    transform: [{ rotate: '20deg' }],
  },
  label: {
    fontSize: 15,
    letterSpacing: 0.3,
    zIndex: 2,
  },
});
