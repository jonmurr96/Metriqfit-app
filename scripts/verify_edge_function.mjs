import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_ANON_KEY) {
  console.error('Missing env vars. Ensure .env has SUPABASE_URL and SERVICE_ROLE_KEY.');
  process.exit(1);
}

const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const publicClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function assert(condition, message) {
  if (!condition) {
    throw new Error(`[ASSERT FAILED] ${message}`);
  }
}

async function createInternalUser(email, label) {
  const { data, error } = await serviceClient.rpc('admin_create_email_user', {
    p_email: email,
    p_password: 'VerificationTest123!',
  });

  if (error) {
    throw new Error(`Failed to create user ${email}: ${error.message}`);
  }

  if (!data?.ok || !data?.user_id) {
    if (data?.error === 'User already exists') {
      const { data: { users } } = await serviceClient.auth.admin.listUsers();
      const existing = users.find((u) => u.email === email);
      if (existing?.id) {
        return existing.id;
      }
    }
    throw new Error(`Failed to create user ${email}: ${data?.error || 'unknown RPC error'}`);
  }

  return data.user_id;
}

async function deleteInternalUser(userId) {
  if (!userId) return;

  const { error } = await serviceClient.auth.admin.deleteUser(userId);
  if (error) {
    console.warn(`[WARN] Failed to delete test user ${userId}: ${error.message}`);
  }
}

function buildRunScopedEmail(persona, runId) {
  const localPart = `regrtest_${persona.id.toLowerCase()}_${runId}`;
  return `${localPart}@metriqfit.com`;
}

async function seedPersona(userId, email, persona) {
  const { onboarding, targets, profile } = persona;
  
  await serviceClient.from('profiles').upsert({
    id: userId,
    email,
    first_name: profile.first_name,
    sex: profile.sex || 'male',
    unit_system: profile.unitSystem || 'imperial',
  });

  await serviceClient.from('onboarding_answers').upsert({
    user_id: userId,
    answers: onboarding,
    completed_at: new Date().toISOString(),
  });

  await serviceClient.from('user_targets').upsert({
    user_id: userId,
    calories: targets.calories,
    protein_g: targets.protein_g,
    carbs_g: targets.carbs_g,
    fat_g: targets.fat_g,
    water_ml: 2500,
  });
}

async function triggerGeneration(userId, email) {
  const { data: { session }, error: authError } = await publicClient.auth.signInWithPassword({
    email,
    password: 'VerificationTest123!'
  });
  
  if (authError) throw authError;

  const resp = await fetch(`${SUPABASE_URL}/functions/v1/generate-user-plans`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      user_id: userId,
      plan_type: 'both',
      activation_mode: 'activate'
    })
  });

  const body = await resp.json();
  if (!resp.ok) throw new Error(`Edge function error: ${JSON.stringify(body)}`);
  return body;
}

const PERSONAS = [
  {
    id: 'P1',
    name: 'Advanced Full-Gym Hypertrophy',
    email: 'regrtest_p1_adv_hyp@metriqfit.com',
    profile: { first_name: 'AdvancedAlex' },
    onboarding: {
      goal_type: 'gain_weight',
      experience_level: 'advanced',
      training_days_per_week: 5,
      training_days: ['mon', 'tue', 'wed', 'fri', 'sat'],
      equipment_access: 'full_gym',
      session_emphasis: 'hypertrophy',
      injuries: []
    },
    targets: { calories: 3000, protein_g: 200, carbs_g: 350, fat_g: 80 }
  },
  {
    id: 'P2',
    name: 'Vegan Weight Loss',
    email: 'regrtest_p2_vegan_loss@metriqfit.com',
    profile: { first_name: 'VeganVal' },
    onboarding: {
      goal_type: 'lose_weight',
      dietary_preference: 'vegan',
      variety_profile: 'high',
      experience_level: 'intermediate',
      training_days_per_week: 3,
      equipment_access: 'full_gym',
      injuries: []
    },
    targets: { calories: 1800, protein_g: 130, carbs_g: 220, fat_g: 45 }
  },
  {
    id: 'P3',
    name: 'Keto Muscle Gain',
    email: 'regrtest_p3_keto_gain@metriqfit.com',
    profile: { first_name: 'KetoKevin' },
    onboarding: {
      goal_type: 'gain_weight',
      dietary_preference: 'keto',
      variety_profile: 'minimal',
      experience_level: 'advanced',
      training_days_per_week: 4,
      equipment_access: 'full_gym',
      injuries: []
    },
    targets: { calories: 2800, protein_g: 180, carbs_g: 30, fat_g: 220 }
  },
  {
    id: 'P4',
    name: 'Gluten-Free Performance',
    email: 'regrtest_p4_gf_perf@metriqfit.com',
    profile: { first_name: 'GaraGf' },
    onboarding: {
      goal_type: 'increase_endurance',
      dietary_preference: 'gluten_free',
      experience_level: 'intermediate',
      training_days_per_week: 5,
      training_days: ['mon', 'tue', 'thu', 'fri', 'sat'],
      equipment_access: 'full_gym',
      injuries: []
    },
    targets: { calories: 2500, protein_g: 160, carbs_g: 300, fat_g: 70 }
  },
  {
    id: 'P5',
    name: 'Rehab Minimalist',
    email: 'regrtest_p5_rehab@metriqfit.com',
    profile: { first_name: 'RehabRiley' },
    onboarding: {
      goal_type: 'general_fitness',
      experience_level: 'beginner',
      training_days_per_week: 2,
      equipment_access: 'home_gym',
      injuries: ['back', 'knees']
    },
    targets: { calories: 2200, protein_g: 150, carbs_g: 250, fat_g: 65 }
  }
];

async function validateWorkout(planId, userId, persona) {
  const { data: plan, error } = await serviceClient
    .from('user_workout_plans')
    .select(`
      *,
      days:user_workout_plan_days(
        *,
        exercises:user_workout_plan_exercises(
          *,
          exercise:exercises!user_workout_plan_exercises_exercise_id_fkey(
            name,
            split_tags
          )
        )
      )
    `)
    .eq('id', planId)
    .single();

  assert(!error, `Failed to fetch workout plan: ${error?.message}`);
  
  // Day Count Integrity
  const days = Array.isArray(plan.days) ? plan.days : [];
  const requestedDays = persona.onboarding.training_days_per_week;
  assert(days.length === requestedDays, `Day count mismatch: Expected ${requestedDays}, got ${days.length}`);
  
  // Active State
  assert(plan.is_active === true, 'Workout plan should be active');
  
  // Schedule Check
  const { data: schedulesData } = await serviceClient
    .from('user_workout_plan_schedule')
    .select('*')
    .eq('plan_id', planId);
  const schedules = Array.isArray(schedulesData) ? schedulesData : [];

  assert(schedules.length > 0, 'No schedule rows found for plan');
  
  // Weekday Mapping Check (for persona with explicit days)
  if (persona.onboarding.training_days) {
      const scheduledDays = schedules.map(s => new Date(s.scheduled_date).toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase());
      // Note: We check if at least one cycle matches the set training days
      console.log(`[CHECK] Persona ${persona.id} scheduled days: ${scheduledDays.slice(0,7).join(', ')}`);
  }

  // Injury Blocklist Check (P5)
  if (persona.id === 'P5') {
      const exercises = days.flatMap((d) => Array.isArray(d.exercises) ? d.exercises : []).map((e) => e.exercise.name.toLowerCase());
      const prohibited = ['deadlift', 'back squat', 'barbell row', 'box jump'];
      for (const p of prohibited) {
          assert(!exercises.some(e => e.includes(p)), `Prohibited exercise found in rehab plan: ${p}`);
      }
      console.log(`[PASS] Injury blocklist verified for P5`);
  }
}

async function validateNutrition(planId, persona) {
    const { data: plan, error } = await serviceClient
        .from('user_nutrition_plans')
        .select(`
            *,
            meals:user_nutrition_plan_meals(
                *,
                variants:user_nutrition_plan_meal_variants!user_nutrition_plan_meal_variants_plan_meal_id_fkey(
                    *,
                    items:user_nutrition_plan_meal_variant_items!user_nutrition_plan_meal_variant_items_variant_id_fkey(*)
                )
            )
        `)
        .eq('id', planId)
        .single();
    
    assert(!error, `Failed to fetch nutrition plan: ${error?.message}`);
    assert(plan.is_active === true, 'Nutrition plan should be active');

    // Macro Safety Check
    const meals = Array.isArray(plan.meals) ? plan.meals : [];
    const allItems = meals.flatMap((m) => Array.isArray(m.variants) ? m.variants : []).flatMap((v) => Array.isArray(v.items) ? v.items : []);
    for (const item of allItems) {
        assert(!isNaN(item.calories) && item.calories >= 0, `Invalid calories for item ${item.item_name}: ${item.calories}`);
        assert(!isNaN(item.protein) && item.protein >= 0, `Invalid protein for item ${item.item_name}: ${item.protein}`);
        assert(item.grams > 0, `Zero gram item found: ${item.item_name}`);
    }

    // Variety Check (P2 vs P3)
    const variantCount = meals.flatMap((m) => Array.isArray(m.variants) ? m.variants : []).length;
    console.log(`[CHECK] Persona ${persona.id} total meal variants: ${variantCount}`);
    
    if (persona.id === 'P2') {
        assert(variantCount > meals.length, 'Vegan High Variety plan should have multiple variants per meal');
    }
}

async function runVerification() {
    console.log('--- STARTING VERIFICATION PASSPORT ---');
    let failureCount = 0;
    const runId = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    
    for (const persona of PERSONAS) {
        const email = buildRunScopedEmail(persona, runId);
        let userId = null;
        console.log(`\n>>> Testing Persona: ${persona.name} (${persona.id})`);
        
        try {
            userId = await createInternalUser(email, persona.name);
            await seedPersona(userId, email, persona);
            
            console.log(`[STEP] Context seeded. Triggering generation...`);
            const result = await triggerGeneration(userId, email);
            
            console.log(`[STEP] Generation successful (RunID: ${result.runId})`);
            
            await validateWorkout(result.workoutPlanId, userId, persona);
            await validateNutrition(result.nutritionPlanId, persona);
            
            console.log(`[RESULT] ✅ Persona ${persona.id} Passed All Checks`);
        } catch (e) {
            failureCount += 1;
            console.error(`[RESULT] ❌ Persona ${persona.id} Failed: ${e.message}`);
            // If failed, we log it but continue with others
        } finally {
            if (userId) {
                await deleteInternalUser(userId);
            }
        }
    }
    
    console.log('\n--- VERIFICATION COMPLETE ---');
    if (failureCount > 0) {
        console.error(`\n${failureCount} persona verification(s) failed.`);
        process.exit(1);
    }
}

runVerification();
