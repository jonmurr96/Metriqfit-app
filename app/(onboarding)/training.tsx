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
import { useOnboarding, EquipmentAccess, MinutesPerWorkout, Injury, Weekday, SessionEmphasis, ProgressionPreference } from '../../lib/onboarding';
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

const INJURIES: { value: Injury; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'shoulders', label: 'Shoulders' },
  { value: 'knees', label: 'Knees' },
  { value: 'back', label: 'Back' },
  { value: 'wrists', label: 'Wrists' },
  { value: 'ankles', label: 'Ankles' },
  { value: 'hips', label: 'Hips' },
  { value: 'elbows', label: 'Elbows' },
  { value: 'neck', label: 'Neck' },
  { value: 'other', label: 'Other' },
];

type EquipmentConfig = {
  value: EquipmentAccess;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
};

type EmphasisConfig = {
  value: SessionEmphasis;
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
};

type ProgressionConfig = {
  value: ProgressionPreference;
  label: string;
  description: string;
};

const EMPHASIS: EmphasisConfig[] = [
  { value: 'strength',      label: 'Strength',      description: 'Max force, heavy compound lifts',       icon: 'barbell-outline',      color: ORANGE },
  { value: 'hypertrophy',   label: 'Hypertrophy',   description: 'Muscle size, moderate rep ranges',      icon: 'body-outline',         color: PURPLE },
  { value: 'balanced',      label: 'Balanced',      description: 'Mix of strength and muscle building',   icon: 'analytics-outline',    color: CYAN },
  { value: 'conditioning',  label: 'Conditioning',  description: 'Endurance, metabolic work, circuits',   icon: 'heart-outline',        color: '#22C55E' },
  { value: 'no_preference', label: 'No Preference', description: 'Let the AI decide what fits you best',  icon: 'sparkles-outline',     color: '#71717A' },
];

const PROGRESSIONS: ProgressionConfig[] = [
  { value: 'linear_overload', label: 'Linear Overload', description: 'Add weight each week — structured and simple' },
  { value: 'undulating',      label: 'Undulating',      description: 'Vary reps/load daily — keeps the body guessing' },
  { value: 'autoregulated',   label: 'Autoregulated',   description: 'Progress by feel — RPE-driven adjustments' },
  { value: 'no_preference',   label: 'No Preference',   description: 'AI selects based on your goal and experience' },
];

const EQUIPMENT: EquipmentConfig[] = [
  { value: 'full_gym',           label: 'Full Gym',         icon: 'barbell-outline',         color: PURPLE },
  { value: 'dumbbells_plus_bench',label: 'Dumbbells + Bench',icon: 'apps-outline',            color: CYAN },
  { value: 'dumbbells_only',     label: 'Dumbbells Only',   icon: 'fitness-outline',          color: '#38BDF8' },
  { value: 'bands_only',         label: 'Resistance Bands', icon: 'infinite-outline',         color: '#22C55E' },
  { value: 'bodyweight_only',    label: 'Bodyweight Only',  icon: 'body-outline',             color: ORANGE },
  { value: 'other',              label: 'Other',            icon: 'ellipsis-horizontal-outline', color: '#71717A' },
];

export default function TrainingScreen() {
  const { data, updateData, setCurrentStep } = useOnboarding();

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
    (data.equipment_access !== 'other' || !!data.equipment_other_text) &&
    (!data.injuries.includes('other') || !!data.injuries_other_text) &&
    !!data.session_emphasis;

  const handleDayToggle = (day: Weekday) => {
    const current = selectedDays;
    if (current.includes(day)) {
      // Don't allow dropping below 1 (UX guard — 2 is the min for valid)
      updateData({ training_days: current.filter((d) => d !== day) });
    } else {
      // Don't allow selecting more than 6
      if (current.length >= 6) return;
      updateData({ training_days: [...current, day] });
    }
  };

  const handleInjurySelect = (val: Injury) => {
    if (val === 'none') {
      updateData({ injuries: ['none'] });
      return;
    }
    let next = data.injuries.filter((i) => i !== 'none');
    if (next.includes(val)) {
      next = next.filter((i) => i !== val);
    } else {
      next = [...next, val];
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
                    accessibilityLabel={`${d.label}${sel ? ' — training day' : ' — rest day'}`}
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
              {INJURIES.map((inj) => {
                const sel = data.injuries.includes(inj.value);
                return (
                  <Pressable
                    key={inj.value}
                    style={[
                      styles.chip,
                      sel && (inj.value === 'none' ? styles.chipSelectedGreen : styles.chipSelectedOrange),
                    ]}
                    onPress={() => handleInjurySelect(inj.value)}
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
            {data.equipment_access === 'other' && (
              <TextInput
                style={styles.otherInput}
                placeholder="Describe your equipment..."
                placeholderTextColor="rgba(255,255,255,0.2)"
                value={data.equipment_other_text || ''}
                onChangeText={(t) => updateData({ equipment_other_text: t })}
              />
            )}
          </View>
          {/* Training Emphasis */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Training Emphasis</Text>
            <Text style={styles.sectionHint}>What should your workouts prioritise?</Text>
            {EMPHASIS.map((e) => {
              const sel = data.session_emphasis === e.value;
              return (
                <Pressable
                  key={e.value}
                  style={[styles.listCard, sel && { borderColor: e.color, backgroundColor: `${e.color}0D` }]}
                  onPress={() => updateData({ session_emphasis: e.value })}
                >
                  <View style={[styles.listIcon, { backgroundColor: sel ? e.color : `${e.color}20` }]}>
                    <Ionicons name={e.icon} size={20} color={sel ? BG : e.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.listLabel, sel && { color: e.color }]}>{e.label}</Text>
                    <Text style={styles.emphasisDesc}>{e.description}</Text>
                  </View>
                  {sel && (
                    <View style={[styles.radioSelected, { borderColor: e.color }]}>
                      <View style={[styles.radioDot, { backgroundColor: e.color }]} />
                    </View>
                  )}
                  {!sel && <View style={styles.radio} />}
                </Pressable>
              );
            })}
          </View>

          {/* Progression Style */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Progression Style</Text>
            <Text style={styles.sectionHint}>Optional · How should your plan advance week to week?</Text>
            <View style={styles.chipRowWrap}>
              {PROGRESSIONS.map((p) => {
                const sel = data.progression_preference === p.value;
                return (
                  <Pressable
                    key={p.value}
                    style={[styles.progressionCard, sel && styles.progressionCardSelected]}
                    onPress={() => updateData({ progression_preference: p.value })}
                  >
                    <Text style={[styles.progressionLabel, sel && styles.progressionLabelSelected]}>{p.label}</Text>
                    <Text style={[styles.progressionDesc, sel && styles.progressionDescSelected]}>{p.description}</Text>
                  </Pressable>
                );
              })}
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
  emphasisDesc: {
    fontSize: 12,
    fontFamily: 'Sora_400Regular',
    color: 'rgba(255,255,255,0.35)',
    marginTop: 2,
  },
  progressionCard: {
    width: '100%',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    backgroundColor: SURFACE,
    marginBottom: 8,
  },
  progressionCardSelected: {
    borderColor: CYAN,
    backgroundColor: `${CYAN}0D`,
  },
  progressionLabel: {
    fontSize: 14,
    fontFamily: 'Sora_600SemiBold',
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 3,
  },
  progressionLabelSelected: { color: CYAN },
  progressionDesc: {
    fontSize: 12,
    fontFamily: 'Sora_400Regular',
    color: 'rgba(255,255,255,0.3)',
  },
  progressionDescSelected: { color: `${CYAN}99` },
});
