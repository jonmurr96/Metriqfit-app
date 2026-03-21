import { useCallback, useEffect, useMemo } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotiView } from 'moti';

import { useTokens } from '../../../lib/theme';
import { PremiumBackground } from '../../../components/premium/PremiumBackground';
import { GlassCard } from '../../../components/premium/GlassCard';
import { WorkoutWeekStrip } from '../../../components/workout/home/WorkoutWeekStrip';
import { WorkoutQuickAccessRow } from '../../../components/workout/home/WorkoutQuickAccessRow';
import { WorkoutToolsGrid } from '../../../components/workout/home/WorkoutToolsGrid';
import { WorkoutPrimaryHeroCard } from '../../../components/workout/home/WorkoutPrimaryHeroCard';
import { WorkoutTomorrowPreviewCard } from '../../../components/workout/home/WorkoutTomorrowPreviewCard';
import { WorkoutCoachQueueCard } from '../../../components/workout/home/WorkoutCoachQueueCard';
import { WorkoutMomentumCard } from '../../../components/workout/home/WorkoutMomentumCard';
import { useWorkoutDashboard } from '../../../hooks/useWorkoutDashboard';
import {
  useApplyWorkoutAdaptationRecommendation,
  useSetWorkoutAdaptationRecommendationStatus,
} from '../../../hooks/useWorkoutAdaptation';
import { useMarkDayCompleted } from '../../../hooks/usePlan';
import { useFinishSession } from '../../../hooks/useWorkout';
import type { WorkoutActionKey } from '../../../lib/workout/dashboard-state';
import {
  trackWorkoutHomeHeroRendered,
  trackWorkoutHomeHeroTapped,
  trackWorkoutHomeResumeTapped,
  trackWorkoutHomeToolTapped,
  trackWorkoutHomeViewed,
  trackWorkoutRecommendationAccepted,
  trackWorkoutRecommendationRejected,
  trackWorkoutRecommendationRendered,
  trackWorkoutRecommendationReviewTapped,
  trackWorkoutSecondaryUtilityTapped,
  trackWorkoutTomorrowPreviewTapped,
} from '../../../lib/analytics';

function humanizeProgramMeta(value?: string | null) {
  if (!value) {
    return null;
  }

  return value.replaceAll('_', ' ').replace(/\b\w/g, (match) => match.toUpperCase());
}

type RoutePath =
  | '/(tabs)/workout/active-session'
  | '/(tabs)/workout/adaptation'
  | '/(tabs)/workout/day-preview'
  | '/(tabs)/workout/my-plan'
  | '/(tabs)/workout/program-browser'
  | '/(tabs)/workout/summary'
  | '/(tabs)/workout/tools'
  | '/(tabs)/workout/workout-history'
  | '/(tabs)/workout/workout-notes';

export default function WorkoutHomeScreen() {
  const { c, s, ty, r, animation } = useTokens();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const dashboard = useWorkoutDashboard();
  const applyRecommendation = useApplyWorkoutAdaptationRecommendation();
  const rejectRecommendation = useSetWorkoutAdaptationRecommendationStatus();
  const finishSession = useFinishSession();
  const markDayCompleted = useMarkDayCompleted();
  const activeSessionId = dashboard.raw.activeSession?.id;
  const activeSessionPlanDayId = dashboard.raw.activeSession?.plan_day_id;

  const isBusy =
    applyRecommendation.isPending
    || rejectRecommendation.isPending
    || finishSession.isPending
    || markDayCompleted.isPending;

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

  const runAction = useCallback((action: WorkoutActionKey) => {
    switch (action) {
      case 'resume_session':
        trackWorkoutHomeResumeTapped({ mode: dashboard.state.hero.mode });
        router.push('/(tabs)/workout/active-session');
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
      case 'open_tomorrow':
        trackWorkoutTomorrowPreviewTapped({
          action,
          session_type: dashboard.raw.tomorrowEntry?.session_type || 'none',
        });
        if (dashboard.raw.tomorrowEntry?.session_type === 'workout' && dashboard.raw.tomorrowEntry.plan_day_id) {
          router.push({
            pathname: '/(tabs)/workout/day-preview',
            params: { dayId: dashboard.raw.tomorrowEntry.plan_day_id },
          });
          return;
        }
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
        trackWorkoutRecommendationReviewTapped({ source: 'coach_queue' });
        router.push('/(tabs)/workout/adaptation');
        return;
      case 'open_history':
        trackWorkoutSecondaryUtilityTapped({ action });
        router.push('/(tabs)/workout/workout-history');
        return;
      case 'open_tools':
        trackWorkoutSecondaryUtilityTapped({ action });
        router.push('/(tabs)/workout/tools');
        return;
      case 'open_notes':
        trackWorkoutHomeHeroTapped({ action, mode: dashboard.state.hero.mode });
        router.push('/(tabs)/workout/workout-notes');
        return;
      default:
        return;
    }
  }, [
    dashboard.raw.todayEntry,
    dashboard.raw.tomorrowEntry,
    dashboard.state.hero.completedSessionId,
    dashboard.state.hero.mode,
    handleFinishSession,
    router,
  ]);

  const utilityItems = useMemo(
    () => [
      { label: 'Plan', icon: 'calendar', action: 'open_plan' as const, active: dashboard.state.utilityEmphasis === 'plan' },
      { label: 'History', icon: 'stats-chart', action: 'open_history' as const, active: dashboard.state.utilityEmphasis === 'history' },
      { label: 'Programs', icon: 'barbell', action: 'open_programs' as const, active: dashboard.state.utilityEmphasis === 'programs' },
      { label: 'Tools', icon: 'construct', action: 'open_tools' as const, active: dashboard.state.utilityEmphasis === 'tools' },
    ].map((item) => ({
      label: item.label,
      icon: item.icon,
      active: item.active,
      onPress: () => runAction(item.action),
    })),
    [dashboard.state.utilityEmphasis, runAction],
  );

  const toolItems = useMemo(
    () => [
      { label: '1RM Calculator', icon: 'calculator', route: '/(tabs)/workout/calculators/one-rep-max' },
      { label: 'Plate Calculator', icon: 'albums', route: '/(tabs)/workout/calculators/plate-calculator' },
      { label: 'Program Builder', icon: 'build', route: '/(tabs)/workout/program-builder' },
      { label: 'Import Plan', icon: 'cloud-upload', route: '/(tabs)/workout/import-plan' },
      { label: 'Adaptive Coach', icon: 'sparkles', route: '/(tabs)/workout/adaptation' },
      { label: 'Workout Notes', icon: 'document-text', route: '/(tabs)/workout/workout-notes' },
    ].map((item) => ({
      label: item.label,
      icon: item.icon,
      onPress: () => {
        trackWorkoutHomeToolTapped({ action: item.label });
        router.push(item.route as RoutePath);
      },
    })),
    [router],
  );

  const programContextLabel = useMemo(() => {
    const meta = dashboard.raw.activePlan?.programMeta;
    if (!meta) {
      return null;
    }

    const parts = [
      humanizeProgramMeta(meta.programFamilyKey),
      humanizeProgramMeta(meta.progressionModel),
    ].filter(Boolean);

    return parts.length > 0 ? parts.join(' • ') : null;
  }, [dashboard.raw.activePlan?.programMeta]);

  const isInitialLoading =
    dashboard.isLoading
    && !dashboard.raw.activePlan
    && !dashboard.raw.activeSession
    && !dashboard.raw.todayEntry
    && dashboard.raw.history.length === 0;

  const handleRecommendationAccept = async (recommendationId: string) => {
    try {
      await applyRecommendation.mutateAsync({ recommendationId });
      trackWorkoutRecommendationAccepted({ recommendation_id: recommendationId });
    } catch (error: any) {
      Alert.alert('Unable to apply recommendation', error?.message || 'Try again.');
    }
  };

  const handleRecommendationReject = async (recommendationId: string) => {
    try {
      await rejectRecommendation.mutateAsync({ recommendationId, status: 'rejected' });
      trackWorkoutRecommendationRejected({ recommendation_id: recommendationId });
    } catch (error: any) {
      Alert.alert('Unable to keep current plan', error?.message || 'Try again.');
    }
  };

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
              <WorkoutPrimaryHeroCard
                state={dashboard.state.hero}
                contextLabel={programContextLabel}
                onPrimaryPress={() => runAction(dashboard.state.hero.primaryAction)}
                onSecondaryPress={
                  dashboard.state.hero.secondaryAction
                    ? () => runAction(dashboard.state.hero.secondaryAction as WorkoutActionKey)
                    : undefined
                }
                disabled={dashboard.isRefreshing || isBusy}
              />

              {dashboard.raw.activePlan ? (
                <WorkoutTomorrowPreviewCard
                  state={dashboard.state.tomorrow}
                  contextLabel={programContextLabel}
                  onPress={() => runAction(dashboard.state.tomorrow.action)}
                />
              ) : null}

              <WorkoutCoachQueueCard
                state={dashboard.state.coachQueue}
                onPrimaryPress={
                  dashboard.state.coachQueue.primaryAction
                    ? () => runAction(dashboard.state.coachQueue.primaryAction as WorkoutActionKey)
                    : undefined
                }
                onReviewAllPress={
                  dashboard.state.coachQueue.reviewAllAction
                    ? () => runAction(dashboard.state.coachQueue.reviewAllAction as WorkoutActionKey)
                    : undefined
                }
                onAcceptRecommendation={handleRecommendationAccept}
                onRejectRecommendation={handleRecommendationReject}
                disabled={dashboard.isRefreshing || isBusy}
              />

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
                <WorkoutQuickAccessRow items={utilityItems} delayBase={160} size={64} />
              </View>

              <WorkoutMomentumCard state={dashboard.state.momentum} />

              <WorkoutToolsGrid items={toolItems} title="MORE TOOLS" />
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
