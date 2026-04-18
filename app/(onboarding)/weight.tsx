import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { metriqfitTheme } from '../../lib/theme';
import { useOnboarding } from '../../lib/onboarding';
import { PremiumHeader, PremiumFooter } from '../../components/onboarding/premium';
import { RulerPicker } from '../../components/onboarding/RulerPicker';

const { spacing: s } = metriqfitTheme;
const CYAN = '#22D3EE';
const ORANGE = '#F97316';
const BG = '#050510';
const SURFACE = '#0A1128';

const LB_MIN = 70;
const LB_MAX = 500;
const KG_MIN = 32;
const KG_MAX = 227;

function lbToKg(lb: number): number { return Math.round(lb * 0.453592); }
function kgToLb(kg: number): number { return Math.round(kg / 0.453592); }

export default function WeightScreen() {
  const { data, updateData, setCurrentStep } = useOnboarding();

  const storedLb = data.current_weight_lb ?? 175;
  const storedTargetLb = data.target_weight_lb ?? storedLb;

  const [unit, setUnit] = useState<'lb' | 'kg'>('lb');
  const [rulerValue, setRulerValue] = useState(
    unit === 'lb' ? storedLb : lbToKg(storedLb),
  );
  const [targetRulerValue, setTargetRulerValue] = useState(
    unit === 'lb' ? storedTargetLb : lbToKg(storedTargetLb),
  );

  const isValid = data.current_weight_lb != null && data.target_weight_lb != null;

  const handleSwitchUnit = (newUnit: 'lb' | 'kg') => {
    if (newUnit === unit) return;
    if (newUnit === 'kg') {
      setRulerValue(Math.max(KG_MIN, Math.min(KG_MAX, lbToKg(rulerValue))));
      setTargetRulerValue(Math.max(KG_MIN, Math.min(KG_MAX, lbToKg(targetRulerValue))));
    } else {
      setRulerValue(Math.max(LB_MIN, Math.min(LB_MAX, kgToLb(rulerValue))));
      setTargetRulerValue(Math.max(LB_MIN, Math.min(LB_MAX, kgToLb(targetRulerValue))));
    }
    setUnit(newUnit);
  };

  const handleCurrentChange = useCallback(
    (value: number) => {
      setRulerValue(value);
      const asLb = unit === 'lb' ? value : kgToLb(value);
      updateData({ current_weight_lb: asLb });
    },
    [unit, updateData],
  );

  const handleTargetChange = useCallback(
    (value: number) => {
      setTargetRulerValue(value);
      const asLb = unit === 'lb' ? value : kgToLb(value);
      updateData({ target_weight_lb: asLb, target_weight_enabled: true });
    },
    [unit, updateData],
  );

  const formatDisplay = useCallback(
    (value: number): string => `${value}`,
    [],
  );

  const handleContinue = () => {
    if (isValid) {
      setCurrentStep(5);
      router.push('/(onboarding)/goals');
    }
  };

  const handleBack = () => {
    setCurrentStep(3);
    router.back();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.glowOrb} pointerEvents="none" />

      <PremiumHeader currentStep={4} totalSteps={7} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <MotiView
          from={{ opacity: 0, translateY: 24 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 400 } as any}
        >
          {/* Title */}
          <View style={styles.titleBlock}>
            <Text style={styles.titleLine1}>What is your</Text>
            <Text style={[styles.titleAccent, { color: ORANGE }]}>current weight?</Text>
          </View>

          {/* Unit toggle */}
          <View style={styles.unitToggleWrapper}>
            <View style={styles.unitToggle}>
              <Pressable
                style={[styles.unitBtn, unit === 'lb' && styles.unitBtnActive]}
                onPress={() => handleSwitchUnit('lb')}
              >
                <Text style={[styles.unitBtnText, unit === 'lb' && styles.unitBtnTextActive]}>lb</Text>
              </Pressable>
              <Pressable
                style={[styles.unitBtn, unit === 'kg' && styles.unitBtnActive]}
                onPress={() => handleSwitchUnit('kg')}
              >
                <Text style={[styles.unitBtnText, unit === 'kg' && styles.unitBtnTextActive]}>kg</Text>
              </Pressable>
            </View>
          </View>

          {/* Current weight ruler */}
          <RulerPicker
            min={unit === 'lb' ? LB_MIN : KG_MIN}
            max={unit === 'lb' ? LB_MAX : KG_MAX}
            step={1}
            initialValue={rulerValue}
            onChangeEnd={handleCurrentChange}
            formatDisplay={formatDisplay}
            accentColor={ORANGE}
          />
          <Text style={styles.unitHint}>{unit === 'lb' ? 'pounds' : 'kilograms'}</Text>

          {/* Target weight ruler */}
          <View style={styles.targetSection}>
            <Text style={styles.targetLabel}>Goal Weight</Text>
            <RulerPicker
              min={unit === 'lb' ? LB_MIN : KG_MIN}
              max={unit === 'lb' ? LB_MAX : KG_MAX}
              step={1}
              initialValue={targetRulerValue}
              onChangeEnd={handleTargetChange}
              formatDisplay={formatDisplay}
              accentColor={CYAN}
            />
            <Text style={styles.unitHint}>{unit === 'lb' ? 'pounds' : 'kilograms'}</Text>
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
    width: 350,
    height: 350,
    borderRadius: 175,
    backgroundColor: `${ORANGE}0A`,
    top: 60,
    alignSelf: 'center',
  },
  scrollContent: { flexGrow: 1, paddingBottom: 32 },
  titleBlock: { alignItems: 'center', marginBottom: 28, marginTop: s.lg, paddingHorizontal: s.xl },
  titleLine1: {
    fontSize: 26,
    fontFamily: 'Unbounded_700Bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  titleAccent: {
    fontSize: 26,
    fontFamily: 'Unbounded_700Bold',
    textAlign: 'center',
  },
  unitToggleWrapper: { alignItems: 'center', marginBottom: 40 },
  unitToggle: {
    flexDirection: 'row',
    backgroundColor: '#0A1128',
    borderRadius: 100,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  unitBtn: { paddingHorizontal: 28, paddingVertical: 10, borderRadius: 100 },
  unitBtnActive: {
    backgroundColor: ORANGE,
    shadowColor: ORANGE,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  } as any,
  unitBtnText: {
    fontSize: 15,
    fontFamily: 'Sora_600SemiBold',
    color: 'rgba(255,255,255,0.4)',
  },
  unitBtnTextActive: { color: BG },
  unitHint: {
    fontSize: 11,
    fontFamily: 'Sora_400Regular',
    color: 'rgba(255,255,255,0.3)',
    textAlign: 'center',
    marginTop: 12,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 28,
  },
  targetSection: { paddingTop: 8 },
  targetLabel: {
    fontSize: 12,
    fontFamily: 'Sora_600SemiBold',
    color: `${CYAN}CC`,
    letterSpacing: 1,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: 24,
  },
});
