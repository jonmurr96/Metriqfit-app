import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTokens } from '../../lib/theme';

type ProviderType = 'google' | 'apple';

interface AuthProviderButtonProps {
  provider: ProviderType;
  onPress?: () => void;
  disabled?: boolean;
  helperText?: string;
}

export function AuthProviderButton({ provider, onPress, disabled = false, helperText }: AuthProviderButtonProps) {
  const { c, ty, r } = useTokens();
  const isGoogle = provider === 'google';

  return (
    <View style={{ gap: 6 }}>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={({ pressed }) => [
          styles.button,
          {
            borderRadius: r.md,
            backgroundColor: pressed && !disabled
              ? 'rgba(255, 255, 255, 0.09)'
              : 'rgba(255, 255, 255, 0.04)',
            borderColor: disabled
              ? 'rgba(255, 255, 255, 0.06)'
              : 'rgba(255, 255, 255, 0.12)',
            opacity: disabled ? 0.4 : 1,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel={isGoogle ? 'Continue with Google' : 'Continue with Apple'}
        accessibilityHint={disabled ? 'This option is currently unavailable' : 'Signs in using your provider account'}
      >
        <Ionicons
          name={isGoogle ? 'logo-google' : 'logo-apple'}
          size={18}
          color={disabled ? 'rgba(255,255,255,0.3)' : c.text}
        />
        <Text
          style={[
            styles.text,
            {
              color: disabled ? 'rgba(255,255,255,0.3)' : c.text,
              fontFamily: ty.body.familySemibold,
            },
          ]}
        >
          {isGoogle ? 'Continue with Google' : 'Continue with Apple'}
        </Text>
      </Pressable>
      {helperText ? (
        <Text style={[styles.helper, { color: c.textMuted, fontFamily: ty.body.family }]}>
          {helperText}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 52,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 16,
  },
  text: {
    fontSize: 14,
    letterSpacing: 0.1,
  },
  helper: {
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
  },
});
