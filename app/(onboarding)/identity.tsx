import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TextInput,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';
import { metriqfitTheme } from '../../lib/theme';
import { useOnboarding } from '../../lib/onboarding';
import { PremiumHeader, PremiumFooter } from '../../components/onboarding/premium';

const { colors: c, spacing: s } = metriqfitTheme;

const CYAN = '#22D3EE';

export default function IdentityScreen() {
  const { data, updateData, setCurrentStep } = useOnboarding();
  const isValid =
    !!data.first_name && data.first_name.trim().length >= 1 &&
    !!data.last_name && data.last_name.trim().length >= 1;

  const handleContinue = () => {
    if (isValid) {
      setCurrentStep(2);
      router.push('/(onboarding)/about-you');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Ambient glow */}
      <View style={styles.glowContainer} pointerEvents="none">
        <View style={[styles.glowOrb, { backgroundColor: `${CYAN}18`, top: -60, left: -60 }]} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <PremiumHeader currentStep={1} totalSteps={7} showBack={false} />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <MotiView
            from={{ opacity: 0, translateY: 24 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 450 } as any}
            style={styles.content}
          >
            {/* Title */}
            <View style={styles.titleBlock}>
              <Text style={styles.titleLine1}>What should we</Text>
              <Text style={[styles.titleGradient, { color: CYAN }]}>call you?</Text>
              <Text style={styles.subtitle}>Let's personalise your experience</Text>
            </View>

            {/* First Name */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>First Name</Text>
              <View style={[styles.inputWrapper, data.first_name ? styles.inputWrapperActive : null]}>
                <TextInput
                  style={styles.input}
                  placeholder="John"
                  placeholderTextColor="rgba(255,255,255,0.2)"
                  value={data.first_name || ''}
                  onChangeText={(t) => updateData({ first_name: t })}
                  autoCapitalize="words"
                  autoComplete="given-name"
                  maxLength={30}
                  returnKeyType="next"
                />
                {!!data.first_name && (
                  <View style={styles.inputAccentLine} />
                )}
              </View>
            </View>

            {/* Last Name */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Last Name</Text>
              <View style={[styles.inputWrapper, data.last_name ? styles.inputWrapperActive : null]}>
                <TextInput
                  style={styles.input}
                  placeholder="Smith"
                  placeholderTextColor="rgba(255,255,255,0.2)"
                  value={data.last_name || ''}
                  onChangeText={(t) => updateData({ last_name: t })}
                  autoCapitalize="words"
                  autoComplete="family-name"
                  maxLength={30}
                  returnKeyType="done"
                  onSubmitEditing={handleContinue}
                />
                {!!data.last_name && (
                  <View style={styles.inputAccentLine} />
                )}
              </View>
            </View>
          </MotiView>
        </ScrollView>

        <PremiumFooter
          onContinue={handleContinue}
          canContinue={isValid}
          showBack={false}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050510',
  },
  flex: { flex: 1 },
  glowContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  glowOrb: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: s.xl,
  },
  content: {
    flex: 1,
    paddingHorizontal: s.xl,
    paddingTop: s.xl,
  },
  titleBlock: {
    marginBottom: 40,
  },
  titleLine1: {
    fontSize: 30,
    fontFamily: 'Unbounded_700Bold',
    color: '#FFFFFF',
    lineHeight: 40,
  },
  titleGradient: {
    fontSize: 30,
    fontFamily: 'Unbounded_700Bold',
    lineHeight: 40,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Sora_400Regular',
    color: 'rgba(255,255,255,0.45)',
    marginTop: 12,
  },
  fieldGroup: {
    marginBottom: 28,
  },
  fieldLabel: {
    fontSize: 12,
    fontFamily: 'Sora_600SemiBold',
    color: `${CYAN}CC`,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  inputWrapper: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    backgroundColor: '#0A1128',
    overflow: 'hidden',
  },
  inputWrapperActive: {
    borderColor: `${CYAN}50`,
    backgroundColor: `${CYAN}06`,
  },
  input: {
    height: 58,
    paddingHorizontal: 20,
    fontSize: 17,
    fontFamily: 'Sora_500Medium',
    color: '#FFFFFF',
  },
  inputAccentLine: {
    height: 2,
    backgroundColor: CYAN,
    marginHorizontal: 20,
    marginBottom: 8,
    borderRadius: 1,
    shadowColor: CYAN,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  } as any,
});
