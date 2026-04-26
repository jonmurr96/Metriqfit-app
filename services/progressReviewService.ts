import { supabase } from "../lib/supabase";
import {
  buildProgressDailyReviewSnapshot,
  buildProgressWeeklyReviewSnapshot,
  type ProgressDailyReviewSnapshot,
  type ProgressReviewAction,
  type ProgressReviewMiss,
  type ProgressReviewStatus,
  type ProgressWeeklyReviewSnapshot,
} from "../lib/progress/review-insights";
import { getDailyTotals, getNutritionStats } from "./nutritionService";
import { getLatestBodyCheckInStatus } from "./progressBodyService";
import {
  getConsistencyHistory,
  getTodayWorkoutScheduleEntry,
  type ConsistencyRecord,
} from "./planService";
import { getActiveSession, getWorkoutStats } from "./workoutService";

export type {
  ProgressDailyReviewSnapshot,
  ProgressWeeklyReviewSnapshot,
  ProgressReviewStatus,
  ProgressReviewMiss,
  ProgressReviewAction,
};

type TargetsRow = {
  calories: number | null;
  protein_g: number | null;
} | null;

type MeasurementRow = {
  weight_kg: number | null;
  body_fat_percentage: number | null;
  waist_cm: number | null;
  chest_cm: number | null;
  arms_cm: number | null;
  thighs_cm: number | null;
  hips_cm: number | null;
  logged_at: string;
};

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function toIsoDate(date: Date) {
  return date.toISOString().split("T")[0];
}

function startOfDay(date: Date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function endOfDay(date: Date) {
  const value = new Date(date);
  value.setHours(23, 59, 59, 999);
  return value;
}

function rollingRange(days: number) {
  const end = endOfDay(new Date());
  const start = startOfDay(new Date(end.getTime() - (days - 1) * 24 * 60 * 60 * 1000));
  return {
    startDate: toIsoDate(start),
    endDate: toIsoDate(end),
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  };
}

function previousRollingRange(days: number) {
  const current = rollingRange(days);
  const currentStart = new Date(current.startIso);
  const previousEnd = new Date(currentStart.getTime() - 1000);
  const previousStart = startOfDay(new Date(previousEnd.getTime() - (days - 1) * 24 * 60 * 60 * 1000));
  return {
    startDate: toIsoDate(previousStart),
    endDate: toIsoDate(previousEnd),
    startIso: previousStart.toISOString(),
    endIso: previousEnd.toISOString(),
  };
}

async function getTargets(userId: string): Promise<TargetsRow> {
  const { data, error } = await supabase
    .from("user_targets")
    .select("calories, protein_g")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "Failed to load user targets.");
  }

  return (data as TargetsRow) || null;
}

async function getMeasurementsInRange(
  userId: string,
  startIso: string,
  endIso: string,
): Promise<MeasurementRow[]> {
  const { data, error } = await supabase
    .from("user_measurements")
    .select("weight_kg, body_fat_percentage, waist_cm, chest_cm, arms_cm, thighs_cm, hips_cm, logged_at")
    .eq("user_id", userId)
    .gte("logged_at", startIso)
    .lte("logged_at", endIso)
    .order("logged_at", { ascending: true });

  if (error) {
    throw new Error(error.message || "Failed to load measurements.");
  }

  return (data as MeasurementRow[]) || [];
}

function averageConsistency(rows: ConsistencyRecord[]) {
  if (rows.length === 0) return 0;
  return round1(rows.reduce((sum, row) => sum + Number(row.overall_score || 0), 0) / rows.length);
}

function findTodayConsistency(rows: ConsistencyRecord[], date: string) {
  return rows.find((row) => row.log_date === date) || null;
}

function buildCircumferenceDelta(measurements: MeasurementRow[]) {
  if (measurements.length < 2) return null;
  const first = measurements[0];
  const last = measurements[measurements.length - 1];
  return {
    waistCm:
      first.waist_cm != null && last.waist_cm != null ? round1(last.waist_cm - first.waist_cm) : null,
    hipsCm:
      first.hips_cm != null && last.hips_cm != null ? round1(last.hips_cm - first.hips_cm) : null,
    chestCm:
      first.chest_cm != null && last.chest_cm != null ? round1(last.chest_cm - first.chest_cm) : null,
    armsCm:
      first.arms_cm != null && last.arms_cm != null ? round1(last.arms_cm - first.arms_cm) : null,
    thighsCm:
      first.thighs_cm != null && last.thighs_cm != null ? round1(last.thighs_cm - first.thighs_cm) : null,
  };
}

function weightDelta(measurements: MeasurementRow[]) {
  if (measurements.length < 2) return null;
  const first = measurements[0].weight_kg;
  const last = measurements[measurements.length - 1].weight_kg;
  if (first == null || last == null) return null;
  return round1(last - first);
}

function bodyFatDelta(measurements: MeasurementRow[]) {
  if (measurements.length < 2) return null;
  const first = measurements[0].body_fat_percentage;
  const last = measurements[measurements.length - 1].body_fat_percentage;
  if (first == null || last == null) return null;
  return round1(last - first);
}

function hitRate(days: Record<string, { calories: number; protein: number }>, target: number | null, key: "calories" | "protein") {
  const entries = Object.values(days);
  if (entries.length === 0 || !target || target <= 0) return 0;
  const hits = entries.filter((entry) => entry[key] >= target * 0.9).length;
  return Math.round((hits / entries.length) * 100);
}

function workoutStatusFromInputs(input: {
  activeSessionName: string | null;
  scheduleEntry: Awaited<ReturnType<typeof getTodayWorkoutScheduleEntry>>;
}) {
  if (input.activeSessionName) {
    return {
      status: "active" as const,
      name: input.activeSessionName,
    };
  }

  const schedule = input.scheduleEntry;
  if (!schedule) {
    return {
      status: "none" as const,
      name: null,
    };
  }

  if (schedule.session_type !== "workout") {
    return {
      status: "rest" as const,
      name: schedule.plan_day?.name || null,
    };
  }

  return {
    status: schedule.status === "completed" ? ("completed" as const) : ("planned" as const),
    name: schedule.plan_day?.name || null,
  };
}

export async function getProgressDailyReview(
  userId: string,
  date = toIsoDate(new Date()),
): Promise<ProgressDailyReviewSnapshot> {
  const [nutrition, targets, consistencyRows, todaySchedule, activeSession, bodyStatus] = await Promise.all([
    getDailyTotals(userId, date),
    getTargets(userId),
    getConsistencyHistory(userId, 7),
    getTodayWorkoutScheduleEntry(userId),
    getActiveSession(userId).catch(() => null),
    getLatestBodyCheckInStatus(userId).catch(() => null),
  ]);

  const todayConsistency = findTodayConsistency(consistencyRows, date);
  const workout = workoutStatusFromInputs({
    activeSessionName: activeSession?.name || null,
    scheduleEntry: todaySchedule,
  });

  const latestCheckInAt = bodyStatus?.latestCheckInAt || null;
  const bodyCheckInDaysAgo = latestCheckInAt
    ? Math.max(0, Math.floor((Date.now() - Date.parse(latestCheckInAt)) / (1000 * 60 * 60 * 24)))
    : null;

  return buildProgressDailyReviewSnapshot({
    date,
    calories: Math.round(nutrition.calories || 0),
    calorieTarget: targets?.calories || null,
    protein: nutrition.protein || 0,
    proteinTarget: targets?.protein_g || null,
    hydrationScore: todayConsistency?.hydration_score ?? null,
    workoutStatus: workout.status,
    workoutName: workout.name,
    bodyCheckInDaysAgo,
  });
}

export async function getProgressWeeklyReview(
  userId: string,
  range = 7,
): Promise<ProgressWeeklyReviewSnapshot> {
  const window = rollingRange(range);
  const previousWindow = previousRollingRange(range);

  const [nutritionStats, targets, consistencyRows, workoutStats, previousWorkoutStats, measurements, bodyStatus] = await Promise.all([
    getNutritionStats(userId, window.startIso, window.endIso),
    getTargets(userId),
    getConsistencyHistory(userId, range),
    getWorkoutStats(userId, window.startIso, window.endIso),
    getWorkoutStats(userId, previousWindow.startIso, previousWindow.endIso),
    getMeasurementsInRange(userId, window.startIso, window.endIso),
    getLatestBodyCheckInStatus(userId).catch(() => null),
  ]);

  const latestCheckInAt = bodyStatus?.latestCheckInAt || null;
  const latestCheckInDaysAgo = latestCheckInAt
    ? Math.max(0, Math.floor((Date.now() - Date.parse(latestCheckInAt)) / (1000 * 60 * 60 * 24)))
    : null;

  const nutritionDays = Object.entries(nutritionStats).reduce<Record<string, { calories: number; protein: number }>>(
    (acc, [day, values]) => {
      acc[day] = {
        calories: Math.round(values.calories || 0),
        protein: values.protein || 0,
      };
      return acc;
    },
    {},
  );

  const volumeChangePercent =
    previousWorkoutStats.totalVolumeLb > 0
      ? Math.round(((workoutStats.totalVolumeLb - previousWorkoutStats.totalVolumeLb) / previousWorkoutStats.totalVolumeLb) * 100)
      : workoutStats.totalVolumeLb > 0
        ? 100
        : null;

  return buildProgressWeeklyReviewSnapshot({
    range: `${range}d`,
    sessionsCompleted: workoutStats.totalSessions,
    volumeChangePercent,
    consistencyAverage: averageConsistency(consistencyRows),
    calorieHitRate: hitRate(nutritionDays, targets?.calories || null, "calories"),
    proteinHitRate: hitRate(nutritionDays, targets?.protein_g || null, "protein"),
    weightDeltaKg: weightDelta(measurements),
    bodyFatDelta: bodyFatDelta(measurements),
    circumferenceDelta: buildCircumferenceDelta(measurements),
    bodyConfidence: measurements.length >= 2 ? "high" : "limited",
    latestCheckInAt,
    latestCheckInDaysAgo,
    checkpointCount: bodyStatus?.latestPhotoCheckpointCount || 0,
  });
}
