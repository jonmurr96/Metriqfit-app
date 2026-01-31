import React from 'react';
import { View, StyleSheet, ViewStyle, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { MotiView } from 'moti';
import { useTokens } from '../../lib/theme';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  intensity?: 'light' | 'medium' | 'strong';
  glowEffect?: boolean;
  animated?: boolean;
  delay?: number;
}

export function GlassCard({
  children,
  style,
  intensity = 'medium',
  glowEffect = false,
  animated = true,
  delay = 0,
}: GlassCardProps) {
  const { c, r, s, glass, shadow } = useTokens();

  const blurIntensity = {
    light: glass.blur.sm,
    medium: glass.blur.md,
    strong: glass.blur.lg,
  }[intensity];

  const bgOpacity = {
    light: 0.45,
    medium: 0.65,
    strong: 0.8,
  }[intensity];

  const cardStyle: ViewStyle = {
    borderRadius: r.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: glowEffect ? glass.borderGlow : glass.border,
    ...(glowEffect ? shadow.glow : shadow.subtle),
  };

  const innerContent = (
    <View style={[styles.inner, { padding: s.lg }]}>
      {children}
    </View>
  );

  const CardWrapper = animated ? MotiView : View;

  const animationProps = animated
    ? {
      from: { opacity: 0, scale: 0.95, translateY: 10 },
      animate: { opacity: 1, scale: 1, translateY: 0 },
      transition: {
        type: 'timing' as const,
        duration: 400,
        delay,
      },
    }
    : {};

  const renderNativeGlass = () => (
    <BlurView
      intensity={blurIntensity}
      tint="dark"
      style={styles.blur}
    >
      <View style={[styles.overlay, { backgroundColor: `rgba(10, 17, 40, ${bgOpacity * 0.7})` }]}>
        <LinearGradient
          colors={[
            'rgba(255, 255, 255, 0.04)',
            'transparent',
            'rgba(0, 0, 0, 0.25)',
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {innerContent}
      </View>
    </BlurView>
  );

  const renderWebGlass = () => (
    <View
      style={[
        styles.webGlass,
        {
          backgroundColor: `rgba(10, 17, 40, ${bgOpacity})`,
          // @ts-ignore
          backdropFilter: `blur(${blurIntensity}px)`,
          WebkitBackdropFilter: `blur(${blurIntensity}px)`,
        } as any,
      ]}
    >
      <LinearGradient
        colors={[
          'rgba(255, 255, 255, 0.03)',
          'transparent',
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {innerContent}
    </View>
  );

  return (
    <CardWrapper {...animationProps} style={[cardStyle, style]}>
      {Platform.OS === 'web' ? renderWebGlass() : renderNativeGlass()}
    </CardWrapper>
  );
}

const styles = StyleSheet.create({
  blur: {
    flex: 1,
  },
  overlay: {
    flex: 1,
  },
  inner: {
    flex: 1,
  },
  webGlass: {
    flex: 1,
    overflow: 'hidden',
  },
});
