import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MotiView } from 'moti';

import { useTokens } from '../../lib/theme';
import { BrandMark } from '../branding/BrandMark';
import { AuthBackground } from './AuthBackground';

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
  const { c, ty, s } = useTokens();

  return (
    <SafeAreaView className="flex-1">
      <AuthBackground />

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
            paddingHorizontal: 24,
            paddingTop: 28,
            paddingBottom: 60,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentInset={{ bottom: 40 }}
          scrollIndicatorInsets={{ bottom: 40 }}
        >
          {/* Hero Section */}
          <View className="items-center mb-8 gap-[10px]">
            <MotiView
              from={{ scale: 1 }}
              animate={{ scale: [1, 1.03, 1] }}
              transition={{
                type: 'timing',
                duration: 4000,
                loop: true,
                repeatReverse: false,
              }}
            >
              <BrandMark size="xl" glow="hero" />
            </MotiView>

            {/* Logo glow backdrop */}
            <View
              className="absolute w-[200px] h-[200px] rounded-full"
              style={{ top: -20, zIndex: -1, backgroundColor: `${c.primary}15` }}
              pointerEvents="none"
            />

            {/* Title */}
            {titleMode === 'brandAnimated' ? (
              <MotiView
                from={{ opacity: 0, translateY: 8 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'timing', duration: 600, delay: 200 }}
              >
                <Text
                  style={{
                    fontSize: 32,
                    textAlign: 'center',
                    letterSpacing: -0.5,
                    marginTop: 4,
                    color: c.primary,
                    fontFamily: ty.heading.family,
                    textShadowColor: `${c.primary}40`,
                    textShadowRadius: 20,
                    textShadowOffset: { width: 0, height: 0 },
                  }}
                >
                  {title}
                </Text>
              </MotiView>
            ) : (
              <MotiView
                from={{ opacity: 0, translateY: 8 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'timing', duration: 600, delay: 200 }}
              >
                <Text
                  style={{
                    fontSize: 32,
                    textAlign: 'center',
                    letterSpacing: -0.5,
                    marginTop: 4,
                    color: c.text,
                    fontFamily: ty.heading.family,
                  }}
                >
                  {title}
                </Text>
              </MotiView>
            )}

            {/* Subtitle */}
            <MotiView
              from={{ opacity: 0, translateY: 6 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'timing', duration: 600, delay: 350 }}
            >
              <Text
                className="text-sm text-center leading-[22px]"
                style={{ letterSpacing: 0.2, color: c.textMuted, fontFamily: ty.body.family }}
              >
                {subtitle}
              </Text>
            </MotiView>
          </View>

          {/* Form Content */}
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 600, delay: 450 }}
            className="w-full max-w-[420px] self-center"
          >
            <View style={{ gap: s.md }}>{children}</View>
          </MotiView>

          {/* Footer */}
          {footer ? (
            <MotiView
              from={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ type: 'timing', duration: 500, delay: 700 }}
              className="mt-6 items-center"
            >
              {footer}
            </MotiView>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
