import { supabase } from "../lib/supabase";
import { getDailyTotals, getNutritionStats } from "./nutritionService";
import { getPrepCoachState, type PrepCoachState } from "./prepCoachService";
import { getConsistencyHistory, getLatestConsistency, getTodayWorkoutScheduleEntry } from "./planService";
import { getUserPRs, getWorkoutStats } from "./workoutService";

export type ProgressTimeframe = "week" | "month" | "year";

export type MetricQualityFlag = {
  key: "weight_data" | "bodyfat_data" | "consistency_data" | "workout_data";
  status: "good" | "warn" | "missing";
  message: string;
};

export type TrendPoint = {
  day: string;
  value: number;
  isToday?: boolean;
};

export type CircumferenceDelta = {
  waistCm: number | null;
  hipsCm: number | null;
  chestCm: number | null;
  armsCm: number | null;
  thighsCm: number | null;
};

export interface BodyCompMetrics {
  currentWeightKg: number | null;
  weightChangePercent: number;
  weightDeltaKg: number;
  weightTrendQualityScore: number;
  weightTrendSeries: TrendPoint[];
  bodyFatCurrent: number | null;
  bodyFatChange: number | null;
  circumferenceDelta: CircumferenceDelta;
}

export interface AdherenceMetrics {
  consistencyAverage: number;
  consistencyChangePercent: number;
  consistencyTrendSeries: TrendPoint[];
  trendStabilityScore: number;
  streakDays: number;
  nutritionHitRate: number;
  nutritionHitDays: number;
  timeframeDays: number;
}

export interface PerformanceMetrics {
  sessions: number;
  totalVolumeLb: number;
  totalSets: number;
  totalReps: number;
  avgDurationMinutes: number;
  sessionsPerWeek: number;
  prVelocity30d: number;
}

export interface ProgressSnapshot {
  timeframe: ProgressTimeframe;
  generatedAt: string;
  bodyComp: BodyCompMetrics;
  adherence: AdherenceMetrics;
  performance: PerformanceMetrics;
  dataFreshness: {
    weightLastLoggedAt: string | null;
    consistencyLastLoggedAt: string | null;
    workoutLastSessionAt: string | null;
  };
  goalBenchmark: {
    key: "fat_loss" | "strength";
    title: string;
    status: "on_track" | "off_track" | "insufficient_data";
    paceLabel: string;
    paceValue: string;
    targetBand: string;
    details: string;
  } | null;
  qualityFlags: MetricQualityFlag[];
}

export interface HomeSnapshot {
  generatedAt: string;
  todayStatus: {
    nutritionTargetProximity: number;
    workoutStatus: "completed" | "planned" | "rest" | "none";
    hydrationReadiness: number;
  };
  kpiStrip: {
    weightDelta7dKg: number | null;
    consistencyScore: number;
    sessionsThisWeek: number;
    prepStatus: string;
  };
  nextBestActions: {
    id: string;
    title: string;
    description: string;
    route: string;
  }[];
}

type MeasurementRow = {
  weight_kg: number;
  body_fat_percentage: number | null;
  waist_cm: number | null;
  chest_cm: number | null;
  arms_cm: number | null;
  thighs_cm: number | null;
  hips_cm: number | null;
  logged_at: string;
};

type TargetsRow = {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  water_ml: number;
} | null;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

function getTimeframeDays(timeframe: ProgressTimeframe): number {
  if (timeframe === "week") return 7;
  if (timeframe === "month") return 30;
  return 365;
}

function toIsoDate(date: Date) {
  return date.toISOString().split("T")[0];
}

function getDateRange(days: number) {
  const end = new Date();
  const start = new Date(end);
  start.setDate(end.getDate() - (days - 1));
  return {
    startDate: toIsoDate(start),
    endDate: toIsoDate(end),
  };
}

function dayLabel(isoDate: string, timeframe: ProgressTimeframe) {
  const d = new Date(isoDate);
  if (timeframe === "week") return d.toLocaleDateString("en-US", { weekday: "narrow" });
  if (timeframe === "month") return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return d.toLocaleDateString("en-US", { month: "short" });
}

function percentChange(latest: number, earliest: number) {
  if (!Number.isFinite(latest) || !Number.isFinite(earliest) || earliest === 0) return 0;
  return round1(((latest - earliest) / earliest) * 100);
}

function stdDev(values: number[]) {
  if (values.length < 2) return 0;
  const mean = values.reduce((acc, n) => acc + n, 0) / values.length;
  const variance = values.reduce((acc, n) => acc + (n - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function mondayStartIso() {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - daysToMonday);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString();
}

function computeCircDelta(current: MeasurementRow | null, baseline: MeasurementRow | null): CircumferenceDelta {
  const delta = (latest: number | null | undefined, earliest: number | null | undefined) => {
    if (latest == null || earliest == null) return null;
    return round1(latest - earliest);
  };
  return {
    waistCm: delta(current?.waist_cm, baseline?.waist_cm),
    hipsCm: delta(current?.hips_cm, baseline?.hips_cm),
    chestCm: delta(current?.chest_cm, baseline?.chest_cm),
    armsCm: delta(current?.arms_cm, baseline?.arms_cm),
    thighsCm: delta(current?.thighs_cm, baseline?.thighs_cm),
  };
}

function buildWeightQualityScore(measurements: MeasurementRow[], timeframeDays: number) {
  if (!measurements.length) return 0;
  const expected = timeframeDays === 7 ? 2 : timeframeDays === 30 ? 4 : 12;
  const coverageScore = clamp((measurements.length / expected) * 100, 0, 100);
  const latestDate = new Date(measurements[0].logged_at);
  const daysSinceLatest = Math.max(
    0,
    (Date.now() - latestDate.getTime()) / (1000 * 60 * 60 * 24),
  );
  const recencyScore = clamp(100 - daysSinceLatest * 12, 0, 100);
  return Math.round((coverageScore * 0.6) + (recencyScore * 0.4));
}

async function getMeasurementsInRange(userId: string, startDate: string, endDate: string): Promise<MeasurementRow[]> {
  const { data, error } = await supabase
    .from("user_measurements")
    .select("weight_kg, body_fat_percentage, waist_cm, chest_cm, arms_cm, thighs_cm, hips_cm, logged_at")
    .eq("user_id", userId)
    .gte("logged_at", `${startDate}T00:00:00`)
    .lte("logged_at", `${endDate}T23:59:59`)
    .order("logged_at", { ascending: false });

  if (error) throw error;
  return (data || []) as MeasurementRow[];
}

async function getTargets(userId: string): Promise<TargetsRow> {
  const { data, error } = await supabase
    .from("user_targets")
    .select("calories, protein_g, carbs_g, fat_g, water_ml")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data as TargetsRow;
}

async function getUserStreak(userId: string): Promise<number> {
  const today = new Date();
  const since = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const [workouts, meals] = await Promise.all([
    supabase
      .from("workout_sessions")
      .select("started_at")
      .eq("user_id", userId)
      .gte("started_at", since),
    supabase
      .from("meal_logs")
      .select("logged_at")
      .eq("user_id", userId)
      .gte("logged_at", since),
  ]);

  if (workouts.error) throw workouts.error;
  if (meals.error) throw meals.error;

  const activity = new Set<string>();
  workouts.data?.forEach((row: any) => {
    if (row?.started_at) activity.add(new Date(row.started_at).toDateString());
  });
  meals.data?.forEach((row: any) => {
    if (row?.logged_at) activity.add(new Date(row.logged_at).toDateString());
  });

  let streak = 0;
  const cursor = new Date();
  while (activity.has(cursor.toDateString())) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

async function getSessionsThisWeek(userId: string): Promise<number> {
  const mondayIso = mondayStartIso();
  const { count, error } = await supabase
    .from("workout_sessions")
    .select("*", { head: true, count: "exact" })
    .eq("user_id", userId)
    .gte("started_at", mondayIso)
    .not("finished_at", "is", null);
  if (error) throw error;
  return count || 0;
}

async function getOnboardingPayload(userId: string): Promise<Record<string, unknown>> {
  const { data, error } = await supabase
    .from("onboarding_answers")
    .select("answers")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return (data?.answers || {}) as Record<string, unknown>;
}

async function getLatestWorkoutTimestamp(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("workout_sessions")
    .select("started_at")
    .eq("user_id", userId)
    .not("finished_at", "is", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data?.started_at || null;
}

export async function getProgressSnapshot(
  userId: string,
  timeframe: ProgressTimeframe,
): Promise<ProgressSnapshot> {
  const days = getTimeframeDays(timeframe);
  const { startDate, endDate } = getDateRange(days);
  const startIso = `${startDate}T00:00:00.000Z`;
  const endIso = `${endDate}T23:59:59.999Z`;

  const [measurements, consistencyHistory, targets, nutritionStats, workoutStats, prs, streak, onboardingPayload, latestWorkoutAt] = await Promise.all([
    getMeasurementsInRange(userId, startDate, endDate),
    getConsistencyHistory(userId, days),
    getTargets(userId),
    getNutritionStats(userId, startIso, endIso),
    getWorkoutStats(userId, startIso, endIso),
    getUserPRs(userId),
    getUserStreak(userId),
    getOnboardingPayload(userId),
    getLatestWorkoutTimestamp(userId),
  ]);

  const newestMeasurement = measurements[0] || null;
  const oldestMeasurement = measurements.length ? measurements[measurements.length - 1] : null;
  const weightDeltaKg = newestMeasurement && oldestMeasurement
    ? round1(newestMeasurement.weight_kg - oldestMeasurement.weight_kg)
    : 0;
  const weightChangePct = newestMeasurement && oldestMeasurement
    ? percentChange(newestMeasurement.weight_kg, oldestMeasurement.weight_kg)
    : 0;
  const bodyFatSeries = measurements.filter((m) => m.body_fat_percentage != null);
  const bodyFatCurrent = bodyFatSeries[0]?.body_fat_percentage ?? null;
  const bodyFatChange = bodyFatSeries.length > 1 && bodyFatSeries[bodyFatSeries.length - 1].body_fat_percentage != null
    ? round1((bodyFatSeries[0].body_fat_percentage as number) - (bodyFatSeries[bodyFatSeries.length - 1].body_fat_percentage as number))
    : null;

  const weightTrendSeries: TrendPoint[] = [...measurements]
    .reverse()
    .map((row) => ({
      day: dayLabel(row.logged_at, timeframe),
      value: round1(row.weight_kg),
      isToday: toIsoDate(new Date(row.logged_at)) === toIsoDate(new Date()),
    }));

  const consistencySeries = consistencyHistory.map((row) => ({
    day: dayLabel(row.log_date, timeframe),
    value: Number(row.overall_score || 0),
    isToday: row.log_date === toIsoDate(new Date()),
  }));
  const consistencyValues = consistencyHistory.map((row) => Number(row.overall_score || 0));
  const consistencyAverage = consistencyValues.length
    ? consistencyValues.reduce((acc, n) => acc + n, 0) / consistencyValues.length
    : 0;
  const consistencyChange = consistencyValues.length >= 2
    ? percentChange(consistencyValues[consistencyValues.length - 1], consistencyValues[0])
    : 0;
  const consistencyStability = Math.round(clamp(100 - (stdDev(consistencyValues) * 1.7), 0, 100));

  const dailyDates = Array.from({ length: days }, (_, idx) => {
    const date = new Date(startDate);
    date.setDate(date.getDate() + idx);
    return toIsoDate(date);
  });
  const calorieTarget = Math.max(1, Number(targets?.calories || 2000));
  const proteinTarget = Math.max(1, Number(targets?.protein_g || 150));
  const nutritionHits = dailyDates.reduce((acc, date) => {
    const day = nutritionStats[date] || { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
    const caloriesInBand = day.calories >= calorieTarget * 0.9 && day.calories <= calorieTarget * 1.1;
    const proteinHit = day.protein >= proteinTarget * 0.9;
    return acc + (caloriesInBand && proteinHit ? 1 : 0);
  }, 0);
  const nutritionHitRate = Math.round((nutritionHits / Math.max(1, days)) * 100);

  const last30PrCount = prs.filter((pr) => {
    const achievedAt = Date.parse(pr.achieved_at as string);
    return Number.isFinite(achievedAt) && achievedAt >= (Date.now() - 30 * 24 * 60 * 60 * 1000);
  }).length;

  const qualityFlags: MetricQualityFlag[] = [
    measurements.length === 0
      ? { key: "weight_data", status: "missing", message: "No weigh-ins logged in this timeframe." }
      : measurements.length < (timeframe === "week" ? 2 : timeframe === "month" ? 3 : 8)
        ? { key: "weight_data", status: "warn", message: "Add more weigh-ins for more reliable trends." }
        : { key: "weight_data", status: "good", message: "Weight trend confidence is healthy." },
    bodyFatSeries.length === 0
      ? { key: "bodyfat_data", status: "missing", message: "Body-fat trend unavailable in current window." }
      : bodyFatSeries.length < 2
        ? { key: "bodyfat_data", status: "warn", message: "Need one more body-fat entry for trend direction." }
        : { key: "bodyfat_data", status: "good", message: "Body-fat trend has enough data." },
    consistencyHistory.length === 0
      ? { key: "consistency_data", status: "missing", message: "Consistency data not available yet." }
      : consistencyHistory.length < 3
        ? { key: "consistency_data", status: "warn", message: "Consistency trend is still stabilizing." }
        : { key: "consistency_data", status: "good", message: "Consistency trend has enough samples." },
    workoutStats.totalSessions === 0
      ? { key: "workout_data", status: "missing", message: "No completed sessions in this timeframe." }
      : { key: "workout_data", status: "good", message: "Workout performance data is available." },
  ];

  const goalType = String(onboardingPayload.goal_type || "maintain_weight");
  const sessionEmphasis = String(onboardingPayload.session_emphasis || "").toLowerCase();
  const newest = measurements[0] || null;
  const oldest = measurements.length ? measurements[measurements.length - 1] : null;
  const weeklyWeightRatePct = (() => {
    if (!newest || !oldest || !oldest.weight_kg) return null;
    const daysBetween = Math.max(
      1,
      (Date.parse(newest.logged_at) - Date.parse(oldest.logged_at)) / (1000 * 60 * 60 * 24),
    );
    const pct = ((newest.weight_kg - oldest.weight_kg) / oldest.weight_kg) * 100;
    return round1((pct * 7) / daysBetween);
  })();

  const waistDelta = newest?.waist_cm != null && oldest?.waist_cm != null
    ? round1(newest.waist_cm - oldest.waist_cm)
    : null;

  const recentWindowStart = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const priorWindowStart = Date.now() - 60 * 24 * 60 * 60 * 1000;
  const recentPrs = prs.filter((pr) => {
    const ts = Date.parse(pr.achieved_at as string);
    return Number.isFinite(ts) && ts >= recentWindowStart;
  });
  const priorPrs = prs.filter((pr) => {
    const ts = Date.parse(pr.achieved_at as string);
    return Number.isFinite(ts) && ts >= priorWindowStart && ts < recentWindowStart;
  });
  const avgRecentE1rm = recentPrs.length
    ? recentPrs.reduce((acc, pr: any) => acc + Number(pr.estimated_1rm || 0), 0) / recentPrs.length
    : null;
  const avgPriorE1rm = priorPrs.length
    ? priorPrs.reduce((acc, pr: any) => acc + Number(pr.estimated_1rm || 0), 0) / priorPrs.length
    : null;
  const e1rmPacePct = avgRecentE1rm && avgPriorE1rm
    ? round1(((avgRecentE1rm - avgPriorE1rm) / avgPriorE1rm) * 100)
    : null;

  const goalBenchmark: ProgressSnapshot["goalBenchmark"] = (() => {
    if (goalType === "lose_weight") {
      const minRate = -0.8;
      const maxRate = -0.25;
      if (weeklyWeightRatePct == null) {
        return {
          key: "fat_loss",
          title: "Fat-Loss Pace",
          status: "insufficient_data",
          paceLabel: "Weekly bodyweight rate",
          paceValue: "Need more check-ins",
          targetBand: `${minRate}% to ${maxRate}% / week`,
          details: "Add at least 2 check-ins in this window for accurate pace tracking.",
        };
      }
      const status = weeklyWeightRatePct >= minRate && weeklyWeightRatePct <= maxRate ? "on_track" : "off_track";
      return {
        key: "fat_loss",
        title: "Fat-Loss Pace",
        status,
        paceLabel: "Weekly bodyweight rate",
        paceValue: `${weeklyWeightRatePct > 0 ? "+" : ""}${weeklyWeightRatePct}% / week`,
        targetBand: `${minRate}% to ${maxRate}% / week`,
        details: `Waist delta ${waistDelta == null ? "--" : `${waistDelta > 0 ? "+" : ""}${waistDelta}cm`} across selected timeframe.`,
      };
    }

    if (sessionEmphasis === "strength" || goalType === "gain_weight") {
      if (e1rmPacePct == null && workoutStats.totalSessions < 3) {
        return {
          key: "strength",
          title: "Strength Progression",
          status: "insufficient_data",
          paceLabel: "e1RM pace",
          paceValue: "Insufficient data",
          targetBand: "+1.0% to +4.0% / 30d",
          details: "Log more heavy top sets to improve e1RM trend confidence.",
        };
      }
      const status = e1rmPacePct == null
        ? (last30PrCount > 0 && workoutStats.sessionsPerWeek >= 2 ? "on_track" : "off_track")
        : (e1rmPacePct >= 1 && e1rmPacePct <= 4 ? "on_track" : "off_track");
      return {
        key: "strength",
        title: "Strength Progression",
        status,
        paceLabel: "e1RM pace",
        paceValue: e1rmPacePct == null
          ? `${last30PrCount} PRs / 30d`
          : `${e1rmPacePct > 0 ? "+" : ""}${e1rmPacePct}% / 30d`,
        targetBand: "+1.0% to +4.0% / 30d",
        details: `Volume ${workoutStats.totalVolumeLb} lb, sessions/week ${workoutStats.sessionsPerWeek}.`,
      };
    }

    return null;
  })();

  return {
    timeframe,
    generatedAt: new Date().toISOString(),
    bodyComp: {
      currentWeightKg: newestMeasurement?.weight_kg || null,
      weightChangePercent: weightChangePct,
      weightDeltaKg,
      weightTrendQualityScore: buildWeightQualityScore(measurements, days),
      weightTrendSeries,
      bodyFatCurrent,
      bodyFatChange,
      circumferenceDelta: computeCircDelta(newestMeasurement, oldestMeasurement),
    },
    adherence: {
      consistencyAverage: round1(consistencyAverage),
      consistencyChangePercent: consistencyChange,
      consistencyTrendSeries: consistencySeries,
      trendStabilityScore: consistencyStability,
      streakDays: streak,
      nutritionHitRate,
      nutritionHitDays: nutritionHits,
      timeframeDays: days,
    },
    performance: {
      sessions: workoutStats.totalSessions,
      totalVolumeLb: workoutStats.totalVolumeLb,
      totalSets: workoutStats.totalSets,
      totalReps: workoutStats.totalReps,
      avgDurationMinutes: workoutStats.avgDurationMinutes,
      sessionsPerWeek: workoutStats.sessionsPerWeek,
      prVelocity30d: last30PrCount,
    },
    dataFreshness: {
      weightLastLoggedAt: newestMeasurement?.logged_at || null,
      consistencyLastLoggedAt: consistencyHistory.length
        ? `${consistencyHistory[consistencyHistory.length - 1].log_date}T00:00:00.000Z`
        : null,
      workoutLastSessionAt: latestWorkoutAt,
    },
    goalBenchmark,
    qualityFlags,
  };
}

export async function getHomeSnapshot(userId: string): Promise<HomeSnapshot> {
  const today = toIsoDate(new Date());
  const [dailyTotals, targets, measurements7d, consistency7d, todaySchedule, latestConsistency, prepState, sessionsThisWeek] = await Promise.all([
    getDailyTotals(userId, today),
    getTargets(userId),
    getMeasurementsInRange(userId, toIsoDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)), today),
    getConsistencyHistory(userId, 7),
    getTodayWorkoutScheduleEntry(userId),
    getLatestConsistency(userId),
    getPrepCoachState(userId).catch(
      () =>
        ({
          enabled: false,
          discipline: null,
          phase: null,
          autoAdjustEnabled: false,
          isElite: false,
          eliteRequired: false,
          lastAdjustment: null,
          nextCheckInDate: null,
        }) as PrepCoachState,
    ),
    getSessionsThisWeek(userId),
  ]);

  const calorieTarget = Math.max(1, Number(targets?.calories || 2000));
  const nutritionTargetProximity = Math.round(
    clamp(
      100 - (Math.abs((dailyTotals.calories || 0) - calorieTarget) / calorieTarget) * 100,
      0,
      100,
    ),
  );

  let workoutStatus: "completed" | "planned" | "rest" | "none" = "none";
  if (todaySchedule?.session_type === "workout") {
    workoutStatus = todaySchedule.status === "completed" ? "completed" : "planned";
  } else if (todaySchedule?.session_type) {
    workoutStatus = "rest";
  }

  const hydrationReadiness = Math.round(
    clamp(
      Number(latestConsistency?.hydration_score || consistency7d[0]?.hydration_score || 65),
      0,
      100,
    ),
  );

  const newestMeasurement = measurements7d[0];
  const oldestMeasurement = measurements7d[measurements7d.length - 1];
  const weightDelta7dKg = newestMeasurement && oldestMeasurement
    ? round1(newestMeasurement.weight_kg - oldestMeasurement.weight_kg)
    : null;

  const consistencyScore = consistency7d.length
    ? Math.round(consistency7d.reduce((acc, row) => acc + Number(row.overall_score || 0), 0) / consistency7d.length)
    : 0;

  const prepStatus = prepState.enabled
    ? `${prepState.discipline || "prep"} ${prepState.phase || ""}`.trim()
    : "Off";

  const actions: HomeSnapshot["nextBestActions"] = [];
  if ((dailyTotals.calories || 0) < calorieTarget * 0.3) {
    actions.push({
      id: "log-food",
      title: "Log your next meal",
      description: "You are far below today’s nutrition target.",
      route: "/(tabs)/nutrition/food-search",
    });
  }
  if (workoutStatus === "planned") {
    actions.push({
      id: "complete-workout",
      title: "Complete today’s workout",
      description: "A workout is scheduled and still pending.",
      route: "/(tabs)/workout",
    });
  }
  if (!newestMeasurement || (Date.now() - Date.parse(newestMeasurement.logged_at)) > 8 * 24 * 60 * 60 * 1000) {
    actions.push({
      id: "check-in-weight",
      title: "Log a check-in",
      description: "Fresh body metrics improve your trend reliability.",
      route: "/log-weight-sheet",
    });
  }

  if (!actions.length) {
    actions.push(
      {
        id: "view-progress",
        title: "Review your progress trends",
        description: "You are on track. Use trends to plan next week.",
        route: "/(tabs)/progress",
      },
      {
        id: "open-plan",
        title: "Review your nutrition plan",
        description: "Fine-tune upcoming meals before tomorrow.",
        route: "/(tabs)/nutrition/my-plan",
      },
    );
  } else if (actions.length === 1) {
    actions.push({
      id: "backup-action",
      title: "Open weekly check-in",
      description: "Run a quick review to keep adjustments current.",
      route: "/check-in",
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    todayStatus: {
      nutritionTargetProximity,
      workoutStatus,
      hydrationReadiness,
    },
    kpiStrip: {
      weightDelta7dKg,
      consistencyScore,
      sessionsThisWeek,
      prepStatus,
    },
    nextBestActions: actions.slice(0, 2),
  };
}

export interface DailyActivityStatus {
  dayLabel: string;
  date: string;
  macroGoalMet: boolean;
  workoutCompleted: boolean;
  isToday: boolean;
}

export async function getWeeklyActivityStatus(userId: string): Promise<DailyActivityStatus[]> {
  const today = new Date();
  const todayIso = toIsoDate(today);

  // Build array for current week (Sunday–Saturday)
  const dayOfWeek = today.getDay(); // 0=Sun
  const sunday = new Date(today);
  sunday.setDate(today.getDate() - dayOfWeek);

  const weekDates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    weekDates.push(toIsoDate(d));
  }

  const startIso = `${weekDates[0]}T00:00:00.000Z`;
  const endIso = `${weekDates[6]}T23:59:59.999Z`;
  const dayLabels = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  const [workoutsRes, targets, nutritionStats] = await Promise.all([
    supabase
      .from("workout_sessions")
      .select("started_at")
      .eq("user_id", userId)
      .gte("started_at", startIso)
      .lte("started_at", endIso)
      .not("finished_at", "is", null),
    getTargets(userId),
    getNutritionStats(userId, startIso, endIso),
  ]);

  const workoutDates = new Set<string>();
  (workoutsRes.data || []).forEach((row: any) => {
    if (row?.started_at) workoutDates.add(toIsoDate(new Date(row.started_at)));
  });

  const calorieTarget = Math.max(1, Number(targets?.calories || 2000));
  const proteinTarget = Math.max(1, Number(targets?.protein_g || 150));

  return weekDates.map((date, idx) => {
    const nutrition = nutritionStats[date] || { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
    const caloriesInBand = nutrition.calories >= calorieTarget * 0.85 && nutrition.calories <= calorieTarget * 1.15;
    const proteinHit = nutrition.protein >= proteinTarget * 0.85;
    const macroGoalMet = caloriesInBand && proteinHit;
    const workoutCompleted = workoutDates.has(date);

    return {
      dayLabel: dayLabels[idx],
      date,
      macroGoalMet,
      workoutCompleted,
      isToday: date === todayIso,
    };
  });
}
