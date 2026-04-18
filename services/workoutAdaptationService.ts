import { supabase } from '../lib/supabase';
import { invokeFunction } from '../lib/supabase/invokeFunction';
import { getPlanFocusCoherenceReport } from './workoutCoherenceService';

export type WorkoutAdaptationRecommendation = {
  id: string;
  user_id: string;
  plan_id: string;
  recommendation_type: string;
  payload_json: Record<string, any>;
  rationale: string | null;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  created_at: string;
  resolved_at: string | null;
};

export async function generateWorkoutAdaptationRecommendations(input?: {
  planId?: string;
  contextWindowDays?: number;
}) {
  const { data, parsedError, rawError } = await invokeFunction(() =>
    supabase.functions.invoke('adapt-workout-plan', {
      body: { planId: input?.planId, contextWindowDays: input?.contextWindowDays },
    })
  );

  if (rawError) throw new Error(parsedError?.error || parsedError?.message || rawError?.message || 'Failed to generate adaptation recommendations');
  if (!data?.success) throw new Error(data?.error || 'Failed to generate adaptation recommendations');
  return data;
}

export async function getWorkoutAdaptationRecommendations(planId?: string) {
  let query = (supabase as any)
    .from('workout_adaptation_recommendations')
    .select('*')
    .order('created_at', { ascending: false });

  if (planId) {
    query = query.eq('plan_id', planId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message || 'Failed to load adaptation recommendations');
  return (data || []) as WorkoutAdaptationRecommendation[];
}

export async function setWorkoutAdaptationRecommendationStatus(input: {
  recommendationId: string;
  status: 'accepted' | 'rejected';
}): Promise<void> {
  const { error } = await (supabase as any)
    .from('workout_adaptation_recommendations')
    .update({ status: input.status, resolved_at: new Date().toISOString() })
    .eq('id', input.recommendationId);

  if (error) throw new Error(error.message || 'Failed to update adaptation recommendation');
}

export async function applyWorkoutAdaptationRecommendation(input: {
  recommendationId: string;
}): Promise<void> {
  const { data: rec, error: recError } = await (supabase as any)
    .from('workout_adaptation_recommendations')
    .select('*')
    .eq('id', input.recommendationId)
    .maybeSingle();

  if (recError || !rec) throw new Error(recError?.message || 'Recommendation not found');

  const recType = String(rec.recommendation_type || '');
  const payload = (rec.payload_json || {}) as Record<string, any>;

  if (recType === 'deload_microcycle') {
    const volumeDrop = Number(payload.reduce_volume_percent || 20);
    const volumeMultiplier = Math.max(0.60, 1 - volumeDrop / 100);

    // Non-destructive: flag the upcoming 7 days of planned workout schedule
    // entries so startSession applies the multiplier at copy-time only.
    // This preserves plan exercise sets_target for future non-deload sessions.
    const today = new Date().toISOString().split('T')[0];
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const { data: upcomingEntries } = await (supabase as any)
      .from('user_workout_plan_schedule')
      .select('id')
      .eq('plan_id', rec.plan_id)
      .eq('session_type', 'workout')
      .eq('status', 'planned')
      .gte('scheduled_date', today)
      .lte('scheduled_date', nextWeek);

    if (upcomingEntries && upcomingEntries.length > 0) {
      const entryIds = upcomingEntries.map((e: any) => e.id);
      await (supabase as any)
        .from('user_workout_plan_schedule')
        .update({
          is_deload_week: true,
          volume_multiplier: volumeMultiplier,
          notes: `Deload week (week ${payload.trigger_week}) — volume at ${Math.round(volumeMultiplier * 100)}%`,
        })
        .in('id', entryIds);
    } else {
      // Fallback for plans without a generated schedule: modify sets directly.
      // This path is legacy-only and will be removed once all users have schedules.
      const { data: days } = await (supabase as any)
        .from('user_workout_plan_days')
        .select('id')
        .eq('plan_id', rec.plan_id);

      const dayIds = (days || []).map((d: any) => d.id);
      if (dayIds.length) {
        const { data: exercises } = await (supabase as any)
          .from('user_workout_plan_exercises')
          .select('id, sets_target')
          .in('plan_day_id', dayIds);

        for (const ex of exercises || []) {
          const nextSets = Math.max(1, Math.round(Number(ex.sets_target || 3) * volumeMultiplier));
          await (supabase as any)
            .from('user_workout_plan_exercises')
            .update({ sets_target: nextSets, is_user_modified: true })
            .eq('id', ex.id);
        }
      }
    }
  }

  if (recType === 'schedule_recovery_shift') {
    const { data: nextWorkout } = await (supabase as any)
      .from('user_workout_plan_schedule')
      .select('id')
      .eq('plan_id', rec.plan_id)
      .eq('session_type', 'workout')
      .eq('status', 'planned')
      .gte('scheduled_date', new Date().toISOString().split('T')[0])
      .order('scheduled_date', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (nextWorkout?.id) {
      await (supabase as any)
        .from('user_workout_plan_schedule')
        .update({ session_type: 'active_recovery', notes: 'Auto-adjusted by adaptation engine' })
        .eq('id', nextWorkout.id);
    }
  }

  if (recType === 'load_adjustment') {
    const { data: days } = await (supabase as any)
      .from('user_workout_plan_days')
      .select('id')
      .eq('plan_id', rec.plan_id);

    const dayIds = (days || []).map((d: any) => d.id);
    if (dayIds.length) {
      await (supabase as any)
        .from('user_workout_plan_exercises')
        .update({
          user_notes: 'Adaptive note: reduce load ~5% until target RPE normalizes.',
          is_user_modified: true,
        })
        .in('plan_day_id', dayIds);
    }
  }

  if (recType === 'increase_weight') {
    const exerciseId = payload.exercise_id as string | null;

    // Mark ready_for_progression in exercise_progressions
    if (exerciseId) {
      await (supabase as any)
        .from('exercise_progressions')
        .update({ ready_for_progression: true, updated_at: new Date().toISOString() })
        .eq('user_id', rec.user_id)
        .eq('exercise_id', exerciseId);
    }

    // Add a coaching note on every plan exercise for this exercise_id
    // so the user sees the cue on their next session
    if (exerciseId && rec.plan_id) {
      const { data: days } = await (supabase as any)
        .from('user_workout_plan_days')
        .select('id')
        .eq('plan_id', rec.plan_id);

      const dayIds = (days || []).map((d: any) => d.id);
      if (dayIds.length) {
        await (supabase as any)
          .from('user_workout_plan_exercises')
          .update({
            user_notes: '💪 Ready to progress — increase weight by 5–10 lb next session.',
            is_user_modified: true,
          })
          .in('plan_day_id', dayIds)
          .eq('exercise_id', exerciseId);
      }
    }
  }

  await setWorkoutAdaptationRecommendationStatus({ recommendationId: rec.id, status: 'accepted' });

  await (supabase as any).from('workout_adaptation_events').insert({
    user_id: rec.user_id,
    plan_id: rec.plan_id,
    event_type: `${recType}_applied`,
    metrics_json: { recommendation_id: rec.id },
    recommended_changes_json: payload,
    status: 'applied',
    applied_at: new Date().toISOString(),
  });

  try {
    const report = await getPlanFocusCoherenceReport(rec.plan_id, 0.8);
    if (report.violations.length > 0) {
      await (supabase as any).from('workout_adaptation_events').insert({
        user_id: rec.user_id,
        plan_id: rec.plan_id,
        event_type: 'focus_coherence_warning',
        metrics_json: {
          violation_count: report.violations.length,
          min_ratio: report.minRatio,
          first_violation: report.violations[0]?.dayName || null,
        },
        recommended_changes_json: {
          violations: report.violations.map((v) => ({
            day_name: v.dayName,
            focus_ratio: Number(v.focusRatio.toFixed(2)),
            failing_exercises: v.failingExerciseNames,
          })),
        },
        status: 'detected',
      });
    }
  } catch (error) {
    console.warn('[workoutAdaptation] coherence check failed', error);
  }
}
