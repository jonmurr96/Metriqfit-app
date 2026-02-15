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
            borderColor: disabled ? `${c.border}` : `${c.primary}66`,
            backgroundColor: pressed && !disabled ? `${c.primary}1F` : `${c.surface2}B5`,
            opacity: disabled ? 0.7 : 1,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel={isGoogle ? 'Continue with Google' : 'Continue with Apple'}
        accessibilityHint={disabled ? 'This option is currently unavailable' : 'Signs in using your provider account'}
      >
        <Ionicons name={isGoogle ? 'logo-google' : 'logo-apple'} size={18} color={c.text} />
        <Text style={[styles.text, { color: c.text, fontFamily: ty.body.familySemibold }]}>
          {isGoogle ? 'Continue with Google' : 'Continue with Apple'}
        </Text>
      </Pressable>
      {helperText ? (
        <Text style={[styles.helper, { color: c.textMuted, fontFamily: ty.body.family }]}>{helperText}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 50,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 14,
  },
  text: {
    fontSize: 14,
  },
  helper: {
    fontSize: 12,
    lineHeight: 17,
  },
});
