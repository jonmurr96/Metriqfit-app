import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
} from 'react-native';
import { useTokens } from '../../lib/theme';
import { useTargets } from '../../lib/targets/useTargets';
import { useDailyTotals } from '../../hooks/useNutrition';
import { toLocalDateKey } from '../../lib/home/dashboard-state';

interface MacroInputs {
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
}

const PRESETS: { label: string; values: MacroInputs }[] = [
  { label: 'Big restaurant dinner', values: { calories: '1200', protein: '45', carbs: '110', fat: '55' } },
  { label: 'Dessert / snack binge', values: { calories: '600', protein: '8', carbs: '80', fat: '25' } },
  { label: 'Drinks night', values: { calories: '500', protein: '2', carbs: '30', fat: '0' } },
  { label: 'Fast food meal', values: { calories: '900', protein: '30', carbs: '90', fat: '45' } },
  { label: 'Went over on carbs', values: { calories: '0', protein: '0', carbs: '80', fat: '0' } },
];

function parseNum(v: string) {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
}

export function MacroBudgeter() {
  const { c, ty, s, r } = useTokens();
  const [mode, setMode] = useState<'auto' | 'manual'>('manual');
  const [inputs, setInputs] = useState<MacroInputs>({
    calories: '',
    protein: '',
    carbs: '',
    fat: '',
  });

  const today = toLocalDateKey(new Date());
  const { targets, loading: targetsLoading } = useTargets();
  const { data: consumed, isLoading: consumedLoading } = useDailyTotals(today);

  const targetValues = {
    calories: targets?.calories || 0,
    protein: targets?.protein_g || 0,
    carbs: targets?.carbs_g || 0,
    fat: targets?.fat_g || 0,
  };

  const consumedValues = {
    calories: consumed?.calories || 0,
    protein: consumed?.protein || 0,
    carbs: consumed?.carbs || 0,
    fat: consumed?.fat || 0,
  };

  const manualValues = {
    calories: parseNum(inputs.calories),
    protein: parseNum(inputs.protein),
    carbs: parseNum(inputs.carbs),
    fat: parseNum(inputs.fat),
  };

  const remaining = useMemo(() => {
    if (mode === 'auto') {
      return {
        calories: targetValues.calories - consumedValues.calories,
        protein: targetValues.protein - consumedValues.protein,
        carbs: targetValues.carbs - consumedValues.carbs,
        fat: targetValues.fat - consumedValues.fat,
      };
    }
    return {
      calories: targetValues.calories - manualValues.calories,
      protein: targetValues.protein - manualValues.protein,
      carbs: targetValues.carbs - manualValues.carbs,
      fat: targetValues.fat - manualValues.fat,
    };
  }, [mode, targetValues, consumedValues, manualValues]);

  const status = useMemo(() => {
    const overCount = [remaining.calories, remaining.protein, remaining.carbs, remaining.fat].filter(
      (v) => v < -10
    ).length;
    if (overCount >= 2 || remaining.calories < -200) {
      return {
        color: c.danger || '#FF4D4D',
        bg: `${c.danger || '#FF4D4D'}16`,
        text: 'Over budget — keep dinner lean and skip any extra snacks.',
      };
    }
    if (overCount >= 1 || remaining.calories < -50) {
      return {
        color: c.warning,
        bg: `${c.warning}16`,
        text: 'Tight but recoverable — focus on protein and keep fat low.',
      };
    }
    return {
      color: c.success,
      bg: `${c.success}16`,
      text: 'On target — stay the course.',
    };
  }, [remaining, c.danger, c.warning, c.success]);

  const recoveryTips = useMemo(() => {
    const tips: string[] = [];
    if (remaining.calories < -50) tips.push('Keep dinner lean and simple.');
    if (remaining.protein < -10) tips.push('Prioritize 30–40g protein at your next meal.');
    else if (remaining.protein < 10) tips.push('Make protein the centerpiece of your next meal.');
    if (remaining.carbs < -10) tips.push('Go lighter on carbs for the rest of the day.');
    if (remaining.fat < -10) tips.push('Choose a low-fat option next.');
    if (tips.length === 0 && remaining.calories >= 0) tips.push('You are on track. Stick to your plan.');
    else if (tips.length === 0) tips.push('Watch your portions and stay consistent.');
    return tips;
  }, [remaining]);

  const isLoading = targetsLoading || consumedLoading;

  const displayValues = mode === 'auto' ? consumedValues : manualValues;

  const updateInput = (key: keyof MacroInputs, value: string) => {
    setInputs((prev) => ({ ...prev, [key]: value }));
  };

  const applyPreset = (preset: MacroInputs) => {
    setInputs(preset);
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: c.bg }]}>
        <Text style={{ color: c.textMuted, fontFamily: ty.body.family, textAlign: 'center', marginTop: s.xl }}>
          Loading your targets...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ padding: s.lg, paddingBottom: s.xl * 3 }}>
      {/* Mode Toggle */}
      <View style={[styles.toggleRow, { backgroundColor: c.surface2, borderRadius: r.pill, padding: 4 }]}>
        <Pressable
          onPress={() => setMode('auto')}
          style={[
            styles.toggleBtn,
            { backgroundColor: mode === 'auto' ? c.primary : 'transparent', borderRadius: r.pill },
          ]}
        >
          <Text style={{ color: mode === 'auto' ? c.bg : c.textMuted, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm }}>
            Auto
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setMode('manual')}
          style={[
            styles.toggleBtn,
            { backgroundColor: mode === 'manual' ? c.primary : 'transparent', borderRadius: r.pill },
          ]}
        >
          <Text style={{ color: mode === 'manual' ? c.bg : c.textMuted, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm }}>
            Manual
          </Text>
        </Pressable>
      </View>

      <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.sm, marginTop: s.md, textAlign: 'center' }}>
        {mode === 'auto'
          ? "Based on what you've already logged today."
          : 'Enter what you ate to see how it affects the rest of your day.'}
      </Text>

      {/* Inputs */}
      <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border, borderRadius: r.lg, marginTop: s.lg }]}>
        <View style={styles.inputsGrid}>
          <MacroInput
            label="Calories"
            value={mode === 'auto' ? String(Math.round(displayValues.calories)) : inputs.calories}
            onChangeText={(v) => updateInput('calories', v)}
            editable={mode === 'manual'}
            color={c.text}
          />
          <MacroInput
            label="Protein"
            value={mode === 'auto' ? String(Math.round(displayValues.protein)) : inputs.protein}
            onChangeText={(v) => updateInput('protein', v)}
            editable={mode === 'manual'}
            suffix="g"
            color={c.primary}
          />
          <MacroInput
            label="Carbs"
            value={mode === 'auto' ? String(Math.round(displayValues.carbs)) : inputs.carbs}
            onChangeText={(v) => updateInput('carbs', v)}
            editable={mode === 'manual'}
            suffix="g"
            color={c.warning}
          />
          <MacroInput
            label="Fat"
            value={mode === 'auto' ? String(Math.round(displayValues.fat)) : inputs.fat}
            onChangeText={(v) => updateInput('fat', v)}
            editable={mode === 'manual'}
            suffix="g"
            color={c.accent}
          />
        </View>
      </View>

      {/* Presets */}
      {mode === 'manual' && (
        <View style={{ marginTop: s.lg }}>
          <Text style={{ color: c.textMuted, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs, marginBottom: s.sm }}>
            QUICK PRESETS
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {PRESETS.map((preset) => (
              <Pressable
                key={preset.label}
                onPress={() => applyPreset(preset.values)}
                style={{
                  backgroundColor: c.surface2,
                  borderRadius: r.pill,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                }}
              >
                <Text style={{ color: c.text, fontFamily: ty.body.familyMedium, fontSize: ty.sizes.xs }}>
                  {preset.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {/* Results */}
      <View style={{ marginTop: s.xl }}>
        <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.md }}>
          Remaining budget
        </Text>

        <View style={[styles.statusBadge, { backgroundColor: status.bg, borderRadius: r.md, marginTop: s.sm }]}>
          <Text style={{ color: status.color, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm }}>
            {status.text}
          </Text>
        </View>

        <View style={styles.resultsGrid}>
          <ResultCard label="Calories" value={remaining.calories} unit="kcal" color={c.text} bg={c.surface} />
          <ResultCard label="Protein" value={remaining.protein} unit="g" color={c.primary} bg={`${c.primary}14`} />
          <ResultCard label="Carbs" value={remaining.carbs} unit="g" color={c.warning} bg={`${c.warning}14`} />
          <ResultCard label="Fat" value={remaining.fat} unit="g" color={c.accent} bg={`${c.accent}14`} />
        </View>

        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border, borderRadius: r.lg, marginTop: s.lg }]}>
          <Text style={{ color: c.textMuted, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs }}>
            RECOVERY SUGGESTIONS
          </Text>
          {recoveryTips.map((tip, idx) => (
            <View key={idx} style={{ flexDirection: 'row', marginTop: s.sm }}>
              <Text style={{ color: c.primary, marginRight: 6 }}>•</Text>
              <Text style={{ color: c.text, fontFamily: ty.body.family, fontSize: ty.sizes.sm, flex: 1 }}>
                {tip}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

function MacroInput({
  label,
  value,
  onChangeText,
  editable,
  suffix,
  color,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  editable: boolean;
  suffix?: string;
  color: string;
}) {
  const { c, ty, s } = useTokens();
  return (
    <View style={{ flex: 1, minWidth: '45%' }}>
      <Text style={{ color: c.textMuted, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs, marginBottom: 6 }}>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType="numeric"
        editable={editable}
        placeholder="0"
        placeholderTextColor={c.textSubtle}
        style={[
          styles.input,
          {
            color: editable ? color : c.textMuted,
            backgroundColor: c.surface2,
            fontFamily: ty.heading.familySemibold,
            opacity: editable ? 1 : 0.7,
          },
        ]}
      />
      {suffix ? (
        <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.xs, marginTop: 4 }}>{suffix}</Text>
      ) : null}
    </View>
  );
}

function ResultCard({
  label,
  value,
  unit,
  color,
  bg,
}: {
  label: string;
  value: number;
  unit: string;
  color: string;
  bg: string;
}) {
  const { c, ty, s, r } = useTokens();
  const isNegative = value < 0;
  return (
    <View
      style={[
        styles.resultCard,
        { backgroundColor: bg, borderRadius: r.md },
      ]}
    >
      <Text style={{ color, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs }}>{label}</Text>
      <Text
        style={{
          color: isNegative ? c.danger || '#FF4D4D' : c.text,
          fontFamily: ty.heading.familySemibold,
          fontSize: ty.sizes.lg,
          marginTop: s.xs,
        }}
      >
        {Math.round(value)}
        <Text style={{ fontSize: ty.sizes.sm, color: c.textMuted }}> {unit}</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  toggleRow: {
    flexDirection: 'row',
    alignSelf: 'center',
  },
  toggleBtn: {
    paddingHorizontal: 20,
    paddingVertical: 6,
  },
  card: {
    borderWidth: 1,
    padding: 16,
  },
  inputsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  input: {
    height: 48,
    borderRadius: 10,
    textAlign: 'center',
    fontSize: 22,
  },
  resultsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
  },
  resultCard: {
    flex: 1,
    minWidth: '45%',
    padding: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
});
