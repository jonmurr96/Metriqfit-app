import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const EDGE_URL = `${SUPABASE_URL}/functions/v1/generate-user-plans`;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing env. Set EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const publicClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const cutoff = process.env.BACKFILL_CUTOFF || process.argv[2] || new Date(Date.now() - (14 * 24 * 60 * 60 * 1000)).toISOString();
const dryRun = process.argv.includes('--dry-run');
const targetUserIdArg = process.argv.find((arg) => arg.startsWith('--user-id='))?.split('=')[1] || null;

function isStaleRulesFirstPlan(plan) {
  const selectionSource = plan.planner_metadata_json?.selection_source || null;
  return selectionSource !== 'generated_rules_first';
}

async function fetchCandidatePlans() {
  let query = serviceClient
    .from('user_workout_plans')
    .select(`
      id,
      user_id,
      name,
      created_at,
      is_active,
      program_family_key,
      planner_metadata_json
    `)
    .eq('is_active', true)
    .gte('created_at', cutoff)
    .order('created_at', { ascending: false });

  if (targetUserIdArg) {
    query = query.eq('user_id', targetUserIdArg);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to load candidate plans: ${error.message}`);
  }

  return (data || []).filter(isStaleRulesFirstPlan);
}

async function impersonateUser(userId) {
  const { data: userData, error: userError } = await serviceClient.auth.admin.getUserById(userId);
  if (userError || !userData?.user?.email) {
    throw new Error(`Failed to load auth user ${userId}: ${userError?.message || 'missing email'}`);
  }

  const email = userData.user.email;
  const link = await serviceClient.auth.admin.generateLink({ type: 'magiclink', email });
  if (link.error || !link.data?.properties?.email_otp) {
    throw new Error(`Failed to generate magic link for ${userId}: ${link.error?.message || 'missing otp'}`);
  }

  const verify = await publicClient.auth.verifyOtp({
    email,
    token: link.data.properties.email_otp,
    type: 'magiclink',
  });
  if (verify.error || !verify.data?.session?.access_token) {
    throw new Error(`Failed to verify magic link for ${userId}: ${verify.error?.message || 'missing session'}`);
  }

  return {
    email,
    accessToken: verify.data.session.access_token,
  };
}

async function invokePlannerRegeneration(userId, accessToken) {
  const response = await fetch(EDGE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      user_id: userId,
      plan_type: 'workout',
      generation_mode: 'regenerate',
      activation_mode: 'activate',
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Regeneration failed for ${userId} (${response.status}): ${payload?.error || JSON.stringify(payload)}`);
  }
  return payload;
}

async function loadActivePlan(userId) {
  const { data, error } = await serviceClient
    .from('user_workout_plans')
    .select('id, user_id, created_at, is_active, program_family_key, planner_metadata_json')
    .eq('user_id', userId)
    .eq('is_active', true)
    .single();

  if (error || !data) {
    throw new Error(`Failed to load active plan for ${userId}: ${error?.message || 'not found'}`);
  }

  return data;
}

async function main() {
  const candidates = await fetchCandidatePlans();
  const uniqueCandidates = Array.from(
    new Map(candidates.map((plan) => [plan.user_id, plan])).values(),
  );

  if (dryRun) {
    console.log(JSON.stringify({
      ok: true,
      cutoff,
      dryRun: true,
      candidateCount: uniqueCandidates.length,
      candidates: uniqueCandidates,
    }, null, 2));
    return;
  }

  const results = [];
  for (const candidate of uniqueCandidates) {
    const { email, accessToken } = await impersonateUser(candidate.user_id);
    const payload = await invokePlannerRegeneration(candidate.user_id, accessToken);
    const activePlan = await loadActivePlan(candidate.user_id);
    results.push({
      email,
      userId: candidate.user_id,
      previousPlanId: candidate.id,
      previousFamilyKey: candidate.program_family_key,
      previousSelectionSource: candidate.planner_metadata_json?.selection_source || null,
      runId: payload.runId || payload.run_id || null,
      newPlanId: activePlan.id,
      newFamilyKey: activePlan.program_family_key,
      newSelectionSource: activePlan.planner_metadata_json?.selection_source || null,
      validationScore: activePlan.planner_metadata_json?.quality_gate?.validation_score || null,
    });
  }

  console.log(JSON.stringify({
    ok: true,
    cutoff,
    candidateCount: uniqueCandidates.length,
    regeneratedCount: results.length,
    results,
  }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, cutoff, error: error.message }, null, 2));
  process.exit(1);
});
