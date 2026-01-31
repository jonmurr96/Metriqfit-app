/**
 * Plan Service - Workout and Nutrition Plan Management
 * Handles fetching, activation, and regeneration of AI-generated plans
 */

import { supabase } from '../lib/supabase';
import { Database } from '../lib/supabase/types';

type WorkoutPlan = Database['public']['Tables']['user_workout_plans']['Row'];
type WorkoutPlanDay = Database['public']['Tables']['user_workout_plan_days']['Row'];
type WorkoutPlanExercise = Database['public']['Tables']['user_workout_plan_exercises']['Row'];
type NutritionPlan = Database['public']['Tables']['user_nutrition_plans']['Row'];

export interface WorkoutPlanWithDetails extends WorkoutPlan {
  days: Array<
    WorkoutPlanDay & {
      exercises: Array<
        WorkoutPlanExercise & {
          exercise: {
            id: string;
            name: string;
            category: string;
            equipment_required: string[];
            primary_muscle: string | null;
            video_url: string | null;
          };
        }
      >;
    }
  >;
}

export interface NutritionPlanWithDetails extends NutritionPlan {
  meal_structure: {
    breakfast?: any;
    lunch?: any;
    dinner?: any;
    snacks?: any;
  };
  macro_distribution: {
    protein_percent: number;
    carbs_percent: number;
    fat_percent: number;
  } | null;
}

export interface PlanRegenerationUsage {
  regenerationsToday: number;
  regenerationsLimit: number;
  isElite: boolean;
  remainingRegenerations: number;
}

/**
 * Get user's active workout plan with all details
 */
export async function getActiveWorkoutPlan(
  userId: string
): Promise<WorkoutPlanWithDetails | null> {
  const { data, error } = await supabase
    .from('user_workout_plans')
    .select(
      `
      *,
      days:user_workout_plan_days(
        *,
        exercises:user_workout_plan_exercises(
          *,
          exercise:exercises!exercise_id(
            id,
            name,
            category,
            equipment_required,
            primary_muscle,
            video_url
          )
        )
      )
    `
    )
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .maybeSingle();

  if (error) {
    console.error('Failed to fetch active workout plan:', error);
    return null;
  }

  return data as WorkoutPlanWithDetails | null;
}

/**
 * Get user's active nutrition plan
 */
export async function getActiveNutritionPlan(
  userId: string
): Promise<NutritionPlanWithDetails | null> {
  const { data, error } = await supabase
    .from('user_nutrition_plans')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .maybeSingle();

  if (error) {
    console.error('Failed to fetch active nutrition plan:', error);
    return null;
  }

  return data as NutritionPlanWithDetails | null;
}

/**
 * Get all workout plan versions for a user
 */
export async function getWorkoutPlanHistory(userId: string): Promise<WorkoutPlan[]> {
  const { data, error } = await supabase
    .from('user_workout_plans')
    .select('*')
    .eq('user_id', userId)
    .order('version', { ascending: false });

  if (error) {
    console.error('Failed to fetch workout plan history:', error);
    return [];
  }

  return data || [];
}

/**
 * Get all nutrition plan versions for a user
 */
export async function getNutritionPlanHistory(userId: string): Promise<NutritionPlan[]> {
  const { data, error } = await supabase
    .from('user_nutrition_plans')
    .select('*')
    .eq('user_id', userId)
    .order('version', { ascending: false });

  if (error) {
    console.error('Failed to fetch nutrition plan history:', error);
    return [];
  }

  return data || [];
}

/**
 * Get plan regeneration usage for rate limiting
 */
export async function getPlanRegenerationUsage(
  userId: string
): Promise<PlanRegenerationUsage> {
  // Check user subscription status
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('entitlement_tier')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle();

  const isElite = subscription?.entitlement_tier === 'elite';

  // Elite users: 3 regenerations per hour
  // Free users: 1 regeneration per hour
  const regenerationsLimit = isElite ? 3 : 1;

  // Check regenerations in the last hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { data: recentRuns } = await supabase
    .from('plan_generation_runs')
    .select('id')
    .eq('user_id', userId)
    .gte('created_at', oneHourAgo);

  const regenerationsToday = recentRuns?.length || 0;

  return {
    regenerationsToday,
    regenerationsLimit,
    isElite,
    remainingRegenerations: Math.max(0, regenerationsLimit - regenerationsToday),
  };
}

/**
 * Check if user can regenerate plans (rate limit check)
 */
export async function canRegeneratePlans(userId: string): Promise<boolean> {
  const usage = await getPlanRegenerationUsage(userId);
  return usage.remainingRegenerations > 0;
}

/**
 * Regenerate user's workout and nutrition plans via Edge Function
 */
export async function regeneratePlans(userId: string): Promise<{
  workoutPlanId: string;
  nutritionPlanId: string;
}> {
  // Check rate limit first
  const canRegenerate = await canRegeneratePlans(userId);
  if (!canRegenerate) {
    const usage = await getPlanRegenerationUsage(userId);
    throw new Error(
      `Plan regeneration limit reached (${usage.regenerationsLimit} per hour for ${usage.isElite ? 'Elite' : 'free'} users). Please try again later.`
    );
  }

  // Verify session is valid before calling Edge Function
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Authentication required. Please sign in again.');
  }

  // Call Edge Function to generate new plans
  const { data, error } = await supabase.functions.invoke('generate-user-plans', {
    body: { user_id: userId },  // snake_case for Edge Function
  });

  if (error) {
    console.error('Plan regeneration error:', error);
    throw new Error('Failed to regenerate plans. Please try again.');
  }

  if (!data?.workoutPlanId && !data?.nutritionPlanId) {
    if (data?.validation_errors) {
      throw new Error(`Plan generation failed: ${data.validation_errors.join(', ')}`);
    }
    throw new Error('Plan generation did not return valid plan IDs');
  }

  return {
    workoutPlanId: data.workoutPlanId,
    nutritionPlanId: data.nutritionPlanId,
  };
}

/**
 * Activate a specific workout plan version
 */
export async function activateWorkoutPlan(planId: string, userId: string): Promise<void> {
  // Deactivate all existing plans
  await supabase
    .from('user_workout_plans')
    .update({ is_active: false })
    .eq('user_id', userId);

  // Activate the selected plan
  const { error } = await supabase
    .from('user_workout_plans')
    .update({ is_active: true })
    .eq('id', planId)
    .eq('user_id', userId);

  if (error) {
    console.error('Failed to activate workout plan:', error);
    throw new Error('Failed to activate workout plan');
  }
}

/**
 * Activate a specific nutrition plan version
 */
export async function activateNutritionPlan(planId: string, userId: string): Promise<void> {
  // Deactivate all existing plans
  await supabase
    .from('user_nutrition_plans')
    .update({ is_active: false })
    .eq('user_id', userId);

  // Activate the selected plan
  const { error } = await supabase
    .from('user_nutrition_plans')
    .update({ is_active: true })
    .eq('id', planId)
    .eq('user_id', userId);

  if (error) {
    console.error('Failed to activate nutrition plan:', error);
    throw new Error('Failed to activate nutrition plan');
  }
}

/**
 * Get a specific workout plan day with exercises
 */
export async function getWorkoutPlanDay(
  dayId: string
): Promise<
  | (WorkoutPlanDay & {
    exercises: Array<
      WorkoutPlanExercise & {
        exercise: {
          id: string;
          name: string;
          category: string;
          equipment_required: string[];
          primary_muscle: string | null;
          video_url: string | null;
        };
      }
    >;
  })
  | null
> {
  // Fetch via parent plan to ensure RLS compliance
  const { data, error } = await supabase
    .from('user_workout_plans')
    .select(
      `
      id,
      days:user_workout_plan_days!inner(
        *,
        exercises:user_workout_plan_exercises(
          *,
          exercise:exercises!exercise_id(
            id,
            name,
            category,
            equipment_required,
            primary_muscle,
            video_url
          )
        )
      )
    `
    )
    .eq('days.id', dayId)
    .maybeSingle();

  if (error) {
    console.error('Failed to fetch workout plan day:', error);
    return null;
  }

  // Return the first matching day
  return (data?.days?.[0] as any) || null;
}

/**
 * Mark a workout plan day as completed
 */
export async function markWorkoutDayComplete(
  dayId: string,
  sessionId?: string
): Promise<void> {
  const { error } = await supabase
    .from('user_workout_plan_days')
    .update({
      is_completed: true,
      completed_at: new Date().toISOString(),
      session_id: sessionId || null,
    })
    .eq('id', dayId);

  if (error) {
    console.error('Failed to mark workout day complete:', error);
    throw new Error('Failed to mark workout day complete');
  }
}

// Type exports for hooks
export type UserWorkoutPlan = WorkoutPlan;
export type UserWorkoutPlanDay = WorkoutPlanDay;
export type UserNutritionPlan = NutritionPlan;
export type PlanGenerationRun = {
  id: string;
  user_id: string;
  plan_type: 'workout' | 'nutrition' | 'both';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  created_at: string;
  completed_at: string | null;
  error_message: string | null;
};

/**
 * Trigger AI plan generation via Edge Function
 */
export async function triggerPlanGeneration(
  userId: string,
  planType: 'workout' | 'nutrition' | 'both'
): Promise<{ runId: string; workoutPlanId?: string; nutritionPlanId?: string }> {
  // Check rate limit first
  const canRegenerate = await canRegeneratePlans(userId);
  if (!canRegenerate) {
    const usage = await getPlanRegenerationUsage(userId);
    throw new Error(
      `Plan regeneration limit reached (${usage.regenerationsLimit} per hour for ${usage.isElite ? 'Elite' : 'free'} users). Please try again later.`
    );
  }

  // Verify session is valid before calling Edge Function
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Authentication required. Please sign in again.');
  }

  // Call Edge Function to generate plans
  try {
    console.log('[PlanService] Invoking generate-user-plans for user:', userId);

    // Explicitly pass Authorization header to ensure it's not dropped
    const { data, error } = await supabase.functions.invoke('generate-user-plans', {
      body: { user_id: userId, plan_type: planType },
    });

    if (error) {
      console.error('Plan generation edge function error:', error);

      // Try to parse more details if available
      let errorMsg = error.message;
      if (error.context && error.context.status) {
        errorMsg = `Edge Function returned status ${error.context.status}: ${errorMsg}`;
      }

      throw new Error(errorMsg);
    }

    console.log('[PlanService] Generation successful:', data);

    return {
      runId: data.runId,
      workoutPlanId: data.workoutPlanId,
      nutritionPlanId: data.nutritionPlanId,
    };
  } catch (err: any) {
    console.error('Plan generation failed with exception:', err);
    // Throw error to properly surface failures to user
    throw new Error(
      `Failed to generate plans: ${err.message || 'Unknown error'}`
    );
  }
}

/**
 * Get plan history by type (workout or nutrition)
 */
export async function getPlanHistory(
  userId: string,
  planType: 'workout' | 'nutrition'
): Promise<(WorkoutPlan | NutritionPlan)[]> {
  const table = planType === 'workout' ? 'user_workout_plans' : 'user_nutrition_plans';

  const { data, error } = await supabase
    .from(table)
    .select('*')
    .eq('user_id', userId)
    .order('version', { ascending: false });

  if (error) {
    console.error(`Failed to fetch ${planType} plan history:`, error);
    return [];
  }

  return data || [];
}

/**
 * Get today's scheduled workout based on active plan
 */
export async function getTodaysWorkout(userId: string): Promise<(WorkoutPlanDay & {
  exercises: Array<WorkoutPlanExercise & {
    exercise: {
      id: string;
      name: string;
      category: string;
      equipment_required: string[];
      primary_muscle: string | null;
      video_url: string | null;
    };
  }>;
}) | null> {
  // Get active plan
  const plan = await getActiveWorkoutPlan(userId);
  if (!plan || !plan.days?.length) return null;

  // Determine which day of the week we're on in the plan cycle
  const dayOfWeek = new Date().getDay(); // 0-6 (Sunday-Saturday)
  const planDayNumber = dayOfWeek === 0 ? 7 : dayOfWeek; // Convert to 1-7

  // Find the matching day in the plan, or fall back to next incomplete day
  let todaysDay = plan.days.find((d) => d.day_number === planDayNumber && !d.is_completed);

  if (!todaysDay) {
    // Fall back to next incomplete day
    todaysDay = plan.days.find((d) => !d.is_completed);
  }

  return todaysDay || null;
}

/**
 * Mark a workout day as completed (alias)
 */
export async function markDayCompleted(dayId: string): Promise<void> {
  return markWorkoutDayComplete(dayId);
}

/**
 * Swap an exercise in a workout plan
 */
export async function swapExercise(
  planExerciseId: string,
  newExerciseId: string
): Promise<void> {
  const { error } = await supabase
    .from('user_workout_plan_exercises')
    .update({ exercise_id: newExerciseId })
    .eq('id', planExerciseId);

  if (error) {
    console.error('Failed to swap exercise:', error);
    throw new Error('Failed to swap exercise');
  }
}

/**
 * Update exercise targets (sets, reps, rest)
 */
export async function updateExerciseTargets(
  planExerciseId: string,
  updates: {
    sets_target?: number;
    reps_min?: number;
    reps_max?: number;
    rest_seconds?: number;
  }
): Promise<void> {
  const { error } = await supabase
    .from('user_workout_plan_exercises')
    .update(updates)
    .eq('id', planExerciseId);

  if (error) {
    console.error('Failed to update exercise targets:', error);
    throw new Error('Failed to update exercise targets');
  }
}

/**
 * Get plan generation history (audit log)
 */
export async function getGenerationHistory(userId: string): Promise<PlanGenerationRun[]> {
  const { data, error } = await supabase
    .from('plan_generation_runs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('Failed to fetch generation history:', error);
    return [];
  }

  return (data || []) as PlanGenerationRun[];
}

/**
 * Reactivate an old plan version
 */
export async function reactivatePlan(
  userId: string,
  planId: string,
  planType: 'workout' | 'nutrition'
): Promise<void> {
  if (planType === 'workout') {
    await activateWorkoutPlan(planId, userId);
  } else {
    await activateNutritionPlan(planId, userId);
  }
}
