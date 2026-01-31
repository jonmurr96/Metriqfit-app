import React from 'react';
import { View, StyleSheet } from 'react-native';
import { PremiumButton } from './PremiumButton';
import { metriqfitTheme } from '../../../lib/theme';

const { colors: c, spacing: s } = metriqfitTheme;

interface PremiumFooterProps {
  onBack?: () => void;
  onContinue: () => void;
  canContinue?: boolean;
  isLoading?: boolean;
  continueLabel?: string;
  backLabel?: string;
  showBack?: boolean;
}

export function PremiumFooter({
  onBack,
  onContinue,
  canContinue = true,
  isLoading = false,
  continueLabel = 'Continue',
  backLabel = 'Back',
  showBack = true,
}: PremiumFooterProps) {
  return (
    <View style={styles.container}>
      {showBack && onBack ? (
        <View style={styles.buttonRow}>
          <View style={styles.backButtonContainer}>
            <PremiumButton
              label={backLabel}
              onPress={onBack}
              variant="secondary"
            />
          </View>
          <View style={styles.continueButtonContainer}>
            <PremiumButton
              label={continueLabel}
              onPress={onContinue}
              disabled={!canContinue}
              loading={isLoading}
              variant="primary"
            />
          </View>
        </View>
      ) : (
        <PremiumButton
          label={continueLabel}
          onPress={onContinue}
          disabled={!canContinue}
          loading={isLoading}
          variant="primary"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: s.xl,
    paddingVertical: s.lg,
    backgroundColor: c.bg,
    borderTopWidth: 1,
    borderTopColor: c.border,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: s.md,
  },
  backButtonContainer: {
    flex: 1,
  },
  continueButtonContainer: {
    flex: 2,
  },
});
