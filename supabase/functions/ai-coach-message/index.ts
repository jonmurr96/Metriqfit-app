// supabase/functions/ai-coach-message/index.ts
// Deno + Supabase Edge Function
//
// Purpose:
// - Handle AI Coach chat messages
// - Fetch grounding data (targets, today's logs, history)
// - Call OpenAI GPT-4 with guardrails
// - Store messages in ai_coach_messages
// - Return response with optional action buttons
//
// Required secrets:
// - SUPABASE_URL
// - SUPABASE_SERVICE_ROLE_KEY
// - OPENAI_API_KEY

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

// Types
interface RequestBody {
  user_id: string;
  message: string;
  context?: Record<string, unknown>;
}

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface GroundingData {
  targets: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    water_ml: number;
  } | null;
  todayNutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  todayWater: number;
  todayWorkout: {
    completed: boolean;
    name?: string;
  };
  recentWeight: number | null;
  profile: {
    first_name?: string;
    unit_system: string;
  } | null;
  isElite: boolean;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

// Rate limit constants
const RATE_LIMITS = {
  free: 10,
  elite: 999999, // Essentially unlimited
};

/**
 * Build the system prompt with guardrails and grounding data
 */
function buildSystemPrompt(grounding: GroundingData): string {
  const name = grounding.profile?.first_name || "there";
  const unitSystem = grounding.profile?.unit_system || "imperial";

  let dataSection = "";

  if (grounding.targets) {
    dataSection += `
## User's Daily Targets
- Calories: ${grounding.targets.calories} kcal
- Protein: ${grounding.targets.protein_g}g
- Carbs: ${grounding.targets.carbs_g}g
- Fat: ${grounding.targets.fat_g}g
- Water: ${grounding.targets.water_ml}ml (${Math.round(grounding.targets.water_ml / 29.5735)} oz)
`;
  } else {
    dataSection += `
## User's Daily Targets
Not yet calculated. User needs to complete onboarding.
`;
  }

  dataSection += `
## Today's Progress
- Calories consumed: ${grounding.todayNutrition.calories} kcal ${grounding.targets ? `(${Math.round((grounding.todayNutrition.calories / grounding.targets.calories) * 100)}% of target)` : ""}
- Protein: ${grounding.todayNutrition.protein}g ${grounding.targets ? `(${Math.round((grounding.todayNutrition.protein / grounding.targets.protein_g) * 100)}% of target)` : ""}
- Carbs: ${grounding.todayNutrition.carbs}g ${grounding.targets ? `(${Math.round((grounding.todayNutrition.carbs / grounding.targets.carbs_g) * 100)}% of target)` : ""}
- Fat: ${grounding.todayNutrition.fat}g ${grounding.targets ? `(${Math.round((grounding.todayNutrition.fat / grounding.targets.fat_g) * 100)}% of target)` : ""}
- Water: ${grounding.todayWater}ml (${Math.round(grounding.todayWater / 29.5735)} oz)
- Workout: ${grounding.todayWorkout.completed ? `Completed${grounding.todayWorkout.name ? ` (${grounding.todayWorkout.name})` : ""}` : "Not yet done"}
`;

  if (grounding.recentWeight) {
    const weightDisplay = unitSystem === "metric"
      ? `${grounding.recentWeight} kg`
      : `${Math.round(grounding.recentWeight / 0.453592)} lbs`;
    dataSection += `- Recent weight: ${weightDisplay}\n`;
  }

  return `You are the MetriqFit AI Coach - a friendly, knowledgeable fitness and nutrition assistant. Your name is "Coach".

## Your Personality
- Supportive and encouraging, but realistic
- Direct and concise (mobile-first responses)
- Use the user's name (${name}) occasionally
- Celebrate progress, provide actionable suggestions

## What You CAN Do
1. Answer questions about the user's targets and daily progress
2. Suggest meal swaps that align with their macro targets
3. Suggest exercise substitutions
4. Explain training and nutrition concepts
5. Help plan meals for the next 24-72 hours
6. Provide motivation and accountability

## What You CANNOT Do (STRICT GUARDRAILS)
1. NO medical diagnosis, treatment advice, or medication recommendations
2. NO eating disorder coaching or extreme caloric restriction (<1200 kcal)
3. NO unsafe supplement protocols or steroid advice
4. NO "guaranteed" outcome claims
5. NO advice that contradicts basic health safety

If asked about any prohibited topic, politely redirect: "I'm not qualified to advise on that. Please consult a healthcare professional."

## Grounding Rules (CRITICAL - Anti-Hallucination)
You must ONLY reference the data provided below. Never invent or assume data.

${dataSection}

## Response Guidelines
- Keep responses concise (2-4 sentences typical, more if explaining concepts)
- Use specific numbers from the user's data
- If data is missing, say "I don't see X logged yet" and suggest logging it
- Include actionable next steps when relevant
- You can suggest actions using this format: [ACTION:Label:route] (e.g., [ACTION:Log Food:/nutrition/log])

## User's Unit System
The user prefers ${unitSystem} units. Display weights in ${unitSystem === "metric" ? "kg" : "lbs"} and volumes in ${unitSystem === "metric" ? "ml" : "oz"}.

Remember: You're a coach, not a doctor. When in doubt, encourage consulting professionals.`;
}

/**
 * Fetch all grounding data for the AI
 */
async function fetchGroundingData(
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<GroundingData> {
  const today = new Date().toISOString().split("T")[0];
  const todayStart = `${today}T00:00:00.000Z`;
  const todayEnd = `${today}T23:59:59.999Z`;

  // Fetch in parallel for speed
  const [
    targetsResult,
    profileResult,
    mealLogsResult,
    waterResult,
    workoutResult,
    weightResult,
    subscriptionResult,
  ] = await Promise.all([
    // User targets
    supabase
      .from("user_targets")
      .select("calories, protein_g, carbs_g, fat_g, water_ml")
      .eq("user_id", userId)
      .single(),

    // Profile
    supabase
      .from("profiles")
      .select("first_name, unit_system")
      .eq("id", userId)
      .single(),

    // Today's meal logs with items
    supabase
      .from("meal_logs")
      .select(`
        id,
        meal_log_items (
          calories,
          protein,
          carbs,
          fat
        )
      `)
      .eq("user_id", userId)
      .gte("logged_at", todayStart)
      .lte("logged_at", todayEnd),

    // Today's water
    supabase
      .from("water_logs")
      .select("amount_ml")
      .eq("user_id", userId)
      .gte("logged_at", todayStart)
      .lte("logged_at", todayEnd),

    // Today's workout
    supabase
      .from("workout_sessions")
      .select("id, ended_at")
      .eq("user_id", userId)
      .gte("started_at", todayStart)
      .lte("started_at", todayEnd)
      .limit(1),

    // Recent weight
    supabase
      .from("user_measurements")
      .select("weight_kg")
      .eq("user_id", userId)
      .order("logged_at", { ascending: false })
      .limit(1),

    // Check subscription status
    supabase
      .from("subscriptions")
      .select("status, entitlement")
      .eq("user_id", userId)
      .eq("status", "active")
      .single(),
  ]);

  // Calculate today's nutrition totals
  let todayNutrition = { calories: 0, protein: 0, carbs: 0, fat: 0 };
  if (mealLogsResult.data) {
    for (const meal of mealLogsResult.data) {
      if (meal.meal_log_items) {
        for (const item of meal.meal_log_items as any[]) {
          todayNutrition.calories += item.calories || 0;
          todayNutrition.protein += item.protein || 0;
          todayNutrition.carbs += item.carbs || 0;
          todayNutrition.fat += item.fat || 0;
        }
      }
    }
  }

  // Round nutrition values
  todayNutrition = {
    calories: Math.round(todayNutrition.calories),
    protein: Math.round(todayNutrition.protein * 10) / 10,
    carbs: Math.round(todayNutrition.carbs * 10) / 10,
    fat: Math.round(todayNutrition.fat * 10) / 10,
  };

  // Calculate today's water total
  const todayWater = (waterResult.data || []).reduce(
    (sum, log) => sum + (log.amount_ml || 0),
    0
  );

  // Check if workout is completed
  const todayWorkout = {
    completed: workoutResult.data && workoutResult.data.length > 0 &&
               workoutResult.data[0].ended_at !== null,
    name: undefined as string | undefined,
  };

  // Check elite status
  const isElite = subscriptionResult.data?.entitlement === "elite" &&
                  subscriptionResult.data?.status === "active";

  return {
    targets: targetsResult.data || null,
    todayNutrition,
    todayWater,
    todayWorkout,
    recentWeight: weightResult.data?.[0]?.weight_kg || null,
    profile: profileResult.data || null,
    isElite,
  };
}

/**
 * Get recent conversation history for context
 */
async function getRecentMessages(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  limit = 10
): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from("ai_coach_messages")
    .select("role, content")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching messages:", error);
    return [];
  }

  // Reverse to chronological order
  return (data || []).reverse().map((m) => ({
    role: m.role as "user" | "assistant" | "system",
    content: m.content,
  }));
}

/**
 * Check and update rate limits
 * Returns true if allowed, false if rate limited
 */
async function checkAndUpdateRateLimit(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  isElite: boolean
): Promise<{ allowed: boolean; used: number; limit: number }> {
  const limit = isElite ? RATE_LIMITS.elite : RATE_LIMITS.free;
  const today = new Date().toISOString().split("T")[0];

  // Get current usage
  const { data: usage } = await supabase
    .from("ai_usage_daily")
    .select("coach_messages")
    .eq("user_id", userId)
    .eq("usage_date", today)
    .single();

  const currentUsage = usage?.coach_messages || 0;

  if (currentUsage >= limit) {
    return { allowed: false, used: currentUsage, limit };
  }

  // Increment usage using the database function
  await supabase.rpc("increment_ai_usage", {
    p_user_id: userId,
    p_usage_type: "coach_messages",
  });

  return { allowed: true, used: currentUsage + 1, limit };
}

/**
 * Call OpenAI GPT-4
 */
async function callOpenAI(
  apiKey: string,
  messages: ChatMessage[]
): Promise<{ content: string; tokens: { input: number; output: number } }> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4-turbo-preview",
      messages,
      max_tokens: 500,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("OpenAI API error:", errorText);
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();

  return {
    content: data.choices[0]?.message?.content || "I apologize, but I couldn't generate a response. Please try again.",
    tokens: {
      input: data.usage?.prompt_tokens || 0,
      output: data.usage?.completion_tokens || 0,
    },
  };
}

/**
 * Store messages in the database
 */
async function storeMessages(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  userMessage: string,
  assistantMessage: string,
  tokens: { input: number; output: number },
  grounding: GroundingData
): Promise<{ userMsgId: string; assistantMsgId: string }> {
  // Store user message
  const { data: userMsg, error: userError } = await supabase
    .from("ai_coach_messages")
    .insert({
      user_id: userId,
      role: "user",
      content: userMessage,
    })
    .select("id")
    .single();

  if (userError) throw userError;

  // Store assistant message with context snapshot
  const contextSnapshot = {
    targets: grounding.targets,
    todayNutrition: grounding.todayNutrition,
    todayWater: grounding.todayWater,
  };

  const { data: assistantMsg, error: assistantError } = await supabase
    .from("ai_coach_messages")
    .insert({
      user_id: userId,
      role: "assistant",
      content: assistantMessage,
      context_snapshot: contextSnapshot,
      tokens_input: tokens.input,
      tokens_output: tokens.output,
      model: "gpt-4-turbo-preview",
    })
    .select("id")
    .single();

  if (assistantError) throw assistantError;

  return {
    userMsgId: userMsg.id,
    assistantMsgId: assistantMsg.id,
  };
}

/**
 * Parse action buttons from response
 */
function parseActionButtons(content: string): {
  cleanedContent: string;
  buttons: Array<{ type: string; label: string; route: string }>;
} {
  const buttons: Array<{ type: string; label: string; route: string }> = [];
  let cleanedContent = content;

  // Parse [ACTION:Label:route] patterns
  const actionPattern = /\[ACTION:([^:]+):([^\]]+)\]/g;
  let match;

  while ((match = actionPattern.exec(content)) !== null) {
    buttons.push({
      type: "navigate",
      label: match[1],
      route: match[2],
    });
    cleanedContent = cleanedContent.replace(match[0], "");
  }

  return {
    cleanedContent: cleanedContent.trim(),
    buttons,
  };
}

// Main handler
serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Use POST" }, 405);
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

  if (!OPENAI_API_KEY) {
    return jsonResponse({ error: "OpenAI API key not configured" }, 500);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });

  // Verify auth
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData?.user) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  // Parse request body
  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const { user_id, message } = body;

  // Validate input
  if (!user_id || !message) {
    return jsonResponse({ error: "user_id and message are required" }, 400);
  }

  // Verify user_id matches authenticated user
  if (user_id !== authData.user.id) {
    return jsonResponse({ error: "user_id mismatch" }, 403);
  }

  // Validate message length
  if (message.length > 2000) {
    return jsonResponse({ error: "Message too long (max 2000 characters)" }, 400);
  }

  try {
    // Fetch grounding data
    const grounding = await fetchGroundingData(supabase, user_id);

    // Check rate limits
    const rateLimit = await checkAndUpdateRateLimit(supabase, user_id, grounding.isElite);
    if (!rateLimit.allowed) {
      return jsonResponse({
        error: "Rate limit exceeded",
        rate_limit: {
          used: rateLimit.used,
          limit: rateLimit.limit,
          resets_at: new Date(new Date().setUTCHours(24, 0, 0, 0)).toISOString(),
        },
      }, 429);
    }

    // Build messages for OpenAI
    const systemPrompt = buildSystemPrompt(grounding);
    const recentMessages = await getRecentMessages(supabase, user_id);

    const messages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...recentMessages,
      { role: "user", content: message },
    ];

    // Call OpenAI
    const aiResponse = await callOpenAI(OPENAI_API_KEY, messages);

    // Parse action buttons
    const { cleanedContent, buttons } = parseActionButtons(aiResponse.content);

    // Store messages
    const { assistantMsgId } = await storeMessages(
      supabase,
      user_id,
      message,
      aiResponse.content,
      aiResponse.tokens,
      grounding
    );

    // Return response
    return jsonResponse({
      id: assistantMsgId,
      user_id,
      role: "assistant",
      content: cleanedContent,
      attachments: buttons.length > 0 ? buttons : undefined,
      created_at: new Date().toISOString(),
      rate_limit: {
        used: rateLimit.used,
        limit: grounding.isElite ? -1 : rateLimit.limit,
      },
    });
  } catch (error) {
    console.error("AI Coach error:", error);
    return jsonResponse({
      error: "Failed to process message",
      details: (error as Error).message,
    }, 500);
  }
});
