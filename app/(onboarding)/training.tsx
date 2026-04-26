import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { metriqfitTheme } from '../../lib/theme';
import { useOnboarding, EquipmentAccess, MinutesPerWorkout, Injury, Weekday } from '../../lib/onboarding';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { PremiumHeader, PremiumFooter } from '../../components/onboarding/premium';

const { spacing: s } = metriqfitTheme;
const CYAN = '#22D3EE';
const PURPLE = '#A855F7';
const ORANGE = '#F97316';
const BG = '#050510';
const SURFACE = '#0A1128';

// All 7 weekdays in display order — user taps which days they'll actually train
const WEEKDAY_OPTIONS: { value: Weekday; label: string; abbr: string }[] = [
  { value: 'mon', label: 'Monday',    abbr: 'M' },
  { value: 'tue', label: 'Tuesday',   abbr: 'T' },
  { value: 'wed', label: 'Wednesday', abbr: 'W' },
  { value: 'thu', label: 'Thursday',  abbr: 'Th' },
  { value: 'fri', label: 'Friday',    abbr: 'F' },
  { value: 'sat', label: 'Saturday',  abbr: 'Sa' },
  { value: 'sun', label: 'Sunday',    abbr: 'Su' },
];

const MINUTES: { value: MinutesPerWorkout; label: string }[] = [
  { value: '30', label: '30 min' },
  { value: '45', label: '45 min' },
  { value: '60', label: '60 min' },
  { value: '90_plus', label: '90+ min' },
];

const INJURIES_UI: { key: string; label: string; mapsTo: Injury[] }[] = [
  { key: 'none', label: 'None', mapsTo: ['none'] },
  { key: 'shoulders', label: 'Shoulders', mapsTo: ['shoulders'] },
  { key: 'lower_body_joints', label: 'Lower body (knees/hips)', mapsTo: ['knees', 'hips'] },
  { key: 'back', label: 'Back', mapsTo: ['back'] },
  { key: 'upper_body_joints', label: 'Upper body (wrists/elbows)', mapsTo: ['wrists', 'elbows'] },
  { key: 'ankles', label: 'Ankles', mapsTo: ['ankles'] },
  { key: 'neck', label: 'Neck', mapsTo: ['neck'] },
  { key: 'other', label: 'Other', mapsTo: ['other'] },
];

type EquipmentConfig = {
  value: EquipmentAccess;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
};

const EQUIPMENT: EquipmentConfig[] = [
  { value: 'full_gym',           label: 'Full Gym',         icon: 'barbell-outline',         color: PURPLE },
  { value: 'dumbbells_only',     label: 'Dumbbells',        icon: 'fitness-outline',         color: CYAN },
  { value: 'bodyweight_only',    label: 'Bodyweight Only',  icon: 'body-outline',            color: ORANGE },
];

export default function TrainingScreen() {
  const { data, updateData, setCurrentStep } = useOnboarding();
  const { user } = useAuth();

  // Backward-compat migrations
  React.useEffect(() => {
    // Merge old dumbbells options into single value
    if (data.equipment_access === 'dumbbells_plus_bench' || data.equipment_access === 'other') {
      updateData({ equipment_access: 'dumbbells_only' });
    }
    if ((data.equipment_access as string) === 'bands_only') {
      updateData({ equipment_access: 'bodyweight_only' });
    }
    // Complete combined injury sets if user has partial legacy selections
    const hasKnees = data.injuries.includes('knees');
    const hasHips = data.injuries.includes('hips');
    const hasWrists = data.injuries.includes('wrists');
    const hasElbows = data.injuries.includes('elbows');
    if ((hasKnees || hasHips) && !(hasKnees && hasHips)) {
      updateData({ injuries: Array.from(new Set([...data.injuries, 'knees', 'hips'])) });
    }
    if ((hasWrists || hasElbows) && !(hasWrists && hasElbows)) {
      updateData({ injuries: Array.from(new Set([...data.injuries, 'wrists', 'elbows'])) });
    }
  }, []);

  // Derive count and rest-day summary from explicit training_days selection
  const selectedDays = (data.training_days || []) as Weekday[];
  const trainingCount = selectedDays.length;
  const restDays = WEEKDAY_OPTIONS.filter((d) => !selectedDays.includes(d.value));

  const isValid =
    trainingCount >= 2 &&
    trainingCount <= 6 &&
    !!data.minutes_per_workout &&
    data.injuries.length > 0 &&
    !!data.equipment_access &&
    (!data.injuries.includes('other') || !!data.injuries_other_text);

  const handleDayToggle = (day: Weekday) => {
    const current = selectedDays;
    if (current.includes(day)) {
      updateData({ training_days: current.filter((d) => d !== day) });
    } else {
      if (current.length >= 6) return;
      updateData({ training_days: [...current, day] });
    }
  };

  const isInjurySelected = (mapsTo: Injury[]) => {
    if (mapsTo.length === 1) return data.injuries.includes(mapsTo[0]);
    return mapsTo.every((i) => data.injuries.includes(i));
  };

  const handleInjurySelect = (mapsTo: Injury[]) => {
    if (mapsTo.includes('none')) {
      updateData({ injuries: ['none'] });
      return;
    }
    const hasAll = mapsTo.every((i) => data.injuries.includes(i));
    let next: Injury[] = data.injuries.filter((i) => i !== 'none');
    if (hasAll) {
      next = next.filter((i) => !mapsTo.includes(i));
    } else {
      next = Array.from(new Set([...next, ...mapsTo]));
    }
    updateData({ injuries: next });
  };

  const handleContinue = () => {
    if (isValid) {
      // Derive training_days_per_week and preferred_days_off from explicit selections
      const derivedDaysOff = WEEKDAY_OPTIONS
        .filter((d) => !selectedDays.includes(d.value))
        .map((d) => d.value) as Weekday[];
      updateData({
        training_days_per_week: trainingCount,
        preferred_days_off: derivedDaysOff,
      });
      setCurrentStep(7);
      if (user?.id) {
        supabase
          .from('onboarding_answers')
          .upsert({ user_id: user.id, last_onboarding_step: 'nutrition' }, { onConflict: 'user_id' })
          .then(() => {});
      }
      router.push('/(onboarding)/nutrition');
    }
  };

  const handleBack = () => {
    setCurrentStep(5);
    router.back();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <PremiumHeader currentStep={6} totalSteps={7} />

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
            <Text style={styles.titleLine1}>Set up your</Text>
            <Text style={[styles.titleAccent, { color: PURPLE }]}>training</Text>
          </View>

          {/* Training days — direct day selection */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Training Days</Text>
            <Text style={styles.sectionHint}>
              {trainingCount === 0
                ? "Select 2\u20136 days you'll train each week"
                : trainingCount === 1
                ? '1 day selected \u2014 pick at least 2'
                : `${trainingCount} day${trainingCount > 1 ? 's' : ''} / week${restDays.length > 0 ? ' \u00b7 Rest: ' + restDays.map((d) => d.label.slice(0, 3)).join(', ') : ''}`}
            </Text>
            <View style={styles.weekdayRow}>
              {WEEKDAY_OPTIONS.map((d) => {
                const sel = selectedDays.includes(d.value);
                const atMax = !sel && trainingCount >= 6;
                return (
                  <Pressable
                    key={d.value}
                    style={[
                      styles.weekdayChip,
                      sel && styles.weekdayChipSelected,
                      atMax && styles.weekdayChipDisabled,
                    ]}
                    onPress={() => !atMax && handleDayToggle(d.value)}
                    accessibilityLabel={`${d.label}${sel ? ' \u2014 training day' : ' \u2014 rest day'}`}
                  >
                    <Text style={[styles.weekdayChipText, sel && styles.weekdayChipTextSelected]}>
                      {d.abbr}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {trainingCount > 3 && trainingCount < 7 && (
              <View style={styles.infoRow}>
                <Ionicons name="information-circle-outline" size={13} color={`${CYAN}99`} />
                <Text style={styles.infoText}>
                  {trainingCount >= 5
                    ? "High frequency \u2014 make sure you're getting adequate rest and sleep."
                    : 'Solid frequency for consistent progress.'}
                </Text>
              </View>
            )}
          </View>

          {/* Minutes per workout */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Duration / Session</Text>
            <View style={styles.chipRowWrap}>
              {MINUTES.map((m) => {
                const sel = data.minutes_per_workout === m.value;
                return (
                  <Pressable
                    key={m.value}
                    style={[styles.chip, sel && styles.chipSelected]}
                    onPress={() => updateData({ minutes_per_workout: m.value })}
                  >
                    <Text style={[styles.chipText, sel && styles.chipTextSelected]}>{m.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Injuries */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Injuries / Limitations</Text>
            <Text style={styles.sectionHint}>We'll modify exercises to protect you</Text>
            <View style={styles.chipRowWrap}>
              {INJURIES_UI.map((inj) => {
                const sel = isInjurySelected(inj.mapsTo);
                return (
                  <Pressable
                    key={inj.key}
                    style={[
                      styles.chip,
                      sel && (inj.key === 'none' ? styles.chipSelectedGreen : styles.chipSelectedOrange),
                    ]}
                    onPress={() => handleInjurySelect(inj.mapsTo)}
                  >
                    <Text style={[styles.chipText, sel && styles.chipTextSelected]}>{inj.label}</Text>
                  </Pressable>
                );
              })}
            </View>
            {data.injuries.includes('other') && (
              <TextInput
                style={styles.otherInput}
                placeholder="Describe your limitation..."
                placeholderTextColor="rgba(255,255,255,0.2)"
                value={data.injuries_other_text || ''}
                onChangeText={(t) => updateData({ injuries_other_text: t })}
              />
            )}
          </View>

          {/* Equipment */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Equipment Access</Text>
            {EQUIPMENT.map((eq) => {
              const sel = data.equipment_access === eq.value;
              return (
                <Pressable
                  key={eq.value}
                  style={[styles.listCard, sel && { borderColor: eq.color, backgroundColor: `${eq.color}0D` }]}
                  onPress={() => updateData({ equipment_access: eq.value })}
                >
                  <View style={[styles.listIcon, { backgroundColor: sel ? eq.color : `${eq.color}20` }]}>
                    <Ionicons name={eq.icon} size={20} color={sel ? BG : eq.color} />
                  </View>
                  <Text style={[styles.listLabel, sel && { color: eq.color }]}>{eq.label}</Text>
                  {sel && (
                    <View style={[styles.radioSelected, { borderColor: eq.color }]}>
                      <View style={[styles.radioDot, { backgroundColor: eq.color }]} />
                    </View>
                  )}
                  {!sel && <View style={styles.radio} />}
                </Pressable>
              );
            })}
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
  scrollContent: { flexGrow: 1, paddingBottom: 32 },
  content: { paddingHorizontal: s.xl, paddingTop: s.lg },
  titleBlock: { marginBottom: 28 },
  titleLine1: { fontSize: 28, fontFamily: 'Unbounded_700Bold', color: '#FFFFFF' },
  titleAccent: { fontSize: 28, fontFamily: 'Unbounded_700Bold' },
  section: { marginBottom: 32 },
  sectionLabel: {
    fontSize: 12,
    fontFamily: 'Sora_600SemiBold',
    color: `${CYAN}CC`,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  sectionHint: {
    fontSize: 12,
    fontFamily: 'Sora_400Regular',
    color: 'rgba(255,255,255,0.3)',
    marginTop: -8,
    marginBottom: 14,
  },
  chipRowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  // 7-day weekly training day toggle grid
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
    marginTop: 4,
  },
  weekdayChip: {
    flex: 1,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: SURFACE,
  },
  weekdayChipSelected: {
    backgroundColor: PURPLE,
    borderColor: PURPLE,
    shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
  } as any,
  weekdayChipDisabled: {
    opacity: 0.3,
  },
  weekdayChipText: {
    fontSize: 12,
    fontFamily: 'Sora_700Bold',
    color: 'rgba(255,255,255,0.45)',
  },
  weekdayChipTextSelected: { color: '#FFFFFF' },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 10,
    paddingHorizontal: 2,
  },
  infoText: {
    flex: 1,
    fontSize: 11,
    fontFamily: 'Sora_400Regular',
    color: `${CYAN}80`,
    lineHeight: 16,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: SURFACE,
    marginBottom: 4,
  },
  chipSelected: {
    backgroundColor: CYAN,
    borderColor: CYAN,
    shadowColor: CYAN,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  } as any,
  chipSelectedOrange: {
    backgroundColor: ORANGE,
    borderColor: ORANGE,
  },
  chipSelectedGreen: {
    backgroundColor: '#22C55E',
    borderColor: '#22C55E',
  },
  chipText: {
    fontSize: 13,
    fontFamily: 'Sora_500Medium',
    color: 'rgba(255,255,255,0.5)',
  },
  chipTextSelected: { color: BG },
  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    backgroundColor: SURFACE,
    marginBottom: 8,
    gap: 12,
  },
  listIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listLabel: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Sora_600SemiBold',
    color: 'rgba(255,255,255,0.7)',
  },
  radio: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)',
  },
  radioSelected: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, alignItems: 'center', justifyContent: 'center',
  },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  otherInput: {
    marginTop: 10,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: `${CYAN}40`,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: 'Sora_400Regular',
    color: '#FFFFFF',
  },
});
