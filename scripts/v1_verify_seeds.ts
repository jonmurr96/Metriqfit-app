import * as fs from 'fs';
import * as path from 'path';

const ROOT = process.cwd();
const TEMPLATES_PATH = path.resolve(ROOT, 'loaders/seeds/templates.ts');
const EXERCISES_PATH = path.resolve(ROOT, 'loaders/seeds/exercises.ts');
const ENGINE_TYPES_PATH = path.resolve(ROOT, 'types/v1_engine.ts');

function extractReplacementGroupsFromExercises(content: string): string[] {
  const matches = Array.from(content.matchAll(/architectural_group:\s*ReplacementGroup\.([A-Za-z0-9_]+)/g));
  return Array.from(new Set(matches.map(m => m[1])));
}

function extractReplacementGroupsFromTemplates(content: string): string[] {
  const matches = Array.from(content.matchAll(/architectural_group:\s*ReplacementGroup\.([A-Za-z0-9_]+)/g));
  return Array.from(new Set(matches.map(m => m[1])));
}

function extractEnumValues(content: string, enumName: string): string[] {
  const regex = new RegExp(`export enum ${enumName} \\{([^\\}]+)\\}`, 'g');
  const match = regex.exec(content);
  if (!match) return [];
  return match[1]
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('//'))
    .map(line => line.split('=')[0].trim().replace(/,/g, ''));
}

const FAMILIES_PATH = path.resolve(ROOT, 'loaders/seeds/families.ts');

function extractTemplateIdsFromFamilies(content: string): string[] {
  const matches = Array.from(content.matchAll(/template_id:\s*'([A-Za-z0-9_]+)'/g));
  return Array.from(new Set(matches.map(m => m[1])));
}

function extractTemplateIdsFromTemplates(content: string): string[] {
  const matches = Array.from(content.matchAll(/external_id:\s*'([A-Za-z0-9_]+)'/g));
  return Array.from(new Set(matches.map(m => m[1])));
}

function extractFamilyIdsFromFamilies(content: string): string[] {
  const matches = Array.from(content.matchAll(/external_id:\s*'([A-Za-z0-9_]+)'/g));
  return Array.from(new Set(matches.map(m => m[1])));
}

async function runVerification() {
  console.log('--- STARTING SEED INTEGRITY CHECK ---');
  
  const templatesContent = fs.readFileSync(TEMPLATES_PATH, 'utf-8');
  const exercisesContent = fs.readFileSync(EXERCISES_PATH, 'utf-8');
  const familiesContent = fs.readFileSync(FAMILIES_PATH, 'utf-8');
  const engineContent = fs.readFileSync(ENGINE_TYPES_PATH, 'utf-8');
  
  const results: any[] = [];
  
  // 1. Verify ReplacementGroup Enums 
  const enumValues = extractEnumValues(engineContent, 'ReplacementGroup');
  const groupsInTemplates = extractReplacementGroupsFromTemplates(templatesContent);
  const groupsInExercises = extractReplacementGroupsFromExercises(exercisesContent);
  
  const templateEnumErrors: string[] = [];
  groupsInTemplates.forEach(g => {
    if (!enumValues.includes(g)) {
      templateEnumErrors.push(`ReplacementGroup.${g} used in Templates but missing from Enum.`);
    }
  });
  results.push({ target: 'Template ReplacementGroup enum check', pass: templateEnumErrors.length === 0, errors: templateEnumErrors });
  
  const exerciseEnumErrors: string[] = [];
  groupsInExercises.forEach(g => {
    if (!enumValues.includes(g)) {
      exerciseEnumErrors.push(`ReplacementGroup.${g} used in Exercises but missing from Enum.`);
    }
  });
  results.push({ target: 'Exercise ReplacementGroup enum check', pass: exerciseEnumErrors.length === 0, errors: exerciseEnumErrors });
  
  // 2. Critical: Coverage Check (Every group in templates must have at least one exercise)
  const coverageErrors: string[] = [];
  groupsInTemplates.forEach(g => {
    if (!groupsInExercises.includes(g)) {
      coverageErrors.push(`ReplacementGroup.${g} is REQUIRED by templates but has ZERO exercises in the catalog.`);
    }
  });
  results.push({ target: 'Exercise coverage for template slots', pass: coverageErrors.length === 0, errors: coverageErrors });

  // 3. Template Resolution Check (Every family must point to a valid template)
  const familyTemplateErrors: string[] = [];
  const referencedTemplates = extractTemplateIdsFromFamilies(familiesContent);
  const existingTemplates = extractTemplateIdsFromTemplates(templatesContent);
  referencedTemplates.forEach(t => {
    if (!existingTemplates.includes(t)) {
      familyTemplateErrors.push(`Template '${t}' is referenced in families.ts but MISSING from templates.ts`);
    }
  });
  results.push({ target: 'Family to Template resolution check', pass: familyTemplateErrors.length === 0, errors: familyTemplateErrors });
  
  // 4. Volume Check
  const exerciseCount = (exercisesContent.match(/external_id:/g) || []).length;
  console.log(`\nCatalog Volume: ${exerciseCount} exercises found.`);
  const volumePass = exerciseCount >= 75;
  results.push({ target: 'Exercise catalog volume check (min 75)', pass: volumePass, errors: volumePass ? [] : [`Only ${exerciseCount} exercises found. Target is 75-100.`] });

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
    console.log('\n❌ SEED INTEGRITY CHECKS FAILED.');
    process.exit(1);
  }
  console.log('\n✅ SEED INTEGRITY CHECKS PASSED.');
}

runVerification().catch(err => {
  console.error(err);
  process.exit(1);
});
