import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
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
const BG = '#050510';

// Height ranges
const IN_MIN = 48;  // 4'0"
const IN_MAX = 96;  // 8'0"
const CM_MIN = 122;
const CM_MAX = 244;

function inchesToFtIn(totalInches: number): { ft: number; inches: number } {
  const ft = Math.floor(totalInches / 12);
  const inches = totalInches % 12;
  return { ft, inches };
}

function ftInToInches(ft: number, inches: number): number {
  return ft * 12 + inches;
}

function cmToInches(cm: number): number {
  return Math.round(cm / 2.54);
}

function inchesToCm(inches: number): number {
  return Math.round(inches * 2.54);
}

export default function HeightScreen() {
  const { data, updateData, setCurrentStep } = useOnboarding();

  // Internal tracking: total inches (source of truth)
  const storedInches =
    data.height_ft != null && data.height_in != null
      ? ftInToInches(data.height_ft, data.height_in)
      : 67; // default 5'7"

  const [unit, setUnit] = useState<'ft' | 'cm'>('ft');
  // Ruler value in current unit
  const [rulerValue, setRulerValue] = useState(
    unit === 'ft' ? storedInches : inchesToCm(storedInches),
  );

  const isValid = data.height_ft != null && data.height_in != null;

  const handleSwitchUnit = (newUnit: 'ft' | 'cm') => {
    if (newUnit === unit) return;
    // Convert current ruler value to the new unit
    if (newUnit === 'cm') {
      const asCm = inchesToCm(rulerValue);
      setRulerValue(Math.max(CM_MIN, Math.min(CM_MAX, asCm)));
    } else {
      const asIn = cmToInches(rulerValue);
      setRulerValue(Math.max(IN_MIN, Math.min(IN_MAX, asIn)));
    }
    setUnit(newUnit);
  };

  const handleRulerChange = useCallback(
    (value: number) => {
      setRulerValue(value);
      const totalInches = unit === 'ft' ? value : cmToInches(value);
      const { ft, inches } = inchesToFtIn(totalInches);
      updateData({ height_ft: ft, height_in: inches });
    },
    [unit, updateData],
  );

  const formatDisplay = useCallback(
    (value: number): string => {
      if (unit === 'ft') {
        const { ft, inches } = inchesToFtIn(value);
        return `${ft}'${inches}"`;
      }
      return `${value}`;
    },
    [unit],
  );

  const handleContinue = () => {
    if (isValid) {
      setCurrentStep(4);
      router.push('/(onboarding)/weight');
    }
  };

  const handleBack = () => {
    setCurrentStep(2);
    router.back();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.glowOrb} pointerEvents="none" />

      <PremiumHeader currentStep={3} totalSteps={7} />

      <MotiView
        from={{ opacity: 0, translateY: 24 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 400 } as any}
        style={styles.content}
      >
        {/* Title */}
        <View style={styles.titleBlock}>
          <Text style={styles.titleLine1}>What is your</Text>
          <Text style={[styles.titleAccent, { color: CYAN }]}>height?</Text>
        </View>

        {/* Unit toggle */}
        <View style={styles.unitToggleWrapper}>
          <View style={styles.unitToggle}>
            <Pressable
              style={[styles.unitBtn, unit === 'ft' && styles.unitBtnActive]}
              onPress={() => handleSwitchUnit('ft')}
            >
              <Text style={[styles.unitBtnText, unit === 'ft' && styles.unitBtnTextActive]}>ft</Text>
            </Pressable>
            <Pressable
              style={[styles.unitBtn, unit === 'cm' && styles.unitBtnActive]}
              onPress={() => handleSwitchUnit('cm')}
            >
              <Text style={[styles.unitBtnText, unit === 'cm' && styles.unitBtnTextActive]}>cm</Text>
            </Pressable>
          </View>
        </View>

        {/* Ruler */}
        <View style={styles.rulerWrapper}>
          <RulerPicker
            min={unit === 'ft' ? IN_MIN : CM_MIN}
            max={unit === 'ft' ? IN_MAX : CM_MAX}
            step={1}
            initialValue={rulerValue}
            onChangeEnd={handleRulerChange}
            formatDisplay={formatDisplay}
            accentColor={CYAN}
          />
          {/* Unit label under ruler */}
          <Text style={styles.unitHint}>{unit === 'ft' ? 'feet / inches' : 'centimeters'}</Text>
        </View>
      </MotiView>

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
    backgroundColor: `${CYAN}0E`,
    top: 80,
    alignSelf: 'center',
  },
  content: {
    flex: 1,
    alignItems: 'center',
  },
  titleBlock: {
    alignItems: 'center',
    marginBottom: 28,
    marginTop: s.lg,
  },
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
  unitToggleWrapper: {
    marginBottom: 48,
  },
  unitToggle: {
    flexDirection: 'row',
    backgroundColor: '#0A1128',
    borderRadius: 100,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  unitBtn: {
    paddingHorizontal: 28,
    paddingVertical: 10,
    borderRadius: 100,
  },
  unitBtnActive: {
    backgroundColor: CYAN,
    shadowColor: CYAN,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  } as any,
  unitBtnText: {
    fontSize: 15,
    fontFamily: 'Sora_600SemiBold',
    color: 'rgba(255,255,255,0.4)',
  },
  unitBtnTextActive: {
    color: BG,
  },
  rulerWrapper: {
    width: '100%',
    alignItems: 'center',
  },
  unitHint: {
    fontSize: 12,
    fontFamily: 'Sora_400Regular',
    color: 'rgba(255,255,255,0.3)',
    marginTop: 16,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});
