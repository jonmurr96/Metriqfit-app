import React from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { metriqfitTheme } from '../../lib/theme';
import { useOnboarding } from '../../lib/onboarding';
import {
  PremiumHeader,
  PremiumTitle,
  PremiumTextInput,
  PremiumFooter,
} from '../../components/onboarding/premium';

const { onboarding: o, spacing: s } = metriqfitTheme;

export default function IdentityScreen() {
  const { data, updateData, setCurrentStep } = useOnboarding();

  const isValid = data.first_name && data.first_name.length >= 1 && data.last_name && data.last_name.length >= 1;

  const handleContinue = () => {
    if (isValid) {
      setCurrentStep(2);
      router.push('/(onboarding)/body-stats');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <PremiumHeader currentStep={1} totalSteps={5} showBack={false} />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 400 } as any}
            style={styles.content}
          >
            <PremiumTitle
              line1="What should we"
              line2Gradient="call you?"
              subtitle="Let's get to know you better"
            />

            <PremiumTextInput
              label="First Name"
              value={data.first_name || ''}
              onChangeText={(text) => updateData({ first_name: text })}
              placeholder="John"
              maxLength={30}
              autoCapitalize="words"
              autoComplete="given-name"
            />

            <PremiumTextInput
              label="Last Name"
              value={data.last_name || ''}
              onChangeText={(text) => updateData({ last_name: text })}
              placeholder="Smith"
              maxLength={30}
              autoCapitalize="words"
              autoComplete="family-name"
            />
          </MotiView>
        </ScrollView>

        <PremiumFooter
          onContinue={handleContinue}
          canContinue={!!isValid}
          showBack={false}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: o.bg,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: s.xl,
    paddingTop: s.lg,
  },
});
