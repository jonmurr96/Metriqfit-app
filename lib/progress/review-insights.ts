import type { CircumferenceDelta } from "../../services/progressMetricsService";

export type ProgressReviewStatus = "on_pace" | "watch" | "quiet" | "insufficient_data";

export interface ProgressReviewMiss {
  id: string;
  label: string;
  detail: string;
}

export interface ProgressReviewAction {
  id: "log_food" | "open_workout" | "open_checkin" | "review_progress";
  label: string;
  route: string;
}

export interface ProgressDailyReviewSnapshot {
  date: string;
  status: ProgressReviewStatus;
  headline: string;
  subheadline: string;
  nutrition: {
    calories: number;
    calorieTarget: number | null;
    protein: number;
    proteinTarget: number | null;
    caloriesHit: boolean;
    proteinHit: boolean;
  };
  workout: {
    status: "completed" | "planned" | "active" | "rest" | "none";
    name: string | null;
  };
  hydration: {
    score: number | null;
    readinessLabel: string;
  };
  misses: ProgressReviewMiss[];
  primaryAction: ProgressReviewAction;
  secondaryAction: ProgressReviewAction | null;
}

export interface ProgressWeeklyReviewMetric {
  label: string;
  value: string;
  detail: string;
}

export interface ProgressWeeklyReviewSnapshot {
  range: string;
  status: ProgressReviewStatus;
  headline: string;
  subheadline: string;
  bestMetric: ProgressWeeklyReviewMetric;
  weakestArea: ProgressWeeklyReviewMetric;
  training: {
    sessionsCompleted: number;
    volumeDirection: "up" | "down" | "flat";
    volumeChangePercent: number | null;
    consistencySummary: string;
  };
  body: {
    weightDeltaKg: number | null;
    weightDirection: "up" | "down" | "flat" | "unknown";
    bodyFatDelta: number | null;
    circumferenceDelta: CircumferenceDelta | null;
    confidence: "high" | "limited";
  };
  checkInStatus: {
    lastCheckInAt: string | null;
    checkpointCount: number;
    state: "fresh" | "stale" | "missing";
  };
  nextWeekFocus: string;
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function percentOf(actual: number, target: number | null) {
  if (!target || target <= 0) return null;
  return Math.round((actual / target) * 100);
}

function formatDaysAgo(daysAgo: number | null) {
  if (daysAgo == null) return "No recent check-in";
  if (daysAgo === 0) return "today";
  if (daysAgo === 1) return "1 day ago";
  return `${daysAgo} days ago`;
}

function hydrationLabel(score: number | null) {
  if (score == null) return "No hydration signal";
  if (score >= 80) return "Hydration ready";
  if (score >= 60) return "Hydration fair";
  return "Hydration needs attention";
}

function calorieMiss(calories: number, calorieTarget: number | null): ProgressReviewMiss | null {
  if (!calorieTarget || calorieTarget <= 0) return null;
  if (calories >= calorieTarget * 0.8) return null;
  return {
    id: "calories_low",
    label: "Calories running low",
    detail: `${calories} of ${calorieTarget} kcal logged so far.`,
  };
}

function proteinMiss(protein: number, proteinTarget: number | null): ProgressReviewMiss | null {
  if (!proteinTarget || proteinTarget <= 0) return null;
  if (protein >= proteinTarget * 0.75) return null;
  return {
    id: "protein_low",
    label: "Protein is behind target",
    detail: `${round1(protein)} of ${proteinTarget} g logged so far.`,
  };
}

function staleCheckInMiss(daysAgo: number | null): ProgressReviewMiss | null {
  if (daysAgo == null || daysAgo <= 14) return null;
  return {
    id: "stale_checkin",
    label: "Body check-in is stale",
    detail: `Latest check-in was ${formatDaysAgo(daysAgo)}.`,
  };
}

function workoutMiss(
  status: ProgressDailyReviewSnapshot["workout"]["status"],
  workoutName: string | null,
): ProgressReviewMiss | null {
  if (status !== "planned") return null;
  return {
    id: "planned_workout_open",
    label: "Planned workout is still open",
    detail: workoutName ? `${workoutName} is still waiting.` : "Today's workout is still waiting.",
  };
}

function dedupeActions(actions: (ProgressReviewAction | null)[]) {
  const seen = new Set<string>();
  return actions.filter((action): action is ProgressReviewAction => {
    if (!action || seen.has(action.id)) return false;
    seen.add(action.id);
    return true;
  });
}

function resolvePrimaryAction(input: {
  hasMeaningfulActivity: boolean;
  workoutStatus: ProgressDailyReviewSnapshot["workout"]["status"];
  calories: number;
  calorieTarget: number | null;
  protein: number;
  proteinTarget: number | null;
  bodyCheckInDaysAgo: number | null;
}): ProgressReviewAction[] {
  const actions: (ProgressReviewAction | null)[] = [];

  if (!input.hasMeaningfulActivity) {
    actions.push({
      id: "review_progress",
      label: "Review progress",
      route: "/(tabs)/progress",
    });
  }

  if (input.workoutStatus === "active" || input.workoutStatus === "planned") {
    actions.push({
      id: "open_workout",
      label: input.workoutStatus === "active" ? "Open active workout" : "Open workout",
      route: "/(tabs)/workout",
    });
  }

  if (
    (input.calorieTarget && input.calories < input.calorieTarget * 0.8) ||
    (input.proteinTarget && input.protein < input.proteinTarget * 0.75)
  ) {
    actions.push({
      id: "log_food",
      label: "Log food",
      route: "/(tabs)/nutrition",
    });
  }

  if (input.bodyCheckInDaysAgo == null || input.bodyCheckInDaysAgo > 14) {
    actions.push({
      id: "open_checkin",
      label: "Open weekly check-in",
      route: "/check-in",
    });
  }

  actions.push({
    id: "review_progress",
    label: "Review progress",
    route: "/(tabs)/progress",
  });

  return dedupeActions(actions);
}

export function buildProgressDailyReviewSnapshot(input: {
  date: string;
  calories: number;
  calorieTarget: number | null;
  protein: number;
  proteinTarget: number | null;
  hydrationScore: number | null;
  workoutStatus: "completed" | "planned" | "active" | "rest" | "none";
  workoutName?: string | null;
  bodyCheckInDaysAgo: number | null;
}): ProgressDailyReviewSnapshot {
  const misses = [
    calorieMiss(input.calories, input.calorieTarget),
    workoutMiss(input.workoutStatus, input.workoutName || null),
    staleCheckInMiss(input.bodyCheckInDaysAgo),
    proteinMiss(input.protein, input.proteinTarget),
  ].filter((miss): miss is ProgressReviewMiss => Boolean(miss));

  const hasMeaningfulActivity =
    input.calories > 0 ||
    input.protein > 0 ||
    input.hydrationScore != null ||
    input.workoutStatus !== "none";

  const caloriePercent = percentOf(input.calories, input.calorieTarget);
  const proteinPercent = percentOf(input.protein, input.proteinTarget);

  let status: ProgressReviewStatus = "quiet";
  let headline = "Quiet day so far";
  let subheadline = "No workout, nutrition, or hydration signals have been logged yet today.";

  if (!hasMeaningfulActivity) {
    status = "quiet";
  } else if (misses.length === 0 && (input.workoutStatus === "completed" || input.workoutStatus === "active" || (input.hydrationScore || 0) >= 70)) {
    status = "on_pace";
    headline = "On pace";
    subheadline = `${
      input.workoutStatus === "active"
        ? `${input.workoutName || "Workout"} is in progress`
        : input.workoutStatus === "completed"
          ? `${input.workoutName || "Workout"} is done`
          : "Nutrition and hydration are holding"
    }. Calories ${caloriePercent ?? 0}% of target and protein ${proteinPercent ?? 0}% of target.`;
  } else {
    status = "watch";
    headline = "Needs attention";
    subheadline = `${
      input.workoutStatus === "planned"
        ? `${input.workoutName || "Workout"} is still planned`
        : "Today's recovery and adherence signals are mixed"
    }. Calories ${caloriePercent ?? 0}% of target and protein ${proteinPercent ?? 0}% of target.`;
  }

  const actions = resolvePrimaryAction({
    hasMeaningfulActivity,
    workoutStatus: input.workoutStatus,
    calories: input.calories,
    calorieTarget: input.calorieTarget,
    protein: input.protein,
    proteinTarget: input.proteinTarget,
    bodyCheckInDaysAgo: input.bodyCheckInDaysAgo,
  });

  return {
    date: input.date,
    status,
    headline,
    subheadline,
    nutrition: {
      calories: input.calories,
      calorieTarget: input.calorieTarget,
      protein: round1(input.protein),
      proteinTarget: input.proteinTarget,
      caloriesHit: Boolean(input.calorieTarget && input.calories >= input.calorieTarget * 0.9),
      proteinHit: Boolean(input.proteinTarget && input.protein >= input.proteinTarget * 0.9),
    },
    workout: {
      status: input.workoutStatus,
      name: input.workoutName || null,
    },
    hydration: {
      score: input.hydrationScore,
      readinessLabel: hydrationLabel(input.hydrationScore),
    },
    misses: misses.slice(0, 3),
    primaryAction: actions[0],
    secondaryAction: actions[1] || null,
  };
}

function formatVolumeDirection(volumeChangePercent: number | null) {
  if (volumeChangePercent == null || Math.abs(volumeChangePercent) < 1) return "flat";
  return volumeChangePercent > 0 ? "up" : "down";
}

function resolveCheckInState(daysAgo: number | null, checkpointCount: number) {
  if (checkpointCount === 0) return "missing" as const;
  if (daysAgo == null || daysAgo > 14) return "stale" as const;
  return "fresh" as const;
}

export function buildProgressWeeklyReviewSnapshot(input: {
  range?: string;
  sessionsCompleted: number;
  volumeChangePercent: number | null;
  consistencyAverage: number;
  calorieHitRate: number;
  proteinHitRate: number;
  weightDeltaKg: number | null;
  bodyFatDelta: number | null;
  circumferenceDelta: CircumferenceDelta | null;
  bodyConfidence: "high" | "limited";
  latestCheckInAt: string | null;
  latestCheckInDaysAgo: number | null;
  checkpointCount: number;
}): ProgressWeeklyReviewSnapshot {
  const status: ProgressReviewStatus =
    input.sessionsCompleted === 0 && input.calorieHitRate === 0 && input.checkpointCount === 0
      ? "insufficient_data"
      : input.consistencyAverage >= 75 && input.sessionsCompleted >= 2
        ? "on_pace"
        : "watch";

  const volumeDirection = formatVolumeDirection(input.volumeChangePercent);
  const weightDirection =
    input.weightDeltaKg == null
      ? "unknown"
      : Math.abs(input.weightDeltaKg) < 0.2
        ? "flat"
        : input.weightDeltaKg > 0
          ? "up"
          : "down";

  const bestMetric =
    input.consistencyAverage >= Math.max(input.calorieHitRate, input.proteinHitRate)
      ? {
          label: "Consistency",
          value: `${Math.round(input.consistencyAverage)}%`,
          detail: "Highest quality signal across the week.",
        }
      : input.sessionsCompleted >= 2
        ? {
            label: "Training",
            value: `${input.sessionsCompleted} sessions`,
            detail: "Session count held up this week.",
          }
        : {
            label: "Nutrition",
            value: `${Math.round(Math.max(input.calorieHitRate, input.proteinHitRate))}%`,
            detail: "Best adherence signal across the week.",
          };

  const weakestArea =
    input.proteinHitRate < 60
      ? {
          label: "Protein adherence",
          value: `${Math.round(input.proteinHitRate)}%`,
          detail: "Protein intake lagged target most often.",
        }
      : input.sessionsCompleted < 2
        ? {
            label: "Training consistency",
            value: `${input.sessionsCompleted} sessions`,
            detail: "Session count was light for the week.",
          }
        : resolveCheckInState(input.latestCheckInDaysAgo, input.checkpointCount) !== "fresh"
          ? {
              label: "Check-in cadence",
              value: formatDaysAgo(input.latestCheckInDaysAgo),
              detail: "Body check-ins need a fresher checkpoint.",
            }
          : {
              label: "Calorie adherence",
              value: `${Math.round(input.calorieHitRate)}%`,
              detail: "Calories were the least stable weekly signal.",
            };

  const checkInState = resolveCheckInState(input.latestCheckInDaysAgo, input.checkpointCount);

  const headline =
    status === "on_pace"
      ? "Solid week"
      : status === "insufficient_data"
        ? "Need more weekly data"
        : "Watch next week";

  const subheadline =
    status === "on_pace"
      ? `Training held at ${input.sessionsCompleted} sessions and consistency averaged ${Math.round(input.consistencyAverage)}%.`
      : status === "insufficient_data"
        ? "Add more workouts, meals, and check-ins to make this review meaningful."
        : `Training logged ${input.sessionsCompleted} sessions with ${Math.round(input.consistencyAverage)}% consistency.`;

  const nextWeekFocus =
    weakestArea.label === "Protein adherence"
      ? "Bring protein closer to target before chasing bigger training changes."
      : weakestArea.label === "Training consistency"
        ? "Protect the next two workout slots before adding more volume."
        : weakestArea.label === "Check-in cadence"
          ? "Add a fresh body check-in so the next review has stronger context."
          : "Tighten calorie execution so the rest of the weekly signals are easier to read.";

  return {
    range: input.range || "7d",
    status,
    headline,
    subheadline,
    bestMetric,
    weakestArea,
    training: {
      sessionsCompleted: input.sessionsCompleted,
      volumeDirection,
      volumeChangePercent: input.volumeChangePercent,
      consistencySummary: `${Math.round(input.consistencyAverage)}% consistency · ${Math.round(input.calorieHitRate)}% calorie hit rate`,
    },
    body: {
      weightDeltaKg: input.weightDeltaKg,
      weightDirection,
      bodyFatDelta: input.bodyFatDelta,
      circumferenceDelta: input.circumferenceDelta,
      confidence: input.bodyConfidence,
    },
    checkInStatus: {
      lastCheckInAt: input.latestCheckInAt,
      checkpointCount: input.checkpointCount,
      state: checkInState,
    },
    nextWeekFocus,
  };
}
