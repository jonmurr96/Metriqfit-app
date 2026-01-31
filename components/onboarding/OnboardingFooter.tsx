import React from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { metriqfitTheme } from '../../lib/theme';

const { colors: c, radius: r, spacing: s, type: ty } = metriqfitTheme;

interface OnboardingFooterProps {
  onBack?: () => void;
  onContinue: () => void;
  canContinue: boolean;
  isLoading?: boolean;
  continueLabel?: string;
  showBack?: boolean;
}

export function OnboardingFooter({
  onBack,
  onContinue,
  canContinue,
  isLoading = false,
  continueLabel = 'Continue',
  showBack = true,
}: OnboardingFooterProps) {
  return (
    <View style={[styles.footer, { paddingHorizontal: s.xl }]}>
      <View style={styles.buttonRow}>
        {showBack && onBack && (
          <Pressable
            style={({ pressed }) => [
              styles.backButton,
              { borderColor: c.border, opacity: pressed ? 0.8 : 1 },
            ]}
            onPress={onBack}
            disabled={isLoading}
          >
            <Text style={[styles.backButtonText, { color: c.textMuted }]}>Back</Text>
          </Pressable>
        )}
        <Pressable
          style={({ pressed }) => [
            styles.continueButton,
            {
              backgroundColor: canContinue ? c.primary : c.surface,
              opacity: pressed && canContinue ? 0.9 : 1,
            },
            !showBack && { flex: 1 },
          ]}
          onPress={onContinue}
          disabled={!canContinue || isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={c.bg} />
          ) : (
            <Text style={[styles.buttonText, { color: canContinue ? c.bg : c.textMuted, fontFamily: ty.body.familyMedium }]}>
              {continueLabel}
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    paddingVertical: s.lg,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: s.md,
  },
  backButton: {
    flex: 1,
    height: 52,
    borderRadius: r.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  continueButton: {
    flex: 2,
    height: 52,
    borderRadius: r.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
