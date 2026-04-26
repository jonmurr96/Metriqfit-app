import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTokens } from '../../../lib/theme';

interface StickyBottomBarProps {
  canContinue: boolean;
  onContinue: () => void;
  acceptedCount: number;
  total: number;
}

export function StickyBottomBar({ canContinue, onContinue, acceptedCount, total }: StickyBottomBarProps) {
  const { c, ty, r, shadow } = useTokens();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          paddingBottom: insets.bottom + 12,
          paddingHorizontal: 20,
          paddingTop: 12,
          backgroundColor: 'rgba(5, 5, 16, 0.92)',
          borderTopColor: c.border,
        },
      ]}
    >
      <Pressable
        style={[
          styles.button,
          {
            backgroundColor: canContinue ? c.primary : c.surface2,
            borderRadius: r.lg,
            ...(canContinue ? shadow.glow : {}),
          },
        ]}
        onPress={onContinue}
        disabled={!canContinue}
      >
        <Text
          style={[
            styles.label,
            {
              color: canContinue ? c.bg : c.textMuted,
              fontFamily: ty.heading.familySemibold,
            },
          ]}
        >
          {canContinue ? 'Continue' : `Accept all sections (${acceptedCount}/${total})`}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
  },
  button: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 15,
    letterSpacing: 0.3,
  },
});
