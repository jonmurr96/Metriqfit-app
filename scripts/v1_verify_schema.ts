import * as fs from 'fs';
import * as path from 'path';

const ROOT = process.cwd();
const ENGINE_TYPES_PATH = path.resolve(ROOT, 'types/v1_engine.ts');
const SQL_MIGRATION_PATH = path.resolve(ROOT, 'supabase/migrations/080_v1_workout_engine_schema.sql');
const TRACKING_MIGRATION_PATH = path.resolve(ROOT, 'supabase/migrations/082_v1_workout_engine_tracking.sql');
const TEMPLATES_PATH = path.resolve(ROOT, 'loaders/seeds/templates.ts');
const ROUTER_PATH = path.resolve(ROOT, 'lib/workout/v1_librarian_router.ts');

function extractTsEnum(content: string, enumName: string): string[] {
  const regex = new RegExp(`export enum ${enumName} \\{([^\\}]+)\\}`, 'g');
  const match = regex.exec(content);
  if (!match) return [];
  return match[1]
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('//'))
    .map(line => {
      const parts = line.split('=');
      return parts[1] ? parts[1].trim().replace(/['",]/g, '') : parts[0].trim().replace(/[,]/g, '');
    });
}

function verifySqlEnum(sql: string, enumName: string, expectedValues: string[]): { pass: boolean; errors: string[] } {
  const errors: string[] = [];
  const regex = new RegExp(`CREATE TYPE ${enumName} AS ENUM\\s*\\(([^)]+)\\)`, 'i');
  const match = sql.match(regex);
  
  if (!match) {
    return { pass: false, errors: [`Enum ${enumName} not found in SQL.`] };
  }
  
  const sqlValues = match[1].split(',').map(v => v.trim().replace(/'/g, ''));
  
  expectedValues.forEach(val => {
    if (!sqlValues.includes(val)) {
      errors.push(`Value "${val}" missing from SQL enum ${enumName}.`);
    }
  });
  
  sqlValues.forEach(val => {
    if (!expectedValues.includes(val)) {
      errors.push(`Value "${val}" in SQL enum ${enumName} but missing from TypeScript.`);
    }
  });
  
  return { pass: errors.length === 0, errors };
}

async function runVerification() {
  console.log('--- STARTING CANONICAL DRIFT CHECK ---');
  
  const engineContent = fs.readFileSync(ENGINE_TYPES_PATH, 'utf-8');
  const sqlCore = fs.readFileSync(SQL_MIGRATION_PATH, 'utf-8');
  const sqlTracking = fs.readFileSync(TRACKING_MIGRATION_PATH, 'utf-8');
  const templatesContent = fs.readFileSync(TEMPLATES_PATH, 'utf-8');
  const routerCode = fs.readFileSync(ROUTER_PATH, 'utf-8');
  
  const allSql = sqlCore + '\n' + sqlTracking;
  const results: any[] = [];
  
  // 1. Verify SQL Enums
  const enumsToCheck = [
    { name: 'experience_level', tsName: 'ExperienceLevel' },
    { name: 'goal_bucket', tsName: 'GoalBucket' },
    { name: 'training_style', tsName: 'TrainingStyle' },
    { name: 'lift_comfort', tsName: 'LiftComfort' },
    { name: 'session_environment', tsName: 'SessionEnvironment' },
    { name: 'progression_model', tsName: 'ProgressionModel' },
    { name: 'day_type', tsName: 'DayType' },
    { name: 'slot_archetype', tsName: 'SlotArchetype' },
    { name: 'replacement_group', tsName: 'ReplacementGroup' },
    { name: 'movement_pattern', tsName: 'MovementPattern' },
    { name: 'exercise_tier', tsName: 'ExerciseTier' },
    { name: 'equipment_category', tsName: 'EquipmentCategory' },
  ];
  
  for (const item of enumsToCheck) {
    const tsValues = extractTsEnum(engineContent, item.tsName);
    const res = verifySqlEnum(allSql, item.name, tsValues);
    results.push({ target: item.name, ...res });
  }
  
  // 2. Verify Family ID consistency
  // Extracting from coreFamilies array in templates.ts
  const familyIdsInSeeds = Array.from(templatesContent.matchAll(/external_id:\s*'([^']+)'/g)).map(m => m[1]);
  const familyIdErrors: string[] = [];
  
  const routerIdMatches = Array.from(routerCode.matchAll(/familyIdRef:\s*'([^']+)'/g)).map(m => m[1]);
  
  familyIdsInSeeds.forEach(id => {
    if (!routerCode.includes(id)) {
      familyIdErrors.push(`Seed Family ID "${id}" NOT matched in Librarian Router.`);
    }
  });
  
  routerIdMatches.forEach(id => {
    if (!familyIdsInSeeds.includes(id)) {
      familyIdErrors.push(`Router references unknown Family ID "${id}".`);
    }
  });
  
  results.push({ target: 'Family ID consistency', pass: familyIdErrors.length === 0, errors: familyIdErrors });
  
  // Summary
  console.log('\n--- VERIFICATION RESULTS ---');
  results.forEach(r => {
    if (r.pass) {
      console.log(`✅ [PASS] ${r.target}`);
    } else {
      console.log(`❌ [FAIL] ${r.target}`);
      r.errors.forEach((e: string) => console.log(`   - ${e}`));
    }
  });
  
  const allPass = results.every(r => r.pass);
  if (!allPass) {
    process.exit(1);
  }
  console.log('\n✅ ALL CANONICAL DRIFT CHECKS PASSED.');
}

runVerification().catch(err => {
  console.error(err);
  process.exit(1);
});
