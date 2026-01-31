import React from 'react';
import { Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { MotiView } from 'moti';
import { metriqfitTheme } from '../../../lib/theme';

const { colors: c, spacing: s, radius: r } = metriqfitTheme;

interface PremiumButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary';
}

export function PremiumButton({
  label,
  onPress,
  disabled = false,
  loading = false,
  variant = 'primary',
}: PremiumButtonProps) {
  const isPrimary = variant === 'primary';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        isPrimary ? styles.buttonPrimary : styles.buttonSecondary,
        (disabled || loading) && styles.buttonDisabled,
        pressed && styles.buttonPressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? c.bg : c.text} />
      ) : (
        <Text
          style={[
            styles.label,
            isPrimary ? styles.labelPrimary : styles.labelSecondary,
            disabled && styles.labelDisabled,
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 56,
    borderRadius: r.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimary: {
    backgroundColor: c.primary,
    shadowColor: c.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
  } as any,
  buttonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: c.border,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  label: {
    fontSize: 17,
    fontFamily: 'Sora_600SemiBold',
  },
  labelPrimary: {
    color: c.bg,
  },
  labelSecondary: {
    color: c.text,
  },
  labelDisabled: {
    opacity: 0.7,
  },
});
