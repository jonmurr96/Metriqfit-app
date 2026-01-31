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
}

export interface SuggestedPrompt {
  id: string;
  label: string;
  icon: string;
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

  // Store user message
  const { data: userMessage, error: userError } = await supabase
    .from('ai_coach_messages')
    .insert({
      user_id: userId,
      role: 'user',
      content: message,
      context_snapshot: context ? JSON.stringify(context) : null,
    })
    .select()
    .single();

  if (userError) throw userError;
  if (!userMessage) throw new Error('Failed to create user message');

  // Increment usage count
  await incrementAIUsage(userId, 'coach_messages');

  // Call Supabase Edge Function for AI response
  const { data, error } = await supabase.functions.invoke('ai-coach-message', {
    body: { userId, message, context },
  });

  if (error) {
    console.error('AI Coach Edge Function error:', error);
    // Fallback if function fails or is not deployed
    const { data: assistantMessage, error: assistantError } = await supabase
      .from('ai_coach_messages')
      .insert({
        user_id: userId,
        role: 'assistant',
        content: "I'm having trouble connecting to my brain right now. Please try again in a moment.",
        context_snapshot: null,
        model: 'system-fallback',
      })
      .select()
      .single();

    if (assistantError) throw assistantError;
    return assistantMessage!;
  }

  // The Edge Function should have inserted the message, but if it returns the message object:
  return data as ChatMessage;


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

  // Elite users have unlimited messages
  if (isElite) {
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

/**
 * Increment AI usage counter
 * Uses Supabase RPC function for atomic increment
 */
async function incrementAIUsage(userId: string, usageType: string): Promise<void> {
  const { error } = await supabase.rpc('increment_ai_usage', {
    p_user_id: userId,
    p_usage_type: usageType,
  });

  if (error) throw error;
}

// ============================================================================
// Suggested Prompts
// ============================================================================

/**
 * Get context-aware suggested prompts
 */
export function getSuggestedPrompts(
  hasLoggedToday = false,
  hasActiveWorkout = false
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
    currentGoal: 'maintain', // TODO: Fetch from onboarding_answers
  };
}
