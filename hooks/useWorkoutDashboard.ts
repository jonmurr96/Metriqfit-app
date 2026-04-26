import { useMemo } from 'react';

import {
  useActiveWorkoutPlan,
  useLatestConsistency,
  useTodayWorkoutScheduleEntry,
  useWorkoutSchedule,
} from './usePlan';
import { useActiveSession, useWorkoutHistory, useWorkoutStats } from './useWorkout';
import { useWorkoutAdaptationRecommendations } from './useWorkoutAdaptation';
import type { WorkoutScheduleEntry } from '../services/planService';
import type { WorkoutSessionWithDetails } from '../services/workoutService';
import {
  buildWorkoutDashboardState,
  type WorkoutDashboardActiveSession,
  type WorkoutDashboardHistoryItem,
  type WorkoutDashboardRecommendation,
  type WorkoutDashboardScheduleEntry,
  type WorkoutDashboardState,
} from '../lib/workout/dashboard-state';
import {
  buildWorkoutCalendarDayState,
  buildWorkoutCalendarFallbackContext,
} from '../lib/workout/calendar-status';

function humanizeProgramMeta(value?: string | null) {
  if (!value) {
    return null;
  }

  return value.replaceAll('_', ' ').replace(/\b\w/g, (match) => match.toUpperCase());
}

function toLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function startOfWeek(date: Date) {
  const next = new Date(date);
  const day = next.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + diff);
  next.setHours(0, 0, 0, 0);
  return next;
}

function mapScheduleEntry(entry: WorkoutScheduleEntry | null | undefined): WorkoutDashboardScheduleEntry | null {
  if (!entry) return null;

  return {
    sessionType: entry.session_type,
    status: entry.status,
    planDayId: entry.plan_day_id,
    planDayName: entry.plan_day?.name || null,
    focus: entry.plan_day?.focus || null,
  };
}

function mapActiveSession(session: WorkoutSessionWithDetails | null | undefined): WorkoutDashboardActiveSession | null {
  if (!session) return null;

  const resumableExercises = (session.exercises || []).filter((exercise) => (
    !!exercise?.id && !!exercise?.exercise?.id
  ));

  if (resumableExercises.length === 0) {
    return null;
  }

  return {
    id: session.id,
    name: session.name || 'Active session',
    startedAt: session.started_at,
    exercises: resumableExercises.map((exercise) => ({
      id: exercise.id,
      name: exercise.exercise?.name || 'Exercise',
      loggedSetCount: (exercise.sets || []).filter((set) => !set.is_warmup).length,
    })),
  };
}

function mapHistory(history: WorkoutSessionWithDetails[] | null | undefined): WorkoutDashboardHistoryItem[] {
  return (history || []).map((session) => ({
    id: session.id,
    name: session.name || 'Workout',
    startedAt: session.started_at,
    durationSeconds: session.duration_seconds || 0,
    volumeLb: (session.exercises || []).reduce((sessionSum, exercise) => (
      sessionSum + (exercise.sets || [])
        .filter((set) => !set.is_warmup)
        .reduce((setSum, set) => setSum + ((set.weight_lb || 0) * (set.reps || 0)), 0)
    ), 0),
    prCount: (session.exercises || []).reduce((sessionSum, exercise) => (
      sessionSum + (exercise.sets || []).filter((set) => set.is_pr).length
    ), 0),
  }));
}

function mapRecommendations(recommendations: any[] | null | undefined): WorkoutDashboardRecommendation[] {
  return (recommendations || []).map((item) => ({
    id: item.id,
    recommendationType: item.recommendation_type,
    rationale: item.rationale,
    status: item.status,
  }));
}

export type WorkoutDashboardWeekDay = {
  date: Date;
  dateText: string;
  label: string;
  dayNumber: number;
  isToday: boolean;
  isSelected: boolean;
  sessionType: WorkoutScheduleEntry['session_type'] | null;
  scheduleStatus: WorkoutScheduleEntry['status'] | null;
  calendarStatus: 'completed' | 'missed' | 'rest' | 'scheduled_future' | 'rescheduled' | 'none';
  isWorkoutExpected: boolean;
  planDayId: string | null;
};

export type WorkoutDashboardResult = {
  dateLabel: string;
  state: WorkoutDashboardState;
  weekDays: WorkoutDashboardWeekDay[];
  raw: {
    activePlan: Awaited<ReturnType<typeof useActiveWorkoutPlan>>['data'];
    todayEntry: WorkoutScheduleEntry | null | undefined;
    tomorrowEntry: WorkoutScheduleEntry | null | undefined;
    activeSession: WorkoutSessionWithDetails | null | undefined;
    history: WorkoutSessionWithDetails[];
    recommendations: any[];
  };
  isLoading: boolean;
  isRefreshing: boolean;
};

export function useWorkoutDashboard(): WorkoutDashboardResult {
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const tomorrowDate = new Date(today);
  tomorrowDate.setDate(today.getDate() + 1);
  const weekStart = startOfWeek(today);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const todayKey = toLocalDateKey(today);
  const tomorrowKey = toLocalDateKey(tomorrowDate);
  const weekStartKey = toLocalDateKey(weekStart);
  const weekEndKey = toLocalDateKey(weekEnd);
  const dateLabel = today.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  const { data: activePlan, isLoading: isPlanLoading, isFetching: isPlanFetching } = useActiveWorkoutPlan();
  const { data: todayEntry, isLoading: isTodayLoading, isFetching: isTodayFetching } = useTodayWorkoutScheduleEntry();
  const { data: weekSchedule = [], isLoading: isWeekLoading, isFetching: isWeekFetching } = useWorkoutSchedule(
    weekStartKey,
    weekEndKey,
    { enabled: !!activePlan },
  );
  const { data: tomorrowSchedule = [], isLoading: isTomorrowLoading, isFetching: isTomorrowFetching } = useWorkoutSchedule(
    tomorrowKey,
    tomorrowKey,
    { enabled: !!activePlan },
  );
  const { data: activeSession, isLoading: isActiveSessionLoading, isFetching: isActiveSessionFetching } = useActiveSession();
  const { data: recommendations = [], isLoading: isRecommendationsLoading, isFetching: isRecommendationsFetching } =
    useWorkoutAdaptationRecommendations(activePlan?.id);
  const { data: latestConsistency, isLoading: isConsistencyLoading, isFetching: isConsistencyFetching } = useLatestConsistency();
  const { data: history = [], isLoading: isHistoryLoading, isFetching: isHistoryFetching } = useWorkoutHistory(8);
  const { data: weeklyStats, isLoading: isStatsLoading, isFetching: isStatsFetching } = useWorkoutStats(weekStartKey, todayKey);
  const calendarFallbackContext = buildWorkoutCalendarFallbackContext(activePlan);
  const activePlanLabel = useMemo(() => {
    const meta = activePlan?.programMeta;
    if (!meta) {
      return null;
    }

    const parts = [
      humanizeProgramMeta(meta.programFamilyKey),
      humanizeProgramMeta(meta.progressionModel),
    ].filter(Boolean);

    return parts.length > 0 ? parts.join(' • ') : null;
  }, [activePlan?.programMeta]);
  const resumableActiveSession = (
    activeSession
    && mapActiveSession(activeSession)
      ? activeSession
      : null
  );

  const tomorrowEntry = tomorrowSchedule[0] || null;

  const weekDays: WorkoutDashboardWeekDay[] = (
    Array.from({ length: 7 }, (_, index) => {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + index);
      const dateText = toLocalDateKey(date);
      const schedule = weekSchedule.find((entry) => entry.scheduled_date === dateText) || null;
      const calendarState = buildWorkoutCalendarDayState({
        dateKey: dateText,
        todayKey,
        scheduleEntry: schedule,
        fallback: calendarFallbackContext,
      });

      return {
        date,
        dateText,
        label: date.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNumber: date.getDate(),
        isToday: dateText === todayKey,
        isSelected: dateText === todayKey,
        sessionType: calendarState.sessionType,
        scheduleStatus: calendarState.scheduleStatus,
        calendarStatus: calendarState.calendarStatus,
        isWorkoutExpected: calendarState.isWorkoutExpected,
        planDayId: calendarState.planDayId,
      };
    })
  );

  const state = buildWorkoutDashboardState({
    now,
    hasActivePlan: !!activePlan,
    activePlanLabel,
    activeSession: mapActiveSession(resumableActiveSession),
    todayEntry: mapScheduleEntry(todayEntry),
    tomorrowEntry: mapScheduleEntry(tomorrowEntry),
    latestConsistencyScore: latestConsistency?.overall_score ?? 0,
    weeklyStats: {
      totalSessions: weeklyStats?.totalSessions ?? 0,
      totalVolumeLb: weeklyStats?.totalVolumeLb ?? 0,
      avgDurationMinutes: weeklyStats?.avgDurationMinutes ?? 0,
    },
    recentHistory: mapHistory(history),
    pendingRecommendations: mapRecommendations(recommendations),
  });

  return {
    dateLabel,
    state,
    weekDays,
    raw: {
      activePlan,
      todayEntry,
      tomorrowEntry,
      activeSession: resumableActiveSession,
      history,
      recommendations,
    },
    isLoading:
      isPlanLoading
      || isTodayLoading
      || isWeekLoading
      || isTomorrowLoading
      || isActiveSessionLoading
      || isRecommendationsLoading
      || isConsistencyLoading
      || isHistoryLoading
      || isStatsLoading,
    isRefreshing:
      isPlanFetching
      || isTodayFetching
      || isWeekFetching
      || isTomorrowFetching
      || isActiveSessionFetching
      || isRecommendationsFetching
      || isConsistencyFetching
      || isHistoryFetching
      || isStatsFetching,
  };
}
