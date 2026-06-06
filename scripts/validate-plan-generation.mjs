#!/usr/bin/env node

import { spawnSync } from 'node:child_process';

const checks = [
  {
    name: 'Scientific meal preferences and hard restrictions',
    command: 'deno',
    args: [
      'test',
      'supabase/functions/generate-user-plans/scientificMealEngine_preference_test.ts',
      '--no-check',
      '--allow-read',
      '--allow-env',
    ],
  },
  {
    name: 'Nutrition persona matrix',
    command: 'deno',
    args: [
      'test',
      'supabase/functions/generate-user-plans/persona_matrix_test.ts',
      '--no-check',
      '--allow-read',
      '--allow-env',
    ],
  },
  {
    name: 'V3 deterministic pipeline contract',
    command: 'deno',
    args: [
      'test',
      'supabase/functions/generate-user-plans/pipelines/v3-pipeline_test.ts',
      '--no-check',
      '--allow-read',
      '--allow-env',
      '--allow-net',
    ],
  },
  {
    name: 'Edge Function type contract',
    command: 'deno',
    args: ['check', 'supabase/functions/generate-user-plans/index.ts'],
  },
];

const failures = [];

for (const check of checks) {
  console.log(`\n== ${check.name} ==`);
  const result = spawnSync(check.command, check.args, {
    stdio: 'inherit',
    shell: false,
  });

  if (result.status !== 0) {
    failures.push(check.name);
  }
}

if (failures.length) {
  console.error('\nPlan generation validation failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('\nPlan generation validation passed.');
