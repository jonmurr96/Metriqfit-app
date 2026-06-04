import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { verifyClerkRequest } from "../_shared/clerkAuth.ts";

interface RequestBody {
  user_id?: string;
  userId?: string;
  message?: string;
  thread_id?: string;
  context_mode?: "auto" | "minimal" | "full";
  context?: Record<string, unknown>;
  allow_web?: boolean;
  allow_actions?: boolean;
  allow_auto_apply?: boolean;
  approved_proposal_id?: string;
  rejected_proposal_id?: string;
}

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

type IntentMode =
  | "general_qa"
  | "coaching_qa"
  | "app_read"
  | "app_mutation"
  | "memory_update"
  | "web_freshness_needed"
  | "unsafe_or_restricted";

type MutationLevel = "none" | "low" | "medium" | "high";
type RiskLevel = "low" | "medium" | "high";
type ProposalStatus = "pending" | "approved" | "rejected" | "executed" | "failed" | "expired";

type ToolName =
  | "log_food_item"
  | "log_water"
  | "log_weight"
  | "log_workout_note"
  | "complete_workout_session"
  | "update_meal_plan"
  | "update_workout_plan"
  | "update_prep_settings"
  | "update_user_settings"
  | "save_memory_item"
  | "dismiss_memory_item"
  | "resolve_memory_item"
  | "search_web";

interface IntentClassification {
  mode: IntentMode;
  confidence: number;
  requiresWeb: boolean;
  requiresApproval: boolean;
  requiresClarification: boolean;
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
    unit_system: "imperial" | "metric";
  } | null;
  subscriptionTier: "free" | "premium" | "elite";
  isPremium: boolean;
  isElite: boolean;
  prepCoach: {
    enabled: boolean;
    discipline: "bodybuilding" | "powerlifting" | null;
    phase: "cut" | "bulk" | null;
    autoAdjustEnabled: boolean;
    lastStatus: string | null;
    lastSummary: string | null;
  };
  onboardingAnswers: Record<string, unknown>;
  memory: Array<{
    id: string;
    memory_type: string;
    title: string;
    body: string;
    priority: number;
    scope: string;
    origin_type: string;
  }>;
}

interface ToolCallRecord {
  tool_name: ToolName;
  input: Record<string, unknown>;
  mutation_level: MutationLevel;
  status: "planned" | "executed" | "proposed" | "failed";
}

interface DetectedAction {
  toolName: ToolName;
  riskLevel: RiskLevel;
  mutationLevel: MutationLevel;
  summary: string;
  title: string;
  input: Record<string, unknown>;
  approveLabel?: string;
  rejectLabel?: string;
  canAutoApply: boolean;
  affectedArea?: string;
  rationale?: string;
}

interface ToolExecutionResult {
  success: boolean;
  content: string;
  user_safe_summary: string;
  mutation_level: MutationLevel;
  tool_name: ToolName;
  receipt_payload: Record<string, unknown> | null;
  raw_payload?: Record<string, unknown> | null;
  memory_item?: Record<string, unknown> | null;
}

class OpenAIRequestError extends Error {
  status: number;
  details?: string;

  constructor(message: string, status: number, details?: string) {
    super(message);
    this.name = "OpenAIRequestError";
    this.status = status;
    this.details = details;
  }
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const RATE_LIMITS = {
  free: 5,
  premium: 25,
  elite: 999999,
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

function toRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function toStringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function normalizedText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function titleFromMessage(message: string) {
  const normalized = normalizedText(message);
  if (!normalized) return "New coach chat";
  return normalized.length > 54 ? `${normalized.slice(0, 54).trimEnd()}...` : normalized;
}

function safeDayOfWeek(input?: Date) {
  return (input || new Date()).getDay();
}

function round(value: number, precision = 1) {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function max0(value: number) {
  return Math.max(0, Math.round(value));
}

function nowIso() {
  return new Date().toISOString();
}

function extractWebSources(payload: unknown, found: Array<{ title: string; url: string }> = []): Array<{ title: string; url: string }> {
  if (Array.isArray(payload)) {
    for (const item of payload) extractWebSources(item, found);
    return found;
  }

  const record = toRecord(payload);
  if (!record) return found;

  const url = toStringOrNull(record.url);
  const title = toStringOrNull(record.title) || toStringOrNull(record.name);
  if (url && title && !found.some((entry) => entry.url === url)) {
    found.push({ title, url });
  }

  for (const value of Object.values(record)) {
    extractWebSources(value, found);
  }

  return found;
}

function buildConversationTitleHint(message: string) {
  return {
    type: "conversation_title_hint",
    title: titleFromMessage(message),
  };
}

function buildToolReceiptAttachment(receiptId: string, toolName: ToolName, title: string, summary: string, mutationLevel: MutationLevel, metadata?: Record<string, unknown> | null) {
  return {
    type: "tool_receipt",
    receiptId,
    toolName,
    title,
    summary,
    mutationLevel,
    created_at: nowIso(),
    metadata: metadata || null,
  };
}

function buildProposalAttachment(proposalId: string, action: DetectedAction) {
  const proposalType =
    action.toolName === "update_user_settings" || action.toolName === "update_prep_settings"
      ? "settings_change_proposal"
      : action.toolName === "log_food_item" || action.toolName === "log_water" || action.toolName === "log_weight"
        ? "log_action_proposal"
        : "action_proposal";

  return {
    type: proposalType,
    proposalId,
    title: action.title,
    summary: action.summary,
    riskLevel: action.riskLevel,
    toolName: action.toolName,
    toolInputPreview: action.input,
    approveLabel: action.approveLabel || "Approve",
    rejectLabel: action.rejectLabel || "Not now",
    canAutoApply: action.canAutoApply,
    receiptPreview: action.summary,
    rationale: action.rationale || null,
    affectedArea: action.affectedArea || null,
    status: "pending" as ProposalStatus,
  };
}

function buildWebSummaryAttachment(query: string, summary: string, sources: Array<{ title: string; url: string }>) {
  return {
    type: "web_result_summary",
    title: "Live web context used",
    summary,
    query,
    sources: sources.slice(0, 5),
  };
}

function buildClarificationAttachment(title: string, prompt: string, options: Array<{ label: string; prompt: string }>) {
  return {
    type: "clarification_prompt",
    title,
    prompt,
    options,
  };
}

function buildContextAttachment(grounding: GroundingData) {
  if (grounding.targets && grounding.todayNutrition.protein < grounding.targets.protein_g * 0.6) {
    return {
      type: "context_note",
      label: "Grounded in today's logs",
      value: `Protein is ${max0(grounding.targets.protein_g - grounding.todayNutrition.protein)}g behind target.`,
      source: "Today's nutrition logs",
    };
  }

  if (grounding.prepCoach.enabled) {
    return {
      type: "context_note",
      label: "Grounded in prep settings",
      value: `${grounding.prepCoach.discipline || "Prep"} ${grounding.prepCoach.phase || "phase"} is active.`,
      source: "Prep settings",
    };
  }

  if (!grounding.todayWorkout.completed) {
    return {
      type: "context_note",
      label: "Grounded in today's training",
      value: "No workout has been completed yet today.",
      source: "Workout sessions",
    };
  }

  return null;
}

function buildFollowUpAttachment(grounding: GroundingData) {
  if (grounding.targets && grounding.todayNutrition.protein < grounding.targets.protein_g * 0.6) {
    return {
      type: "follow_up_prompt",
      label: "Close the protein gap",
      prompt: "Show me the cleanest way to close my protein gap today.",
    };
  }

  if (!grounding.todayWorkout.completed) {
    return {
      type: "follow_up_prompt",
      label: "Review today's training move",
      prompt: "What is the smartest workout move for me today?",
    };
  }

  return null;
}

function classifyIntent(message: string): IntentClassification {
  const lower = message.toLowerCase().trim();

  if (/\b(diagnos|prescrib|prescription|medication|steroid|anorexi|bulimi|purge|self-harm|suicide|dangerous cut|extreme deficit)\b/.test(lower)) {
    return {
      mode: "unsafe_or_restricted",
      confidence: 0.96,
      requiresWeb: false,
      requiresApproval: false,
      requiresClarification: false,
    };
  }

  if (/\b(log|add|track|save|record|set|change|switch|update|turn on|turn off|enable|disable|delete|remove|mark|complete|apply)\b/.test(lower)) {
    return {
      mode: "app_mutation",
      confidence: 0.84,
      requiresWeb: false,
      requiresApproval: /\b(plan|target|macro|delete|remove|prep|exercise|workout)\b/.test(lower),
      requiresClarification: /\b(log (my )?(meal|breakfast|lunch|dinner|snack)|change (my )?plan|add .*exercise)\b/.test(lower),
    };
  }

  if (/\b(remember|i prefer|i like|i avoid|i can't|i cannot|allergic|injur|i will|i'm going to|i am going to)\b/.test(lower)) {
    return {
      mode: "memory_update",
      confidence: 0.8,
      requiresWeb: false,
      requiresApproval: false,
      requiresClarification: false,
    };
  }

  if (/\b(latest|most recent|today|yesterday|current|live|news|score|scores|weather|stock|stocks|nfl|nba|mlb|nhl|epl|president|ceo|search the web|look it up)\b/.test(lower)) {
    return {
      mode: "web_freshness_needed",
      confidence: 0.86,
      requiresWeb: true,
      requiresApproval: false,
      requiresClarification: false,
    };
  }

  if (/\b(my|today|remaining|left|next meal|next workout|targets|macros|settings|plan|progress|streak|water|hydration)\b/.test(lower)) {
    return {
      mode: /\b(protein|carbs|fat|workout|meal|nutrition|prep|cut|bulk|recovery|split|strength)\b/.test(lower)
        ? "coaching_qa"
        : "app_read",
      confidence: 0.76,
      requiresWeb: false,
      requiresApproval: false,
      requiresClarification: false,
    };
  }

  if (/\b(protein|carbs|fat|calories|nutrition|workout|training|recovery|hypertrophy|strength)\b/.test(lower)
    && !/\bmy\b/.test(lower)
    && !/\btoday\b/.test(lower)
    && !/\bplan\b/.test(lower)) {
    return {
      mode: "general_qa",
      confidence: 0.72,
      requiresWeb: false,
      requiresApproval: false,
      requiresClarification: false,
    };
  }

  return {
    mode: "general_qa",
    confidence: 0.68,
    requiresWeb: false,
    requiresApproval: false,
    requiresClarification: false,
  };
}

function parseWaterLogAction(message: string): DetectedAction | null {
  const lower = message.toLowerCase();
  if (!/\b(water|hydrate|hydration)\b/.test(lower) || !/\b(log|add|track|record|drank|drink|save)\b/.test(lower)) {
    return null;
  }

  const match = lower.match(/(\d+(?:\.\d+)?)\s*(ml|milliliters?|l|liters?|litres?|oz|ounces?|cups?|glasses?)/);
  if (!match) return null;

  const value = Number(match[1]);
  const unit = match[2];
  let amountMl = value;
  if (/^l|liter|litre/.test(unit)) amountMl = value * 1000;
  if (/^oz|ounce/.test(unit)) amountMl = value * 29.5735;
  if (/^cup/.test(unit)) amountMl = value * 236.588;
  if (/^glass/.test(unit)) amountMl = value * 240;

  return {
    toolName: "log_water",
    riskLevel: "low",
    mutationLevel: "low",
    title: "Water logged",
    summary: `Log ${Math.round(amountMl)}ml of water to today's hydration.`,
    input: { amount_ml: Math.round(amountMl), original_text: message },
    canAutoApply: true,
    affectedArea: "Hydration log",
    rationale: "This is a low-risk, explicit logging request.",
  };
}

function parseWeightLogAction(message: string, grounding: GroundingData): DetectedAction | null {
  const lower = message.toLowerCase();
  if (!/\b(weight|weigh|scale)\b/.test(lower) || !/\b(log|add|track|record|set|change|update|save)\b/.test(lower)) {
    return null;
  }

  const match = lower.match(/(\d+(?:\.\d+)?)\s*(lb|lbs|pounds?|kg|kgs|kilograms?)?\b/);
  if (!match) return null;

  const value = Number(match[1]);
  if (!Number.isFinite(value) || value <= 0) return null;

  const explicitUnit = match[2];
  const inferredUnit = grounding.profile?.unit_system === "metric" ? "kg" : "lb";
  const unit = explicitUnit || inferredUnit;
  const weightKg = /^kg/.test(unit) || /^kilogram/.test(unit) ? value : value * 0.45359237;
  if (weightKg < 25 || weightKg > 320) return null;
  const displayWeight = grounding.profile?.unit_system === "metric"
    ? `${round(weightKg, 1)}kg`
    : `${round(weightKg / 0.45359237, 1)}lb`;

  return {
    toolName: "log_weight",
    riskLevel: "low",
    mutationLevel: "low",
    title: "Weight logged",
    summary: `Log ${displayWeight} as a new current-weight measurement.`,
    input: { weight_kg: round(weightKg, 2), display_weight: displayWeight, inferred_unit: explicitUnit ? null : inferredUnit, original_text: message },
    canAutoApply: true,
    affectedArea: "Weight log",
    rationale: explicitUnit
      ? "This is a low-risk, explicit measurement entry."
      : `No unit was provided, so I used the user's ${inferredUnit === "kg" ? "metric" : "imperial"} unit preference.`,
  };
}

async function parseFoodLogAction(
  supabase: ReturnType<typeof createClient>,
  message: string,
): Promise<DetectedAction | null> {
  const lower = message.toLowerCase();
  if (!/\b(log|add|track|save)\b/.test(lower)) return null;
  if (!/\b(breakfast|lunch|dinner|snack)\b/.test(lower)) return null;
  if (!/\b(g|gram|grams|oz|ounce|ounces)\b/.test(lower)) return null;

  const slotMatch = lower.match(/\b(breakfast|lunch|dinner|snack)\b/);
  const amountMatch = lower.match(/(\d+(?:\.\d+)?)\s*(g|gram|grams|oz|ounce|ounces)\b/);
  if (!slotMatch || !amountMatch) return null;

  const slot = slotMatch[1] as "breakfast" | "lunch" | "dinner" | "snack";
  const amount = Number(amountMatch[1]);
  const unit = amountMatch[2];
  const grams = /^oz|^ounce/.test(unit) ? Math.round(amount * 28.3495) : amount;
  if (!Number.isFinite(grams) || grams <= 0) return null;

  const cleaned = lower
    .replace(/\b(log|add|track|save)\b/g, " ")
    .replace(/\b(my|for|to|today|please)\b/g, " ")
    .replace(/\b(breakfast|lunch|dinner|snack)\b/g, " ")
    .replace(/(\d+(?:\.\d+)?)\s*(g|gram|grams|oz|ounce|ounces)\b/g, " ")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned || cleaned.length < 3) return null;

  const searchTerm = `%${cleaned}%`;
  const { data: candidates } = await supabase
    .from("food_items")
    .select("id, name, brand")
    .or(`name.ilike.${searchTerm},brand.ilike.${searchTerm}`)
    .order("is_verified", { ascending: false })
    .order("name", { ascending: true })
    .limit(3);

  if (!Array.isArray(candidates) || candidates.length === 0) return null;

  const exact = candidates.find((item: Record<string, unknown>) => {
    const name = String(item.name || "").toLowerCase();
    const brand = String(item.brand || "").toLowerCase();
    return name === cleaned || `${brand} ${name}`.trim() === cleaned || name.includes(cleaned);
  });

  const target = exact || candidates[0];
  if (!target?.id) return null;

  return {
    toolName: "log_food_item",
    riskLevel: "low",
    mutationLevel: "low",
    title: "Food logged",
    summary: `Log ${grams}g of ${String(target.name)} to ${slot}.`,
    input: {
      food_item_id: String(target.id),
      food_name: String(target.name),
      meal_slot: slot,
      grams,
      original_amount: amount,
      original_unit: unit,
    },
    canAutoApply: true,
    affectedArea: "Meal log",
    rationale: "This is a low-risk, explicit food logging request with a matched food item.",
  };
}

function parseUnitSettingAction(message: string): DetectedAction | null {
  const lower = message.toLowerCase();
  if (!/\b(metric|imperial)\b/.test(lower) || !/\b(unit|units|weight|display|switch|change|set)\b/.test(lower)) {
    return null;
  }

  const value = lower.includes("metric") ? "metric" : "imperial";
  return {
    toolName: "update_user_settings",
    riskLevel: "low",
    mutationLevel: "low",
    title: "Units preference",
    summary: `Switch unit display to ${value}.`,
    input: { setting: "unit_system", value },
    canAutoApply: true,
    affectedArea: "Display settings",
    rationale: "Unit system is a low-risk user preference.",
  };
}

function parseMemorySaveAction(message: string): DetectedAction | null {
  const trimmed = message.trim();
  if (!/^remember\b/i.test(trimmed) && !/\b(i prefer|i like|i avoid|i can't|i cannot|allergic|injur|i will|i'm going to|i am going to)\b/i.test(trimmed)) {
    return null;
  }

  let memoryType = "summary";
  if (/\b(i prefer|i like)\b/i.test(trimmed)) memoryType = "preference";
  if (/\b(i avoid|i can't|i cannot|allergic|injur)\b/i.test(trimmed)) memoryType = "constraint";
  if (/\b(i will|i'm going to|i am going to)\b/i.test(trimmed)) memoryType = "commitment";

  const body = trimmed.replace(/^remember\b[:\s-]*/i, "").trim() || trimmed;
  return {
    toolName: "save_memory_item",
    riskLevel: "low",
    mutationLevel: "low",
    title: "Coach memory",
    summary: "Save this detail for future coaching context.",
    input: {
      memory_type: memoryType,
      title: memoryType === "preference"
        ? "Preference captured"
        : memoryType === "constraint"
          ? "Constraint captured"
          : memoryType === "commitment"
            ? "Commitment captured"
            : "Remembered for coach context",
      body,
      priority: memoryType === "constraint" ? 80 : 55,
      scope: "conversation",
      origin_type: "conversation",
    },
    canAutoApply: true,
    affectedArea: "Coach memory",
    rationale: "Saving explicit user context is a low-risk assistant action.",
  };
}

function parsePrepSettingsAction(message: string): DetectedAction | null {
  const lower = message.toLowerCase();
  if (!/\bprep\b/.test(lower)) return null;

  if (/\b(turn off|disable)\b/.test(lower) && /\bprep mode\b/.test(lower)) {
    return {
      toolName: "update_prep_settings",
      riskLevel: "medium",
      mutationLevel: "medium",
      title: "Prep mode change",
      summary: "Turn prep mode off.",
      input: { prep_mode_enabled: false, prep_auto_adjust_enabled: false },
      approveLabel: "Turn off prep",
      rejectLabel: "Keep prep on",
      canAutoApply: false,
      affectedArea: "Prep settings",
      rationale: "This changes plan behavior and should require approval.",
    };
  }

  if (/\b(turn on|enable)\b/.test(lower) && /\bprep mode\b/.test(lower)) {
    return {
      toolName: "update_prep_settings",
      riskLevel: "medium",
      mutationLevel: "medium",
      title: "Prep mode change",
      summary: "Turn prep mode on with auto-adjust enabled.",
      input: { prep_mode_enabled: true, prep_auto_adjust_enabled: true },
      approveLabel: "Enable prep",
      rejectLabel: "Not now",
      canAutoApply: false,
      affectedArea: "Prep settings",
      rationale: "Prep mode affects long-term coaching behavior and should be approved.",
    };
  }

  const phaseMatch = lower.match(/\b(cut|bulk)\b/);
  if (/\bprep phase\b/.test(lower) && phaseMatch) {
    return {
      toolName: "update_prep_settings",
      riskLevel: "medium",
      mutationLevel: "medium",
      title: "Prep phase change",
      summary: `Change prep phase to ${phaseMatch[1]}.`,
      input: { prep_phase: phaseMatch[1], prep_mode_enabled: true, prep_auto_adjust_enabled: true },
      approveLabel: "Apply phase",
      rejectLabel: "Keep current phase",
      canAutoApply: false,
      affectedArea: "Prep settings",
      rationale: "Prep phase changes should be approved before they affect coaching and plans.",
    };
  }

  return null;
}

async function parseMealPlanTargetAction(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  message: string,
): Promise<DetectedAction | null> {
  const lower = message.toLowerCase();
  const slotMatch = lower.match(/\b(breakfast|lunch|dinner|snack)\b/);
  const macroMatch = lower.match(/\b(protein|carbs|fat|calories)\b/);
  const valueMatch = lower.match(/(\d+(?:\.\d+)?)\s*(g|grams?|kcal|calories)?/);

  if (!slotMatch || !macroMatch || !valueMatch) return null;
  if (!/\b(change|set|update|make|raise|lower|increase|decrease)\b/.test(lower)) return null;

  const { data: plan } = await (supabase as any)
    .from("user_nutrition_plans")
    .select("id")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!plan?.id) return null;

  const dayOfWeek = /\btomorrow\b/.test(lower)
    ? ((safeDayOfWeek() + 1) % 7)
    : safeDayOfWeek();

  const { data: meals } = await (supabase as any)
    .from("user_nutrition_plan_meals")
    .select("id, plan_id, meal_slot, name, description, target_calories, target_protein, target_carbs, target_fat, prep_time_min")
    .eq("plan_id", plan.id)
    .eq("day_of_week", dayOfWeek);

  if (!Array.isArray(meals) || meals.length === 0) return null;

  const slot = slotMatch[1];
  const targetMeal = meals.find((meal: any) => meal.meal_slot === slot);
  if (!targetMeal) return null;

  const numericValue = Number(valueMatch[1]);
  const macro = macroMatch[1];
  const updatedMeals = meals.map((meal: any) => {
    if (meal.id !== targetMeal.id) {
      return {
        meal_slot: meal.meal_slot,
        name: meal.name,
        description: meal.description,
        target_calories: meal.target_calories,
        target_protein: meal.target_protein,
        target_carbs: meal.target_carbs,
        target_fat: meal.target_fat,
        prep_time_min: meal.prep_time_min,
      };
    }

    return {
      meal_slot: meal.meal_slot,
      name: meal.name,
      description: meal.description,
      target_calories: macro === "calories" ? numericValue : meal.target_calories,
      target_protein: macro === "protein" ? numericValue : meal.target_protein,
      target_carbs: macro === "carbs" ? numericValue : meal.target_carbs,
      target_fat: macro === "fat" ? numericValue : meal.target_fat,
      prep_time_min: meal.prep_time_min,
    };
  });

  return {
    toolName: "update_meal_plan",
    riskLevel: "medium",
    mutationLevel: "medium",
    title: `${slot.charAt(0).toUpperCase()}${slot.slice(1)} meal change`,
    summary: `Change ${slot} ${macro} target to ${numericValue}${macro === "calories" ? " kcal" : "g"}.`,
    input: {
      plan_id: plan.id,
      day_of_week: dayOfWeek,
      meals: updatedMeals,
      target_slot: slot,
      changed_field: macro,
      changed_value: numericValue,
    },
    approveLabel: "Approve meal change",
    rejectLabel: "Keep current meal",
    canAutoApply: false,
    affectedArea: "Nutrition plan",
    rationale: "Meal-plan changes affect long-term programming and require approval.",
  };
}

async function parseWorkoutPlanAction(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  message: string,
): Promise<DetectedAction | null> {
  const lower = message.toLowerCase();
  if (!/\b(workout|training|session)\b/.test(lower)) return null;
  if (!/\b(recovery|rest)\b/.test(lower)) return null;
  if (!/\b(tomorrow|next)\b/.test(lower)) return null;
  if (!/\b(change|make|set|turn)\b/.test(lower)) return null;

  const targetDate = /\btomorrow\b/.test(lower)
    ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0]
    : new Date().toISOString().split("T")[0];

  let scheduleQuery = (supabase as any)
    .from("user_workout_plan_schedule")
    .select("id, scheduled_date, session_type, notes")
    .eq("user_id", userId)
    .eq("status", "planned")
    .eq("session_type", "workout")
    .gte("scheduled_date", targetDate)
    .order("scheduled_date", { ascending: true })
    .limit(1);

  if (/\btomorrow\b/.test(lower)) {
    scheduleQuery = scheduleQuery.eq("scheduled_date", targetDate);
  }

  const { data: schedule } = await scheduleQuery.maybeSingle();
  if (!schedule?.id) return null;

  return {
    toolName: "update_workout_plan",
    riskLevel: "medium",
    mutationLevel: "medium",
    title: "Workout schedule change",
    summary: `Shift the next planned workout on ${schedule.scheduled_date} to active recovery.`,
    input: {
      schedule_entry_id: schedule.id,
      scheduled_date: schedule.scheduled_date,
      next_session_type: "active_recovery",
      notes: "Updated by AI Coach after user approval.",
    },
    approveLabel: "Approve recovery shift",
    rejectLabel: "Keep workout",
    canAutoApply: false,
    affectedArea: "Workout schedule",
    rationale: "Schedule changes affect training structure and should be approved.",
  };
}

function workoutDaySearchToken(lower: string) {
  const dayMatch = lower.match(/\b(push|pull|legs?|leg day|upper|lower|chest|back|shoulders?|arms?|glutes?|hamstrings?|quads?)\b/);
  if (!dayMatch) return null;
  const token = dayMatch[1];
  if (token === "leg") return "legs";
  if (token === "leg day") return "legs";
  return token;
}

function cleanExerciseSearchTerm(message: string) {
  const lower = message.toLowerCase();
  return lower
    .replace(/\b(can you|please|could you|would you|i want you to|help me)\b/g, " ")
    .replace(/\b(add|insert|put|include)\b/g, " ")
    .replace(/\b(an?|the|my|to|into|in|on|for)\b/g, " ")
    .replace(/\b(workout|training|exercise|movement|plan|program|session|day|today|tomorrow|next)\b/g, " ")
    .replace(/\b(push|pull|legs?|leg day|upper|lower|chest|back|shoulders?|arms?|glutes?|hamstrings?|quads?)\b/g, " ")
    .replace(/\b\d+\s*(sets?|reps?)\b/g, " ")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function findWorkoutPlanDay(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  lower: string,
) {
  const { data: plan } = await (supabase as any)
    .from("user_workout_plans")
    .select("id")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!plan?.id) return null;

  if (/\b(today|tomorrow|next workout|next session)\b/.test(lower)) {
    const targetDate = /\btomorrow\b/.test(lower)
      ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0];

    let scheduleQuery = (supabase as any)
      .from("user_workout_plan_schedule")
      .select("id, plan_day_id, scheduled_date, plan_day:user_workout_plan_days(id, name, focus, day_number)")
      .eq("user_id", userId)
      .eq("plan_id", plan.id)
      .eq("status", "planned")
      .eq("session_type", "workout")
      .gte("scheduled_date", targetDate)
      .order("scheduled_date", { ascending: true })
      .limit(1);

    if (/\btomorrow\b/.test(lower)) {
      scheduleQuery = scheduleQuery.eq("scheduled_date", targetDate);
    }

    const { data: schedule } = await scheduleQuery.maybeSingle();
    if (schedule?.plan_day_id) {
      const planDay = Array.isArray(schedule.plan_day) ? schedule.plan_day[0] : schedule.plan_day;
      return {
        id: schedule.plan_day_id,
        name: planDay?.name || "scheduled workout",
        focus: planDay?.focus || null,
        day_number: planDay?.day_number ?? null,
        scheduled_date: schedule.scheduled_date,
      };
    }
  }

  const dayToken = workoutDaySearchToken(lower);
  if (!dayToken) return null;

  const search = `%${dayToken}%`;
  const { data: days } = await (supabase as any)
    .from("user_workout_plan_days")
    .select("id, name, focus, day_number")
    .eq("plan_id", plan.id)
    .or(`name.ilike.${search},focus.ilike.${search}`)
    .order("day_number", { ascending: true })
    .limit(3);

  if (!Array.isArray(days) || days.length === 0) return null;
  return days[0];
}

async function findExerciseByMessage(
  supabase: ReturnType<typeof createClient>,
  message: string,
) {
  const cleaned = cleanExerciseSearchTerm(message);
  if (!cleaned || cleaned.length < 3) return null;

  const searchTerms = [cleaned];
  if (/\bcurls?\b/.test(cleaned)) searchTerms.push("curl");
  if (/\bpush\s*ups?\b/.test(cleaned)) searchTerms.push("push");
  if (/\bpull\s*ups?\b/.test(cleaned)) searchTerms.push("pull");
  if (/\bbench\b/.test(cleaned)) searchTerms.push("bench");

  for (const term of searchTerms) {
    const search = `%${term}%`;
    const { data: exercises } = await (supabase as any)
      .from("exercises")
      .select("id, name, category, primary_muscle, target_muscle")
      .ilike("name", search)
      .eq("is_reference_only", false)
      .order("name", { ascending: true })
      .limit(5);

    if (Array.isArray(exercises) && exercises.length > 0) {
      const exact = exercises.find((exercise: Record<string, unknown>) => String(exercise.name || "").toLowerCase() === term);
      return exact || exercises[0];
    }
  }

  return null;
}

async function parseWorkoutExerciseAddAction(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  message: string,
): Promise<DetectedAction | null> {
  const lower = message.toLowerCase();
  if (!/\b(add|insert|put|include)\b/.test(lower)) return null;
  if (!/\b(exercise|movement|workout|training|plan|program|day|session)\b/.test(lower)) return null;

  const [planDay, exercise] = await Promise.all([
    findWorkoutPlanDay(supabase, userId, lower),
    findExerciseByMessage(supabase, message),
  ]);

  if (!planDay?.id || !exercise?.id) return null;

  const setsMatch = lower.match(/(\d+)\s*sets?/);
  const repsMatch = lower.match(/(\d+)(?:\s*-\s*(\d+))?\s*reps?/);
  const sets = setsMatch ? Number(setsMatch[1]) : 3;
  const repsMin = repsMatch ? Number(repsMatch[1]) : 8;
  const repsMax = repsMatch ? Number(repsMatch[2] || repsMatch[1]) : 12;

  return {
    toolName: "update_workout_plan",
    riskLevel: "medium",
    mutationLevel: "medium",
    title: "Exercise add",
    summary: `Add ${String(exercise.name)} to ${String(planDay.name || "your workout day")}.`,
    input: {
      operation: "add_exercise",
      plan_day_id: String(planDay.id),
      plan_day_name: String(planDay.name || "Workout day"),
      exercise_id: String(exercise.id),
      exercise_name: String(exercise.name),
      sets_target: Number.isFinite(sets) && sets > 0 ? sets : 3,
      reps_min: Number.isFinite(repsMin) && repsMin > 0 ? repsMin : 8,
      reps_max: Number.isFinite(repsMax) && repsMax > 0 ? repsMax : 12,
      rest_seconds: 90,
      original_text: message,
    },
    approveLabel: "Add exercise",
    rejectLabel: "Keep plan",
    canAutoApply: false,
    affectedArea: "Workout plan",
    rationale: "Adding exercises changes plan structure, so it should be reviewed before applying.",
  };
}

function parseClarificationRequest(message: string) {
  const lower = message.toLowerCase();
  if (/\b(add|insert|put|include)\b/.test(lower) && /\b(exercise|movement|workout|training|plan|program|day|session)\b/.test(lower)) {
    return buildClarificationAttachment(
      "I need the exercise and target day",
      "I can add an exercise to your plan, but I need the exercise name and where it should go, like push day, pull day, leg day, today, or tomorrow.",
      [
        { label: "Add to push day", prompt: "Add dumbbell lateral raises to my push day." },
        { label: "Add to pull day", prompt: "Add dumbbell curls to my pull day." },
        { label: "Add tomorrow", prompt: "Add calf raises to tomorrow's workout." },
      ],
    );
  }

  if (/\b(log|add|track)\b/.test(lower) && /\b(breakfast|lunch|dinner|snack|meal|food)\b/.test(lower)) {
    return buildClarificationAttachment(
      "I need one more detail",
      "I can help log food, but I need the food item and amount before I write to your log.",
      [
        { label: "Log breakfast", prompt: "Help me log breakfast. Ask me for the food item and amount first." },
        { label: "Log lunch", prompt: "Help me log lunch. Ask me for the food item and amount first." },
        { label: "Open food search", prompt: "Take me to the food search flow so I can log a meal." },
      ],
    );
  }

  if (/\b(reminders?|notifications?)\b/.test(lower) && /\b(turn off|turn on|disable|enable|change|set)\b/.test(lower)) {
    return buildClarificationAttachment(
      "Notification settings stay local",
      "I can change unit and prep settings directly, but notification reminders are still managed in the local settings screen.",
      [
        { label: "Open notifications", prompt: "Open my notifications settings." },
        { label: "Switch units", prompt: "Change my unit system." },
      ],
    );
  }

  return null;
}

async function detectAction(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  message: string,
  grounding: GroundingData,
): Promise<{ action: DetectedAction | null; clarification: Record<string, unknown> | null }> {
  const parsers: Array<DetectedAction | null | Promise<DetectedAction | null>> = [
    parseMemorySaveAction(message),
    parseWaterLogAction(message),
    parseWeightLogAction(message, grounding),
    parseFoodLogAction(supabase, message),
    parseUnitSettingAction(message),
    parsePrepSettingsAction(message),
    parseMealPlanTargetAction(supabase, userId, message),
    parseWorkoutExerciseAddAction(supabase, userId, message),
    parseWorkoutPlanAction(supabase, userId, message),
  ];

  for (const parser of parsers) {
    const result = await parser;
    if (result) {
      return { action: result, clarification: null };
    }
  }

  return { action: null, clarification: parseClarificationRequest(message) };
}

async function fetchGroundingData(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<GroundingData> {
  const today = new Date().toISOString().split("T")[0];
  const todayStart = `${today}T00:00:00.000Z`;
  const todayEnd = `${today}T23:59:59.999Z`;

  const [
    targetsResult,
    profileResult,
    mealLogsResult,
    waterResult,
    workoutResult,
    weightResult,
    subscriptionResult,
    onboardingResult,
    prepCycleResult,
    prepEventResult,
    memoryResult,
  ] = await Promise.all([
    supabase
      .from("user_targets")
      .select("calories, protein_g, carbs_g, fat_g, water_ml")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("first_name, unit_system")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("meal_logs")
      .select("id, meal_log_items(calories, protein, carbs, fat)")
      .eq("user_id", userId)
      .gte("logged_at", todayStart)
      .lte("logged_at", todayEnd),
    supabase
      .from("water_logs")
      .select("amount_ml")
      .eq("user_id", userId)
      .gte("logged_at", todayStart)
      .lte("logged_at", todayEnd),
    supabase
      .from("workout_sessions")
      .select("id, ended_at")
      .eq("user_id", userId)
      .gte("started_at", todayStart)
      .lte("started_at", todayEnd)
      .limit(1),
    supabase
      .from("user_measurements")
      .select("weight_kg")
      .eq("user_id", userId)
      .order("logged_at", { ascending: false })
      .limit(1),
    supabase
      .from("subscriptions")
      .select("plan_type, status, expires_at, trial_ends_at")
      .eq("user_id", userId)
      .in("status", ["active", "trial", "grace_period"])
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("onboarding_answers")
      .select("answers")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("prep_coach_cycles")
      .select("discipline, phase, is_active, auto_adjust_enabled")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("prep_coach_adjustment_events")
      .select("status, coach_summary")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    (supabase as any)
      .from("ai_coach_memory_items")
      .select("id, memory_type, title, body, priority, scope, origin_type")
      .eq("user_id", userId)
      .eq("status", "active")
      .order("priority", { ascending: false })
      .order("updated_at", { ascending: false })
      .limit(6),
  ]);

  let todayNutrition = { calories: 0, protein: 0, carbs: 0, fat: 0 };
  for (const meal of mealLogsResult.data || []) {
    for (const item of (meal.meal_log_items || []) as Array<Record<string, unknown>>) {
      todayNutrition.calories += Number(item.calories || 0);
      todayNutrition.protein += Number(item.protein || 0);
      todayNutrition.carbs += Number(item.carbs || 0);
      todayNutrition.fat += Number(item.fat || 0);
    }
  }

  todayNutrition = {
    calories: Math.round(todayNutrition.calories),
    protein: round(todayNutrition.protein),
    carbs: round(todayNutrition.carbs),
    fat: round(todayNutrition.fat),
  };

  const todayWater = (waterResult.data || []).reduce(
    (sum: number, log: Record<string, unknown>) => sum + Number(log.amount_ml || 0),
    0,
  );

  const onboardingAnswers = (onboardingResult.data?.answers || {}) as Record<string, unknown>;
  const prepEnabled = Boolean(prepCycleResult.data?.is_active) || onboardingAnswers.prep_mode_enabled === true;
  const prepDiscipline = (
    prepCycleResult.data?.discipline ||
    onboardingAnswers.prep_discipline ||
    null
  ) as GroundingData["prepCoach"]["discipline"];
  const prepPhase = (
    prepCycleResult.data?.phase ||
    onboardingAnswers.prep_phase ||
    null
  ) as GroundingData["prepCoach"]["phase"];
  const subscription = subscriptionResult.data;
  const hasActiveWindow = !!subscription && (
    subscription.plan_type === "elite_lifetime"
    || !subscription.expires_at
    || Date.parse(subscription.expires_at) > Date.now()
    || (subscription.trial_ends_at ? Date.parse(subscription.trial_ends_at) > Date.now() : false)
  );
  const subscriptionTier: GroundingData["subscriptionTier"] = !subscription || !hasActiveWindow
    ? "free"
    : subscription.plan_type.startsWith("premium")
      ? "premium"
      : subscription.plan_type === "free"
        ? "free"
        : "elite";

  return {
    targets: targetsResult.data || null,
    todayNutrition,
    todayWater,
    todayWorkout: {
      completed: !!(workoutResult.data?.[0]?.ended_at),
      name: undefined,
    },
    recentWeight: weightResult.data?.[0]?.weight_kg || null,
    profile: profileResult.data
      ? {
          first_name: profileResult.data.first_name || undefined,
          unit_system: (profileResult.data.unit_system || "imperial") as "imperial" | "metric",
        }
      : null,
    subscriptionTier,
    isPremium: subscriptionTier === "premium" || subscriptionTier === "elite",
    isElite: subscriptionTier === "elite",
    prepCoach: {
      enabled: prepEnabled,
      discipline: prepDiscipline,
      phase: prepPhase,
      autoAdjustEnabled: Boolean(prepCycleResult.data?.auto_adjust_enabled) || onboardingAnswers.prep_auto_adjust_enabled === true,
      lastStatus: prepEventResult.data?.status || null,
      lastSummary: prepEventResult.data?.coach_summary || null,
    },
    onboardingAnswers,
    memory: (memoryResult.data || []) as GroundingData["memory"],
  };
}

async function getRecentMessages(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  threadId?: string | null,
  limit = 10,
): Promise<ChatMessage[]> {
  let query = supabase
    .from("ai_coach_messages")
    .select("role, content")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (threadId) {
    query = query.eq("thread_id", threadId);
  }

  const { data, error } = await query;
  if (error) return [];
  return (data || []).reverse().map((row: Record<string, unknown>) => ({
    role: row.role as ChatMessage["role"],
    content: String(row.content || ""),
  }));
}

async function checkAndUpdateRateLimit(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  subscriptionTier: "free" | "premium" | "elite",
) {
  const limit = RATE_LIMITS[subscriptionTier];
  const today = new Date().toISOString().split("T")[0];

  const { data: usage } = await supabase
    .from("ai_usage_daily")
    .select("coach_messages")
    .eq("user_id", userId)
    .eq("usage_date", today)
    .maybeSingle();

  const currentUsage = usage?.coach_messages || 0;
  if (currentUsage >= limit) {
    return { allowed: false, used: currentUsage, limit };
  }

  await supabase.rpc("increment_ai_usage", {
    p_user_id: userId,
    p_usage_type: "coach_messages",
  });

  return { allowed: true, used: currentUsage + 1, limit };
}

function buildGroundingBlock(grounding: GroundingData) {
  const targets = grounding.targets
    ? `Targets: ${grounding.targets.calories} kcal, ${grounding.targets.protein_g}g protein, ${grounding.targets.carbs_g}g carbs, ${grounding.targets.fat_g}g fat, ${grounding.targets.water_ml}ml water.`
    : "Targets are not available yet.";

  const memory = grounding.memory.length
    ? grounding.memory
        .map((item) => `- ${item.memory_type}: ${item.title} -> ${item.body}`)
        .join("\n")
    : "- No high-priority memory stored yet.";

  return `
User context:
- Name: ${grounding.profile?.first_name || "unknown"}
- Unit system: ${grounding.profile?.unit_system || "imperial"}
- Today's calories: ${grounding.todayNutrition.calories}
- Today's protein: ${grounding.todayNutrition.protein}g
- Today's carbs: ${grounding.todayNutrition.carbs}g
- Today's fat: ${grounding.todayNutrition.fat}g
- Today's water: ${Math.round(grounding.todayWater)}ml
- Workout done today: ${grounding.todayWorkout.completed ? "yes" : "no"}
- Recent weight: ${grounding.recentWeight ? `${round(grounding.recentWeight, 1)}kg` : "unknown"}
- Prep mode: ${grounding.prepCoach.enabled ? `on (${grounding.prepCoach.discipline || "prep"} / ${grounding.prepCoach.phase || "phase"})` : "off"}
- Prep auto-adjust: ${grounding.prepCoach.autoAdjustEnabled ? "on" : "off"}
- Memory:
${memory}

${targets}
`.trim();
}

function buildSystemPrompt(grounding: GroundingData, intent: IntentClassification) {
  return `You are AI Coach inside MetriqFit.

Identity:
- You are a broad conversational assistant, not just a fitness FAQ bot.
- You are especially strong at fitness, nutrition, training, recovery, and app-specific coaching.
- You are grounded in the user's MetriqFit data and memory when it is relevant.

Response rules:
- Answer the direct question first.
- Do not force every question back into coaching.
- Use the user's app data as enrichment when it genuinely helps, not as a replacement for an answer.
- Keep replies concise, natural, and conversational.
- If the user greets you, greet them back like a normal assistant.
- If data is missing, say that clearly instead of inventing it.

Action rules:
- Do not claim to have changed anything unless the tool execution already happened.
- If a change needs approval, explain it briefly and let the inline proposal card carry the details.
- Never silently mutate plans or settings.

Safety rules:
- No medical diagnosis, treatment, or dangerous cutting advice.
- No steroid advice, no eating-disorder coaching, no extreme calorie prescriptions.
- If a question is unsafe or medical, redirect clearly to a professional.

Intent mode for this turn: ${intent.mode}

${buildGroundingBlock(grounding)}
`;
}

async function callOpenAIChat(
  apiKey: string,
  systemPrompt: string,
  messages: ChatMessage[],
): Promise<{ content: string; tokens: { input: number; output: number } }> {
  const model = Deno.env.get("AI_COACH_MODEL") || "gpt-4.1-mini";
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      max_tokens: 650,
      temperature: 0.45,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new OpenAIRequestError(`OpenAI API error: ${response.status}`, response.status, errorText);
  }

  const data = await response.json();
  return {
    content: data.choices?.[0]?.message?.content || "",
    tokens: {
      input: data.usage?.prompt_tokens || 0,
      output: data.usage?.completion_tokens || 0,
    },
  };
}

async function callOpenAIWebSearch(
  apiKey: string,
  systemPrompt: string,
  userMessage: string,
): Promise<{ content: string; sources: Array<{ title: string; url: string }> }> {
  const model = Deno.env.get("AI_COACH_WEB_MODEL") || "gpt-4.1-mini";
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "system",
          content: [{ type: "input_text", text: systemPrompt }],
        },
        {
          role: "user",
          content: [{ type: "input_text", text: userMessage }],
        },
      ],
      tools: [{ type: "web_search" }],
      max_output_tokens: 700,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new OpenAIRequestError(`OpenAI Responses API error: ${response.status}`, response.status, errorText);
  }

  const data = await response.json();
  const content = String(data.output_text || "").trim();
  const sources = extractWebSources(data);
  return { content, sources };
}

function buildDeterministicFallback(message: string, grounding: GroundingData, intent: IntentClassification) {
  const lower = message.toLowerCase().trim();
  const name = grounding.profile?.first_name?.trim();
  const proteinRemaining = grounding.targets
    ? max0(grounding.targets.protein_g - grounding.todayNutrition.protein)
    : null;
  const caloriesRemaining = grounding.targets
    ? max0(grounding.targets.calories - grounding.todayNutrition.calories)
    : null;

  if (/^\s*(hi|hello|hey|yo|what's up|good morning|good afternoon|good evening)[!.?\s]*$/i.test(message)) {
    return `${name ? `Hey ${name}.` : "Hey."} I'm here and ready. Ask me anything general, or ask about your plan, today's numbers, a change you want to make, or something current that needs live search.`;
  }

  if (intent.mode === "unsafe_or_restricted") {
    return "I can't help with dangerous dieting, self-harm, steroid use, or medical treatment decisions. I can help with safer training, nutrition structure, recovery, and when to involve a qualified clinician.";
  }

  if (/\bhow many calories\b/.test(lower) && /\bprotein\b/.test(lower)) {
    return "Protein has 4 calories per gram.";
  }

  if (/\bhow many calories\b/.test(lower) && /\bcarb|carbs\b/.test(lower)) {
    return "Carbohydrates have 4 calories per gram.";
  }

  if (/\bhow many calories\b/.test(lower) && /\bfat\b/.test(lower)) {
    return "Fat has 9 calories per gram.";
  }

  if (/\bhow many calories\b/.test(lower) && /\balcohol\b/.test(lower)) {
    return "Alcohol has 7 calories per gram.";
  }

  if (/\b(best|good|clean|healthy|ideal|top)\b/.test(lower) && /\bprotein|proteins\b/.test(lower)) {
    return [
      "The best protein is the one that gives you a lot of high-quality protein for the calories and fits your diet consistently.",
      "",
      "Top picks: chicken or turkey breast, fish, eggs or egg whites, lean beef, Greek yogurt or cottage cheese, whey/casein protein, tofu, tempeh, edamame, and lentils or beans if you are plant-based.",
      "",
      "For muscle and body composition, aim for roughly 25-45g protein per meal, prioritize complete proteins or varied plant proteins, and choose lower-fat options when calories are tight.",
      proteinRemaining && proteinRemaining > 0
        ? `Based on your current targets, you still have about ${proteinRemaining}g protein left today. A simple option would be chicken breast, Greek yogurt, tuna, egg whites, whey, tofu, or tempeh depending on what you prefer.`
        : null,
    ].filter(Boolean).join("\n");
  }

  if (/\b(protein gap|hit (my )?protein|more protein|close.*protein)\b/.test(lower)) {
    if (proteinRemaining !== null) {
      if (proteinRemaining <= 0) {
        return "You are already at or above your protein target today. Keep the rest of the day balanced and avoid forcing extra protein unless you are genuinely hungry.";
      }

      return [
        `You have about ${proteinRemaining}g protein left today${caloriesRemaining !== null ? ` with about ${caloriesRemaining} kcal left` : ""}.`,
        "",
        "Clean ways to close it: Greek yogurt, whey or casein, chicken breast, tuna, turkey, egg whites, cottage cheese, tofu, tempeh, or lean beef.",
        proteinRemaining <= 30
          ? "Since the gap is small, one protein shake, a Greek yogurt, or a lean single-serving protein should cover it."
          : "Since the gap is bigger, split it across two feedings so digestion and meal quality stay better.",
      ].join("\n");
    }

    return "Clean ways to add protein: Greek yogurt, whey or casein, chicken breast, tuna, turkey, egg whites, cottage cheese, tofu, tempeh, lean beef, or edamame. Use the option that fits your calories and preferences best.";
  }

  if (/\b(what should i eat|what can i eat|meal idea|food idea|hit my macros|hit macros)\b/.test(lower)) {
    if (grounding.targets) {
      const carbsRemaining = max0(grounding.targets.carbs_g - grounding.todayNutrition.carbs);
      const fatRemaining = max0(grounding.targets.fat_g - grounding.todayNutrition.fat);
      return [
        `For today, you have about ${caloriesRemaining} kcal, ${proteinRemaining}g protein, ${carbsRemaining}g carbs, and ${fatRemaining}g fat remaining.`,
        "",
        "A solid macro-balanced meal: lean protein plus a carb plus a small fat source. Example: chicken or tofu, rice or potatoes, vegetables, and olive oil or avocado.",
        "If protein is the main gap, choose a leaner protein first and add carbs/fats only as needed.",
      ].join("\n");
    }

    return "A reliable meal structure is lean protein plus a carb plus vegetables plus a small fat source. Examples: chicken/rice/vegetables, Greek yogurt/fruit, eggs/potatoes, tuna/rice cakes, or tofu/rice/vegetables.";
  }

  if (intent.mode === "coaching_qa" || intent.mode === "app_read") {
    if (grounding.targets) {
      return `You have ${caloriesRemaining} kcal and ${proteinRemaining}g protein left today. ${grounding.todayWorkout.completed ? "Today's workout is already logged." : "No workout is logged yet today."}`;
    }
    return "I can help, but I don't have your full targets available yet. If you log today's meal or open your targets, I can ground the next answer better.";
  }

  if (intent.mode === "web_freshness_needed") {
    return "I couldn't reach live web search right now. Retry in a moment and I'll pull fresh context instead of guessing.";
  }

  return "I couldn't reach live reasoning right now, but I can still help with basic fitness and nutrition guidance. Try asking a specific nutrition, training, recovery, or app-data question and I'll answer from the built-in coach logic until the live model is available again.";
}

async function getOrCreateThread(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  requestedThreadId: string | undefined,
  message: string,
) {
  if (requestedThreadId) {
    const { data } = await (supabase as any)
      .from("ai_coach_threads")
      .select("*")
      .eq("id", requestedThreadId)
      .eq("user_id", userId)
      .maybeSingle();

    if (data) return data;
  }

  const { data: latest } = await (supabase as any)
    .from("ai_coach_threads")
    .select("*")
    .eq("user_id", userId)
    .is("archived_at", null)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latest) return latest;

  const { data: created, error } = await (supabase as any)
    .from("ai_coach_threads")
    .insert({
      user_id: userId,
      title: titleFromMessage(message),
      title_source: "auto",
      last_message_preview: normalizedText(message),
    })
    .select("*")
    .single();

  if (error) throw error;
  return created;
}

async function updateThreadSummary(
  supabase: ReturnType<typeof createClient>,
  threadId: string,
  preview: string,
  intentMode?: string | null,
) {
  await (supabase as any)
    .from("ai_coach_threads")
    .update({
      last_message_preview: preview,
      last_intent_mode: intentMode || null,
      updated_at: nowIso(),
    })
    .eq("id", threadId);
}

async function insertUserMessage(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  threadId: string,
  message: string,
  intent: IntentClassification,
) {
  const { data, error } = await (supabase as any)
    .from("ai_coach_messages")
    .insert({
      user_id: userId,
      thread_id: threadId,
      role: "user",
      content: message,
      intent_mode: intent.mode,
      intent_confidence: intent.confidence,
      web_used: false,
      approval_required: intent.requiresApproval,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

async function insertAssistantMessage(
  supabase: ReturnType<typeof createClient>,
  input: {
    userId: string;
    threadId: string;
    content: string;
    attachments?: unknown[];
    tokens?: { input: number; output: number };
    intent: IntentClassification;
    toolCalls?: ToolCallRecord[];
    webUsed?: boolean;
    proposalId?: string | null;
    receiptId?: string | null;
    contextSnapshot?: Record<string, unknown> | null;
  },
) {
  const { data, error } = await (supabase as any)
    .from("ai_coach_messages")
    .insert({
      user_id: input.userId,
      thread_id: input.threadId,
      role: "assistant",
      content: input.content,
      attachments: input.attachments?.length ? input.attachments : null,
      tokens_input: input.tokens?.input || 0,
      tokens_output: input.tokens?.output || 0,
      model: Deno.env.get("AI_COACH_MODEL") || "gpt-4.1-mini",
      context_snapshot: input.contextSnapshot || null,
      intent_mode: input.intent.mode,
      intent_confidence: input.intent.confidence,
      tool_calls_json: input.toolCalls?.length ? input.toolCalls : null,
      web_used: input.webUsed === true,
      approval_required: input.intent.requiresApproval,
      proposal_id: input.proposalId || null,
      receipt_id: input.receiptId || null,
    })
    .select("*")
    .single();

  if (error) throw error;
  await updateThreadSummary(supabase, input.threadId, input.content, input.intent.mode);
  return data;
}

async function createMemoryItem(
  supabase: ReturnType<typeof createClient>,
  input: {
    userId: string;
    sourceMessageId?: string | null;
    threadId?: string | null;
    proposalId?: string | null;
    memoryType: string;
    title: string;
    body: string;
    priority?: number;
    metadata?: Record<string, unknown> | null;
    originType?: string;
    scope?: string;
  },
) {
  const { data } = await (supabase as any)
    .from("ai_coach_memory_items")
    .insert({
      user_id: input.userId,
      source_message_id: input.sourceMessageId || null,
      thread_id: input.threadId || null,
      proposal_id: input.proposalId || null,
      memory_type: input.memoryType,
      title: input.title,
      body: input.body,
      priority: input.priority || 50,
      metadata_json: input.metadata || null,
      origin_type: input.originType || "conversation",
      scope: input.scope || "conversation",
    })
    .select("*")
    .maybeSingle();

  return data || null;
}

async function createProposal(
  supabase: ReturnType<typeof createClient>,
  input: {
    userId: string;
    threadId: string;
    toolName: ToolName;
    toolInput: Record<string, unknown>;
    riskLevel: RiskLevel;
    summary: string;
  },
) {
  const { data, error } = await (supabase as any)
    .from("ai_coach_action_proposals")
    .insert({
      user_id: input.userId,
      thread_id: input.threadId,
      tool_name: input.toolName,
      tool_input_json: input.toolInput,
      risk_level: input.riskLevel,
      summary: input.summary,
      status: "pending",
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

async function createToolReceipt(
  supabase: ReturnType<typeof createClient>,
  input: {
    userId: string;
    threadId: string;
    proposalId?: string | null;
    toolName: ToolName;
    mutationLevel: MutationLevel;
    summary: string;
    metadata?: Record<string, unknown> | null;
  },
) {
  const { data, error } = await (supabase as any)
    .from("ai_coach_tool_receipts")
    .insert({
      user_id: input.userId,
      thread_id: input.threadId,
      proposal_id: input.proposalId || null,
      tool_name: input.toolName,
      mutation_level: input.mutationLevel,
      summary: input.summary,
      metadata_json: input.metadata || null,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

async function updateProposalAttachmentStatus(
  supabase: ReturnType<typeof createClient>,
  proposalId: string,
  assistantMessageId: string | null,
  nextStatus: ProposalStatus,
) {
  if (!assistantMessageId) return;

  const { data: message } = await (supabase as any)
    .from("ai_coach_messages")
    .select("attachments")
    .eq("id", assistantMessageId)
    .maybeSingle();

  if (!Array.isArray(message?.attachments)) return;

  const nextAttachments = message.attachments.map((attachment: Record<string, unknown>) => {
    const attachmentRecord = toRecord(attachment);
    if (!attachmentRecord) return attachment;
    const attachmentProposalId = toStringOrNull(attachmentRecord.proposalId || attachmentRecord.proposal_id);
    if (attachmentProposalId !== proposalId) return attachment;
    return { ...attachmentRecord, status: nextStatus };
  });

  await (supabase as any)
    .from("ai_coach_messages")
    .update({ attachments: nextAttachments })
    .eq("id", assistantMessageId);
}

async function executeTool(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  threadId: string,
  action: DetectedAction,
): Promise<ToolExecutionResult> {
  if (action.toolName === "log_water") {
    const amountMl = Number(action.input.amount_ml || 0);
    const { data, error } = await supabase
      .from("water_logs")
      .insert({
        user_id: userId,
        amount_ml: amountMl,
        logged_at: nowIso(),
      })
      .select("*")
      .single();

    if (error) throw error;
    return {
      success: true,
      content: `Logged ${amountMl}ml of water. That is in for today.`,
      user_safe_summary: `Added ${amountMl}ml to your hydration log.`,
      mutation_level: "low",
      tool_name: action.toolName,
      receipt_payload: { water_log_id: data.id, amount_ml: amountMl },
    };
  }

  if (action.toolName === "log_weight") {
    const weightKg = Number(action.input.weight_kg || 0);
    const loggedAt = nowIso();
    const { data, error } = await supabase
      .from("user_measurements")
      .insert({
        user_id: userId,
        weight_kg: weightKg,
        logged_at: loggedAt,
      })
      .select("*")
      .single();

    if (error) throw error;

    await supabase
      .from("profiles")
      .update({ current_weight_kg: weightKg, updated_at: loggedAt })
      .eq("id", userId);

    return {
      success: true,
      content: `Logged your weight at ${round(weightKg, 1)}kg.`,
      user_safe_summary: `Added a new weight entry at ${round(weightKg, 1)}kg.`,
      mutation_level: "low",
      tool_name: action.toolName,
      receipt_payload: { measurement_id: data.id, weight_kg: weightKg },
    };
  }

  if (action.toolName === "log_food_item") {
    const foodId = String(action.input.food_item_id || "");
    const grams = Number(action.input.grams || 0);
    const mealSlot = String(action.input.meal_slot || "snack");

    const { data: food, error: foodError } = await supabase
      .from("food_items")
      .select("*")
      .eq("id", foodId)
      .maybeSingle();

    if (foodError || !food) {
      throw new Error("Food item could not be found for logging");
    }

    const calories = Math.round(Number(food.calories_per_100g || 0) * grams / 100);
    const protein = round(Number(food.protein_per_100g || 0) * grams / 100, 1);
    const carbs = round(Number(food.carbs_per_100g || 0) * grams / 100, 1);
    const fat = round(Number(food.fat_per_100g || 0) * grams / 100, 1);

    const loggedAt = nowIso();
    const loggedDate = loggedAt.split("T")[0];

    const { data: existingMealLog } = await supabase
      .from("meal_logs")
      .select("id")
      .eq("user_id", userId)
      .eq("meal_slot", mealSlot)
      .gte("logged_at", `${loggedDate}T00:00:00`)
      .lte("logged_at", `${loggedDate}T23:59:59`)
      .maybeSingle();

    let mealLogId = existingMealLog?.id || null;

    if (!mealLogId) {
      const { data: newMealLog, error: mealLogError } = await supabase
        .from("meal_logs")
        .insert({
          user_id: userId,
          meal_slot: mealSlot,
          logged_at: loggedAt,
        })
        .select("id")
        .single();

      if (mealLogError || !newMealLog?.id) {
        throw new Error(mealLogError?.message || "Could not create meal log");
      }

      mealLogId = newMealLog.id;
    }

    const { data: mealLogItem, error: itemError } = await supabase
      .from("meal_log_items")
      .insert({
        meal_log_id: mealLogId,
        food_item_id: foodId,
        grams,
        calories,
        protein,
        carbs,
        fat,
      })
      .select("id")
      .single();

    if (itemError || !mealLogItem?.id) {
      throw new Error(itemError?.message || "Could not create meal log item");
    }

    return {
      success: true,
      content: `Logged ${grams}g of ${String(food.name)} to ${mealSlot}.`,
      user_safe_summary: `Added ${grams}g of ${String(food.name)} to ${mealSlot}.`,
      mutation_level: "low",
      tool_name: action.toolName,
      receipt_payload: {
        meal_log_id: mealLogId,
        meal_log_item_id: mealLogItem.id,
        food_item_id: foodId,
        grams,
        meal_slot: mealSlot,
      },
    };
  }

  if (action.toolName === "update_user_settings") {
    const setting = String(action.input.setting || "");
    const value = action.input.value;
    if (setting !== "unit_system" || (value !== "imperial" && value !== "metric")) {
      throw new Error("Unsupported settings change");
    }

    await supabase
      .from("profiles")
      .update({ unit_system: value, updated_at: nowIso() })
      .eq("id", userId);

    return {
      success: true,
      content: `Done. I'll use ${value} units for display going forward.`,
      user_safe_summary: `Changed your unit system to ${value}.`,
      mutation_level: "low",
      tool_name: action.toolName,
      receipt_payload: { setting: "unit_system", value },
      memory_item: {
        memoryType: "preference",
        title: "Preferred unit system",
        body: `Use ${value} units.`,
        scope: "settings",
        originType: "tool",
      },
    };
  }

  if (action.toolName === "save_memory_item") {
    const memoryRow = await createMemoryItem(supabase, {
      userId: userId,
      threadId,
      memoryType: String(action.input.memory_type || "summary"),
      title: String(action.input.title || "Remembered for coach context"),
      body: String(action.input.body || ""),
      priority: Number(action.input.priority || 55),
      originType: String(action.input.origin_type || "conversation"),
      scope: String(action.input.scope || "conversation"),
    });

    return {
      success: true,
      content: "Saved that. I'll keep it in mind in future coaching.",
      user_safe_summary: "Saved a new coach memory item.",
      mutation_level: "low",
      tool_name: action.toolName,
      receipt_payload: { memory_id: memoryRow?.id || null },
    };
  }

  if (action.toolName === "update_prep_settings") {
    const { data: existing } = await supabase
      .from("onboarding_answers")
      .select("id, answers")
      .eq("user_id", userId)
      .maybeSingle();

    const existingAnswers = (existing?.answers || {}) as Record<string, unknown>;
    const nextAnswers = {
      ...existingAnswers,
      ...action.input,
    };

    if (existing?.id) {
      await supabase
        .from("onboarding_answers")
        .update({ answers: nextAnswers, updated_at: nowIso() })
        .eq("id", existing.id);
    } else {
      await supabase
        .from("onboarding_answers")
        .insert({ user_id: userId, answers: nextAnswers });
    }

    if (action.input.prep_mode_enabled === false) {
      await (supabase as any)
        .from("prep_coach_cycles")
        .update({ is_active: false, updated_at: nowIso() })
        .eq("user_id", userId)
        .eq("is_active", true);
    }

    return {
      success: true,
      content: "Applied that prep setting change.",
      user_safe_summary: action.summary,
      mutation_level: "medium",
      tool_name: action.toolName,
      receipt_payload: action.input,
      memory_item: {
        memoryType: "summary",
        title: "Prep settings updated",
        body: action.summary,
        scope: "settings",
        originType: "tool",
      },
    };
  }

  if (action.toolName === "update_meal_plan") {
    const planId = String(action.input.plan_id || "");
    const dayOfWeek = Number(action.input.day_of_week);
    const meals = Array.isArray(action.input.meals) ? action.input.meals : [];

    for (const meal of meals) {
      const row = toRecord(meal);
      if (!row) continue;
      await (supabase as any)
        .from("user_nutrition_plan_meals")
        .update({
          name: row.name,
          description: row.description,
          target_calories: row.target_calories,
          target_protein: row.target_protein,
          target_carbs: row.target_carbs,
          target_fat: row.target_fat,
          prep_time_min: row.prep_time_min,
          is_user_modified: true,
        })
        .eq("plan_id", planId)
        .eq("day_of_week", dayOfWeek)
        .eq("meal_slot", row.meal_slot);
    }

    return {
      success: true,
      content: "Applied that meal-plan change.",
      user_safe_summary: action.summary,
      mutation_level: "medium",
      tool_name: action.toolName,
      receipt_payload: action.input,
      memory_item: {
        memoryType: "intervention",
        title: "Meal plan adjusted",
        body: action.summary,
        scope: "nutrition",
        originType: "tool",
      },
    };
  }

  if (action.toolName === "update_workout_plan") {
    if (action.input.operation === "add_exercise") {
      const planDayId = String(action.input.plan_day_id || "");
      const exerciseId = String(action.input.exercise_id || "");
      const exerciseName = String(action.input.exercise_name || "exercise");

      if (!planDayId || !exerciseId) {
        throw new Error("Missing workout day or exercise for plan update");
      }

      const { data: lastExercise, error: orderError } = await (supabase as any)
        .from("user_workout_plan_exercises")
        .select("order_index")
        .eq("plan_day_id", planDayId)
        .order("order_index", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (orderError) throw orderError;

      const nextOrderIndex = Number(lastExercise?.order_index || 0) + 1;
      const setsTarget = Number(action.input.sets_target || 3);
      const repsMin = Number(action.input.reps_min || 8);
      const repsMax = Number(action.input.reps_max || 12);
      const restSeconds = Number(action.input.rest_seconds || 90);

      const { data, error } = await (supabase as any)
        .from("user_workout_plan_exercises")
        .insert({
          plan_day_id: planDayId,
          exercise_id: exerciseId,
          order_index: nextOrderIndex,
          sets_target: Number.isFinite(setsTarget) ? setsTarget : 3,
          reps_min: Number.isFinite(repsMin) ? repsMin : 8,
          reps_max: Number.isFinite(repsMax) ? repsMax : 12,
          rest_seconds: Number.isFinite(restSeconds) ? restSeconds : 90,
          is_user_modified: true,
          original_exercise_id: exerciseId,
          user_notes: "Added by AI Coach after user approval.",
        })
        .select("id")
        .single();

      if (error || !data?.id) {
        throw new Error(error?.message || "Failed to add exercise to workout plan");
      }

      return {
        success: true,
        content: `Added ${exerciseName} to ${String(action.input.plan_day_name || "your workout day")}.`,
        user_safe_summary: `Added ${exerciseName} to ${String(action.input.plan_day_name || "your workout day")}.`,
        mutation_level: "medium",
        tool_name: action.toolName,
        receipt_payload: {
          operation: "add_exercise",
          plan_exercise_id: data.id,
          plan_day_id: planDayId,
          exercise_id: exerciseId,
          exercise_name: exerciseName,
        },
        memory_item: {
          memoryType: "intervention",
          title: "Exercise added to plan",
          body: action.summary,
          scope: "workout",
          originType: "tool",
        },
      };
    }

    await (supabase as any)
      .from("user_workout_plan_schedule")
      .update({
        session_type: action.input.next_session_type,
        notes: action.input.notes,
      })
      .eq("id", action.input.schedule_entry_id);

    return {
      success: true,
      content: "Applied that workout schedule change.",
      user_safe_summary: action.summary,
      mutation_level: "medium",
      tool_name: action.toolName,
      receipt_payload: action.input,
      memory_item: {
        memoryType: "intervention",
        title: "Workout schedule adjusted",
        body: action.summary,
        scope: "workout",
        originType: "tool",
      },
    };
  }

  throw new Error(`Unsupported tool: ${action.toolName}`);
}

async function handleProposalDecision(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  proposalId: string,
  decision: "approved" | "rejected",
) {
  const { data: proposal, error } = await (supabase as any)
    .from("ai_coach_action_proposals")
    .select("*")
    .eq("id", proposalId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !proposal) {
    return jsonResponse({ error: "Proposal not found" }, 404);
  }

  if (proposal.status !== "pending") {
    return jsonResponse({ error: "Proposal is no longer pending" }, 409);
  }

  if (decision === "rejected") {
    await (supabase as any)
      .from("ai_coach_action_proposals")
      .update({
        status: "rejected",
        rejected_at: nowIso(),
        updated_at: nowIso(),
      })
      .eq("id", proposalId);

    await updateProposalAttachmentStatus(supabase, proposalId, proposal.source_message_id, "rejected");

    const receipt = await createToolReceipt(supabase, {
      userId,
      threadId: proposal.thread_id,
      proposalId,
      toolName: proposal.tool_name,
      mutationLevel: "none",
      summary: "Change not applied.",
      metadata: { status: "rejected" },
    });

    const assistant = await insertAssistantMessage(supabase, {
      userId,
      threadId: proposal.thread_id,
      content: "Okay. I did not apply that change.",
      attachments: [
        buildToolReceiptAttachment(receipt.id, proposal.tool_name, "Change skipped", "Change not applied.", "none", { proposal_id: proposalId }),
      ],
      intent: {
        mode: "app_mutation",
        confidence: 0.95,
        requiresWeb: false,
        requiresApproval: false,
        requiresClarification: false,
      },
      toolCalls: [{
        tool_name: proposal.tool_name,
        input: (proposal.tool_input_json || {}) as Record<string, unknown>,
        mutation_level: "none",
        status: "executed",
      }],
      receiptId: receipt.id,
    });

    return jsonResponse({
      id: assistant.id,
      thread_id: proposal.thread_id,
      content: assistant.content,
      attachments: assistant.attachments,
      created_at: assistant.created_at,
      intent_classification: {
        mode: "app_mutation",
        confidence: 0.95,
        requiresWeb: false,
        requiresApproval: false,
        requiresClarification: false,
      },
      tool_calls: assistant.tool_calls_json || [],
      web_used: false,
      action_proposals: [],
      tool_receipts: [{ id: receipt.id, tool_name: receipt.tool_name, summary: receipt.summary }],
      approval_required: false,
    });
  }

  const action: DetectedAction = {
    toolName: proposal.tool_name as ToolName,
    riskLevel: proposal.risk_level as RiskLevel,
    mutationLevel: proposal.risk_level === "low" ? "low" : "medium",
    title: proposal.summary,
    summary: proposal.summary,
    input: (proposal.tool_input_json || {}) as Record<string, unknown>,
    canAutoApply: false,
  };

  try {
    const execution = await executeTool(supabase, userId, proposal.thread_id, action);
    const receipt = await createToolReceipt(supabase, {
      userId,
      threadId: proposal.thread_id,
      proposalId,
      toolName: action.toolName,
      mutationLevel: execution.mutation_level,
      summary: execution.user_safe_summary,
      metadata: execution.receipt_payload,
    });

    await (supabase as any)
      .from("ai_coach_action_proposals")
      .update({
        status: "executed",
        approved_at: nowIso(),
        executed_at: nowIso(),
        updated_at: nowIso(),
        receipt_json: execution.receipt_payload || null,
      })
      .eq("id", proposalId);

    await updateProposalAttachmentStatus(supabase, proposalId, proposal.source_message_id, "executed");

    if (execution.memory_item) {
      await createMemoryItem(supabase, {
        userId,
        threadId: proposal.thread_id,
        proposalId,
        sourceMessageId: proposal.source_message_id,
        memoryType: String(execution.memory_item.memoryType || "intervention"),
        title: String(execution.memory_item.title || action.title),
        body: String(execution.memory_item.body || action.summary),
        priority: 70,
        scope: String(execution.memory_item.scope || "conversation"),
        originType: String(execution.memory_item.originType || "tool"),
      });
    }

    const assistant = await insertAssistantMessage(supabase, {
      userId,
      threadId: proposal.thread_id,
      content: execution.content,
      attachments: [
        buildToolReceiptAttachment(receipt.id, action.toolName, "Action applied", execution.user_safe_summary, execution.mutation_level, execution.receipt_payload || null),
      ],
      intent: {
        mode: "app_mutation",
        confidence: 0.97,
        requiresWeb: false,
        requiresApproval: false,
        requiresClarification: false,
      },
      toolCalls: [{
        tool_name: action.toolName,
        input: action.input,
        mutation_level: execution.mutation_level,
        status: "executed",
      }],
      receiptId: receipt.id,
    });

    return jsonResponse({
      id: assistant.id,
      thread_id: proposal.thread_id,
      content: assistant.content,
      attachments: assistant.attachments,
      created_at: assistant.created_at,
      intent_classification: {
        mode: "app_mutation",
        confidence: 0.97,
        requiresWeb: false,
        requiresApproval: false,
        requiresClarification: false,
      },
      tool_calls: assistant.tool_calls_json || [],
      web_used: false,
      action_proposals: [],
      tool_receipts: [{ id: receipt.id, tool_name: receipt.tool_name, summary: receipt.summary }],
      approval_required: false,
    });
  } catch (toolError) {
    await (supabase as any)
      .from("ai_coach_action_proposals")
      .update({
        status: "failed",
        approved_at: nowIso(),
        updated_at: nowIso(),
      })
      .eq("id", proposalId);

    await updateProposalAttachmentStatus(supabase, proposalId, proposal.source_message_id, "failed");

    return jsonResponse({
      error: "Failed to execute approved action",
      details: (toolError as Error).message,
    }, 500);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Use POST" }, 405);
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });

  const { data: authData, error: authError } = await verifyClerkRequest(req);
  if (authError || !authData?.user) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const userId = body.user_id || body.userId;
  if (!userId || userId !== authData.user.id) {
    return jsonResponse({ error: "user_id mismatch" }, 403);
  }

  if (body.approved_proposal_id) {
    return handleProposalDecision(supabase, userId, body.approved_proposal_id, "approved");
  }

  if (body.rejected_proposal_id) {
    return handleProposalDecision(supabase, userId, body.rejected_proposal_id, "rejected");
  }

  const message = body.message?.trim();
  if (!message) {
    return jsonResponse({ error: "message is required" }, 400);
  }

  if (message.length > 2000) {
    return jsonResponse({ error: "Message too long (max 2000 characters)" }, 400);
  }

  try {
    const grounding = await fetchGroundingData(supabase, userId);
    const intent = classifyIntent(message);
    const thread = await getOrCreateThread(supabase, userId, body.thread_id, message);

    const rateLimit = await checkAndUpdateRateLimit(supabase, userId, grounding.subscriptionTier);
    if (!rateLimit.allowed) {
      return jsonResponse({
        error: "Rate limit exceeded",
        rate_limit: {
          used: rateLimit.used,
          limit: grounding.subscriptionTier === "elite" ? -1 : rateLimit.limit,
          resets_at: new Date(new Date().setUTCHours(24, 0, 0, 0)).toISOString(),
        },
      }, 429);
    }

    const userMessageRow = await insertUserMessage(supabase, userId, thread.id, message, intent);

    const recentMessages = await getRecentMessages(supabase, userId, thread.id, 10);
    const { action, clarification } = body.allow_actions === false
      ? { action: null, clarification: null }
      : await detectAction(supabase, userId, message, grounding);

    const baseAttachments: unknown[] = [];
    const titleHint = buildConversationTitleHint(message);
    if (titleHint.title !== thread.title && thread.title === "New coach chat") {
      await (supabase as any)
        .from("ai_coach_threads")
        .update({ title: titleHint.title, title_source: "auto" })
        .eq("id", thread.id);
    }

    if (intent.mode === "unsafe_or_restricted") {
      const assistant = await insertAssistantMessage(supabase, {
        userId,
        threadId: thread.id,
        content: "I’m not the right tool for medical or unsafe guidance. A licensed clinician or registered dietitian is the right person for that call.",
        attachments: [titleHint],
        intent,
        toolCalls: [],
      });

      return jsonResponse({
        id: assistant.id,
        thread_id: thread.id,
        content: assistant.content,
        attachments: assistant.attachments,
        created_at: assistant.created_at,
        intent_classification: intent,
        tool_calls: [],
        web_used: false,
        action_proposals: [],
        tool_receipts: [],
        approval_required: false,
      });
    }

    if (clarification) {
      const assistant = await insertAssistantMessage(supabase, {
        userId,
        threadId: thread.id,
        content: toStringOrNull((clarification as Record<string, unknown>).prompt) || "I need one more detail before I can do that safely.",
        attachments: [clarification, titleHint],
        intent: {
          ...intent,
          requiresClarification: true,
        },
        toolCalls: [],
      });

      return jsonResponse({
        id: assistant.id,
        thread_id: thread.id,
        content: assistant.content,
        attachments: assistant.attachments,
        created_at: assistant.created_at,
        intent_classification: { ...intent, requiresClarification: true },
        tool_calls: [],
        web_used: false,
        action_proposals: [],
        tool_receipts: [],
        approval_required: false,
      });
    }

    if (action && action.canAutoApply && body.allow_auto_apply !== false) {
      const execution = await executeTool(supabase, userId, thread.id, action);
      const receipt = await createToolReceipt(supabase, {
        userId,
        threadId: thread.id,
        toolName: action.toolName,
        mutationLevel: execution.mutation_level,
        summary: execution.user_safe_summary,
        metadata: execution.receipt_payload || null,
      });

      if (execution.memory_item) {
        await createMemoryItem(supabase, {
          userId,
          sourceMessageId: userMessageRow.id,
          threadId: thread.id,
          memoryType: String(execution.memory_item.memoryType || "summary"),
          title: String(execution.memory_item.title || action.title),
          body: String(execution.memory_item.body || action.summary),
          priority: 60,
          scope: String(execution.memory_item.scope || "conversation"),
          originType: String(execution.memory_item.originType || "tool"),
        });
      }

      const attachments = [
        buildToolReceiptAttachment(receipt.id, action.toolName, action.title, execution.user_safe_summary, execution.mutation_level, execution.receipt_payload || null),
        titleHint,
      ];

      const assistant = await insertAssistantMessage(supabase, {
        userId,
        threadId: thread.id,
        content: execution.content,
        attachments,
        intent: {
          mode: "app_mutation",
          confidence: 0.95,
          requiresWeb: false,
          requiresApproval: false,
          requiresClarification: false,
        },
        toolCalls: [{
          tool_name: action.toolName,
          input: action.input,
          mutation_level: execution.mutation_level,
          status: "executed",
        }],
        receiptId: receipt.id,
      });

      return jsonResponse({
        id: assistant.id,
        thread_id: thread.id,
        content: assistant.content,
        attachments,
        created_at: assistant.created_at,
        intent_classification: {
          mode: "app_mutation",
          confidence: 0.95,
          requiresWeb: false,
          requiresApproval: false,
          requiresClarification: false,
        },
        tool_calls: assistant.tool_calls_json || [],
        web_used: false,
        action_proposals: [],
        tool_receipts: [{ id: receipt.id, tool_name: receipt.tool_name, summary: receipt.summary }],
        memory_items: execution.memory_item ? [execution.memory_item] : [],
        approval_required: false,
      });
    }

    if (action) {
      const proposal = await createProposal(supabase, {
        userId,
        threadId: thread.id,
        toolName: action.toolName,
        toolInput: action.input,
        riskLevel: action.riskLevel,
        summary: action.summary,
      });

      const proposalAttachment = buildProposalAttachment(proposal.id, action);
      const attachments = [proposalAttachment, titleHint];
      const contextAttachment = buildContextAttachment(grounding);
      if (contextAttachment) attachments.push(contextAttachment);

      const assistant = await insertAssistantMessage(supabase, {
        userId,
        threadId: thread.id,
        content: `I can make that change. Review it below first, then approve it if you want me to apply it.`,
        attachments,
        intent: {
          mode: "app_mutation",
          confidence: 0.9,
          requiresWeb: false,
          requiresApproval: true,
          requiresClarification: false,
        },
        toolCalls: [{
          tool_name: action.toolName,
          input: action.input,
          mutation_level: action.mutationLevel,
          status: "proposed",
        }],
        proposalId: proposal.id,
      });

      await (supabase as any)
        .from("ai_coach_action_proposals")
        .update({ source_message_id: assistant.id })
        .eq("id", proposal.id);

      return jsonResponse({
        id: assistant.id,
        thread_id: thread.id,
        content: assistant.content,
        attachments,
        created_at: assistant.created_at,
        intent_classification: {
          mode: "app_mutation",
          confidence: 0.9,
          requiresWeb: false,
          requiresApproval: true,
          requiresClarification: false,
        },
        tool_calls: assistant.tool_calls_json || [],
        web_used: false,
        action_proposals: [{ id: proposal.id, tool_name: proposal.tool_name, summary: proposal.summary }],
        tool_receipts: [],
        approval_required: true,
      });
    }

    const systemPrompt = buildSystemPrompt(grounding, intent);
    const conversation = [...recentMessages, { role: "user", content: message } as ChatMessage];

    let content = "";
    let tokens = { input: 0, output: 0 };
    let webUsed = false;
    let webSources: Array<{ title: string; url: string }> = [];

    try {
      if (intent.requiresWeb && body.allow_web !== false && OPENAI_API_KEY) {
        const webReply = await callOpenAIWebSearch(OPENAI_API_KEY, systemPrompt, message);
        content = webReply.content;
        webSources = webReply.sources;
        webUsed = true;
      } else if (OPENAI_API_KEY) {
        const chatReply = await callOpenAIChat(OPENAI_API_KEY, systemPrompt, conversation);
        content = chatReply.content;
        tokens = chatReply.tokens;
      } else {
        content = buildDeterministicFallback(message, grounding, intent);
      }
    } catch (openAiError) {
      console.warn("AI Coach fallback triggered", openAiError);
      content = buildDeterministicFallback(message, grounding, intent);
    }

    if (!content.trim()) {
      content = buildDeterministicFallback(message, grounding, intent);
    }

    const followUp = buildFollowUpAttachment(grounding);
    const contextAttachment = intent.mode === "general_qa" ? null : buildContextAttachment(grounding);
    if (followUp) baseAttachments.push(followUp);
    if (contextAttachment) baseAttachments.push(contextAttachment);
    if (webUsed && webSources.length > 0) {
      baseAttachments.push(buildWebSummaryAttachment(message, "Used live web search for a freshness-sensitive answer.", webSources));
    }
    baseAttachments.push(titleHint);

    const memoryAction = parseMemorySaveAction(message);
    if (memoryAction && memoryAction.toolName === "save_memory_item") {
      const memoryRow = await createMemoryItem(supabase, {
        userId,
        sourceMessageId: userMessageRow.id,
        threadId: thread.id,
        memoryType: String(memoryAction.input.memory_type || "summary"),
        title: String(memoryAction.input.title || "Remembered for coach context"),
        body: String(memoryAction.input.body || message),
        priority: Number(memoryAction.input.priority || 55),
        scope: String(memoryAction.input.scope || "conversation"),
        originType: String(memoryAction.input.origin_type || "conversation"),
      });

      if (memoryRow) {
        baseAttachments.push({
          type: "memory_item",
          memoryType: memoryRow.memory_type,
          title: memoryRow.title,
          body: memoryRow.body,
          priority: memoryRow.priority,
        });
      }
    }

    const assistant = await insertAssistantMessage(supabase, {
      userId,
      threadId: thread.id,
      content,
      attachments: baseAttachments,
      tokens,
      intent,
      toolCalls: webUsed
        ? [{
            tool_name: "search_web",
            input: { query: message },
            mutation_level: "none",
            status: "executed",
          }]
        : [],
      webUsed,
      contextSnapshot: body.context || null,
    });

    return jsonResponse({
      id: assistant.id,
      thread_id: thread.id,
      user_id: userId,
      role: "assistant",
      content,
      attachments: baseAttachments,
      created_at: assistant.created_at,
      intent_classification: intent,
      tool_calls: assistant.tool_calls_json || [],
      web_used: webUsed,
      action_proposals: [],
      tool_receipts: [],
      memory_items: baseAttachments.filter((item) => toRecord(item)?.type === "memory_item"),
      title_hint: titleHint.title,
      approval_required: false,
      rate_limit: {
        used: rateLimit.used,
        limit: grounding.subscriptionTier === "elite" ? -1 : rateLimit.limit,
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
