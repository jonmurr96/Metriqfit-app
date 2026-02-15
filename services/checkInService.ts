import { supabase } from '../lib/supabase';
import type { Database } from '../lib/supabase/types';

export interface CheckInInput {
  userId: string;
  weightValue: number;
  unitSystem: 'imperial' | 'metric';
  sleep: number;
  stress: number;
  energy: number;
}

export interface TargetSnapshot {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  water_ml: number;
}

export interface CheckInPreviewResult {
  measurementId: string;
  goalType: string;
  weightKg: number;
  previousWeightKg: number | null;
  weightChangeKg: number | null;
  recoveryScore: number;
  baselineTargets: TargetSnapshot;
  proposedTargets: TargetSnapshot;
  deltas: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    water_ml: number;
  };
  recommendation: {
    title: string;
    message: string;
    rationale: string[];
  };
}

const KG_PER_LB = 0.45359237;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function round(n: number) {
  return Math.round(n);
}

function parseGoalType(answers: unknown): string {
  if (!answers || typeof answers !== 'object') return 'maintain_weight';
  const raw = (answers as Record<string, unknown>).goal_type;
  return typeof raw === 'string' && raw.length > 0 ? raw : 'maintain_weight';
}

function buildRecommendation(goalType: string, deltaCalories: number, recoveryScore: number, weightChangeKg: number | null) {
  const rationale: string[] = [];

  if (weightChangeKg !== null) {
    rationale.push(`Weight change since last check-in: ${weightChangeKg > 0 ? '+' : ''}${weightChangeKg.toFixed(1)} kg`);
  }
  rationale.push(`Recovery score: ${Math.round(recoveryScore)} / 100`);

  if (deltaCalories === 0) {
    return {
      title: 'Maintain current targets',
      message: 'Your latest trends are stable. Keep execution consistent this week.',
      rationale,
    };
  }

  const direction = deltaCalories > 0 ? 'increase' : 'decrease';
  return {
    title: `${direction === 'increase' ? 'Increase' : 'Reduce'} calories by ${Math.abs(deltaCalories)}`,
    message:
      goalType === 'lose_weight'
        ? 'Adjustment favors steady fat loss while protecting recovery.'
        : goalType === 'gain_weight'
          ? 'Adjustment favors sustainable surplus and training recovery.'
          : 'Adjustment balances adherence, recovery, and trend stability.',
    rationale,
  };
}

function computeProposedTargets(
  baseline: TargetSnapshot,
  goalType: string,
  recoveryScore: number,
  weightChangeKg: number | null,
  stress: number,
): TargetSnapshot {
  let calorieDelta = 0;

  if (goalType === 'lose_weight') {
    if (weightChangeKg !== null && weightChangeKg > 0.2) calorieDelta -= 120;
    if (weightChangeKg !== null && weightChangeKg < -0.9) calorieDelta += 120;
  } else if (goalType === 'gain_weight') {
    if (weightChangeKg !== null && weightChangeKg < -0.1) calorieDelta += 140;
    if (weightChangeKg !== null && weightChangeKg > 0.8) calorieDelta -= 120;
  } else {
    if (weightChangeKg !== null && weightChangeKg > 0.8) calorieDelta -= 80;
    if (weightChangeKg !== null && weightChangeKg < -0.8) calorieDelta += 80;
  }

  if (recoveryScore < 45) {
    calorieDelta += 80;
  }

  const calories = clamp(round(baseline.calories + calorieDelta), 800, 10000);

  const proteinAdjustment = recoveryScore < 45 ? 10 : 0;
  const protein = clamp(round(baseline.protein_g + proteinAdjustment), 60, 400);
  const fat = clamp(round(baseline.fat_g), 25, 220);

  const remainingForCarbs = calories - (protein * 4 + fat * 9);
  const carbs = clamp(round(remainingForCarbs / 4), 30, 700);

  const waterBonus = recoveryScore < 45 || stress >= 8 ? 250 : 0;
  const water = clamp(round(baseline.water_ml + waterBonus), 500, 10000);

  return {
    calories,
    protein_g: protein,
    carbs_g: carbs,
    fat_g: fat,
    water_ml: water,
  };
}

export async function previewCheckIn(input: CheckInInput): Promise<CheckInPreviewResult> {
  const { userId, weightValue, unitSystem, sleep, stress, energy } = input;

  const weightKg = unitSystem === 'imperial' ? weightValue * KG_PER_LB : weightValue;
  if (!Number.isFinite(weightKg) || weightKg <= 0) {
    throw new Error('Please enter a valid weight value.');
  }

  const [{ data: profile }, { data: targets, error: targetsError }, { data: onboarding }] = await Promise.all([
    supabase
      .from('profiles')
      .select('current_weight_kg, unit_system')
      .eq('id', userId)
      .maybeSingle(),
    supabase
      .from('user_targets')
      .select('calories, protein_g, carbs_g, fat_g, water_ml')
      .eq('user_id', userId)
      .single(),
    supabase
      .from('onboarding_answers')
      .select('answers')
      .eq('user_id', userId)
      .maybeSingle(),
  ]);

  if (targetsError || !targets) {
    throw new Error(targetsError?.message || 'Could not load targets for check-in.');
  }

  const previousWeightKg = profile?.current_weight_kg ?? null;
  const weightChangeKg = previousWeightKg !== null ? weightKg - previousWeightKg : null;

  const normalizedSleep = clamp(sleep, 1, 10);
  const normalizedStress = clamp(stress, 1, 10);
  const normalizedEnergy = clamp(energy, 1, 10);
  const recoveryScore = clamp(((normalizedSleep + normalizedEnergy + (11 - normalizedStress)) / 30) * 100, 0, 100);

  const goalType = parseGoalType(onboarding?.answers);

  const baselineTargets: TargetSnapshot = {
    calories: targets.calories,
    protein_g: targets.protein_g,
    carbs_g: targets.carbs_g,
    fat_g: targets.fat_g,
    water_ml: targets.water_ml,
  };

  const proposedTargets = computeProposedTargets(
    baselineTargets,
    goalType,
    recoveryScore,
    weightChangeKg,
    normalizedStress,
  );

  const metadata = {
    source: 'weekly_check_in',
    sleep: normalizedSleep,
    stress: normalizedStress,
    energy: normalizedEnergy,
    recoveryScore: round(recoveryScore),
    previousWeightKg,
    proposedTargets,
    goalType,
    recordedAt: new Date().toISOString(),
  };

  const { data: measurement, error: measurementError } = await supabase
    .from('user_measurements')
    .insert({
      user_id: userId,
      weight_kg: round(weightKg * 10) / 10,
      logged_at: new Date().toISOString(),
      notes: JSON.stringify(metadata),
    } satisfies Database['public']['Tables']['user_measurements']['Insert'])
    .select('id')
    .single();

  if (measurementError || !measurement) {
    throw new Error(measurementError?.message || 'Could not save check-in measurement.');
  }

  const { error: profileUpdateError } = await supabase
    .from('profiles')
    .update({
      current_weight_kg: round(weightKg * 10) / 10,
      updated_at: new Date().toISOString(),
    } satisfies Database['public']['Tables']['profiles']['Update'])
    .eq('id', userId);

  if (profileUpdateError) {
    throw new Error(profileUpdateError.message);
  }

  const deltas = {
    calories: proposedTargets.calories - baselineTargets.calories,
    protein_g: proposedTargets.protein_g - baselineTargets.protein_g,
    carbs_g: proposedTargets.carbs_g - baselineTargets.carbs_g,
    fat_g: proposedTargets.fat_g - baselineTargets.fat_g,
    water_ml: proposedTargets.water_ml - baselineTargets.water_ml,
  };

  return {
    measurementId: measurement.id,
    goalType,
    weightKg: round(weightKg * 10) / 10,
    previousWeightKg,
    weightChangeKg: weightChangeKg !== null ? round(weightChangeKg * 10) / 10 : null,
    recoveryScore: round(recoveryScore),
    baselineTargets,
    proposedTargets,
    deltas,
    recommendation: buildRecommendation(goalType, deltas.calories, recoveryScore, weightChangeKg),
  };
}

export async function applyCheckInUpdates(userId: string, preview: CheckInPreviewResult): Promise<TargetSnapshot> {
  const { error } = await supabase
    .from('user_targets')
    .update({
      calories: preview.proposedTargets.calories,
      protein_g: preview.proposedTargets.protein_g,
      carbs_g: preview.proposedTargets.carbs_g,
      fat_g: preview.proposedTargets.fat_g,
      water_ml: preview.proposedTargets.water_ml,
      computation_method: 'check_in_v1',
      updated_at: new Date().toISOString(),
    } satisfies Database['public']['Tables']['user_targets']['Update'])
    .eq('user_id', userId);

  if (error) {
    throw new Error(error.message || 'Failed to apply check-in updates.');
  }

  // Best-effort consistency refresh for progress/coach cards.
  await supabase.functions.invoke('compute-plan-consistency', {
    body: { days: 7 },
  }).catch(() => undefined);

  return preview.proposedTargets;
}
