import { StyleSheet, View, Text, Platform, ActivityIndicator, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../lib/auth/AuthProvider';
import { useTokens } from '../../lib/theme';
import { AnimatedCalorieRing } from '../../components/premium/AnimatedCalorieRing';
import { GlassCard } from '../../components/premium/GlassCard';
import { getDailyTotals } from '../../services/nutritionService';
import { getUserTargets } from '../../hooks/useUser';

interface MacroData {
  consumed: number;
  target: number;
}

export function MacroDashboard() {
  const { c, s, ty, r } = useTokens();
  const { user } = useAuth();
  const today = new Date().toISOString().split('T')[0];

  // Fetch user targets
  const {
    data: targets,
    isLoading: targetsLoading,
    error: targetsError,
    refetch: refetchTargets
  } = useQuery({
    queryKey: ['user-targets', user?.id],
    queryFn: () => getUserTargets(user!.id),
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch today's consumed totals
  const {
    data: consumed,
    isLoading: consumedLoading,
    error: consumedError,
    refetch: refetchConsumed
  } = useQuery({
    queryKey: ['nutrition-daily-total', user?.id, today],
    queryFn: () => getDailyTotals(user!.id, today),
    enabled: !!user,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Show error state
  if (targetsError || consumedError) {
    return (
      <View style={[styles.container, { paddingVertical: s.xl }]}>
        <Ionicons name="cloud-offline-outline" size={32} color={c.textMuted} />
        <Text
          style={{
            color: c.textMuted,
            fontFamily: ty.body.family,
            fontSize: ty.sizes.sm,
            marginTop: s.md,
            marginBottom: s.sm,
          }}
        >
          Failed to load dashboard data
        </Text>
        <Pressable
          onPress={() => {
            refetchTargets();
            refetchConsumed();
          }}
          style={{ padding: s.sm }}
        >
          <Text style={{ color: c.primary, fontFamily: ty.body.familySemibold }}>Tap to Retry</Text>
        </Pressable>
      </View>
    );
  }

  // Show loading state
  if (targetsLoading || consumedLoading) {
    return (
      <View style={[styles.container, { paddingVertical: s.xl }]}>
        <ActivityIndicator size="large" color={c.primary} />
        <Text
          style={{
            color: c.textMuted,
            fontFamily: ty.body.family,
            fontSize: ty.sizes.sm,
            marginTop: s.md,
          }}
        >
          Loading your stats...
        </Text>
      </View>
    );
  }

  // Use real data with fallbacks
  const data = {
    calories: { consumed: consumed?.calories || 0, target: targets?.calories || 2000 },
    protein: { consumed: Math.round(consumed?.protein || 0), target: targets?.protein_g || 150 },
    carbs: { consumed: Math.round(consumed?.carbs || 0), target: targets?.carbs_g || 200 },
    fat: { consumed: Math.round(consumed?.fat || 0), target: targets?.fat_g || 65 },
  };

  const proteinPercent = Math.round((data.protein.consumed / data.protein.target) * 100);
  const carbsPercent = Math.round((data.carbs.consumed / data.carbs.target) * 100);
  const fatPercent = Math.round((data.fat.consumed / data.fat.target) * 100);

  const macroCards = [
    {
      label: 'PROTEIN',
      consumed: data.protein.consumed,
      target: data.protein.target,
      percent: proteinPercent,
      colors: [c.macros.protein, c.macros.proteinDark] as [string, string],
      glowColor: c.macros.protein,
    },
    {
      label: 'CARBS',
      consumed: data.carbs.consumed,
      target: data.carbs.target,
      percent: carbsPercent,
      colors: [c.macros.carbs, c.macros.carbsDark] as [string, string],
      glowColor: c.macros.carbs,
    },
    {
      label: 'FAT',
      consumed: data.fat.consumed,
      target: data.fat.target,
      percent: fatPercent,
      colors: [c.macros.fat, c.macros.fatDark] as [string, string],
      glowColor: c.macros.fat,
    },
  ];

  return (
    <View style={styles.container}>
      <AnimatedCalorieRing
        consumed={data.calories.consumed}
        target={data.calories.target}
        size={260}
        strokeWidth={14}
        animationDelay={200}
      />

      <View style={[styles.macroCardsRow, { gap: s.sm, marginTop: s.xl }]}>
        {macroCards.map((macro, index) => (
          <GlassCard
            key={macro.label}
            intensity="light"
            animated={true}
            delay={800 + index * 100}
            style={styles.macroCard}
          >
            <LinearGradient
              colors={[`${macro.colors[0]}08`, 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />

            <View style={styles.macroCardHeader}>
              <Text
                style={{
                  color: c.textMuted,
                  fontFamily: ty.body.familySemibold,
                  fontSize: ty.sizes.xs,
                  letterSpacing: 1,
                }}
              >
                {macro.label}
              </Text>
              <Text
                style={{
                  color: macro.colors[0],
                  fontFamily: ty.mono.family,
                  fontSize: ty.sizes.sm,
                }}
              >
                {macro.percent}%
              </Text>
            </View>

            <View
              style={[
                styles.progressBarBg,
                {
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  borderRadius: 6,
                  marginTop: s.sm,
                  marginBottom: s.sm,
                }
              ]}
            >
              <MotiView
                from={{ width: '0%' }}
                animate={{ width: `${Math.min(100, macro.percent)}%` }}
                transition={{ type: 'timing', duration: 800, delay: 1000 + index * 100 }}
                style={styles.progressBarFill}
              >
                <View
                  style={[
                    styles.progressBarGlow,
                    {
                      backgroundColor: macro.glowColor,
                      shadowColor: macro.glowColor,
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: 0.8,
                      shadowRadius: 8,
                    },
                    Platform.OS === 'web' && {
                      boxShadow: `0 0 12px ${macro.glowColor}80, 0 0 20px ${macro.glowColor}40`,
                    } as any,
                  ]}
                >
                  <LinearGradient
                    colors={macro.colors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={StyleSheet.absoluteFill}
                  />
                </View>
              </MotiView>
            </View>

            <View style={styles.macroValues}>
              <Text
                style={{
                  color: c.text,
                  fontFamily: ty.mono.family,
                  fontSize: ty.sizes.lg,
                }}
              >
                {macro.consumed}g
              </Text>
              <Text
                style={{
                  color: c.textSubtle,
                  fontFamily: ty.body.family,
                  fontSize: ty.sizes.sm,
                }}
              >
                {' '}/ {macro.target}g
              </Text>
            </View>
          </GlassCard>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  macroCardsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
  },
  macroCard: {
    flex: 1,
  },
  macroCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressBarBg: {
    height: 8,
    width: '100%',
    overflow: 'visible',
  },
  progressBarFill: {
    height: 8,
    overflow: 'visible',
  },
  progressBarGlow: {
    height: 8,
    width: '100%',
    borderRadius: 6,
    overflow: 'hidden',
  },
  macroValues: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
});
