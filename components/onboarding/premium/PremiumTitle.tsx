import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { metriqfitTheme } from '../../../lib/theme';

const { colors: c, spacing: s, type: ty, gradients: g } = metriqfitTheme;

interface PremiumTitleProps {
  line1: string;
  line2Gradient: string;
  subtitle?: string;
}

export function PremiumTitle({ line1, line2Gradient, subtitle }: PremiumTitleProps) {
  const renderGradientText = () => {
    if (Platform.OS === 'web') {
      return (
        <Text
          style={[
            styles.titleGradient,
            {
              backgroundImage: `linear-gradient(to right, ${g.onboardingTitle[0]}, ${g.onboardingTitle[1]})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            } as any,
          ]}
        >
          {line2Gradient}
        </Text>
      );
    }

    return (
      <View style={styles.gradientContainer}>
        <LinearGradient
          colors={g.onboardingTitle as any}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
        <Text style={[styles.titleGradient, { color: g.onboardingTitle[0] }]}>
          {line2Gradient}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.titleLine1}>{line1}</Text>
      {renderGradientText()}
      {subtitle && (
        <Text style={styles.subtitle}>{subtitle}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: s.xl,
  },
  gradientContainer: {
    position: 'relative',
  },
  titleLine1: {
    fontSize: 30,
    fontFamily: 'Unbounded_700Bold',
    color: c.text,
    lineHeight: 38,
  },
  titleGradient: {
    fontSize: 30,
    fontFamily: 'Unbounded_700Bold',
    lineHeight: 38,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Sora_400Regular',
    color: c.textMuted,
    marginTop: s.md,
    lineHeight: 22,
  },
});
