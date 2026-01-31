import { StyleSheet, View, Text, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import { useTokens } from '../../../lib/theme';
import { MacroDashboard } from '../../../components/dashboard/MacroDashboard';
import { TabBarIcon } from '../../../components/navigation/TabBarIcon';
import { GlassCard } from '../../../components/premium/GlassCard';
import { PremiumBackground } from '../../../components/premium/PremiumBackground';
import { RingIconButton } from '../../../components/common/RingIconButton';
import { NextWorkoutCard } from '../../../components/workout/NextWorkoutCard';
import { useTodaysWorkout, useActiveWorkoutPlan } from '../../../hooks/usePlan';
import { useStreak } from '../../../hooks/useUser';
import { useAuth } from '../../../lib/auth';


export default function HomeScreen() {
  const { c, s, ty, r, shadow } = useTokens();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: todaysWorkout } = useTodaysWorkout();
  const { data: activePlan, isLoading: isLoadingPlan, error: planError, refetch: refetchPlan } = useActiveWorkoutPlan();
  const { user } = useAuth();
  const { data: streak } = useStreak();

  // Quick Actions for Home
  const quickActions = [
    { label: 'Food', icon: 'fast-food-outline', onPress: () => router.push('/(tabs)/nutrition/food-search') },
    { label: 'Workout', icon: 'barbell-outline', onPress: () => router.push('/(tabs)/workout') },
    { label: 'Summary', icon: 'analytics-outline', onPress: () => router.push('/(tabs)/nutrition') },
    { label: 'Settings', icon: 'settings-outline', onPress: () => router.push('/settings') },
  ];

  return (
    <PremiumBackground>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + s.lg, paddingBottom: 100 }]}
      >
        <MotiView
          from={{ opacity: 0, translateY: -20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 500 }}
          style={[styles.header, { paddingHorizontal: s.xl }]}
        >
          <View>
            <Text
              style={[
                styles.greeting,
                {
                  color: c.textMuted,
                  fontFamily: ty.body.familyMedium,
                  fontSize: 11,
                  letterSpacing: 1.5,
                  textTransform: 'uppercase',
                },
              ]}
            >
              Today's Goals
            </Text>
            <Text
              style={[
                styles.title,
                {
                  color: c.text,
                  fontFamily: ty.heading.family,
                  fontSize: ty.sizes.h2,
                },
              ]}
            >
              MetriqFit
            </Text>
          </View>
          <View style={styles.headerButtons}>
            {/* Streak Counter */}
            <View style={[styles.headerButton, { flexDirection: 'row', gap: 4, width: 'auto', paddingHorizontal: 12, borderRadius: r.pill, borderWidth: 1, borderColor: `${c.primary}20` }]}>
              <TabBarIcon name="flame" color={c.primary} size={18} />
              <Text style={{ color: c.primary, fontFamily: ty.mono.family, fontSize: 14 }}>
                {streak || 0}
              </Text>
            </View>

            <Pressable
              style={[
                styles.headerButton,
                {
                  backgroundColor: 'transparent',
                  borderRadius: r.pill,
                  borderWidth: 2,
                  borderColor: `${c.primary}40`,
                },
              ]}
              onPress={() => router.push('/settings')}
            >
              <TabBarIcon name="person-circle-outline" color={c.primary} size={22} />
            </Pressable>
          </View>
        </MotiView>

        {/* Macro Dashboard */}
        <View style={[styles.dashboardContainer, { marginTop: s.xl }]}>
          <MacroDashboard />
        </View>

        {/* Quick Actions - Ring Icons */}
        <View style={[styles.section, { marginTop: s.xxl, paddingHorizontal: s.lg }]}>
          <MotiView
            from={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ type: 'timing', duration: 400, delay: 600 }}
          >
            <Text
              style={[
                styles.sectionTitle,
                {
                  color: c.textMuted,
                  fontFamily: ty.body.familySemibold,
                  fontSize: ty.sizes.sm,
                  letterSpacing: 1.5,
                  marginBottom: s.lg,
                },
              ]}
            >
              QUICK LOG
            </Text>
          </MotiView>

          {/* Ring Icon Buttons Row */}
          <View style={styles.ringIconsRow}>
            {quickActions.map((action, index) => (
              <RingIconButton
                key={action.label}
                icon={action.icon as any}
                label={action.label}
                onPress={action.onPress}
                size={64}
                delay={700 + index * 80}
              />
            ))}
          </View>
        </View>

        {/* Next Workout Card */}
        <View style={[styles.section, { marginTop: s.xl, paddingHorizontal: s.lg }]}>
          <NextWorkoutCard
            delay={1000}
            workoutName={todaysWorkout?.name || 'Rest Day'}
            workoutType={todaysWorkout ? 'Scheduled for today' : 'No workout planned'}
            duration={(todaysWorkout as any)?.duration_minutes || 0}
            calories={0} // Hide calories if 0 in component, or use estimate
            onPress={() => router.push({
              pathname: '/(tabs)/workout/day-preview',
              params: { dayId: todaysWorkout?.id }
            })}
          />
        </View>

        {/* Insight Banner */}
        <View style={[styles.section, { marginTop: s.lg, paddingHorizontal: s.lg }]}>
          <GlassCard intensity="light" animated delay={1100}>
            <View style={styles.insightContent}>
              <TabBarIcon name="analytics" color={c.accent} size={20} />
              <Text
                style={{
                  color: c.textMuted,
                  fontFamily: ty.body.family,
                  fontSize: ty.sizes.sm,
                  marginLeft: s.sm,
                  flex: 1,
                }}
              >
                You've logged <Text style={{ color: c.primary, fontFamily: ty.body.familySemibold }}>Today</Text>. Keep consistent!
              </Text>
            </View>
          </GlassCard>
        </View>
      </ScrollView>
    </PremiumBackground>
  );

}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    marginBottom: 2,
  },
  title: {
    letterSpacing: -0.5,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notificationDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 5,
  },
  dashboardContainer: {
    alignItems: 'center',
  },
  section: {},
  sectionTitle: {},
  ringIconsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-start',
  },
  insightContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
