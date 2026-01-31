// supabase/functions/generate-user-plans/index.ts
// Purpose: Generate personalized workout and/or nutrition plans using GPT-4
//
// Security: Uses service role for database operations, requires auth
//
// Request JSON:
// {
//   "user_id": "uuid",           // Required
//   "plan_type": "workout" | "nutrition" | "both"  // Default: "both"
// }
//
// Returns:
// {
//   success: true,
//   workout_plan_id?: string,
//   nutrition_plan_id?: string,
//   run_id: string
// }

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

// ===========================================
// TYPES
// ===========================================

type PlanType = "workout" | "nutrition" | "both";

interface UserContext {
  profile: {
    first_name: string | null;
    sex: string | null;
    date_of_birth: string | null;
    height_cm: number | null;
    current_weight_kg: number | null;
    unit_system: string;
  };
  onboarding: {
    fitness_goal: string;
    experience_level: string;
    days_per_week: number;
    available_equipment: string[];
    injuries: string[];
    dietary_preferences: string[];
    allergies: string[];
  };
  targets: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    water_ml: number;
  };
  availableExercises: Array<{
    id: string;
    name: string;
    category: string;
    equipment_required: string[];
    primary_muscle: string;
    pattern: string;
    difficulty: string;
    is_compound: boolean;
  }>;
}

interface WorkoutPlanDay {
  day_number: number;
  name: string;
  focus: string;
  exercises: Array<{
    exercise_id: string;
    order_index: number;
    sets_target: number;
    reps_min: number;
    reps_max: number;
    rest_seconds: number;
    tempo?: string;
  }>;
}

interface WorkoutPlanResponse {
  name: string;
  description: string;
  days_per_week: number;
  total_weeks: number;
  days: WorkoutPlanDay[];
}

interface NutritionPlanResponse {
  name: string;
  description: string;
  meal_structure: { slots: string[] };
  macro_distribution: Record<string, number>;
  sample_meals: Array<{
    meal_slot: string;
    day_of_week: number;
    name: string;
    description: string;
    target_calories: number;
    target_protein: number;
    target_carbs: number;
    target_fat: number;
    prep_time_min: number;
  }>;
}

interface AIResponse {
  workout_plan?: WorkoutPlanResponse;
  nutrition_plan?: NutritionPlanResponse;
}

// ===========================================
// DATA FETCHING
// ===========================================

async function fetchUserContext(
  supabase: SupabaseClient,
  userId: string,
  planType: PlanType
): Promise<UserContext> {
  // Fetch all data in parallel
  const [profileRes, onboardingRes, targetsRes, exercisesRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).single(),
    supabase.from("onboarding_answers").select("answers").eq("user_id", userId).single(),
    supabase.from("user_targets").select("*").eq("user_id", userId).single(),
    planType !== "nutrition"
      ? supabase
        .from("exercises")
        .select("id, name, category, equipment_required, primary_muscle, pattern, difficulty, is_compound")
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (profileRes.error) throw new Error(`Profile not found: ${profileRes.error.message}`);
  if (onboardingRes.error) throw new Error(`Onboarding not found: ${onboardingRes.error.message}`);
  if (targetsRes.error) throw new Error(`Targets not found: ${targetsRes.error.message}`);
  if (exercisesRes.error) throw new Error(`Failed to fetch exercises: ${exercisesRes.error.message}`);

  const profile = profileRes.data;
  const answers = onboardingRes.data.answers as Record<string, unknown>;
  const targets = targetsRes.data;
  const allExercises = exercisesRes.data || [];

  // Parse onboarding answers - FIX: Use actual field names from OnboardingData
  // Convert equipment_access (single value) to available_equipment array
  const equipmentAccess = answers.equipment_access as string | undefined;
  const availableEquipment = equipmentAccess ? [equipmentAccess] : ["bodyweight"];

  // Parse injuries array (correct field name)
  const injuries = (answers.injuries as string[]) || [];

  // Convert dietary_preference (singular) to dietary_preferences array
  const dietaryPref = answers.dietary_preference as string | undefined;
  const dietaryPreferences = dietaryPref ? [dietaryPref] : [];

  // Parse allergies_exclusions array (correct field name)
  const allergies = (answers.allergies_exclusions as string[]) || [];

  // Filter exercises based on user's equipment
  const equipmentSet = new Set(availableEquipment.map((e) => e.toLowerCase()));
  equipmentSet.add("bodyweight"); // Everyone can do bodyweight
  equipmentSet.add("none"); // No equipment needed

  const availableExercises = allExercises.filter((ex) => {
    const required = ex.equipment_required || [];
    if (required.length === 0) return true;
    return required.every((eq: string) => equipmentSet.has(eq.toLowerCase()));
  });

  return {
    profile: {
      first_name: profile.first_name,
      sex: profile.sex,
      date_of_birth: profile.date_of_birth,
      height_cm: profile.height_cm,
      current_weight_kg: profile.current_weight_kg,
      unit_system: profile.unit_system || "imperial",
    },
    onboarding: {
      // FIX: Map correct field names from OnboardingData
      fitness_goal: (answers.goal_type as string) || "general_fitness",
      experience_level: (answers.experience_level as string) || "beginner",
      days_per_week: (answers.training_days_per_week as number) || 3,
      available_equipment: availableEquipment,
      injuries: injuries,
      dietary_preferences: dietaryPreferences,
      allergies: allergies,
    },
    targets: {
      calories: targets.calories,
      protein_g: targets.protein_g,
      carbs_g: targets.carbs_g,
      fat_g: targets.fat_g,
      water_ml: targets.water_ml,
    },
    availableExercises,
  };

  // SAFETY NET: If valid exercises are too few (< 5), force include "Bodyweight" exercises
  if (availableExercises.length < 5 && planType !== "nutrition") {
    console.log(`[generate-user-plans] Warning: Only ${availableExercises.length} exercises available. Fetching fallback bodyweight exercises.`);

    // Fetch generic bodyweight exercises
    const { data: bodyweightExercises } = await supabase
      .from("exercises")
      .select("id, name, category, equipment_required, primary_muscle, pattern, difficulty, is_compound")
      .contains('equipment_required', ['bodyweight'])
      .limit(20);

    if (bodyweightExercises && bodyweightExercises.length > 0) {
      // Add non-duplicates
      const existingIds = new Set(availableExercises.map(e => e.id));
      for (const ex of bodyweightExercises) {
        if (!existingIds.has(ex.id)) {
          availableExercises.push(ex);
        }
      }
    }
  }

  return {
    profile: {
      first_name: profile.first_name,
      sex: profile.sex,
      date_of_birth: profile.date_of_birth,
      height_cm: profile.height_cm,
      current_weight_kg: profile.current_weight_kg,
      unit_system: profile.unit_system || "imperial",
    },
    onboarding: {
      // FIX: Map correct field names from OnboardingData
      fitness_goal: (answers.goal_type as string) || "general_fitness",
      experience_level: (answers.experience_level as string) || "beginner",
      days_per_week: (answers.training_days_per_week as number) || 3,
      available_equipment: availableEquipment,
      injuries: injuries,
      dietary_preferences: dietaryPreferences,
      allergies: allergies,
    },
    targets: {
      calories: targets.calories,
      protein_g: targets.protein_g,
      carbs_g: targets.carbs_g,
      fat_g: targets.fat_g,
      water_ml: targets.water_ml,
    },
    availableExercises,
  };
}

// ===========================================
// AI PROMPT BUILDING
// ===========================================

function buildSystemPrompt(context: UserContext, planType: PlanType): string {
  const age = context.profile.date_of_birth
    ? Math.floor((Date.now() - new Date(context.profile.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null;

  let prompt = `You are MetriqFit's AI plan generator. Create personalized, safe, and effective plans.

USER PROFILE:
- Name: ${context.profile.first_name || "User"}
- Sex: ${context.profile.sex || "not specified"}
- Age: ${age || "not specified"}
- Weight: ${context.profile.current_weight_kg ? `${context.profile.current_weight_kg} kg` : "not specified"}
- Height: ${context.profile.height_cm ? `${context.profile.height_cm} cm` : "not specified"}

FITNESS CONTEXT:
- Goal: ${context.onboarding.fitness_goal}
- Experience: ${context.onboarding.experience_level}
- Days per week: ${context.onboarding.days_per_week}
- Equipment: ${context.onboarding.available_equipment.join(", ")}
- Injuries/Limitations: ${context.onboarding.injuries.length > 0 ? context.onboarding.injuries.join(", ") : "None reported"}

NUTRITION TARGETS (per day):
- Calories: ${context.targets.calories} kcal
- Protein: ${context.targets.protein_g}g
- Carbs: ${context.targets.carbs_g}g
- Fat: ${context.targets.fat_g}g
- Water: ${context.targets.water_ml} ml

DIETARY PREFERENCES: ${context.onboarding.dietary_preferences.length > 0 ? context.onboarding.dietary_preferences.join(", ") : "None specified"}
ALLERGIES: ${context.onboarding.allergies.length > 0 ? context.onboarding.allergies.join(", ") : "None reported"}

CRITICAL RULES:
1. SAFETY FIRST: Never prescribe exercises that conflict with reported injuries
2. PROGRESSIVE: Start appropriate for experience level, allow room to progress
3. BALANCED: Include all major movement patterns (push, pull, hinge, squat, carry)
4. REALISTIC: Plans must be achievable with stated equipment and time`;

  if (planType === "workout" || planType === "both") {
    prompt += `

AVAILABLE EXERCISES (ONLY use IDs from this list):
${JSON.stringify(
      context.availableExercises.map((e) => ({
        id: e.id,
        name: e.name,
        category: e.category,
        muscle: e.primary_muscle,
        pattern: e.pattern,
      })),
      null,
      2
    )}

WORKOUT PLAN REQUIREMENTS:
- Create exactly ${context.onboarding.days_per_week} workout days
- Each day should have 4-8 exercises
- Use a logical split (e.g., push/pull/legs or upper/lower)
- Include warmup considerations in descriptions
- Rep ranges should match the goal:
  * Strength: 3-6 reps, 3-5 sets
  * Hypertrophy: 8-12 reps, 3-4 sets
  * Endurance: 12-20 reps, 2-3 sets
- Rest periods:
  * Compound movements: 90-180 seconds
  * Isolation movements: 60-90 seconds`;
  }

  if (planType === "nutrition" || planType === "both") {
    prompt += `

NUTRITION PLAN REQUIREMENTS:
- Create meal suggestions for each slot: breakfast, lunch, dinner, snack
- Macro distribution should roughly follow:
  * Breakfast: 25% of daily targets
  * Lunch: 35% of daily targets
  * Dinner: 30% of daily targets
  * Snack: 10% of daily targets
- Respect dietary preferences and allergies
- Focus on whole foods, realistic prep times
- Each meal should have estimated macros`;
  }

  return prompt;
}

function buildUserPrompt(planType: PlanType): string {
  const requestedPlans: string[] = [];
  if (planType === "workout" || planType === "both") requestedPlans.push("workout_plan");
  if (planType === "nutrition" || planType === "both") requestedPlans.push("nutrition_plan");

  return `Generate a personalized ${planType === "both" ? "workout and nutrition" : planType} plan.

Return ONLY valid JSON matching this exact structure:
{
  ${planType === "workout" || planType === "both"
      ? `"workout_plan": {
    "name": "string - descriptive plan name",
    "description": "string - 2-3 sentence overview",
    "days_per_week": number,
    "total_weeks": number (4-12),
    "days": [
      {
        "day_number": 1,
        "name": "string - e.g., Upper Body Push",
        "focus": "string - primary focus",
        "exercises": [
          {
            "exercise_id": "uuid from available exercises - MUST exist in provided list",
            "order_index": 1,
            "sets_target": 3-5,
            "reps_min": number,
            "reps_max": number (>= reps_min),
            "rest_seconds": 60-180,
            "tempo": "optional string e.g., 2-1-2"
          }
        ]
      }
    ]
  }${planType === "both" ? "," : ""}`
      : ""
    }
  ${planType === "nutrition" || planType === "both"
      ? `"nutrition_plan": {
    "name": "string - descriptive plan name",
    "description": "string - 2-3 sentence overview",
    "meal_structure": { "slots": ["breakfast", "lunch", "dinner", "snack"] },
    "macro_distribution": { "breakfast": 25, "lunch": 35, "dinner": 30, "snack": 10 },
    "sample_meals": [
      {
        "meal_slot": "breakfast" | "lunch" | "dinner" | "snack",
        "day_of_week": 0-6,
        "name": "string",
        "description": "string - brief description and ingredients",
        "target_calories": number,
        "target_protein": number,
        "target_carbs": number,
        "target_fat": number,
        "prep_time_min": number
      }
    ]
  }`
      : ""
    }
}

IMPORTANT: Only use exercise_id values from the AVAILABLE EXERCISES list provided. Do not invent IDs.`;
}

// ===========================================
// OPENAI CALL
// ===========================================

async function callOpenAI(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string
): Promise<{ response: AIResponse; tokens: number }> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4-turbo-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 4000,
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`OpenAI API error: ${res.status} - ${error}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  const tokens = data.usage?.total_tokens || 0;

  if (!content) {
    throw new Error("Empty response from OpenAI");
  }

  try {
    const parsed = JSON.parse(content) as AIResponse;
    return { response: parsed, tokens };
  } catch (e) {
    throw new Error(`Failed to parse AI response as JSON: ${(e as Error).message}`);
  }
}

// ===========================================
// VALIDATION
// ===========================================

function validateWorkoutPlan(
  plan: WorkoutPlanResponse,
  availableExerciseIds: Set<string>
): string[] {
  const errors: string[] = [];

  if (!plan.name) errors.push("Workout plan missing name");
  if (!plan.days || !Array.isArray(plan.days)) errors.push("Workout plan missing days array");

  for (const day of plan.days || []) {
    if (!day.exercises || !Array.isArray(day.exercises)) {
      errors.push(`Day ${day.day_number} missing exercises array`);
      continue;
    }

    for (const ex of day.exercises) {
      if (!ex.exercise_id) {
        errors.push(`Day ${day.day_number} has exercise without ID`);
      } else if (!availableExerciseIds.has(ex.exercise_id)) {
        errors.push(`Invalid exercise_id: ${ex.exercise_id} not in available exercises`);
      }

      if (ex.reps_max < ex.reps_min) {
        errors.push(`Day ${day.day_number} exercise has reps_max < reps_min`);
      }
    }
  }

  return errors;
}

function validateNutritionPlan(plan: NutritionPlanResponse): string[] {
  const errors: string[] = [];

  if (!plan.name) errors.push("Nutrition plan missing name");
  if (!plan.sample_meals || !Array.isArray(plan.sample_meals)) {
    errors.push("Nutrition plan missing sample_meals array");
  }

  const validSlots = new Set(["breakfast", "lunch", "dinner", "snack"]);
  for (const meal of plan.sample_meals || []) {
    if (!validSlots.has(meal.meal_slot)) {
      errors.push(`Invalid meal_slot: ${meal.meal_slot}`);
    }
  }

  return errors;
}

// ===========================================
// PLAN STORAGE
// ===========================================

async function storeWorkoutPlan(
  supabase: SupabaseClient,
  userId: string,
  runId: string,
  plan: WorkoutPlanResponse
): Promise<string> {
  // Get next version number
  const { data: existingPlans } = await supabase
    .from("user_workout_plans")
    .select("version")
    .eq("user_id", userId)
    .order("version", { ascending: false })
    .limit(1);

  const nextVersion = existingPlans && existingPlans.length > 0 ? existingPlans[0].version + 1 : 1;

  // Create the plan
  const { data: createdPlan, error: planError } = await supabase
    .from("user_workout_plans")
    .insert({
      user_id: userId,
      generation_run_id: runId,
      version: nextVersion,
      is_active: true, // Trigger will deactivate others
      name: plan.name,
      description: plan.description,
      days_per_week: plan.days_per_week,
      total_weeks: plan.total_weeks,
    })
    .select("id")
    .single();

  if (planError) throw new Error(`Failed to create workout plan: ${planError.message}`);
  const planId = createdPlan.id;

  // Create days
  for (const day of plan.days) {
    const { data: createdDay, error: dayError } = await supabase
      .from("user_workout_plan_days")
      .insert({
        plan_id: planId,
        day_number: day.day_number,
        name: day.name,
        focus: day.focus,
      })
      .select("id")
      .single();

    if (dayError) throw new Error(`Failed to create plan day: ${dayError.message}`);

    // Create exercises for this day
    const exerciseInserts = day.exercises.map((ex) => ({
      plan_day_id: createdDay.id,
      exercise_id: ex.exercise_id,
      order_index: ex.order_index,
      sets_target: ex.sets_target,
      reps_min: ex.reps_min,
      reps_max: ex.reps_max,
      rest_seconds: ex.rest_seconds,
      tempo: ex.tempo,
    }));

    const { error: exError } = await supabase.from("user_workout_plan_exercises").insert(exerciseInserts);

    if (exError) throw new Error(`Failed to create plan exercises: ${exError.message}`);
  }

  return planId;
}

async function storeNutritionPlan(
  supabase: SupabaseClient,
  userId: string,
  runId: string,
  plan: NutritionPlanResponse,
  dietaryPrefs: string[]
): Promise<string> {
  // Get next version number
  const { data: existingPlans } = await supabase
    .from("user_nutrition_plans")
    .select("version")
    .eq("user_id", userId)
    .order("version", { ascending: false })
    .limit(1);

  const nextVersion = existingPlans && existingPlans.length > 0 ? existingPlans[0].version + 1 : 1;

  // Create the plan
  const { data: createdPlan, error: planError } = await supabase
    .from("user_nutrition_plans")
    .insert({
      user_id: userId,
      generation_run_id: runId,
      version: nextVersion,
      is_active: true, // Trigger will deactivate others
      name: plan.name,
      description: plan.description,
      meal_structure: plan.meal_structure,
      macro_distribution: plan.macro_distribution,
      dietary_preferences: { preferences: dietaryPrefs },
    })
    .select("id")
    .single();

  if (planError) throw new Error(`Failed to create nutrition plan: ${planError.message}`);
  const planId = createdPlan.id;

  // Create sample meals
  if (plan.sample_meals && plan.sample_meals.length > 0) {
    const mealInserts = plan.sample_meals.map((meal) => ({
      plan_id: planId,
      meal_slot: meal.meal_slot,
      day_of_week: meal.day_of_week,
      name: meal.name,
      description: meal.description,
      target_calories: meal.target_calories,
      target_protein: meal.target_protein,
      target_carbs: meal.target_carbs,
      target_fat: meal.target_fat,
      prep_time_min: meal.prep_time_min,
    }));

    const { error: mealError } = await supabase.from("user_nutrition_plan_meals").insert(mealInserts);

    if (mealError) throw new Error(`Failed to create plan meals: ${mealError.message}`);
  }

  return planId;
}

// ===========================================
// MAIN HANDLER
// ===========================================

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const startTime = Date.now();
  console.log(`[generate-user-plans] Request received: ${req.method}`);

  if (req.method !== "POST") {
    return jsonResponse({ success: false, error: "Method not allowed" }, 405);
  }

  try {
    // Debug headers (careful with secrets)
    const authHeader = req.headers.get("Authorization");
    console.log(`[generate-user-plans] Auth header present: ${!!authHeader}`);

    // Get environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const openaiKey = Deno.env.get("OPENAI_API_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ success: false, error: "Missing Supabase env vars" }, 500);
    }

    if (!openaiKey) {
      return jsonResponse({ success: false, error: "Missing OpenAI API key" }, 500);
    }

    // Parse request
    const body = await req.json();
    const userId = body.user_id?.trim();
    const planType: PlanType = body.plan_type || "both";

    if (!userId) {
      return jsonResponse({ success: false, error: "user_id is required" }, 400);
    }

    if (!["workout", "nutrition", "both"].includes(planType)) {
      return jsonResponse({ success: false, error: "Invalid plan_type" }, 400);
    }

    // Create admin client
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // Verify user exists
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId);
    if (authError || !authUser.user) {
      return jsonResponse({ success: false, error: "User not found" }, 404);
    }

    // Create generation run (audit log)
    const { data: run, error: runError } = await supabase
      .from("plan_generation_runs")
      .insert({
        user_id: userId,
        plan_type: planType,
        status: "pending",
      })
      .select("id")
      .single();

    if (runError) throw new Error(`Failed to create generation run: ${runError.message}`);
    const runId = run.id;

    try {
      // Fetch user context
      const context = await fetchUserContext(supabase, userId, planType);

      // Store input context
      await supabase
        .from("plan_generation_runs")
        .update({
          input_context: {
            profile: context.profile,
            onboarding: context.onboarding,
            targets: context.targets,
            exercise_count: context.availableExercises.length,
          },
        })
        .eq("id", runId);

      // Build prompts
      const systemPrompt = buildSystemPrompt(context, planType);
      const userPrompt = buildUserPrompt(planType);

      // Call OpenAI
      const { response: aiResponse, tokens } = await callOpenAI(openaiKey, systemPrompt, userPrompt);

      // Store AI response
      await supabase
        .from("plan_generation_runs")
        .update({
          ai_response: aiResponse,
          tokens_used: tokens,
        })
        .eq("id", runId);

      // Validate responses
      const availableIds = new Set(context.availableExercises.map((e) => e.id));
      const validationErrors: string[] = [];

      if (aiResponse.workout_plan) {
        validationErrors.push(...validateWorkoutPlan(aiResponse.workout_plan, availableIds));
      }

      if (aiResponse.nutrition_plan) {
        validationErrors.push(...validateNutritionPlan(aiResponse.nutrition_plan));
      }

      if (validationErrors.length > 0) {
        console.error("Plan validation failed:", validationErrors);
        console.error("AI Response causing failure:", JSON.stringify(aiResponse));

        await supabase
          .from("plan_generation_runs")
          .update({
            status: "validation_failed",
            validation_errors: validationErrors,
            duration_ms: Date.now() - startTime,
            completed_at: new Date().toISOString(),
          })
          .eq("id", runId);

        // FALLBACK STRATEGY:
        // If we have a nutrition plan but workout plan failed validation (or vice versa), 
        // we should try to save at least the valid one instead of failing everything.
        // This is crucial for user experience.

        let savedWorkoutId = undefined;
        let savedNutritionId = undefined;
        let partialSuccess = false;

        // Try to save Nutrition Plan if it's valid and requested
        if (aiResponse.nutrition_plan && (planType === "nutrition" || planType === "both")) {
          const nutritionErrors = validateNutritionPlan(aiResponse.nutrition_plan);
          if (nutritionErrors.length === 0) {
            try {
              savedNutritionId = await storeNutritionPlan(
                supabase,
                userId,
                runId,
                aiResponse.nutrition_plan,
                context.onboarding.dietary_preferences
              );
              partialSuccess = true;
              console.log("Recovered: Saved valid nutrition plan despite validation errors.");
            } catch (e) {
              console.error("Failed to save valid nutrition plan during recovery:", e);
            }
          }
        }

        // Return partial success if possible
        if (partialSuccess) {
          return jsonResponse({
            success: true,
            workout_plan_id: savedWorkoutId,
            nutrition_plan_id: savedNutritionId,
            run_id: runId,
            warning: "Partial success: Some plans failed validation",
            validation_errors: validationErrors
          });
        }

        return jsonResponse({
          success: false,
          error: "Generated plan failed validation",
          validation_errors: validationErrors,
          run_id: runId,
        }, 422);
      }

      // Store plans
      let workoutPlanId: string | undefined;
      let nutritionPlanId: string | undefined;

      if (aiResponse.workout_plan) {
        workoutPlanId = await storeWorkoutPlan(supabase, userId, runId, aiResponse.workout_plan);
      }

      if (aiResponse.nutrition_plan) {
        nutritionPlanId = await storeNutritionPlan(
          supabase,
          userId,
          runId,
          aiResponse.nutrition_plan,
          context.onboarding.dietary_preferences
        );
      }

      // Mark run as successful
      await supabase
        .from("plan_generation_runs")
        .update({
          status: "success",
          duration_ms: Date.now() - startTime,
          completed_at: new Date().toISOString(),
        })
        .eq("id", runId);

      return jsonResponse({
        success: true,
        workout_plan_id: workoutPlanId,
        nutrition_plan_id: nutritionPlanId,
        run_id: runId,
      });
    } catch (innerError) {
      // Mark run as failed
      await supabase
        .from("plan_generation_runs")
        .update({
          status: "failed",
          validation_errors: [(innerError as Error).message],
          duration_ms: Date.now() - startTime,
          completed_at: new Date().toISOString(),
        })
        .eq("id", runId);

      throw innerError;
    }
  } catch (err) {
    console.error("generate-user-plans error:", err);
    return jsonResponse(
      { success: false, error: (err as Error)?.message ?? "Unknown error" },
      500
    );
  }
});
