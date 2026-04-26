import { createClient } from 'npm:@supabase/supabase-js@2';
import { planFamilies } from '../loaders/seeds/families.ts';
import { coreTemplates } from '../loaders/seeds/templates.ts';
import { hydrateTemplate } from '../lib/workout/v1_architect.ts';
import { publicExerciseNameCandidates } from '../lib/workout/v1-public-exercise-aliases.ts';
import {
  ExperienceLevel,
  GoalBucket,
  LiftComfort,
  SessionEnvironment,
} from '../types/v1_engine.ts';

async function loadEnvFile() {
  try {
    const text = await Deno.readTextFile('.env');
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const equalsIndex = trimmed.indexOf('=');
      if (equalsIndex < 0) continue;
      const key = trimmed.slice(0, equalsIndex).trim();
      const value = trimmed.slice(equalsIndex + 1).trim().replace(/^['"]|['"]$/g, '');
      if (key && !Deno.env.get(key)) Deno.env.set(key, value);
    }
  } catch {
    // Environment variables may already be provided by the shell/CI.
  }
}

function generatedV1ExerciseNames() {
  const names = new Set<string>();
  const originalLog = console.log;
  const originalWarn = console.warn;
  console.log = () => undefined;
  console.warn = () => undefined;

  try {
    for (const family of planFamilies) {
      const template = coreTemplates.find((item) => item.external_id === family.template_id);
      if (!template) continue;

      for (const goal of [
        GoalBucket.FatLoss,
        GoalBucket.Hypertrophy,
        GoalBucket.GenFitness,
        GoalBucket.Recomp,
        GoalBucket.Athletic,
        GoalBucket.Strength,
      ]) {
        for (const environment of [
          SessionEnvironment.Commercial,
          SessionEnvironment.AptHotel,
          SessionEnvironment.Bodyweight,
        ]) {
          for (const comfort of [
            LiftComfort.MachineDB,
            LiftComfort.NoBarbell,
            LiftComfort.BarbellBasic,
            LiftComfort.BarbellAdv,
          ]) {
            const plan = hydrateTemplate(
              template,
              family.external_id,
              {
                goal,
                environment,
                comfort,
                injuries: [],
                experience_level: family.experience_level as ExperienceLevel,
                session_duration_min: 60,
                conditioning_goal: goal === GoalBucket.FatLoss || goal === GoalBucket.Athletic,
              },
              template.days_per_week,
            );
            for (const day of plan.days) {
              for (const exercise of day.exercises) names.add(exercise.name);
            }
          }
        }
      }
    }
  } finally {
    console.log = originalLog;
    console.warn = originalWarn;
  }

  return [...names].sort();
}

await loadEnvFile();

const supabaseUrl = Deno.env.get('EXPO_PUBLIC_SUPABASE_URL');
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
}

const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
const generatedNames = generatedV1ExerciseNames();
const lookupNames = [...new Set(generatedNames.flatMap(publicExerciseNameCandidates))];
const { data, error } = await supabase
  .from('exercises')
  .select('name')
  .in('name', lookupNames);

if (error) throw error;

const liveNames = new Set((data || []).map((row: { name: string }) => row.name));
const missing = generatedNames.filter((name) =>
  publicExerciseNameCandidates(name).every((candidate) => !liveNames.has(candidate))
);

console.log('V1 live exercise catalog audit');
console.log(`Generated V1 exercise names: ${generatedNames.length}`);
console.log(`Live lookup candidates: ${lookupNames.length}`);
console.log(`Unresolved generated names: ${missing.length}`);

if (missing.length > 0) {
  for (const name of missing) {
    console.log(`  ${name}`);
  }
  Deno.exit(1);
}

console.log('Result: PASS');
