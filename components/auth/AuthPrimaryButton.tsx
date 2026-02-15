import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useTokens } from '../../lib/theme';

interface AuthPrimaryButtonProps {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  accessibilityHint?: string;
  style?: ViewStyle;
}

export function AuthPrimaryButton({
  label,
  onPress,
  loading = false,
  disabled = false,
  accessibilityHint,
  style,
}: AuthPrimaryButtonProps) {
  const { c, ty, r } = useTokens();
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [styles.wrap, isDisabled ? { opacity: 0.6 } : null, pressed ? { transform: [{ scale: 0.99 }] } : null, style]}
    >
      <LinearGradient
        colors={[c.primary, c.accent, c.primaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.button, { borderRadius: r.md }]}
      >
        {loading ? (
          <ActivityIndicator color={c.bg} />
        ) : (
          <Text style={[styles.label, { color: c.bg, fontFamily: ty.body.familySemibold }]}>{label}</Text>
        )}
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
  },
  button: {
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 15,
    letterSpacing: 0.2,
  },
});
