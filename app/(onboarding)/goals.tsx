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
import { useOnboarding, GoalType, ActivityLevel, ExperienceLevel } from '../../lib/onboarding';
import { PremiumHeader, PremiumFooter } from '../../components/onboarding/premium';

const { spacing: s } = metriqfitTheme;
const CYAN = '#22D3EE';
const ORANGE = '#F97316';
const PURPLE = '#A855F7';
const BG = '#050510';
const SURFACE = '#0A1128';

type GoalConfig = {
  value: GoalType;
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
};

type ActivityConfig = {
  value: ActivityLevel;
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
};

type ExperienceConfig = {
  value: ExperienceLevel;
  label: string;
  sub: string;
  color: string;
};

const GOALS: GoalConfig[] = [
  { value: 'lose_weight',  label: 'Lose Weight', description: 'Burn fat, get lean',         icon: 'flame-outline',       color: ORANGE },
  { value: 'build_muscle', label: 'Build Muscle', description: 'Gain size and strength',     icon: 'trending-up-outline', color: '#22C55E' },
  { value: 'get_fitter',   label: 'Get Fitter',  description: 'Get healthier overall',      icon: 'fitness-outline',     color: '#38BDF8' },
];

const ACTIVITIES: ActivityConfig[] = [
  { value: 'sedentary',        label: 'Sedentary',          description: 'Mostly seated, low daily movement',           icon: 'laptop-outline' },
  { value: 'lightly_active',   label: 'Lightly Active',     description: 'Regular walking and light day-to-day movement', icon: 'walk-outline' },
  { value: 'moderately_active',label: 'Moderately Active',  description: 'On your feet often with solid daily movement',  icon: 'bicycle-outline' },
  { value: 'very_active',      label: 'Very Active',        description: 'High daily movement, physical job, or lots of steps', icon: 'barbell-outline' },
];

const EXPERIENCE: ExperienceConfig[] = [
  { value: 'beginner',     label: 'Beginner',      sub: '< 1 year',   color: '#22C55E' },
  { value: 'intermediate', label: 'Intermediate',  sub: '1-3 years',  color: ORANGE },
  { value: 'advanced',     label: 'Advanced',      sub: '3+ years',   color: PURPLE },
];

export default function GoalsScreen() {
  const { data, updateData, setCurrentStep } = useOnboarding();

  // Backward-compat: map old goal values to simplified UI values once
  React.useEffect(() => {
    const g = data.goal_type;
    if (g === 'gain_weight') updateData({ goal_type: 'build_muscle' });
    else if (g && ['maintain_weight', 'recomp', 'increase_endurance', 'general_fitness'].includes(g)) {
      updateData({ goal_type: 'get_fitter' });
    }
  }, []);

  const isValid =
    !!data.goal_type &&
    !!data.activity_level &&
    !!data.experience_level;

  const handleContinue = () => {
    if (isValid) {
      setCurrentStep(6);
      router.push('/(onboarding)/training');
    }
  };

  const handleBack = () => {
    setCurrentStep(4);
    router.back();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <PremiumHeader currentStep={5} totalSteps={7} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <MotiView
          from={{ opacity: 0, translateY: 24 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 400 } as any}
          style={styles.content}
        >
          {/* Title */}
          <View style={styles.titleBlock}>
            <Text style={styles.titleLine1}>What's your</Text>
            <Text style={[styles.titleAccent, { color: CYAN }]}>main goal?</Text>
          </View>

          {/* Goals */}
          <View style={styles.goalGrid}>
            {GOALS.map((g) => {
              const sel = data.goal_type === g.value;
              return (
                <Pressable
                  key={g.value}
                  style={[styles.goalCard, sel && { borderColor: g.color, backgroundColor: `${g.color}10` }]}
                  onPress={() => updateData({ goal_type: g.value })}
                >
                  <View style={[styles.goalIcon, { backgroundColor: sel ? g.color : `${g.color}20` }]}>
                    <Ionicons name={g.icon} size={22} color={sel ? BG : g.color} />
                  </View>
                  <Text style={[styles.goalLabel, sel && { color: g.color }]}>{g.label}</Text>
                  <Text style={styles.goalDesc}>{g.description}</Text>
                  {sel && <View style={[styles.goalDot, { backgroundColor: g.color }]} />}
                </Pressable>
              );
            })}
          </View>

          {/* Activity Level */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Daily Activity Level</Text>
            <Text style={styles.sectionHint}>Outside of structured workouts</Text>
            {ACTIVITIES.map((a) => {
              const sel = data.activity_level === a.value;
              return (
                <Pressable
                  key={a.value}
                  style={[styles.listCard, sel && styles.listCardSelected]}
                  onPress={() => updateData({ activity_level: a.value })}
                >
                  <View style={[styles.listIcon, sel && styles.listIconSelected]}>
                    <Ionicons name={a.icon} size={20} color={sel ? BG : `${CYAN}80`} />
                  </View>
                  <View style={styles.listText}>
                    <Text style={[styles.listLabel, sel && styles.listLabelSelected]}>{a.label}</Text>
                    <Text style={styles.listDesc}>{a.description}</Text>
                  </View>
                  {sel && (
                    <View style={styles.radioSelected}>
                      <View style={styles.radioDot} />
                    </View>
                  )}
                  {!sel && <View style={styles.radio} />}
                </Pressable>
              );
            })}
          </View>

          {/* Experience Level */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Training Experience</Text>
            <Text style={styles.sectionHint}>Affects your protein targets</Text>
            <View style={styles.expRow}>
              {EXPERIENCE.map((e) => {
                const sel = data.experience_level === e.value;
                return (
                  <Pressable
                    key={e.value}
                    style={[styles.expCard, sel && { borderColor: e.color, backgroundColor: `${e.color}10` }]}
                    onPress={() => updateData({ experience_level: e.value })}
                  >
                    <Text style={[styles.expLabel, sel && { color: e.color }]}>{e.label}</Text>
                    <Text style={styles.expSub}>{e.sub}</Text>
                    {sel && <View style={[styles.expDot, { backgroundColor: e.color }]} />}
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

  // Goal grid (2 cols)
  goalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 36,
  },
  goalCard: {
    width: '47.5%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 16,
    position: 'relative',
  },
  goalIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  goalLabel: {
    fontSize: 14,
    fontFamily: 'Sora_600SemiBold',
    color: '#FFFFFF',
    marginBottom: 3,
  },
  goalDesc: {
    fontSize: 11,
    fontFamily: 'Sora_400Regular',
    color: 'rgba(255,255,255,0.35)',
    lineHeight: 15,
  },
  goalDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  // Sections
  section: { marginBottom: 32 },
  sectionLabel: {
    fontSize: 12,
    fontFamily: 'Sora_600SemiBold',
    color: `${CYAN}CC`,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  sectionHint: {
    fontSize: 12,
    fontFamily: 'Sora_400Regular',
    color: 'rgba(255,255,255,0.3)',
    marginBottom: 14,
  },

  // List cards (activity)
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
  listCardSelected: {
    borderColor: CYAN,
    backgroundColor: `${CYAN}0A`,
  },
  listIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listIconSelected: { backgroundColor: CYAN },
  listText: { flex: 1 },
  listLabel: {
    fontSize: 15,
    fontFamily: 'Sora_600SemiBold',
    color: 'rgba(255,255,255,0.7)',
  },
  listLabelSelected: { color: CYAN },
  listDesc: {
    fontSize: 12,
    fontFamily: 'Sora_400Regular',
    color: 'rgba(255,255,255,0.3)',
    marginTop: 2,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  radioSelected: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: CYAN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: CYAN,
  },

  // Experience row
  expRow: { flexDirection: 'row', gap: 10 },
  expCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 18,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    backgroundColor: SURFACE,
    position: 'relative',
  },
  expLabel: {
    fontSize: 14,
    fontFamily: 'Sora_600SemiBold',
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 4,
  },
  expSub: {
    fontSize: 11,
    fontFamily: 'Sora_400Regular',
    color: 'rgba(255,255,255,0.3)',
  },
  expDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 4,
  },
});
