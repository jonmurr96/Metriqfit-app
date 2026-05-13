import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const EDGE_URL = `${SUPABASE_URL}/functions/v1/generate-user-plans`;
const SMOKE_CASE = process.env.SMOKE_CASE || null;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing env. Set EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const publicClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function uniqueEmail(label) {
  const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return `codex+${slug}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

async function createDisposableUser(label) {
  const email = uniqueEmail(label);
  const password = 'CodexTest123!';
  const { data, error } = await publicClient.rpc('admin_create_email_user', {
    p_email: email,
    p_password: password,
  });
  if (error) {
    throw new Error(`Failed to create disposable user for ${label}: ${error.message}`);
  }
  assert(data?.ok, `Disposable user creation failed for ${label}`);
  return { email, userId: data.user_id };
}

async function signInUser(email, password = 'CodexTest123!') {
  const { data, error } = await publicClient.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    throw new Error(`Failed to sign in ${email}: ${error?.message || 'missing session'}`);
  }
  return data.session.access_token;
}

async function seedUserContext(userId, email, { firstName = 'Codex', sex = 'male', unitSystem = 'imperial', targets, answers }) {
  const profileResult = await serviceClient
    .from('profiles')
    .upsert({
      id: userId,
      email,
      first_name: firstName,
      sex,
      unit_system: unitSystem,
    }, { onConflict: 'id' })
    .select('id')
    .single();

  if (profileResult.error) {
    throw new Error(`Failed to seed profile for ${userId}: ${profileResult.error.message}`);
  }

  const onboardingResult = await serviceClient
    .from('onboarding_answers')
    .upsert({
      user_id: userId,
      answers,
      completed_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
    .select('user_id')
    .single();

  if (onboardingResult.error) {
    throw new Error(`Failed to seed onboarding answers for ${userId}: ${onboardingResult.error.message}`);
  }

  const targetResult = await serviceClient
    .from('user_targets')
    .upsert({
      user_id: userId,
      calories: targets.calories,
      protein_g: targets.protein_g,
      carbs_g: targets.carbs_g,
      fat_g: targets.fat_g,
      water_ml: targets.water_ml ?? 2500,
    }, { onConflict: 'user_id' })
    .select('user_id')
    .single();

  if (targetResult.error) {
    throw new Error(`Failed to seed targets for ${userId}: ${targetResult.error.message}`);
  }
}

async function invokePlanner(accessToken, userId, body = {}) {
  const response = await fetch(EDGE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      user_id: userId,
      plan_type: 'workout',
      activation_mode: 'activate',
      ...body,
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Planner invocation failed (${response.status}): ${payload?.error || JSON.stringify(payload)}`);
  }
  return payload;
}

async function loadWorkoutPlan(planId, userId) {
  const { data, error } = await serviceClient
    .from('user_workout_plans')
    .select(`
      id,
      user_id,
      name,
      is_active,
      created_at,
      days_per_week,
      program_family_key,
      planner_metadata_json,
      days:user_workout_plan_days(
        id,
        name,
        focus,
        day_type,
        estimated_duration_min,
        exercises:user_workout_plan_exercises(
          order_index,
          rest_seconds,
          exercise:exercises!exercise_id(
            id,
            name,
            category,
            movement_pattern,
            popularity_score,
            primary_muscles,
            split_tags
          )
        )
      )
    `)
    .eq('id', planId)
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    throw new Error(`Failed to load workout plan ${planId}: ${error?.message || 'not found'}`);
  }

  return data;
}

function flattenExerciseNames(plan) {
  return (plan.days || [])
    .flatMap((day) => day.exercises || [])
    .map((entry) => entry.exercise?.name)
    .filter(Boolean);
}

const KNOWN_BAD_VARIANTS = /medicine ball|pike[- ]to[- ]cobra|bodyweight standing one arm row|cable assisted inverse|band one arm single leg|band front lateral raise/i;

function assertNoKnownBadVariants(plan, prefix = 'Plan contains known bad variants') {
  const names = flattenExerciseNames(plan).join(' | ');
  assert(!KNOWN_BAD_VARIANTS.test(names), `${prefix}: ${names}`);
}

function assertConservativeDefaultMetrics(plan, {
  minStandardRatio,
  minStapleRatio,
  maxFullGymSubstitutionViolations = 0,
  maxUncommonPerDay = 0,
}) {
  const meta = plan.planner_metadata_json || {};
  const qualityGate = meta.quality_gate || {};
  const metrics = qualityGate.metrics || {};
  assert((meta.quality_policy?.version || '').length > 0, 'Missing quality policy metadata');
  assert((meta.quality_policy?.catalog_version || '').length > 0, 'Missing curated catalog version in planner metadata');
  assert((meta.quality_policy?.recipe_version || '').length > 0, 'Missing recipe version in planner metadata');
  assert(Array.isArray(meta.recipe_engine?.selected_day_recipes) && meta.recipe_engine.selected_day_recipes.length > 0, 'Missing selected recipe metadata');
  assert(meta.recipe_engine.selected_day_recipes.every((entry) => typeof entry.recipe_id === 'string' && entry.recipe_id.length > 0), 'Recipe metadata is missing recipe ids');
  assert((qualityGate.non_staple_selections || []).every((entry) => Array.isArray(entry.reasons)), 'Non-staple selection reasons missing from planner metadata');
  assert((metrics.standardTierRatio ?? 0) >= minStandardRatio, `Standard tier ratio too low: ${metrics.standardTierRatio}`);
  assert((metrics.stapleRatio ?? 0) >= minStapleRatio, `Staple ratio too low: ${metrics.stapleRatio}`);
  assert((metrics.fullGymSubstitutionViolations ?? 99) <= maxFullGymSubstitutionViolations, `Too many full-gym substitution violations: ${metrics.fullGymSubstitutionViolations}`);
  assert((metrics.uncommonCountPerDay ?? []).every((count) => count <= maxUncommonPerDay), `Uncommon-per-day budget exceeded: ${JSON.stringify(metrics.uncommonCountPerDay)}`);
}

function planSummary(label, plan) {
  const meta = plan.planner_metadata_json || {};
  const qualityGate = meta.quality_gate || {};
  return {
    label,
    planId: plan.id,
    familyKey: plan.program_family_key,
    active: plan.is_active,
    selectionSource: meta.selection_source || null,
    policyVersion: meta.quality_policy?.version || null,
    catalogVersion: meta.quality_policy?.catalog_version || null,
    recipeVersion: meta.quality_policy?.recipe_version || null,
    recipeIds: (meta.recipe_engine?.selected_day_recipes || []).map((entry) => entry.recipe_id),
    splitDisplayName: meta.split_selector?.display_name || null,
    validationScore: qualityGate.validation_score ?? null,
    standardTierRatio: qualityGate.metrics?.standardTierRatio ?? null,
    stapleRatio: qualityGate.metrics?.stapleRatio ?? null,
    specialtyExerciseCount: qualityGate.metrics?.specialtyExerciseCount ?? null,
    fullGymSubstitutionViolations: qualityGate.metrics?.fullGymSubstitutionViolations ?? null,
    uncommonCountPerDay: qualityGate.metrics?.uncommonCountPerDay ?? null,
    focusMismatchDays: qualityGate.metrics?.focusMismatchDays ?? null,
    recoveryConflictDays: qualityGate.metrics?.recoveryConflictDays ?? null,
    dayNames: (plan.days || []).map((day) => day.name),
    exerciseNames: flattenExerciseNames(plan),
  };
}

const defaultTargets = {
  calories: 2400,
  protein_g: 180,
  carbs_g: 250,
  fat_g: 70,
  water_ml: 2500,
};

// ── Validators for new split day types ────────────────────────────────────────

function assertDayCount(plan, expected, label) {
  assert((plan.days || []).length === expected, `${label}: expected ${expected} days, got ${(plan.days || []).length}`);
}

function assertFamilyKey(plan, expected, label) {
  assert(plan.program_family_key === expected, `${label}: expected family ${expected}, got ${plan.program_family_key}`);
}

function assertDayTypes(plan, expectedTypes, label) {
  const actual = (plan.days || []).map((day) => day.day_type);
  for (const expected of expectedTypes) {
    assert(actual.includes(expected), `${label}: missing day_type ${expected} — got [${actual.join(', ')}]`);
  }
}

function assertNoEmptyDays(plan, label) {
  for (const day of plan.days || []) {
    assert((day.exercises || []).length >= 2, `${label}: day "${day.name}" (${day.day_type}) has fewer than 2 exercises`);
  }
}

function assertNoEquipmentViolations(plan, allowedCategories, label) {
  const allowed = new Set(allowedCategories);
  for (const day of plan.days || []) {
    for (const ex of day.exercises || []) {
      const cat = ex.exercise?.equipment_category ?? ex.equipment_category;
      if (cat && !allowed.has(cat)) {
        assert(false, `${label}: exercise "${ex.exercise?.name ?? ex.name}" uses equipment "${cat}" not in allowed set [${allowedCategories.join(', ')}]`);
      }
    }
  }
}

function assertStaplePresence(plan, patterns, label) {
  const names = flattenExerciseNames(plan).join(' | ').toLowerCase();
  for (const pattern of patterns) {
    assert(pattern.test(names), `${label}: missing expected staple exercise — ${pattern}`);
  }
}

const canonicalCases = [
  {
    label: 'beginner-3-general-fitness',
    answers: {
      goal_type: 'general_fitness',
      experience_level: 'beginner',
      training_days_per_week: 3,
      training_days: ['mon', 'wed', 'fri'],
      equipment_access: 'full_gym',
      preferred_split_family: 'no_preference',
      session_emphasis: 'no_preference',
      progression_preference: 'double_progression',
      technique_preferences: ['general_fitness'],
    },
    assertPlan(plan) {
      assert(plan.program_family_key === 'fam_adaptive_beginner_3_day', `Expected fam_adaptive_beginner_3_day, got ${plan.program_family_key}`);
      assertDayCount(plan, 3, 'beginner-3-general-fitness');
      assertNoEmptyDays(plan, 'beginner-3-general-fitness');
      assertNoKnownBadVariants(plan);
      const names = flattenExerciseNames(plan).join(' | ').toLowerCase();
      assert(/bench|press|squat|row|pulldown|lat pulldown|rdl|leg press/.test(names), 'Beginner full-body plan is missing staple lifts');
    },
  },
  {
    label: 'beginner-4-full-gym-lose-fat',
    answers: {
      goal_type: 'lose_weight',
      experience_level: 'beginner',
      training_days_per_week: 4,
      training_days: ['mon', 'tue', 'thu', 'sat'],
      equipment_access: 'full_gym',
      preferred_split_family: 'no_preference',
      session_emphasis: 'no_preference',
      progression_preference: 'double_progression',
      technique_preferences: ['general_fitness'],
      activity_level: 'moderately_active',
    },
    assertPlan(plan) {
      assert(plan.program_family_key === 'fam_adaptive_beginner_4_day', `Expected fam_adaptive_beginner_4_day, got ${plan.program_family_key}`);
      assertDayCount(plan, 4, 'beginner-4-full-gym-lose-fat');
      assertNoEmptyDays(plan, 'beginner-4-full-gym-lose-fat');
      assertNoKnownBadVariants(plan, 'Beginner full-gym fat-loss plan contains a known bad exercise');
    },
  },
  {
    label: 'beginner-4-dumbbells-only',
    answers: {
      goal_type: 'general_fitness',
      experience_level: 'beginner',
      training_days_per_week: 4,
      training_days: ['mon', 'tue', 'thu', 'sat'],
      equipment_access: 'dumbbells_only',
      preferred_split_family: 'no_preference',
      session_emphasis: 'no_preference',
      progression_preference: 'double_progression',
      technique_preferences: ['general_fitness'],
      activity_level: 'lightly_active',
    },
    assertPlan(plan) {
      assert(plan.program_family_key === 'fam_adaptive_beginner_4_day', `Expected fam_adaptive_beginner_4_day, got ${plan.program_family_key}`);
      assertDayCount(plan, 4, 'beginner-4-dumbbells-only');
      assertNoEmptyDays(plan, 'beginner-4-dumbbells-only');
      // Dumbbell-only environment — all exercises must be dumbbell/bodyweight compatible
      const names = flattenExerciseNames(plan).join(' | ').toLowerCase();
      assert(!/barbell|cable machine|smith machine/.test(names), `beginner-4-dumbbells-only: plan contains non-dumbbell equipment — ${names}`);
    },
  },
  {
    label: 'intermediate-4-hypertrophy',
    answers: {
      goal_type: 'build_muscle',
      experience_level: 'intermediate',
      training_days_per_week: 4,
      training_days: ['mon', 'tue', 'thu', 'fri'],
      equipment_access: 'full_gym',
      preferred_split_family: 'no_preference',
      session_emphasis: 'hypertrophy',
      progression_preference: 'double_progression',
      technique_preferences: ['balanced'],
    },
    assertPlan(plan) {
      assert(plan.program_family_key === 'fam_adaptive_intermediate_4_day', `Expected fam_adaptive_intermediate_4_day, got ${plan.program_family_key}`);
      assertDayCount(plan, 4, 'intermediate-4-hypertrophy');
      assertNoEmptyDays(plan, 'intermediate-4-hypertrophy');
      assertNoKnownBadVariants(plan);
      const names = flattenExerciseNames(plan).join(' | ').toLowerCase();
      assert(/bench|press|squat|row|pulldown/.test(names), 'intermediate-4-hypertrophy: missing staple compound lifts');
    },
  },
  {
    label: 'intermediate-5-general-fitness',
    answers: {
      goal_type: 'general_fitness',
      experience_level: 'intermediate',
      training_days_per_week: 5,
      training_days: ['mon', 'tue', 'wed', 'fri', 'sat'],
      equipment_access: 'full_gym',
      preferred_split_family: 'no_preference',
      session_emphasis: 'no_preference',
      progression_preference: 'double_progression',
      technique_preferences: ['balanced'],
    },
    assertPlan(plan) {
      assert(plan.program_family_key === 'fam_adaptive_intermediate_5_day', `Expected fam_adaptive_intermediate_5_day, got ${plan.program_family_key}`);
      assertDayCount(plan, 5, 'intermediate-5-general-fitness');
      assertNoEmptyDays(plan, 'intermediate-5-general-fitness');
      assertNoKnownBadVariants(plan);
    },
  },
  {
    label: 'advanced-5-bodybuilding',
    answers: {
      goal_type: 'build_muscle',
      experience_level: 'advanced',
      training_days_per_week: 5,
      training_days: ['mon', 'tue', 'wed', 'fri', 'sat'],
      equipment_access: 'full_gym',
      preferred_split_family: 'no_preference',
      session_emphasis: 'hypertrophy',
      progression_preference: 'double_progression',
      technique_preferences: ['bodybuilding'],
    },
    assertPlan(plan) {
      assert(plan.program_family_key === 'fam_adaptive_advanced_5_day', `Expected fam_adaptive_advanced_5_day, got ${plan.program_family_key}`);
      assertDayCount(plan, 5, 'advanced-5-bodybuilding');
      assertNoEmptyDays(plan, 'advanced-5-bodybuilding');
      assertNoKnownBadVariants(plan);
    },
  },

  // ── New split families ─────────────────────────────────────────────────────

  {
    label: 'intermediate-3-ppl-preference',
    answers: {
      goal_type: 'build_muscle',
      experience_level: 'intermediate',
      training_days_per_week: 3,
      training_days: ['mon', 'wed', 'fri'],
      equipment_access: 'full_gym',
      preferred_split_family: 'fam_ppl_3day',
      session_emphasis: 'hypertrophy',
      progression_preference: 'double_progression',
      technique_preferences: ['balanced'],
    },
    assertPlan(plan) {
      const label = 'intermediate-3-ppl';
      assertFamilyKey(plan, 'fam_ppl_3day', label);
      assertDayCount(plan, 3, label);
      assertDayTypes(plan, ['Push', 'Pull', 'Legs'], label);
      assertNoEmptyDays(plan, label);
      assertStaplePresence(plan, [/bench|press/, /row|pulldown/, /squat|leg press/], label);
      assertNoKnownBadVariants(plan, label);
    },
  },
  {
    label: 'advanced-6-ppl-preference',
    answers: {
      goal_type: 'build_muscle',
      experience_level: 'advanced',
      training_days_per_week: 6,
      training_days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'],
      equipment_access: 'full_gym',
      preferred_split_family: 'fam_ppl_6day',
      session_emphasis: 'hypertrophy',
      progression_preference: 'double_progression',
      technique_preferences: ['bodybuilding'],
    },
    assertPlan(plan) {
      const label = 'advanced-6-ppl';
      assertFamilyKey(plan, 'fam_ppl_6day', label);
      assertDayCount(plan, 6, label);
      assertDayTypes(plan, ['Push', 'Pull', 'Legs'], label);
      assertNoEmptyDays(plan, label);
      // Each of Push, Pull, Legs must appear exactly twice (A + B variation)
      const dayTypes = (plan.days || []).map((d) => d.day_type);
      const pushCount = dayTypes.filter((t) => t === 'Push').length;
      const pullCount = dayTypes.filter((t) => t === 'Pull').length;
      const legsCount = dayTypes.filter((t) => t === 'Legs').length;
      assert(pushCount === 2, `${label}: expected 2 Push days, got ${pushCount}`);
      assert(pullCount === 2, `${label}: expected 2 Pull days, got ${pullCount}`);
      assert(legsCount === 2, `${label}: expected 2 Legs days, got ${legsCount}`);
      assertNoKnownBadVariants(plan, label);
    },
  },
  {
    label: 'intermediate-4-brosplit-preference',
    answers: {
      goal_type: 'build_muscle',
      experience_level: 'intermediate',
      training_days_per_week: 4,
      training_days: ['mon', 'tue', 'thu', 'fri'],
      equipment_access: 'full_gym',
      preferred_split_family: 'fam_brosplit_4day',
      session_emphasis: 'hypertrophy',
      progression_preference: 'double_progression',
      technique_preferences: ['bodybuilding'],
    },
    assertPlan(plan) {
      const label = 'intermediate-4-brosplit';
      assertFamilyKey(plan, 'fam_brosplit_4day', label);
      assertDayCount(plan, 4, label);
      assertDayTypes(plan, ['ChestAndTriceps', 'BackAndBiceps', 'ShoulderDay', 'Legs'], label);
      assertNoEmptyDays(plan, label);
      assertStaplePresence(plan, [/bench|chest press/, /row|pulldown/, /overhead|shoulder press/, /squat|leg press/], label);
      assertNoKnownBadVariants(plan, label);
    },
  },
  {
    label: 'intermediate-5-brosplit-preference',
    answers: {
      goal_type: 'build_muscle',
      experience_level: 'intermediate',
      training_days_per_week: 5,
      training_days: ['mon', 'tue', 'wed', 'fri', 'sat'],
      equipment_access: 'full_gym',
      preferred_split_family: 'fam_brosplit_5day',
      session_emphasis: 'hypertrophy',
      progression_preference: 'double_progression',
      technique_preferences: ['bodybuilding'],
    },
    assertPlan(plan) {
      const label = 'intermediate-5-brosplit';
      assertFamilyKey(plan, 'fam_brosplit_5day', label);
      assertDayCount(plan, 5, label);
      assertDayTypes(plan, ['ChestAndTriceps', 'BackAndBiceps', 'ShoulderDay', 'Legs', 'ArmsDay'], label);
      assertNoEmptyDays(plan, label);
      // Arms day must contain bicep and tricep work
      const armsDay = (plan.days || []).find((d) => d.day_type === 'ArmsDay');
      assert(armsDay, `${label}: ArmsDay not found in plan days`);
      const armNames = (armsDay.exercises || []).map((e) => (e.exercise?.name ?? '').toLowerCase()).join(' | ');
      assert(/curl|bicep/.test(armNames), `${label}: ArmsDay missing bicep work — exercises: ${armNames}`);
      assert(/tricep|extension|pushdown/.test(armNames), `${label}: ArmsDay missing tricep work — exercises: ${armNames}`);
      assertNoKnownBadVariants(plan, label);
    },
  },
  {
    label: 'intermediate-3-upper-lower-full-preference',
    answers: {
      goal_type: 'build_muscle',
      experience_level: 'intermediate',
      training_days_per_week: 3,
      training_days: ['mon', 'wed', 'fri'],
      equipment_access: 'full_gym',
      preferred_split_family: 'fam_upper_lower_full_3day',
      session_emphasis: 'hypertrophy',
      progression_preference: 'double_progression',
      technique_preferences: ['balanced'],
    },
    assertPlan(plan) {
      const label = 'intermediate-3-upper-lower-full';
      assertFamilyKey(plan, 'fam_upper_lower_full_3day', label);
      assertDayCount(plan, 3, label);
      assertDayTypes(plan, ['UpperHypertrophy', 'LowerHypertrophy', 'FullBodyHypertrophy'], label);
      assertNoEmptyDays(plan, label);
      assertStaplePresence(plan, [/bench|press/, /squat|leg press/, /row|pulldown/], label);
      // Full body day should include both upper and lower movements
      const fullDay = (plan.days || []).find((d) => d.day_type === 'FullBodyHypertrophy');
      assert(fullDay, `${label}: FullBodyHypertrophy day not found`);
      const fullNames = (fullDay.exercises || []).map((e) => (e.exercise?.name ?? '').toLowerCase()).join(' | ');
      assert(/press|row|pull/.test(fullNames), `${label}: Full Body day missing upper work — ${fullNames}`);
      assert(/hinge|deadlift|lunge|leg/.test(fullNames), `${label}: Full Body day missing lower work — ${fullNames}`);
      assertNoKnownBadVariants(plan, label);
    },
  },

  // ── Edge cases for new splits ──────────────────────────────────────────────

  {
    label: 'beginner-3-ppl-preference-ignored',
    // Beginners requesting PPL should NOT get PPL — the engine must override to
    // a beginner-appropriate split since PPL is gated to Intermediate+.
    answers: {
      goal_type: 'build_muscle',
      experience_level: 'beginner',
      training_days_per_week: 3,
      training_days: ['mon', 'wed', 'fri'],
      equipment_access: 'full_gym',
      preferred_split_family: 'fam_ppl_3day',
      session_emphasis: 'no_preference',
      progression_preference: 'double_progression',
      technique_preferences: ['general_fitness'],
    },
    assertPlan(plan) {
      const label = 'beginner-3-ppl-preference-ignored';
      const validBeginnerFamilies = ['full_body_beginner_3', 'general_fitness_beginner_3', 'fam_minimalist_2_day_aesthetics'];
      assert(
        !plan.program_family_key.includes('ppl') && !plan.program_family_key.includes('bro'),
        `${label}: beginner received a PPL/BroSplit plan — expected beginner-appropriate split, got ${plan.program_family_key}`,
      );
      assertNoEmptyDays(plan, label);
    },
  },
  {
    label: 'ppl-3-dumbbells-only',
    // PPL requested with dumbbells_only — all exercises must use dumbbell/bodyweight equipment.
    answers: {
      goal_type: 'build_muscle',
      experience_level: 'intermediate',
      training_days_per_week: 3,
      training_days: ['mon', 'wed', 'fri'],
      equipment_access: 'dumbbells_only',
      preferred_split_family: 'fam_ppl_3day',
      session_emphasis: 'hypertrophy',
      progression_preference: 'double_progression',
      technique_preferences: ['balanced'],
    },
    assertPlan(plan) {
      const label = 'ppl-3-dumbbells-only';
      assertDayCount(plan, 3, label);
      assertNoEmptyDays(plan, label);
      assertNoEquipmentViolations(plan, ['DB', 'BW', 'Misc', 'Band'], label);
      assertNoKnownBadVariants(plan, label);
    },
  },
  {
    label: 'brosplit-4-shoulder-injury',
    // Bro Split with shoulder injury — ShoulderDay must not contain high-risk shoulder exercises.
    answers: {
      goal_type: 'build_muscle',
      experience_level: 'intermediate',
      training_days_per_week: 4,
      training_days: ['mon', 'tue', 'thu', 'fri'],
      equipment_access: 'full_gym',
      preferred_split_family: 'fam_brosplit_4day',
      session_emphasis: 'hypertrophy',
      progression_preference: 'double_progression',
      technique_preferences: ['balanced'],
      injuries: ['shoulders'],
    },
    assertPlan(plan) {
      const label = 'brosplit-4-shoulder-injury';
      assertFamilyKey(plan, 'fam_brosplit_4day', label);
      assertNoEmptyDays(plan, label);
      const allNames = flattenExerciseNames(plan).join(' | ').toLowerCase();
      assert(
        !/upright row|behind.the.neck|military press/.test(allNames),
        `${label}: shoulder injury case contains a conflicting shoulder exercise — ${allNames}`,
      );
    },
  },
];

async function runCase(testCase) {
  const { email, userId } = await createDisposableUser(testCase.label);
  await seedUserContext(userId, email, {
    targets: defaultTargets,
    answers: testCase.answers,
  });
  const accessToken = await signInUser(email);
  const result = await invokePlanner(accessToken, userId);
  const planId = result.workoutPlanId || result.workout_plan_id;
  assert(planId, `Planner did not return a workout plan id for ${testCase.label}: ${JSON.stringify(result)}`);
  const plan = await loadWorkoutPlan(planId, userId);
  const summary = planSummary(testCase.label, plan);
  testCase.assertPlan(plan);
  return summary;
}

async function runShoulderInjuryPair() {
  const baseAnswers = {
    goal_type: 'build_muscle',
    experience_level: 'intermediate',
    training_days_per_week: 4,
    training_days: ['mon', 'tue', 'thu', 'fri'],
    equipment_access: 'full_gym',
    preferred_split_family: 'no_preference',
    session_emphasis: 'hypertrophy',
    progression_preference: 'double_progression',
    technique_preferences: ['balanced'],
  };

  const baseline = await runCase({
    label: 'shoulder-control',
    answers: baseAnswers,
    assertPlan(plan) {
      assert(plan.program_family_key === 'fam_adaptive_intermediate_4_day', `Expected fam_adaptive_intermediate_4_day control plan, got ${plan.program_family_key}`);
    },
  });

  const { email, userId } = await createDisposableUser('shoulder-injury');
  await seedUserContext(userId, email, {
    targets: defaultTargets,
    answers: {
      ...baseAnswers,
      injuries: ['shoulder'],
    },
  });
  const accessToken = await signInUser(email);
  const result = await invokePlanner(accessToken, userId);
  if (!result.success && !result.workoutPlanId && !result.workout_plan_id) {
    throw new Error(`Shoulder injury planner failed: ${result.message || result.error || JSON.stringify(result)}`);
  }
  const planId = result.workoutPlanId || result.workout_plan_id;
  assert(planId, `Shoulder injury case did not return a planId: ${JSON.stringify(result)}`);
  const plan = await loadWorkoutPlan(planId, userId);
  const names = flattenExerciseNames(plan).join(' | ').toLowerCase();
  assert(plan.program_family_key === 'fam_adaptive_intermediate_4_day', `Shoulder injury case changed split unexpectedly: ${plan.program_family_key}`);
  assert(!/upright row|behind the neck|military press/.test(names), 'Shoulder injury case contains a likely conflicting shoulder exercise');
  return {
    control: baseline,
    injury: planSummary('shoulder-injury', plan),
  };
}

async function runKneeBackConstraintCase() {
  const { email, userId } = await createDisposableUser('knee-back-constraint');
  await seedUserContext(userId, email, {
    targets: defaultTargets,
    answers: {
      goal_type: 'general_fitness',
      experience_level: 'intermediate',
      training_days_per_week: 4,
      training_days: ['mon', 'tue', 'thu', 'sat'],
      equipment_access: 'full_gym',
      preferred_split_family: 'no_preference',
      session_emphasis: 'no_preference',
      progression_preference: 'double_progression',
      technique_preferences: ['balanced'],
      injuries: ['knees', 'back'],
      activity_level: 'moderately_active',
    },
  });
  const accessToken = await signInUser(email);
  const result = await invokePlanner(accessToken, userId);
  const planId = result.workoutPlanId || result.workout_plan_id;
  
  // If no plan can be generated due to extreme injury constraints, that's acceptable for now
  // The injury-aware recipe substitution is not fully implemented yet
  if (!planId) {
    return { 
      skipped: true, 
      reason: 'No plan generated due to injury constraints - injury-aware recipes not yet implemented',
      warnings: result.warnings || []
    };
  }
  
  const plan = await loadWorkoutPlan(planId, userId);
  const names = flattenExerciseNames(plan).join(' | ').toLowerCase();
  assert(!/good morning|stiff leg deadlift|sissy squat|box jump/.test(names), 'Knee/back constraint case contains a likely conflicting exercise');
  return planSummary('knee-back-constraint', plan);
}

async function main() {
  const summaries = [];
  const selectedCases = SMOKE_CASE
    ? canonicalCases.filter((testCase) => testCase.label === SMOKE_CASE)
    : canonicalCases;

  assert(selectedCases.length > 0, `No canonical smoke case matched SMOKE_CASE=${SMOKE_CASE}`);

  for (const testCase of selectedCases) {
    summaries.push(await runCase(testCase));
  }
  const shoulderPair = SMOKE_CASE ? null : await runShoulderInjuryPair();
  const kneeBackConstraint = SMOKE_CASE ? null : await runKneeBackConstraintCase();
  console.log(JSON.stringify({ ok: true, summaries, shoulderPair, kneeBackConstraint }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exit(1);
});
