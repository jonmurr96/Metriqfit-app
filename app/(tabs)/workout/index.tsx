import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotiView } from 'moti';

import { useTokens } from '../../../lib/theme';
import { PremiumBackground } from '../../../components/premium/PremiumBackground';
import {
  useActiveWorkoutPlan,
  useLatestConsistency,
  useTodayWorkoutScheduleEntry,
  useWorkoutSchedule,
} from '../../../hooks/usePlan';
import { WorkoutWeekStrip } from '../../../components/workout/home/WorkoutWeekStrip';
import { WorkoutQuickAccessRow } from '../../../components/workout/home/WorkoutQuickAccessRow';
import { WorkoutTodayCard } from '../../../components/workout/home/WorkoutTodayCard';
import { WorkoutInsightCard, type WorkoutInsight } from '../../../components/workout/home/WorkoutInsightCard';
import { WorkoutToolsGrid } from '../../../components/workout/home/WorkoutToolsGrid';
import {
  trackWorkoutHomeQuickAccessTapped,
  trackWorkoutHomeToolTapped,
  trackWorkoutHomeViewed,
  trackWorkoutInsightRendered,
} from '../../../lib/analytics';

function toDateString(date: Date) {
  return date.toISOString().split('T')[0];
}

function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatScreenDate(date: Date) {
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

export default function WorkoutHomeScreen() {
  const { c, s, ty, animation } = useTokens();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const { data: activePlan, isLoading: isPlanLoading } = useActiveWorkoutPlan();
  const { data: todayEntry, isLoading: todayLoading } = useTodayWorkoutScheduleEntry();
  const { data: latestConsistency } = useLatestConsistency();

  const weekStart = useMemo(() => startOfWeek(selectedDate), [selectedDate]);
  const weekEnd = useMemo(() => {
    const end = new Date(weekStart);
    end.setDate(weekStart.getDate() + 6);
    return end;
  }, [weekStart]);

  const { data: weekSchedule } = useWorkoutSchedule(toDateString(weekStart), toDateString(weekEnd), {
    enabled: !!activePlan,
  });

  useEffect(() => {
    trackWorkoutHomeViewed({ has_plan: !!activePlan });
  }, [activePlan]);

  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  const dayStrip = useMemo(() => {
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + index);
      const dateText = toDateString(date);
      const schedule = (weekSchedule || []).find((entry) => entry.scheduled_date === dateText) || null;

      return {
        date,
        dateText,
        label: date.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNumber: date.getDate(),
        isToday: date.getTime() === today.getTime(),
        isSelected: date.getTime() === selectedDate.getTime(),
        sessionType: (schedule?.session_type as 'workout' | 'rest' | 'active_recovery' | 'conditioning' | null) || null,
        status: (schedule?.status as 'planned' | 'completed' | 'missed' | null) || null,
        onPress: () => {
          setSelectedDate(date);
          if (schedule?.session_type === 'workout' && schedule.plan_day_id) {
            router.push({
              pathname: '/(tabs)/workout/day-preview',
              params: { dayId: schedule.plan_day_id },
            });
          }
        },
      };
    });
  }, [weekStart, weekSchedule, selectedDate, today, router]);

  const quickAccess = useMemo(
    () => [
      { label: 'My Plan', icon: 'calendar', route: '/(tabs)/workout/my-plan' },
      { label: 'Programs', icon: 'barbell', route: '/(tabs)/workout/program-browser' },
      { label: 'History', icon: 'stats-chart', route: '/(tabs)/workout/workout-history' },
      { label: 'My Tools', icon: 'construct', route: '/(tabs)/workout/tools' },
    ],
    [],
  );

  const quickAccessItems = quickAccess.map((item) => ({
    label: item.label,
    icon: item.icon,
    onPress: () => {
      trackWorkoutHomeQuickAccessTapped({ action: item.label });
      router.push(item.route as any);
    },
  }));

  const toolTiles = useMemo(
    () => [
      { label: '1RM Calculator', icon: 'calculator', route: '/(tabs)/workout/calculators/one-rep-max' },
      { label: 'Plate Calculator', icon: 'albums', route: '/(tabs)/workout/calculators/plate-calculator' },
      { label: 'Program Builder', icon: 'build', route: '/(tabs)/workout/program-builder' },
      { label: 'Import Plan', icon: 'cloud-upload', route: '/(tabs)/workout/import-plan' },
      { label: 'Adaptive Coach', icon: 'sparkles', route: '/(tabs)/workout/adaptation' },
      { label: 'Workout Notes', icon: 'document-text', route: '/(tabs)/workout/workout-notes' },
    ],
    [],
  );

  const toolItems = toolTiles.map((item) => ({
    label: item.label,
    icon: item.icon,
    onPress: () => {
      trackWorkoutHomeToolTapped({ action: item.label });
      router.push(item.route as any);
    },
  }));

  const insight = useMemo<WorkoutInsight>(() => {
    const score = latestConsistency?.overall_score ?? 0;

    if (!activePlan) {
      return {
        title: 'No active plan selected',
        tip: 'Pick a program to align workouts, recovery, and progression this week.',
        icon: 'compass',
      };
    }

    if (!todayEntry) {
      return {
        title: 'Keep momentum this week',
        tip: 'No session is scheduled today. Use Program Builder or Adapt to stay aligned.',
        icon: 'flash',
      };
    }

    if (todayEntry.session_type === 'workout') {
      if (todayEntry.status === 'completed') {
        return {
          title: 'Session complete',
          tip: 'Great execution today. Use Workout Notes to capture what worked best before your next lift.',
          icon: 'checkmark-circle',
        };
      }

      if (score >= 80) {
        return {
          title: 'Consistency is trending up',
          tip: 'You are in a strong rhythm. Prioritize high-quality reps and stick to planned rest intervals.',
          icon: 'trending-up',
        };
      }

      return {
        title: 'Priority: hit today’s session',
        tip: 'Completing today’s workout is your highest-leverage action for weekly adherence.',
        icon: 'barbell',
      };
    }

    return {
      title: 'Recovery day focus',
      tip: 'Use mobility, hydration, and sleep quality to improve readiness for your next training day.',
      icon: 'leaf',
    };
  }, [activePlan, latestConsistency?.overall_score, todayEntry]);

  useEffect(() => {
    trackWorkoutInsightRendered({ title: insight.title, icon: insight.icon });
  }, [insight.icon, insight.title]);

  return (
    <PremiumBackground variant="default">
      <ScrollView
        style={[styles.container, { backgroundColor: 'transparent' }]}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + s.lg, paddingBottom: 110 }]}
      >
        <MotiView
          from={{ opacity: 0, translateY: -10 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: animation.duration.normal }}
          style={[styles.header, { paddingHorizontal: s.lg }]}
        >
          <Text
            style={{
              color: c.textMuted,
              fontFamily: ty.body.familySemibold,
              fontSize: ty.sizes.xs,
              letterSpacing: 1.5,
            }}
          >
            WORKOUT HUB
          </Text>
          <Text
            style={{
              color: c.text,
              fontFamily: ty.heading.family,
              fontSize: ty.sizes.h2,
              letterSpacing: -0.5,
              marginTop: s.xs,
            }}
          >
            {formatScreenDate(today)}
          </Text>
        </MotiView>

        <View style={{ marginTop: s.lg }}>
          <WorkoutWeekStrip days={dayStrip} />
        </View>

        <View style={{ marginTop: s.xl, paddingHorizontal: s.lg }}>
          <Text
            style={{
              color: c.textMuted,
              fontFamily: ty.body.familySemibold,
              fontSize: ty.sizes.sm,
              letterSpacing: 1.5,
              marginBottom: s.lg,
            }}
          >
            QUICK ACCESS
          </Text>
          <WorkoutQuickAccessRow items={quickAccessItems} />
        </View>

        <View style={{ marginTop: s.xl, paddingHorizontal: s.lg }}>
          <WorkoutTodayCard
            loading={todayLoading || isPlanLoading}
            entry={todayEntry as any}
            onOpenWorkoutDay={(dayId) =>
              router.push({ pathname: '/(tabs)/workout/day-preview', params: { dayId } })
            }
            onOpenWeek={() => router.push('/(tabs)/workout/my-plan')}
          />
        </View>

        <View style={{ marginTop: s.lg, paddingHorizontal: s.lg }}>
          <WorkoutInsightCard insight={insight} />
        </View>

        <View style={{ marginTop: s.lg, paddingHorizontal: s.lg }}>
          <WorkoutToolsGrid items={toolItems} />
        </View>

        {!activePlan && !isPlanLoading && (
          <View style={{ marginTop: s.lg, paddingHorizontal: s.lg }}>
            <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.sm, textAlign: 'center' }}>
              No active workout plan yet. Open Programs to choose one and start training.
            </Text>
          </View>
        )}
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
    marginBottom: 4,
  },
});
