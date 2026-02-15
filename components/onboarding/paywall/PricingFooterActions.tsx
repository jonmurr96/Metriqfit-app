import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { TabBarIcon } from '../../navigation/TabBarIcon';
import { useTokens } from '../../../lib/theme';

interface PricingFooterActionsProps {
  onContinueElite: () => void;
  onSelectFree: () => void;
  onRedoOnboarding: () => void;
  isProcessing: boolean;
  eliteLabel: string;
}

export function PricingFooterActions({
  onContinueElite,
  onSelectFree,
  onRedoOnboarding,
  isProcessing,
  eliteLabel,
}: PricingFooterActionsProps) {
  const { c, ty, r, shadow } = useTokens();

  return (
    <View style={styles.container}>
      <Pressable
        style={[styles.primary, { backgroundColor: c.primary, borderRadius: r.md, ...shadow.glow, opacity: isProcessing ? 0.7 : 1 }]}
        onPress={onContinueElite}
        disabled={isProcessing}
      >
        {isProcessing ? <ActivityIndicator color={c.bg} size="small" /> : (
          <>
            <Text style={[styles.primaryLabel, { color: c.bg, fontFamily: ty.heading.familySemibold }]}>{eliteLabel}</Text>
            <TabBarIcon name="arrow-forward" color={c.bg} size={18} />
          </>
        )}
      </Pressable>

      <Pressable style={[styles.secondary, { backgroundColor: c.surface, borderColor: c.border, borderRadius: r.md }]} onPress={onSelectFree}>
        <Text style={[styles.secondaryLabel, { color: c.textMuted, fontFamily: ty.body.familySemibold }]}>Continue Free</Text>
      </Pressable>

      <Pressable style={[styles.tertiary, { borderColor: c.border, borderRadius: r.md }]} onPress={onRedoOnboarding}>
        <Text style={[styles.tertiaryLabel, { color: c.textMuted, fontFamily: ty.body.familySemibold }]}>Redo onboarding</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
    gap: 10,
  },
  primary: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryLabel: {
    fontSize: 18,
  },
  secondary: {
    height: 46,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryLabel: {
    fontSize: 14,
  },
  tertiary: {
    height: 46,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tertiaryLabel: {
    fontSize: 14,
  },
});
