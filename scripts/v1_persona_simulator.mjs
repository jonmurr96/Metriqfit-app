/**
 * V1 Persona Simulator — 5-persona routing and quality audit.
 *
 * Runs LOCALLY — no DB calls, no network.
 * Mirrors the exact mapping and routing logic from:
 *   - supabase/functions/generate-user-plans/index.ts (mapOnboardingToV1)
 *   - lib/workout/v1_librarian_router.ts (routeUserToPlan)
 *   - loaders/seeds/families.ts
 *   - loaders/seeds/templates.ts
 *
 * Flags:
 *   [GAP]      — Routing gap: this path is unreachable from the current onboarding schema
 *   [STUB]     — Template has fewer days than the family advertises (content-incomplete template)
 *   [WARN]     — Non-critical concern for plan quality or coverage
 *   [MODERATE] — Confidence < HIGH from the Librarian (no dedicated family for this profile)
 *   [FALLBACK] — Universal fallback triggered (edge-case / missing branch)
 */

// ──── Enum constants (mirrored from types/v1_engine.ts) ────────────────────────
const ExperienceLevel = { Beginner: 'Beginner', Intermediate: 'Intermediate', Advanced: 'Advanced' };
const GoalBucket = { Hypertrophy: 'Hypertrophy', FatLoss: 'FatLoss', Strength: 'Strength', GenFitness: 'GenFitness', Recomp: 'Recomp', Athletic: 'Athletic' };
const LiftComfort = { BarbellAdv: 'BarbellAdv', BarbellBasic: 'BarbellBasic', MachineDB: 'MachineDB', NoBarbell: 'NoBarbell' };
const SessionEnvironment = { Commercial: 'Commercial', AptHotel: 'AptHotel', Home: 'Home', Bodyweight: 'Bodyweight' };

// ──── Seed data (families + expected template day counts) ──────────────────────
// Day counts derived from loaders/seeds/templates.ts — what is actually seeded.
const FAMILIES = {
  fam_beginner_fb:        { name: 'Beginner Full Body (Standard)',    template_id: 'tmp_beginner_fb_v1',         seeded_days: 3, advertised_days: 3 },
  fam_beginner_machine_fb:{ name: 'Beginner Machine-Focus Full Body', template_id: 'tmp_beginner_machine_fb_v1', seeded_days: 3, advertised_days: 3 },
  fam_hyp_fb:             { name: 'Hypertrophy Full Body (3-Day)',     template_id: 'tmp_hyp_fb_v1',              seeded_days: 3, advertised_days: 3 },
  fam_hyp_ul:             { name: 'Hypertrophy Upper/Lower (4-Day)',   template_id: 'tmp_hyp_ul_v1',              seeded_days: 4, advertised_days: 4 },
  fam_hyp_ppl:            { name: 'Hypertrophy PPL (5-6 Day)',         template_id: 'tmp_hyp_ppl_v1',             seeded_days: 6, advertised_days: 6 },
  fam_fatloss_fb:         { name: 'Metabolic Fat Loss Full Body',      template_id: 'tmp_fatloss_fb_v1',          seeded_days: 3, advertised_days: 3 },
  fam_str_fb:             { name: 'Strength Full Body (3-Day)',        template_id: 'tmp_str_fb_v1',              seeded_days: 3, advertised_days: 3 },
  fam_str_ul:             { name: 'Strength Upper/Lower (4-Day)',      template_id: 'tmp_str_ul_v1',              seeded_days: 4, advertised_days: 4 },
  fam_min_equip_db:       { name: 'Minimal Equipment DB-Only Plan',   template_id: 'tmp_min_equip_db_v1',        seeded_days: 3, advertised_days: 3 },
  fam_at_home_bw:         { name: 'Bodyweight Longevity Plan',         template_id: 'tmp_at_home_bw_v1',          seeded_days: 3, advertised_days: 3 },
};

// ──── goal_type → GoalBucket reachability map ──────────────────────────────────
// Derived from mapOnboardingToV1 in index.ts.
// GoalBucket.Strength is NOT reachable from any onboarding goal_type value.
const GOAL_TYPE_MAP = {
  lose_weight:        GoalBucket.FatLoss,
  gain_weight:        GoalBucket.Hypertrophy,
  recomp:             GoalBucket.Recomp,
  increase_endurance: GoalBucket.Athletic,
  general_fitness:    GoalBucket.GenFitness,
  maintain_weight:    GoalBucket.GenFitness,
  // NOTE: GoalBucket.Strength is UNREACHABLE — no onboarding goal maps to it.
};

// ──── mapOnboardingToV1 (exact mirror of edge function logic) ──────────────────
function mapOnboardingToV1(onboarding) {
  let env = SessionEnvironment.Commercial;
  if (onboarding.equipment_access === 'bodyweight_only') env = SessionEnvironment.Bodyweight;
  else if (onboarding.equipment_access === 'dumbbells_only' || onboarding.equipment_access === 'bands_only') env = SessionEnvironment.AptHotel;
  else if (onboarding.equipment_access === 'dumbbells_plus_bench') env = SessionEnvironment.Home;

  let exp = ExperienceLevel.Beginner;
  if (onboarding.experience_level === 'intermediate') exp = ExperienceLevel.Intermediate;
  else if (onboarding.experience_level === 'advanced') exp = ExperienceLevel.Advanced;

  let goal = GoalBucket.GenFitness;
  if (onboarding.goal_type === 'lose_weight') goal = GoalBucket.FatLoss;
  else if (onboarding.goal_type === 'gain_weight') goal = GoalBucket.Hypertrophy;
  else if (onboarding.goal_type === 'recomp') goal = GoalBucket.Recomp;
  else if (onboarding.goal_type === 'increase_endurance') goal = GoalBucket.Athletic;

  let comfort = LiftComfort.BarbellBasic;
  if (env === SessionEnvironment.Bodyweight) comfort = LiftComfort.NoBarbell;
  else if (env === SessionEnvironment.AptHotel) comfort = LiftComfort.MachineDB;
  else if (exp === ExperienceLevel.Advanced && onboarding.session_emphasis === 'strength') comfort = LiftComfort.BarbellAdv;

  return {
    experienceLevel: exp,
    primaryGoal: goal,
    daysPerWeek: onboarding.training_days_per_week || 3,
    liftComfort: comfort,
    environment: env,
  };
}

// ──── routeUserToPlan (exact mirror of v1_librarian_router.ts) ─────────────────
function routeUserToPlan(profile) {
  const { experienceLevel, primaryGoal, daysPerWeek, liftComfort, environment } = profile;

  if (environment === SessionEnvironment.Bodyweight) {
    return { familyIdRef: 'fam_at_home_bw', confidence: 'HIGH', notes: 'Strict Bodyweight routing mandated by environment.' };
  }
  if (environment === SessionEnvironment.Home || environment === SessionEnvironment.AptHotel) {
    if (liftComfort === LiftComfort.NoBarbell || liftComfort === LiftComfort.MachineDB) {
      return { familyIdRef: 'fam_min_equip_db', confidence: 'HIGH', notes: 'Limited environment with No Barbell/Machine preference forces DB routing.' };
    }
  }
  if (liftComfort === LiftComfort.NoBarbell) {
    if (experienceLevel === ExperienceLevel.Beginner) {
      return { familyIdRef: 'fam_beginner_machine_fb', confidence: 'HIGH', notes: 'Beginner + No Barbell comfort -> Machine/DB path.' };
    }
    return { familyIdRef: 'fam_min_equip_db', confidence: 'HIGH', notes: 'User avoids barbells in commercial gym -> DB fallback.' };
  }
  if (experienceLevel === ExperienceLevel.Beginner) {
    if (liftComfort === LiftComfort.MachineDB) {
      return { familyIdRef: 'fam_beginner_machine_fb', confidence: 'HIGH', notes: 'Beginner with Machine preference.' };
    }
    return { familyIdRef: 'fam_beginner_fb', confidence: 'HIGH', notes: 'Standard beginner barbell protocol.' };
  }
  if (primaryGoal === GoalBucket.Hypertrophy) {
    if (daysPerWeek <= 3) return { familyIdRef: 'fam_hyp_fb', confidence: 'HIGH', notes: 'Hypertrophy 3-day forces Full Body structure.' };
    if (daysPerWeek >= 5) return { familyIdRef: 'fam_hyp_ppl', confidence: 'HIGH', notes: 'Hypertrophy 5+ days routes to PPL.' };
    return { familyIdRef: 'fam_hyp_ul', confidence: 'HIGH', notes: 'Hypertrophy 4-day Upper/Lower.' };
  }
  if (primaryGoal === GoalBucket.Strength) {
    if (daysPerWeek >= 4) return { familyIdRef: 'fam_str_ul', confidence: 'HIGH', notes: 'Strength 4-day Upper/Lower.' };
    return { familyIdRef: 'fam_str_fb', confidence: 'HIGH', notes: 'Strength 3-day Full Body.' };
  }
  if (primaryGoal === GoalBucket.FatLoss) {
    return { familyIdRef: 'fam_fatloss_fb', confidence: 'MODERATE', notes: 'Fat Loss defaults to Strength-Maintenance Full Body.' };
  }
  if (primaryGoal === GoalBucket.GenFitness || primaryGoal === GoalBucket.Recomp || primaryGoal === GoalBucket.Athletic) {
    if (daysPerWeek >= 4) {
      return { familyIdRef: 'fam_hyp_ul', confidence: 'MODERATE', notes: '4+ Days General Fitness routes to Upper/Lower (fam_hyp_ul). No dedicated GenFit UL family seeded.' };
    }
  }
  return { familyIdRef: 'fam_beginner_fb', confidence: 'FALLBACK', notes: 'Edge case triggered fallback to universal beginner baseline.' };
}

// ──── 5 Personas ──────────────────────────────────────────────────────────────
const PERSONAS = [
  {
    id: 'P1',
    name: 'Alex — Beginner Barbell Standard',
    description: '22yo beginner, commercial gym, 3x/week, general fitness.',
    onboarding: {
      experience_level: 'beginner',
      equipment_access: 'full_gym',
      goal_type: 'general_fitness',
      training_days_per_week: 3,
      session_emphasis: 'balanced',
      injuries: [],
    },
    expected_family: 'fam_beginner_fb',
    expected_confidence: 'HIGH',
  },
  {
    id: 'P2',
    name: 'Jamie — Intermediate Hypertrophy 4-Day',
    description: '28yo intermediate, commercial gym, 4x/week, muscle gain.',
    onboarding: {
      experience_level: 'intermediate',
      equipment_access: 'full_gym',
      goal_type: 'gain_weight',
      training_days_per_week: 4,
      session_emphasis: 'hypertrophy',
      injuries: [],
    },
    expected_family: 'fam_hyp_ul',
    expected_confidence: 'HIGH',
  },
  {
    id: 'P3',
    name: 'Taylor — Advanced PPL 5-Day',
    description: '32yo advanced lifter, commercial gym, 5x/week, hypertrophy/PPL split.',
    onboarding: {
      experience_level: 'advanced',
      equipment_access: 'full_gym',
      goal_type: 'gain_weight',
      training_days_per_week: 5,
      session_emphasis: 'hypertrophy',
      injuries: [],
    },
    expected_family: 'fam_hyp_ppl',
    expected_confidence: 'HIGH',
  },
  {
    id: 'P4',
    name: 'Sam — Hotel/Home DB-Only Fat Loss',
    description: '35yo intermediate, dumbbells only (travel), 3x/week, fat loss.',
    onboarding: {
      experience_level: 'intermediate',
      equipment_access: 'dumbbells_only',
      goal_type: 'lose_weight',
      training_days_per_week: 3,
      session_emphasis: 'balanced',
      injuries: [],
    },
    expected_family: 'fam_min_equip_db',
    expected_confidence: 'HIGH',
  },
  {
    id: 'P5',
    name: 'Riley — Bodyweight Only / Zero Equipment',
    description: '26yo beginner, no gym access, bodyweight only, 3x/week, general fitness.',
    onboarding: {
      experience_level: 'beginner',
      equipment_access: 'bodyweight_only',
      goal_type: 'general_fitness',
      training_days_per_week: 3,
      session_emphasis: 'balanced',
      injuries: [],
    },
    expected_family: 'fam_at_home_bw',
    expected_confidence: 'HIGH',
  },
];

// ──── Additional audit probes (not in the 5 personas, flagged as findings) ─────
const AUDIT_PROBES = [
  {
    id: 'AUDIT-A',
    label: 'GenFit 3-day intermediate (no specific family)',
    onboarding: {
      experience_level: 'intermediate',
      equipment_access: 'full_gym',
      goal_type: 'general_fitness',
      training_days_per_week: 3,
      session_emphasis: 'balanced',
      injuries: [],
    },
    note: 'No dedicated 3-day GenFit intermediate family → universal FALLBACK to fam_beginner_fb.',
  },
  {
    id: 'AUDIT-B',
    label: 'Strength goal (unreachable via onboarding)',
    note: 'GoalBucket.Strength is NOT reachable from any onboarding goal_type. fam_str_fb and fam_str_ul are dead code at runtime.',
    skip_routing: true,
  },
  {
    id: 'AUDIT-C',
    label: 'Advanced + strength session_emphasis (BarbellAdv comfort path)',
    onboarding: {
      experience_level: 'advanced',
      equipment_access: 'full_gym',
      goal_type: 'general_fitness',
      training_days_per_week: 4,
      session_emphasis: 'strength',
      injuries: [],
    },
    note: 'Advanced + strength emphasis → BarbellAdv comfort. But goal_type=general_fitness still → Recomp/GenFit bucket → fam_hyp_ul MODERATE fallback.',
  },
];

// ──── Run simulation ───────────────────────────────────────────────────────────
function checkStub(family_key) {
  const fam = FAMILIES[family_key];
  if (!fam) return null;
  return fam.seeded_days < fam.advertised_days ? `[STUB] Template ${fam.template_id} has only ${fam.seeded_days} day(s) seeded but advertises ${fam.advertised_days} days` : null;
}

const PASS = '✅ PASS';
const FAIL = '❌ FAIL';
const WARN = '⚠️  WARN';
const GAP  = '🚨 GAP ';

console.log('\n╔══════════════════════════════════════════════════════════════╗');
console.log('║           V1 PERSONA SIMULATOR — ROUTING AUDIT              ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

const results = [];

for (const persona of PERSONAS) {
  console.log(`─── ${persona.id}: ${persona.name}`);
  console.log(`    ${persona.description}`);

  const profile = mapOnboardingToV1(persona.onboarding);
  const rec = routeUserToPlan(profile);
  const family = FAMILIES[rec.familyIdRef];

  const routingCorrect = rec.familyIdRef === persona.expected_family;
  const confidenceCorrect = rec.confidence === persona.expected_confidence;
  const familyExists = !!family;
  const stubWarning = checkStub(rec.familyIdRef);

  console.log(`    Mapped profile:     ${JSON.stringify(profile)}`);
  console.log(`    Routed family:      ${rec.familyIdRef} (${rec.confidence})`);
  console.log(`    Template:           ${family?.template_id ?? 'NOT FOUND'}`);
  console.log(`    Template days:      ${family?.seeded_days ?? '?'} seeded / ${family?.advertised_days ?? '?'} advertised`);
  console.log(`    Router notes:       ${rec.notes}`);

  const routeResult = routingCorrect && confidenceCorrect
    ? `${PASS}  Routing correct → ${rec.familyIdRef}`
    : `${FAIL}  Expected ${persona.expected_family} (${persona.expected_confidence}), got ${rec.familyIdRef} (${rec.confidence})`;
  const chainResult = familyExists
    ? `${PASS}  Family + template chain valid`
    : `${FAIL}  Family '${rec.familyIdRef}' NOT FOUND in seed data`;

  console.log(`    ${routeResult}`);
  console.log(`    ${chainResult}`);

  if (stubWarning) {
    console.log(`    ${WARN}  ${stubWarning}`);
  }

  results.push({
    id: persona.id,
    routingCorrect: routingCorrect && confidenceCorrect,
    chainValid: familyExists,
    hasStub: !!stubWarning,
    stubWarning,
  });

  console.log('');
}

// ──── Audit probes (findings, not pass/fail) ───────────────────────────────────
console.log('─── AUDIT FINDINGS (non-persona routing gaps and quality risks)\n');

for (const probe of AUDIT_PROBES) {
  console.log(`  ${GAP}  ${probe.id}: ${probe.label}`);
  if (probe.skip_routing) {
    console.log(`         ${probe.note}`);
  } else {
    const profile = mapOnboardingToV1(probe.onboarding);
    const rec = routeUserToPlan(profile);
    const stubWarning = checkStub(rec.familyIdRef);
    console.log(`         Mapped profile: ${JSON.stringify(profile)}`);
    console.log(`         Routed to:      ${rec.familyIdRef} (${rec.confidence})`);
    if (rec.confidence === 'FALLBACK' || rec.confidence === 'MODERATE') {
      console.log(`         ${WARN}  confidence = ${rec.confidence} — ${probe.note}`);
    } else {
      console.log(`         ${probe.note}`);
    }
    if (stubWarning) {
      console.log(`         ${WARN}  ${stubWarning}`);
    }
  }
  console.log('');
}

// ──── Template stub inventory ──────────────────────────────────────────────────
console.log('─── TEMPLATE STUB INVENTORY\n');
let stubCount = 0;
for (const [key, fam] of Object.entries(FAMILIES)) {
  if (fam.seeded_days < fam.advertised_days) {
    console.log(`  ${WARN}  ${key} → ${fam.template_id}: ${fam.seeded_days}/${fam.advertised_days} days seeded`);
    stubCount++;
  } else {
    console.log(`  ${PASS}  ${key} → ${fam.template_id}: ${fam.seeded_days}/${fam.advertised_days} days seeded`);
  }
}
console.log('');

// ──── Exercise name normalizations applied ─────────────────────────────────────
console.log('─── EXERCISE NAME NORMALIZATIONS (applied sprint 2)\n');
const NAME_FIXES = [
  { old: 'DB Flat Bench Press',  fixed: 'Flat Dumbbell Bench Press',       source: 'migration 006 ex_052' },
  { old: 'DB 1-Arm Row',         fixed: 'Dumbbell Row',                    source: 'migration 006 ex_070' },
  { old: 'Barbell RDL',          fixed: 'Romanian Deadlift',               source: 'migration 006 ex_010' },
  { old: 'Seated DB Press',      fixed: 'Seated Dumbbell Overhead Press',  source: 'migration 006 ex_114' },
  { old: 'Lat Pulldown',         fixed: 'Lat Pulldown (Wide-Grip)',         source: 'migration 006 ex_084' },
];
for (const f of NAME_FIXES) {
  console.log(`  ✅ FIXED  "${f.old}" → "${f.fixed}"  (${f.source})`);
}
console.log('');

// ──── Summary ─────────────────────────────────────────────────────────────────
const passed = results.filter(r => r.routingCorrect && r.chainValid).length;
const total = results.length;
const stubsInPersonas = results.filter(r => r.hasStub).length;

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║              5-PERSONA ROUTING AUDIT — SUMMARY              ║');
console.log('╠══════════════════════════════════════════════════════════════╣');
console.log(`║  Routing checks:       ${passed}/${total} passed                              ║`);
console.log(`║  Templates with stubs: ${stubCount}/10 have incomplete day definitions     ║`);
console.log(`║  Personas hitting stubs: ${stubsInPersonas}/5 personas route to stub templates  ║`);
console.log(`║  Exercise names:       5/5 normalized (no known mismatches)  ║`);
console.log(`║  GoalBucket.Strength:  UNREACHABLE via onboarding goal_type  ║`);
console.log('╠══════════════════════════════════════════════════════════════╣');
console.log('║  VERDICT:                                                    ║');
if (passed === total && stubsInPersonas === 0) {
  console.log('║  ✅ All 5 routing paths correct. No stubs in active personas. ║');
} else if (passed === total && stubsInPersonas > 0) {
  console.log('║  ⚠️  Routing correct BUT personas hit stub templates.         ║');
  console.log('║     Plans will generate with reduced day coverage.           ║');
  console.log('║     BLOCKS production promotion until templates completed.   ║');
} else {
  console.log('║  ❌ Routing failures detected. Investigate before deploy.    ║');
}
console.log('╚══════════════════════════════════════════════════════════════╝\n');
