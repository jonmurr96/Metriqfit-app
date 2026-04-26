import { supabase } from "../lib/supabase";
import { invokeFunction } from "../lib/supabase/invokeFunction";
import { checkEntitlementStatus } from "./subscriptionService";

export type PrepDiscipline = "bodybuilding" | "powerlifting";
export type PrepPhase = "cut" | "bulk";

export interface PrepCoachCycle {
  id: string;
  user_id: string;
  is_active: boolean;
  discipline: PrepDiscipline;
  phase: PrepPhase;
  auto_adjust_enabled: boolean;
  started_at: string;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PrepCoachAdjustmentEvent {
  id: string;
  user_id: string;
  cycle_id: string | null;
  measurement_id: string | null;
  source: "weekly_check_in";
  before_target_snapshot: Record<string, unknown>;
  after_target_snapshot: Record<string, unknown>;
  before_nutrition_plan_id: string | null;
  after_nutrition_plan_id: string | null;
  before_nutrition_plan_version: number | null;
  after_nutrition_plan_version: number | null;
  applied_workout_adjustment_ids: string[];
  coach_summary: string | null;
  status: "applied" | "recommended" | "reverted" | "failed";
  error_payload: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface PrepCoachState {
  enabled: boolean;
  discipline: PrepDiscipline | null;
  phase: PrepPhase | null;
  autoAdjustEnabled: boolean;
  isElite: boolean;
  eliteRequired: boolean;
  lastAdjustment: PrepCoachAdjustmentEvent | null;
  nextCheckInDate: string | null;
}

export interface PrepCoachAdjustmentResult {
  success: boolean;
  applied: boolean;
  prepModeEnabled: boolean;
  isElite: boolean;
  autoAdjustEnabled: boolean;
  discipline: PrepDiscipline;
  phase: PrepPhase;
  targetDelta: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    water_ml: number;
  };
  targetsBefore?: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    water_ml: number;
  };
  targetsAfter?: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    water_ml: number;
  };
  nutritionPlanVersionFrom: number | null;
  nutritionPlanVersionTo: number | null;
  workoutAdjustmentsApplied: string[];
  coachSummary: string;
  eventId: string | null;
}

function mapGoalTypeToPhase(goalType: string | null): PrepPhase | null {
  if (!goalType) return null;
  if (goalType === "lose_weight") return "cut";
  if (goalType === "gain_weight") return "bulk";
  return null;
}

function detectDiscipline(answers: Record<string, unknown>): PrepDiscipline {
  const explicit = String(answers.prep_discipline || "").toLowerCase();
  if (explicit === "powerlifting") return "powerlifting";
  if (explicit === "bodybuilding") return "bodybuilding";
  return String(answers.session_emphasis || "").toLowerCase() === "strength"
    ? "powerlifting"
    : "bodybuilding";
}

function mapEvent(row: any): PrepCoachAdjustmentEvent {
  return {
    id: row.id,
    user_id: row.user_id,
    cycle_id: row.cycle_id || null,
    measurement_id: row.measurement_id || null,
    source: row.source,
    before_target_snapshot: row.before_target_snapshot || {},
    after_target_snapshot: row.after_target_snapshot || {},
    before_nutrition_plan_id: row.before_nutrition_plan_id || null,
    after_nutrition_plan_id: row.after_nutrition_plan_id || null,
    before_nutrition_plan_version: row.before_nutrition_plan_version ?? null,
    after_nutrition_plan_version: row.after_nutrition_plan_version ?? null,
    applied_workout_adjustment_ids: Array.isArray(row.applied_workout_adjustment_ids)
      ? row.applied_workout_adjustment_ids
      : [],
    coach_summary: row.coach_summary || null,
    status: row.status,
    error_payload: row.error_payload || null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function getPrepCoachState(userId: string): Promise<PrepCoachState> {
  const [{ data: cycle }, { data: event }, { data: onboarding }] = await Promise.all([
    (supabase as any)
      .from("prep_coach_cycles")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("updated_at", { ascending: false })
      .maybeSingle(),
    (supabase as any)
      .from("prep_coach_adjustment_events")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("onboarding_answers")
      .select("answers")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  const answers = (onboarding?.answers || {}) as Record<string, unknown>;
  const prepEnabled = cycle?.is_active === true || answers.prep_mode_enabled === true;
  const discipline = (cycle?.discipline || detectDiscipline(answers)) as PrepDiscipline;
  const phase = (cycle?.phase || mapGoalTypeToPhase(String(answers.goal_type || "")) || "cut") as PrepPhase;
  const explicitAutoAdjust = cycle?.auto_adjust_enabled === true || answers.prep_auto_adjust_enabled === true;
  const entitlement = await checkEntitlementStatus(userId);
  const isElite = entitlement.isElite;
  const autoAdjustEnabled = prepEnabled && explicitAutoAdjust && isElite;
  const eliteRequired = prepEnabled && !isElite;

  const lastEvent = event ? mapEvent(event) : null;
  const nextCheckInDate = lastEvent
    ? new Date(new Date(lastEvent.created_at).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
    : null;

  return {
    enabled: prepEnabled,
    discipline: prepEnabled ? discipline : null,
    phase: prepEnabled ? phase : null,
    autoAdjustEnabled,
    isElite,
    eliteRequired,
    lastAdjustment: lastEvent,
    nextCheckInDate,
  };
}

export async function runPrepCoachCheckInAdjustment(input: {
  measurementId: string;
  dryRun?: boolean;
}): Promise<PrepCoachAdjustmentResult> {
  const { data, parsedError, rawError } = await invokeFunction(() =>
    supabase.functions.invoke("prep-coach-checkin-adjust", {
      body: {
        measurementId: input.measurementId,
        dryRun: Boolean(input.dryRun),
        source: "weekly_check_in",
      },
    })
  );

  if (rawError) throw new Error(parsedError?.error || parsedError?.message || rawError?.message || "Failed to run prep coach adjustment");
  if (!data?.success && data?.error) throw new Error(data.error);

  return data as PrepCoachAdjustmentResult;
}

export async function getPrepAdjustmentHistory(userId: string, limit = 20): Promise<PrepCoachAdjustmentEvent[]> {
  const { data, error } = await (supabase as any)
    .from("prep_coach_adjustment_events")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(Math.max(1, Math.min(limit, 100)));

  if (error) throw new Error(error.message || "Failed to load prep adjustment history");
  return (data || []).map(mapEvent);
}

export async function revertPrepAdjustment(userId: string, eventId: string): Promise<void> {
  const { data: event, error: eventError } = await (supabase as any)
    .from("prep_coach_adjustment_events")
    .select("*")
    .eq("id", eventId)
    .eq("user_id", userId)
    .maybeSingle();

  if (eventError || !event) throw new Error(eventError?.message || "Prep adjustment event not found");
  if (event.status !== "applied") throw new Error("Only applied prep adjustments can be reverted");

  const beforeTargets = (event.before_target_snapshot || {}) as Record<string, unknown>;
  const beforePlanId = event.before_nutrition_plan_id as string | null;

  const { error: targetError } = await supabase
    .from("user_targets")
    .update({
      calories: Number(beforeTargets.calories || 0),
      protein_g: Number(beforeTargets.protein_g || 0),
      carbs_g: Number(beforeTargets.carbs_g || 0),
      fat_g: Number(beforeTargets.fat_g || 0),
      water_ml: Number(beforeTargets.water_ml || 0),
      computation_method: "prep_coach_revert_v1",
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);
  if (targetError) throw new Error(targetError.message || "Failed to revert target snapshot");

  if (beforePlanId) {
    const { error: deactivateError } = await (supabase as any)
      .from("user_nutrition_plans")
      .update({ is_active: false })
      .eq("user_id", userId)
      .eq("is_active", true);
    if (deactivateError) throw new Error(deactivateError.message || "Failed to clear active nutrition plan");

    const { error: activateError } = await (supabase as any)
      .from("user_nutrition_plans")
      .update({ is_active: true })
      .eq("id", beforePlanId)
      .eq("user_id", userId);
    if (activateError) throw new Error(activateError.message || "Failed to reactivate previous nutrition plan");
  }

  const { error: statusError } = await (supabase as any)
    .from("prep_coach_adjustment_events")
    .update({
      status: "reverted",
      updated_at: new Date().toISOString(),
    })
    .eq("id", eventId)
    .eq("user_id", userId);
  if (statusError) throw new Error(statusError.message || "Failed to update prep event status");
}
