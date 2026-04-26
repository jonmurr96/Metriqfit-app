import { getLocalDateKey } from '../nutrition/meal-slots';

export type WorkoutCalendarSessionType = 'workout' | 'rest' | 'active_recovery' | 'conditioning';
export type WorkoutCalendarScheduleStatus = 'planned' | 'completed' | 'missed' | 'rescheduled' | 'skipped';
export type WorkoutCalendarStatus = 'completed' | 'missed' | 'rest' | 'scheduled_future' | 'rescheduled' | 'none';

export type WorkoutCalendarScheduleEntryLike = {
  scheduled_date?: string;
  session_type?: WorkoutCalendarSessionType | null;
  status?: WorkoutCalendarScheduleStatus | null;
  completed_session_id?: string | null;
  plan_day_id?: string | null;
};

export type WorkoutCalendarFallbackContext = {
  weeklyLayout?: Array<{
    weekday?: string | null;
    sessionType?: string | null;
    planDayId?: string | null;
  }>;
};

export type WorkoutCalendarDayState = {
  dateKey: string;
  sessionType: WorkoutCalendarSessionType | null;
  scheduleStatus: WorkoutCalendarScheduleStatus | null;
  calendarStatus: WorkoutCalendarStatus;
  isWorkoutExpected: boolean;
  isCompleted: boolean;
  isRestLike: boolean;
  isPastDue: boolean;
  planDayId: string | null;
};

const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

function getWeekdayKey(dateKey: string) {
  const parsed = new Date(`${dateKey}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  return WEEKDAY_KEYS[parsed.getDay()] || null;
}

function inferFallbackAssignment(
  dateKey: string,
  fallback?: WorkoutCalendarFallbackContext | null,
) {
  const weekday = getWeekdayKey(dateKey);
  if (!weekday) return null;

  return (fallback?.weeklyLayout || []).find((entry) => String(entry.weekday || '').toLowerCase() === weekday) || null;
}

export function buildWorkoutCalendarFallbackContext(
  plan:
    | {
        programMeta?: {
          weeklyLayout?: Array<{
            weekday?: string | null;
            sessionType?: string | null;
            planDayId?: string | null;
          }>;
        };
      }
    | null
    | undefined,
): WorkoutCalendarFallbackContext | null {
  const weeklyLayout = Array.isArray(plan?.programMeta?.weeklyLayout) ? plan.programMeta?.weeklyLayout : null;
  if (!weeklyLayout?.length) return null;
  return { weeklyLayout };
}

export function buildWorkoutCalendarDayState(input: {
  dateKey: string;
  todayKey?: string;
  scheduleEntry?: WorkoutCalendarScheduleEntryLike | null;
  fallback?: WorkoutCalendarFallbackContext | null;
}): WorkoutCalendarDayState {
  const todayKey = input.todayKey || getLocalDateKey();
  const scheduleEntry = input.scheduleEntry || null;
  const fallbackAssignment = scheduleEntry ? null : inferFallbackAssignment(input.dateKey, input.fallback);
  const sessionType = (
    scheduleEntry?.session_type
    || (fallbackAssignment?.sessionType as WorkoutCalendarSessionType | null)
    || null
  ) as WorkoutCalendarSessionType | null;
  const scheduleStatus = (scheduleEntry?.status || null) as WorkoutCalendarScheduleStatus | null;
  const isRestLike = sessionType === 'rest' || sessionType === 'active_recovery' || sessionType === 'conditioning';
  const isWorkoutExpected = sessionType === 'workout';
  const isCompleted = isWorkoutExpected && (scheduleStatus === 'completed' || Boolean(scheduleEntry?.completed_session_id));
  const isPastDue = isWorkoutExpected && input.dateKey < todayKey && !isCompleted;

  let calendarStatus: WorkoutCalendarStatus = 'none';

  if (isRestLike) {
    calendarStatus = 'rest';
  } else if (isCompleted) {
    calendarStatus = 'completed';
  } else if (scheduleStatus === 'rescheduled') {
    calendarStatus = 'rescheduled';
  } else if (isWorkoutExpected) {
    calendarStatus = isPastDue ? 'missed' : 'scheduled_future';
  }

  return {
    dateKey: input.dateKey,
    sessionType,
    scheduleStatus,
    calendarStatus,
    isWorkoutExpected,
    isCompleted,
    isRestLike,
    isPastDue,
    planDayId: scheduleEntry?.plan_day_id || fallbackAssignment?.planDayId || null,
  };
}
