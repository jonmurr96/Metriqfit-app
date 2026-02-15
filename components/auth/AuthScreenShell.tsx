import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';

import { useTokens } from '../../lib/theme';
import { BrandMark } from '../branding/BrandMark';

interface AuthScreenShellProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  titleMode?: 'default' | 'brandAnimated';
}

export function AuthScreenShell({
  title,
  subtitle,
  children,
  footer,
  titleMode = 'default',
}: AuthScreenShellProps) {
  const { c, ty, s, r, gradients, animation, theme } = useTokens();
  const brandGradient = gradients.brand;
  const purpleBlueGradient = gradients.purpleBlue;
  const titleGradientStops = [
    purpleBlueGradient?.[0] ?? brandGradient[0],
    brandGradient[1],
    purpleBlueGradient?.[1] ?? brandGradient[2],
  ];
  const gradientTitleStyle =
    Platform.OS === 'web'
      ? ({
          backgroundImage: `linear-gradient(110deg, ${titleGradientStops[0]}, ${titleGradientStops[1]}, ${titleGradientStops[2]})`,
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          color: 'transparent',
        } as any)
      : ({ color: c.primary } as const);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]}>
      <LinearGradient
        colors={[`${c.primary}1A`, c.bg, `${c.surface}F0`]}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.atmosphereLayer, { pointerEvents: 'none' as const }]}>
        <View style={[styles.glowOrb, styles.orbTop, { backgroundColor: `${c.primary}24` }]} />
        <View style={[styles.glowOrb, styles.orbBottom, { backgroundColor: `${c.accent2}18` }]} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <MotiView
            from={{ opacity: 0, translateY: 16 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 480 }}
            style={[
              styles.card,
              {
                backgroundColor: `${c.surface}${theme.auth.panelOpacity}`,
                borderColor: `${c.primary}${theme.auth.panelBorderOpacity}`,
                borderRadius: r.lg,
                padding: s.xl,
                maxWidth: theme.auth.maxWidth,
              },
            ]}
          >
            <View style={styles.hero}>
              <BrandMark size="lg" glow="hero" />
              {titleMode === 'brandAnimated' ? (
                <MotiView
                  from={{ opacity: 0.9, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1.02 }}
                  transition={{
                    type: 'timing',
                    duration: animation.duration.verySlow * 2,
                    loop: true,
                    repeatReverse: true,
                  }}
                >
                  <Text
                    style={[
                      styles.title,
                      styles.brandTitle,
                      { fontFamily: ty.heading.family },
                      gradientTitleStyle,
                    ]}
                  >
                    {title}
                  </Text>
                </MotiView>
              ) : (
                <Text style={[styles.title, { color: c.text, fontFamily: ty.heading.family }]}>{title}</Text>
              )}
              <Text style={[styles.subtitle, { color: c.textMuted, fontFamily: ty.body.family }]}>{subtitle}</Text>
            </View>

            <View style={{ gap: s.md }}>{children}</View>

            {footer ? <View style={{ marginTop: s.lg }}>{footer}</View> : null}
          </MotiView>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  atmosphereLayer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  glowOrb: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 999,
  },
  orbTop: {
    top: -140,
    right: -70,
  },
  orbBottom: {
    bottom: -120,
    left: -120,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 22,
  },
  card: {
    alignSelf: 'center',
    width: '100%',
    borderWidth: 1,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 18,
    gap: 8,
  },
  title: {
    fontSize: 30,
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  brandTitle: {
    letterSpacing: -0.7,
    textTransform: 'none',
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
});
