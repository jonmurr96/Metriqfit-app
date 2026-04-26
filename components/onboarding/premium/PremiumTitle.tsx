import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Svg, { Defs, LinearGradient as SvgGradient, Stop, Text as SvgText } from 'react-native-svg';
import { metriqfitTheme } from '../../../lib/theme';

const { colors: c, spacing: s, gradients: g } = metriqfitTheme;

interface PremiumTitleProps {
  line1: string;
  line2Gradient: string;
  subtitle?: string;
}

export function PremiumTitle({ line1, line2Gradient, subtitle }: PremiumTitleProps) {
  const gradientId = React.useMemo(
    () => `onboarding-title-${line1}-${line2Gradient}`.replace(/[^a-z0-9_-]/gi, '').toLowerCase(),
    [line1, line2Gradient]
  );

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
      <View style={styles.gradientContainer} accessible accessibilityRole="header" accessibilityLabel={line2Gradient}>
        <Text style={[styles.titleGradient, styles.gradientTextSizer]}>
          {line2Gradient}
        </Text>
        <Svg
          pointerEvents="none"
          width="100%"
          height={styles.titleGradient.lineHeight as number}
          style={styles.gradientSvg}
        >
          <Defs>
            <SvgGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor={g.onboardingTitle[0]} />
              <Stop offset="100%" stopColor={g.onboardingTitle[1]} />
            </SvgGradient>
          </Defs>
          <SvgText
            x="0"
            y={30}
            fill={`url(#${gradientId})`}
            fontSize={styles.titleGradient.fontSize as number}
            fontFamily="Unbounded_700Bold"
            fontWeight="700"
          >
            {line2Gradient}
          </SvgText>
        </Svg>
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
    justifyContent: 'center',
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
  gradientTextSizer: {
    opacity: 0,
  },
  gradientSvg: {
    ...StyleSheet.absoluteFillObject,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Sora_400Regular',
    color: c.textMuted,
    marginTop: s.md,
    lineHeight: 22,
  },
});
