import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { metriqfitTheme } from '../../../lib/theme';
import { BrandMark } from '../../branding/BrandMark';

const { colors: c, spacing: s } = metriqfitTheme;

interface PremiumHeaderProps {
  currentStep: number;
  totalSteps: number;
  showBack?: boolean;
  onBack?: () => void;
}

export function PremiumHeader({ currentStep, totalSteps, showBack = true, onBack }: PremiumHeaderProps) {
  const progress = (currentStep / totalSteps) * 100;

  return (
    <View style={styles.container}>
      {showBack ? (
        <Pressable
          onPress={() => (onBack ? onBack() : router.back())}
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.backButtonPressed,
          ]}
        >
          <Ionicons name="chevron-back" size={20} color={c.primary} />
        </Pressable>
      ) : (
        <View style={styles.backPlaceholder} />
      )}

      <View style={styles.progressContainer}>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${progress}%` },
            ]}
          />
        </View>
      </View>

      <View style={styles.stepIndicator}>
        <BrandMark size="xs" glow="none" />
        <Text style={styles.stepText}>{currentStep}/{totalSteps}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: s.lg,
    paddingVertical: s.md,
    gap: s.md,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: `${c.primary}60`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonPressed: {
    backgroundColor: `${c.primary}15`,
    borderColor: c.primary,
  },
  backPlaceholder: {
    width: 44,
  },
  progressContainer: {
    flex: 1,
    marginHorizontal: s.sm,
  },
  progressTrack: {
    height: 4,
    backgroundColor: `${c.primary}20`,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: c.primary,
    borderRadius: 2,
    shadowColor: c.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 15,
    // Web specific strong glow
    boxShadow: `0 0 15px ${c.primary}, 0 0 30px ${c.primary}`,
  } as any,
  stepIndicator: {
    minWidth: 80,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 6,
  },
  stepText: {
    fontSize: 12,
    color: c.textMuted,
    fontFamily: 'Sora_500Medium',
  },
});
