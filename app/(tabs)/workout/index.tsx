import { useCallback, useEffect, useMemo } from 'react';
import { Alert, AppState, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { useQueryClient } from '@tanstack/react-query';

import { useTokens } from '../../../lib/theme';
import { useAuth } from '../../../lib/auth/AuthProvider';
import { PremiumBackground } from '../../../components/premium/PremiumBackground';
import { GlassCard } from '../../../components/premium/GlassCard';
import { WorkoutWeekStrip } from '../../../components/workout/home/WorkoutWeekStrip';
import { WorkoutQuickAccessRow } from '../../../components/workout/home/WorkoutQuickAccessRow';
import { WorkoutToolsGrid } from '../../../components/workout/home/WorkoutToolsGrid';
import { WorkoutPrimaryActionCard } from '../../../components/workout/home/WorkoutPrimaryActionCard';
import { WorkoutUtilityTile } from '../../../components/workout/home/WorkoutUtilityTile';
import { useWorkoutDashboard } from '../../../hooks/useWorkoutDashboard';
import { planKeys, useMarkDayCompleted } from '../../../hooks/usePlan';
import { useFinishSession, workoutKeys } from '../../../hooks/useWorkout';
import type { WorkoutActionKey } from '../../../lib/workout/dashboard-state';
import { getActiveSession } from '../../../services/workoutService';
import {
  trackWorkoutHomeHeroRendered,
  trackWorkoutHomeHeroTapped,
  trackWorkoutHomeQuickAccessTapped,
  trackWorkoutHomeResumeTapped,
  trackWorkoutHomeToolTapped,
  trackWorkoutHomeViewed,
  trackWorkoutRecommendationRendered,
} from '../../../lib/analytics/analyticsService';

export default function WorkoutHomeScreen() {
  const { c, s, ty, r, animation } = useTokens();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const dashboard = useWorkoutDashboard();
  const finishSession = useFinishSession();
  const markDayCompleted = useMarkDayCompleted();
  const activeSessionId = dashboard.raw.activeSession?.id;
  const activeSessionPlanDayId = dashboard.raw.activeSession?.plan_day_id;

  const isBusy = finishSession.isPending || markDayCompleted.isPending;

  const refreshWorkoutHomeState = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: workoutKeys.activeSession() });
    queryClient.invalidateQueries({ queryKey: planKeys.workout() });
  }, [queryClient]);

  useFocusEffect(
    useCallback(() => {
      refreshWorkoutHomeState();
    }, [refreshWorkoutHomeState]),
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        refreshWorkoutHomeState();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [refreshWorkoutHomeState]);

  useEffect(() => {
    trackWorkoutHomeViewed({
      has_plan: !!dashboard.raw.activePlan,
      hero_mode: dashboard.state.hero.mode,
      has_active_session: !!dashboard.raw.activeSession,
    });
  }, [dashboard.raw.activePlan, dashboard.raw.activeSession, dashboard.state.hero.mode]);

  useEffect(() => {
    trackWorkoutHomeHeroRendered({
      mode: dashboard.state.hero.mode,
      primary_action: dashboard.state.hero.primaryAction,
    });
  }, [dashboard.state.hero.mode, dashboard.state.hero.primaryAction]);

  useEffect(() => {
    if (dashboard.state.coachQueue.mode !== 'recommendations') return;

    trackWorkoutRecommendationRendered({
      recommendation_count: dashboard.state.coachQueue.items.length,
      top_recommendation: dashboard.state.coachQueue.items[0]?.recommendationType,
    });
  }, [dashboard.state.coachQueue]);

  const handleFinishSession = useCallback(() => {
    const sessionId = activeSessionId;

    if (!sessionId) return;

    Alert.alert(
      'Finish Workout',
      'All planned work is logged. Finish this session now?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Finish',
          onPress: async () => {
            try {
              await finishSession.mutateAsync({ sessionId });

              if (activeSessionPlanDayId) {
                try {
                  await markDayCompleted.mutateAsync(activeSessionPlanDayId);
                } catch (error) {
                  console.warn('Failed to mark plan day complete from workout home', error);
                }
              }

              trackWorkoutHomeHeroTapped({ action: 'finish_session', mode: dashboard.state.hero.mode });
              router.push({
                pathname: '/(tabs)/workout/summary',
                params: { sessionId },
              });
            } catch (error: any) {
              Alert.alert('Unable to finish workout', error?.message || 'Try again.');
            }
          },
        },
      ],
    );
  }, [
    activeSessionId,
    activeSessionPlanDayId,
    dashboard.state.hero.mode,
    finishSession,
    markDayCompleted,
    router,
  ]);

  const handleResumeSession = useCallback(async () => {
    trackWorkoutHomeResumeTapped({ mode: dashboard.state.hero.mode });

    if (!user?.id) {
      router.push('/(tabs)/workout/my-plan');
      return;
    }

    const latestActiveSession = await queryClient.fetchQuery({
      queryKey: workoutKeys.activeSession(),
      queryFn: () => getActiveSession(user.id),
    });

    if (latestActiveSession?.id && (latestActiveSession.exercises?.length || 0) > 0) {
      router.push('/(tabs)/workout/active-session');
      return;
    }

    await queryClient.invalidateQueries({ queryKey: workoutKeys.all });
    Alert.alert(
      'Session unavailable',
      'That unfinished session expired when the day rolled over. Open your plan to start the correct workout for today.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open Plan',
          onPress: () => router.push('/(tabs)/workout/my-plan'),
        },
      ],
    );
  }, [dashboard.state.hero.mode, queryClient, router, user?.id]);

  const runAction = useCallback((action: WorkoutActionKey) => {
    switch (action) {
      case 'resume_session':
        void handleResumeSession();
        return;
      case 'finish_session':
        handleFinishSession();
        return;
      case 'start_workout':
        trackWorkoutHomeHeroTapped({ action, mode: dashboard.state.hero.mode });
        if (dashboard.raw.todayEntry?.session_type === 'workout' && dashboard.raw.todayEntry.plan_day_id) {
          router.push({
            pathname: '/(tabs)/workout/day-preview',
            params: { dayId: dashboard.raw.todayEntry.plan_day_id },
          });
          return;
        }
        router.push('/(tabs)/workout/my-plan');
        return;
      case 'view_summary': {
        trackWorkoutHomeHeroTapped({ action, mode: dashboard.state.hero.mode });
        const sessionId = dashboard.state.hero.completedSessionId || dashboard.raw.todayEntry?.completed_session_id;
        if (!sessionId) {
          router.push('/(tabs)/workout/workout-history');
          return;
        }
        router.push({
          pathname: '/(tabs)/workout/summary',
          params: { sessionId },
        });
        return;
      }
      case 'open_plan':
        trackWorkoutHomeHeroTapped({ action, mode: dashboard.state.hero.mode });
        router.push('/(tabs)/workout/my-plan');
        return;
      case 'browse_programs':
      case 'open_programs':
        trackWorkoutHomeHeroTapped({ action, mode: dashboard.state.hero.mode });
        router.push('/(tabs)/workout/program-browser');
        return;
      case 'generate_plan':
        trackWorkoutHomeHeroTapped({ action, mode: dashboard.state.hero.mode });
        router.push('/(tabs)/workout/my-plan');
        return;
      case 'open_adaptation':
        router.push('/(tabs)/workout/adaptation');
        return;
      case 'open_history':
        router.push('/(tabs)/workout/workout-history');
        return;
      case 'open_tools':
        router.push('/(tabs)/workout/tools');
        return;
      case 'open_notes':
        trackWorkoutHomeHeroTapped({ action, mode: dashboard.state.hero.mode });
        router.push('/(tabs)/workout/workout-notes');
        return;
      case 'open_exercise_library':
        router.push('/(tabs)/workout/exercise-library');
        return;
      case 'open_program_builder':
        router.push('/(tabs)/workout/program-builder');
        return;
      case 'import_plan':
        router.push('/(tabs)/workout/import-plan');
        return;
      case 'open_one_rep_max':
        router.push('/(tabs)/workout/calculators/one-rep-max');
        return;
      case 'open_plate_calculator':
        router.push('/(tabs)/workout/calculators/plate-calculator');
        return;
      default:
        return;
    }
  }, [
    dashboard.raw.todayEntry,
    dashboard.state.hero.completedSessionId,
    dashboard.state.hero.mode,
    handleResumeSession,
    handleFinishSession,
    router,
  ]);

  const quickActions = useMemo(
    () => dashboard.state.compact.quickActions.map((item) => ({
      label: item.label,
      icon: item.icon,
      onPress: () => {
        trackWorkoutHomeQuickAccessTapped({ slot: 'quick_action', label: item.label });
        runAction(item.action);
      },
    })),
    [dashboard.state.compact.quickActions, runAction],
  );

  const resourceItems = useMemo(
    () => dashboard.state.compact.resources.map((item) => ({
      label: item.label,
      icon: item.icon,
      onPress: () => {
        trackWorkoutHomeToolTapped({ slot: 'resource', action: item.label });
        runAction(item.action);
      },
    })),
    [dashboard.state.compact.resources, runAction],
  );

  const isInitialLoading =
    dashboard.isLoading
    && !dashboard.raw.activePlan
    && !dashboard.raw.activeSession
    && !dashboard.raw.todayEntry
    && dashboard.raw.history.length === 0;

  return (
    <PremiumBackground variant="default">
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + s.lg, paddingBottom: 120 }]}
      >
        <MotiView
          from={{ opacity: 0, translateY: -10 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: animation.duration.normal }}
          style={[styles.header, { paddingHorizontal: s.lg }]}
        >
          <View style={{ gap: s.xs, flex: 1, minWidth: 0, paddingRight: s.sm }}>
            <Text
              style={{
                color: c.textMuted,
                fontFamily: ty.body.familySemibold,
                fontSize: ty.sizes.xs,
                letterSpacing: 1.4,
              }}
            >
              WORKOUT
            </Text>
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
              style={{
                color: c.text,
                fontFamily: ty.heading.family,
                fontSize: ty.sizes.h2,
                letterSpacing: -0.5,
              }}
            >
              {dashboard.dateLabel}
            </Text>
          </View>

          <View
            style={{
              paddingHorizontal: s.sm,
              paddingVertical: s.xs,
              borderRadius: r.pill,
              backgroundColor: `${c.primary}14`,
              borderWidth: 1,
              borderColor: `${c.primary}33`,
              flexShrink: 0,
              maxWidth: '38%',
            }}
          >
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
              style={{
                color: c.primary,
                fontFamily: ty.body.familySemibold,
                fontSize: ty.sizes.xs,
                letterSpacing: 0.8,
              }}
            >
              {dashboard.state.hero.chipLabel}
            </Text>
          </View>
        </MotiView>

        <View style={{ marginTop: s.lg }}>
          <WorkoutWeekStrip
            days={dashboard.weekDays.map((day) => ({
              ...day,
              onPress: () => {
                if (day.sessionType === 'workout' && day.planDayId) {
                  router.push({
                    pathname: '/(tabs)/workout/day-preview',
                    params: { dayId: day.planDayId },
                  });
                  return;
                }
                router.push('/(tabs)/workout/my-plan');
              },
            }))}
          />
        </View>

        <View style={{ gap: s.lg, paddingHorizontal: s.lg, marginTop: s.lg }}>
          {isInitialLoading ? (
            <GlassCard
              intensity="medium"
              style={{
                borderRadius: r.xl,
                borderWidth: 1,
                borderColor: `${c.primary}24`,
              }}
            >
              <Text
                style={{
                  color: c.text,
                  fontFamily: ty.heading.familySemibold,
                  fontSize: ty.sizes.lg,
                }}
              >
                Loading workout dashboard...
              </Text>
              <Text
                style={{
                  color: c.textMuted,
                  fontFamily: ty.body.family,
                  fontSize: ty.sizes.sm,
                  marginTop: s.sm,
                }}
              >
                Pulling today’s session, weekly schedule, and recovery signals together.
              </Text>
            </GlassCard>
          ) : (
            <>
              <View style={{ gap: s.sm }}>
                <Text
                  style={{
                    color: c.textMuted,
                    fontFamily: ty.body.familySemibold,
                    fontSize: ty.sizes.sm,
                    letterSpacing: 1.2,
                  }}
                >
                  TODAY&apos;S WORKOUT
                </Text>
                <WorkoutPrimaryActionCard
                  state={dashboard.state.compact.primaryCard}
                  onPress={() => runAction(dashboard.state.compact.primaryCard.action)}
                  disabled={dashboard.isRefreshing || isBusy}
                />
              </View>

              <View style={{ flexDirection: 'row', gap: s.sm }}>
                <WorkoutUtilityTile
                  state={dashboard.state.compact.myPlanTile}
                  onPress={() => runAction(dashboard.state.compact.myPlanTile.action)}
                />
                <WorkoutUtilityTile
                  state={dashboard.state.compact.changeProgramTile}
                  onPress={() => runAction(dashboard.state.compact.changeProgramTile.action)}
                />
              </View>

              <View style={{ gap: s.sm }}>
                <Text
                  style={{
                    color: c.textMuted,
                    fontFamily: ty.body.familySemibold,
                    fontSize: ty.sizes.sm,
                    letterSpacing: 1.2,
                  }}
                >
                  DO NOW
                </Text>
                <WorkoutQuickAccessRow items={quickActions} delayBase={160} size={56} />
              </View>

              <WorkoutToolsGrid items={resourceItems} title="RESOURCES" />
            </>
          )}
        </View>
      </ScrollView>
    </PremiumBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    paddingBottom: 120,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
