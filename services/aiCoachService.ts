/**
 * AI Coach Service - Production Implementation
 *
 * Handles:
 * - Chat message storage and retrieval
 * - Rate limiting (Free: 10/day, Elite: Unlimited)
 * - Conversation history
 * - Context gathering for grounding
 * - Suggested prompts
 */

import { supabase } from '../lib/supabase';
import type { Database } from '../lib/supabase/types';

// ============================================================================
// Types
// ============================================================================

export type ChatMessage = Database['public']['Tables']['ai_coach_messages']['Row'];
export type AIUsageDaily = Database['public']['Tables']['ai_usage_daily']['Row'];

export interface RateLimitStatus {
  canSendMessage: boolean;
  messagesUsed: number;
  messagesLimit: number; // -1 for unlimited (Elite)
  resetTime: string; // ISO timestamp of when limit resets
}

export interface CoachContext {
  // Today's targets
  calorieTarget: number;
  proteinTarget: number;
  carbsTarget: number;
  fatTarget: number;
  waterTarget: number;

  // Today's consumed
  caloriesConsumed: number;
  proteinConsumed: number;
  carbsConsumed: number;
  fatConsumed: number;
  waterConsumed: number;

  // Other context
  workoutsThisWeek: number;
  currentGoal: string;
  prepModeEnabled?: boolean;
  prepPhase?: 'cut' | 'bulk' | null;
  prepDiscipline?: 'bodybuilding' | 'powerlifting' | null;
}

export interface SuggestedPrompt {
  id: string;
  label: string;
  icon: string;
}

export interface ConsistencyRecommendation {
  type?: string;
  title?: string;
  message?: string;
  actions?: string[];
}

export interface PrepPromptContext {
  prepModeEnabled?: boolean;
  prepPhase?: 'cut' | 'bulk' | null;
  prepDiscipline?: 'bodybuilding' | 'powerlifting' | null;
}

export interface PrepCoachSummary {
  enabled: boolean;
  discipline: 'bodybuilding' | 'powerlifting' | null;
  phase: 'cut' | 'bulk' | null;
  lastStatus: string | null;
  coachSummary: string | null;
  lastUpdatedAt: string | null;
}

// ============================================================================
// Message Management
// ============================================================================

/**
 * Get conversation history
 * @param userId - User ID
 * @param limit - Max messages to retrieve (default: 50)
 */
export async function getConversationHistory(
  userId: string,
  limit = 50
): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('ai_coach_messages')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

/**
 * Send a message to AI Coach
 * NOTE: This creates the user message and triggers the Edge Function for AI response
 * @param userId - User ID
 * @param message - User's message content
 * @param context - Optional context snapshot
 */
export async function sendMessage(
  userId: string,
  message: string,
  context?: Partial<CoachContext>
): Promise<ChatMessage> {
  // Check rate limit first
  const rateLimitStatus = await checkRateLimit(userId);
  if (!rateLimitStatus.canSendMessage) {
    throw new Error(
      `Daily message limit reached (${rateLimitStatus.messagesLimit}). Upgrade to Elite for unlimited messages.`
    );
  }

  // Edge function is authoritative for message persistence + usage accounting.
  const { data, error } = await supabase.functions.invoke('ai-coach-message', {
    body: { user_id: userId, message, context },
  });

  if (error) throw new Error(error.message || 'Failed to send AI Coach message');
  if (!data?.id || !data?.content) throw new Error('AI Coach returned an invalid response');

  return {
    id: data.id,
    user_id: userId,
    role: 'assistant',
    content: data.content,
    context_snapshot: context ?? null,
    attachments: data.attachments ?? null,
    tokens_input: null,
    tokens_output: null,
    model: null,
    created_at: data.created_at || new Date().toISOString(),
  } as ChatMessage;
}

/**
 * Clear conversation history
 * @param userId - User ID
 */
export async function clearConversationHistory(userId: string): Promise<void> {
  const { error } = await supabase.from('ai_coach_messages').delete().eq('user_id', userId);

  if (error) throw error;
}

// ============================================================================
// Rate Limiting
// ============================================================================

/**
 * Check if user can send messages (rate limit check)
 * Free: 10 messages/day
 * Elite: Unlimited
 */
export async function checkRateLimit(userId: string, isElite = false): Promise<RateLimitStatus> {
  const today = new Date().toISOString().split('T')[0];
  const effectiveElite = isElite || await getIsEliteSubscriber(userId);

  // Elite users have unlimited messages
  if (effectiveElite) {
    return {
      canSendMessage: true,
      messagesUsed: 0,
      messagesLimit: -1, // -1 indicates unlimited
      resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };
  }

  // Free users: 10 messages/day
  const FREE_LIMIT = 10;

  const { data: usage } = await supabase
    .from('ai_usage_daily')
    .select('coach_messages')
    .eq('user_id', userId)
    .eq('usage_date', today)
    .maybeSingle();

  const messagesUsed = usage?.coach_messages || 0;

  // Calculate reset time (midnight tonight in user's timezone)
  const now = new Date();
  const resetTime = new Date(now);
  resetTime.setHours(24, 0, 0, 0);

  return {
    canSendMessage: messagesUsed < FREE_LIMIT,
    messagesUsed,
    messagesLimit: FREE_LIMIT,
    resetTime: resetTime.toISOString(),
  };
}

async function getIsEliteSubscriber(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('plan_type,status,expires_at,trial_ends_at')
    .eq('user_id', userId)
    .in('status', ['active', 'trial', 'grace_period'])
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return false;

  if (data.plan_type === 'free') return false;

  const now = Date.now();
  const expiresAt = data.expires_at ? Date.parse(data.expires_at) : null;
  const trialEndsAt = data.trial_ends_at ? Date.parse(data.trial_ends_at) : null;

  if (data.status === 'active') return !expiresAt || expiresAt > now;
  if (data.status === 'trial') return !trialEndsAt || trialEndsAt > now;
  if (data.status === 'grace_period') return !expiresAt || expiresAt > now;

  return false;
}

/**
 * Get daily AI usage stats
 */
export async function getDailyUsage(userId: string, date?: string): Promise<AIUsageDaily | null> {
  const targetDate = date || new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('ai_usage_daily')
    .select('*')
    .eq('user_id', userId)
    .eq('usage_date', targetDate)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

// ============================================================================
// Suggested Prompts
// ============================================================================

/**
 * Get context-aware suggested prompts
 */
export function getSuggestedPrompts(
  hasLoggedToday = false,
  hasActiveWorkout = false,
  consistencyRecommendation?: ConsistencyRecommendation | null,
  prepContext?: PrepPromptContext | null,
): SuggestedPrompt[] {
  const prompts: SuggestedPrompt[] = [];

  // Dynamic prompts based on context
  if (!hasLoggedToday) {
    prompts.push({
      id: 'log_help',
      label: 'Help me log my meals',
      icon: 'restaurant',
    });
  }

  if (hasActiveWorkout) {
    prompts.push({
      id: 'workout_sub',
      label: 'Suggest exercise substitution',
      icon: 'barbell',
    });
  }

  if (consistencyRecommendation?.type === 'nutrition_protein') {
    prompts.push({
      id: 'protein_swap',
      label: 'Show high-protein swaps',
      icon: 'flame',
    });
  }

  if (consistencyRecommendation?.type === 'workout_adherence') {
    prompts.push({
      id: 'simplify_split',
      label: 'Simplify my workout split',
      icon: 'calendar',
    });
  }

  if (consistencyRecommendation?.type === 'hydration') {
    prompts.push({
      id: 'hydration_plan',
      label: 'Build a hydration schedule',
      icon: 'water',
    });
  }

  if (prepContext?.prepModeEnabled) {
    prompts.push(
      {
        id: 'prep_pace',
        label: `Review this week's ${prepContext.prepPhase || 'prep'} pace`,
        icon: 'trending-up',
      },
      {
        id: 'prep_macro_explain',
        label: 'Explain my auto-adjusted macros',
        icon: 'analytics',
      },
      {
        id: 'prep_strength',
        label: 'How to preserve strength this week',
        icon: 'barbell',
      },
    );
  }

  // Always available prompts
  prompts.push(
    {
      id: 'protein_goal',
      label: "What should I eat to hit my protein goal?",
      icon: 'nutrition',
    },
    {
      id: 'explain_macros',
      label: 'Explain my macro targets',
      icon: 'analytics',
    },
    {
      id: 'meal_ideas',
      label: 'Give me healthy meal ideas',
      icon: 'restaurant',
    },
    {
      id: 'progress_check',
      label: "How am I progressing?",
      icon: 'trending-up',
    },
    {
      id: 'test_plan',
      label: 'Suggest plan substitution',
      icon: 'construct',
    }
  );

  return prompts.slice(0, 7); // Limit to 7 suggestions
}

/**
 * Get latest recommendation from consistency engine.
 */
export async function getLatestConsistencyRecommendation(
  userId: string
): Promise<ConsistencyRecommendation | null> {
  const { data, error } = await supabase
    .from('user_plan_consistency_daily')
    .select('recommendation_json')
    .eq('user_id', userId)
    .order('log_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Failed to fetch consistency recommendation:', error);
    return null;
  }

  return (data?.recommendation_json as ConsistencyRecommendation) || null;
}

/**
 * Get latest prep coach state summary.
 */
export async function getLatestPrepCoachSummary(userId: string): Promise<PrepCoachSummary> {
  const [{ data: cycle }, { data: event }, { data: onboarding }] = await Promise.all([
    (supabase as any)
      .from('prep_coach_cycles')
      .select('discipline, phase, is_active, auto_adjust_enabled, updated_at')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .maybeSingle(),
    (supabase as any)
      .from('prep_coach_adjustment_events')
      .select('status, coach_summary, updated_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('onboarding_answers')
      .select('answers')
      .eq('user_id', userId)
      .maybeSingle(),
  ]);

  const answers = (onboarding?.answers || {}) as Record<string, unknown>;
  const prepEnabled = Boolean(cycle?.is_active) || answers.prep_mode_enabled === true;
  const discipline = (cycle?.discipline || answers.prep_discipline || null) as PrepCoachSummary['discipline'];
  const phase = (cycle?.phase || answers.prep_phase || null) as PrepCoachSummary['phase'];

  return {
    enabled: prepEnabled,
    discipline,
    phase,
    lastStatus: event?.status || null,
    coachSummary: event?.coach_summary || null,
    lastUpdatedAt: event?.updated_at || cycle?.updated_at || null,
  };
}

// ============================================================================
// Context Gathering (for AI grounding)
// ============================================================================

/**
 * Gather context for AI Coach grounding
 * This fetches user's current state to prevent hallucinations
 */
export async function gatherCoachContext(userId: string): Promise<CoachContext> {
  const today = new Date().toISOString().split('T')[0];

  // Fetch user targets
  const { data: targets } = await supabase
    .from('user_targets')
    .select('calories, protein_g, carbs_g, fat_g, water_ml')
    .eq('user_id', userId)
    .single();

  // Fetch today's nutrition logs
  const { data: meals } = await supabase
    .from('meal_logs')
    .select(
      `
      *,
      items:meal_log_items(
        quantity_grams,
        food:food_items(calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g)
      )
    `
    )
    .eq('user_id', userId)
    .eq('logged_date', today);

  // Calculate consumed macros
  let caloriesConsumed = 0;
  let proteinConsumed = 0;
  let carbsConsumed = 0;
  let fatConsumed = 0;

  meals?.forEach((meal) => {
    meal.items?.forEach((item: any) => {
      const grams = item.quantity_grams;
      if (item.food) {
        caloriesConsumed += (item.food.calories_per_100g * grams) / 100;
        proteinConsumed += (item.food.protein_per_100g * grams) / 100;
        carbsConsumed += (item.food.carbs_per_100g * grams) / 100;
        fatConsumed += (item.food.fat_per_100g * grams) / 100;
      }
    });
  });

  // Fetch water logs
  const { data: waterLogs } = await supabase
    .from('water_logs')
    .select('amount_ml')
    .eq('user_id', userId)
    .eq('logged_date', today);

  const waterConsumed = waterLogs?.reduce((sum, log) => sum + log.amount_ml, 0) || 0;

  // Fetch prep/onboarding context
  const [{ data: onboarding }, prepSummary] = await Promise.all([
    supabase
      .from('onboarding_answers')
      .select('answers')
      .eq('user_id', userId)
      .maybeSingle(),
    getLatestPrepCoachSummary(userId),
  ]);

  const answers = (onboarding?.answers || {}) as Record<string, unknown>;
  const goalType = typeof answers.goal_type === 'string' ? answers.goal_type : 'maintain_weight';

  // Fetch recent workouts
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: workouts } = await supabase
    .from('workout_sessions')
    .select('id')
    .eq('user_id', userId)
    .gte('started_at', weekAgo);

  return {
    calorieTarget: targets?.calories || 2000,
    proteinTarget: targets?.protein_g || 150,
    carbsTarget: targets?.carbs_g || 200,
    fatTarget: targets?.fat_g || 65,
    waterTarget: targets?.water_ml || 2500,
    caloriesConsumed: Math.round(caloriesConsumed),
    proteinConsumed: Math.round(proteinConsumed),
    carbsConsumed: Math.round(carbsConsumed),
    fatConsumed: Math.round(fatConsumed),
    waterConsumed,
    workoutsThisWeek: workouts?.length || 0,
    currentGoal: goalType,
    prepModeEnabled: prepSummary.enabled,
    prepPhase: prepSummary.phase,
    prepDiscipline: prepSummary.discipline,
  };
}
