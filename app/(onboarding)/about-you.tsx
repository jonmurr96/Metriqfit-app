import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { metriqfitTheme } from '../../lib/theme';
import { useOnboarding } from '../../lib/onboarding';
import { PremiumHeader, PremiumFooter, PremiumDatePicker } from '../../components/onboarding/premium';

const { spacing: s } = metriqfitTheme;

const CYAN = '#22D3EE';
const BG = '#050510';
const SURFACE = '#0A1128';

export default function AboutYouScreen() {
  const { data, updateData, setCurrentStep } = useOnboarding();

  const minAgeDate = new Date(
    new Date().getFullYear() - 13,
    new Date().getMonth(),
    new Date().getDate()
  );
  const maxAgeDate = new Date(new Date().getFullYear() - 100, 0, 1);
  const dobAge = data.dob
    ? new Date().getFullYear() - new Date(data.dob).getFullYear()
    : null;
  const isValid = !!data.dob && !!data.sex && dobAge !== null && dobAge >= 13 && dobAge <= 100;

  const handleContinue = () => {
    if (isValid) {
      setCurrentStep(3);
      router.push('/(onboarding)/height');
    }
  };

  const handleBack = () => {
    setCurrentStep(1);
    router.back();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Ambient glow */}
      <View style={styles.glowOrb} pointerEvents="none" />

      <PremiumHeader currentStep={2} totalSteps={7} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <MotiView
          from={{ opacity: 0, translateY: 24 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 400 } as any}
          style={styles.content}
        >
          {/* Title */}
          <View style={styles.titleBlock}>
            <Text style={styles.titleLine1}>Tell us about</Text>
            <Text style={[styles.titleAccent, { color: CYAN }]}>yourself</Text>
            <Text style={styles.subtitle}>Used to calculate your personalised targets</Text>
          </View>

          {/* Date of Birth */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Date of Birth</Text>
            <PremiumDatePicker
              label=""
              value={data.dob}
              onChange={(date) => updateData({ dob: date })}
              placeholder="Select your date of birth"
              maximumDate={minAgeDate}
              minimumDate={maxAgeDate}
            />
            {data.dob && (dobAge === null || dobAge < 13 || dobAge > 100) && (
              <Text style={styles.dobError}>
                {dobAge !== null && dobAge < 13
                  ? 'You must be at least 13 years old to use MetriqFit.'
                  : 'Please enter a valid date of birth.'}
              </Text>
            )}
          </View>

          {/* Sex */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Biological Sex</Text>
            <Text style={styles.sectionHint}>Used for metabolic rate calculation</Text>
            <View style={styles.sexRow}>
              <Pressable
                style={[styles.sexCard, data.sex === 'male' && styles.sexCardSelected]}
                onPress={() => updateData({ sex: 'male' })}
              >
                <View style={[styles.sexIconRing, data.sex === 'male' && styles.sexIconRingSelected]}>
                  <Ionicons
                    name="male"
                    size={28}
                    color={data.sex === 'male' ? BG : `${CYAN}80`}
                  />
                </View>
                <Text style={[styles.sexLabel, data.sex === 'male' && styles.sexLabelSelected]}>
                  Male
                </Text>
                {data.sex === 'male' && (
                  <View style={styles.sexCheckDot}>
                    <Ionicons name="checkmark" size={12} color={BG} />
                  </View>
                )}
              </Pressable>

              <Pressable
                style={[styles.sexCard, data.sex === 'female' && styles.sexCardSelected]}
                onPress={() => updateData({ sex: 'female' })}
              >
                <View style={[styles.sexIconRing, data.sex === 'female' && styles.sexIconRingSelected]}>
                  <Ionicons
                    name="female"
                    size={28}
                    color={data.sex === 'female' ? BG : `${CYAN}80`}
                  />
                </View>
                <Text style={[styles.sexLabel, data.sex === 'female' && styles.sexLabelSelected]}>
                  Female
                </Text>
                {data.sex === 'female' && (
                  <View style={styles.sexCheckDot}>
                    <Ionicons name="checkmark" size={12} color={BG} />
                  </View>
                )}
              </Pressable>
            </View>
          </View>
        </MotiView>
      </ScrollView>

      <PremiumFooter
        onBack={handleBack}
        onContinue={handleContinue}
        canContinue={isValid}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  glowOrb: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: `${CYAN}12`,
    top: -100,
    right: -80,
  },
  scrollContent: { flexGrow: 1, paddingBottom: s.xl },
  content: { paddingHorizontal: s.xl, paddingTop: s.lg },
  titleBlock: { marginBottom: 36 },
  titleLine1: {
    fontSize: 30,
    fontFamily: 'Unbounded_700Bold',
    color: '#FFFFFF',
    lineHeight: 40,
  },
  titleAccent: {
    fontSize: 30,
    fontFamily: 'Unbounded_700Bold',
    lineHeight: 40,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Sora_400Regular',
    color: 'rgba(255,255,255,0.4)',
    marginTop: 12,
  },
  section: { marginBottom: 32 },
  sectionLabel: {
    fontSize: 12,
    fontFamily: 'Sora_600SemiBold',
    color: `${CYAN}CC`,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  sectionHint: {
    fontSize: 12,
    fontFamily: 'Sora_400Regular',
    color: 'rgba(255,255,255,0.3)',
    marginBottom: 16,
  },
  dobError: {
    marginTop: 8,
    fontSize: 12,
    fontFamily: 'Sora_400Regular',
    color: '#EF4444',
  },
  sexRow: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 4,
  },
  sexCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 28,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: SURFACE,
    position: 'relative',
  },
  sexCardSelected: {
    borderColor: CYAN,
    backgroundColor: `${CYAN}0D`,
    shadowColor: CYAN,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  } as any,
  sexIconRing: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  sexIconRingSelected: {
    borderColor: CYAN,
    backgroundColor: CYAN,
  },
  sexLabel: {
    fontSize: 16,
    fontFamily: 'Sora_600SemiBold',
    color: 'rgba(255,255,255,0.5)',
  },
  sexLabelSelected: {
    color: CYAN,
  },
  sexCheckDot: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: CYAN,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
