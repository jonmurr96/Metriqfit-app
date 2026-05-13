#!/usr/bin/env node

import { spawnSync } from 'node:child_process';

const roundsArg = process.argv.find((arg) => arg.startsWith('--rounds='));
const rounds = Number.parseInt(roundsArg ? roundsArg.split('=')[1] : '3', 10);
const baseUrl = process.env.BASE_URL || 'http://localhost:8081';

function runStep(label, command, args, env = {}) {
  console.log(`\n▶ ${label}`);
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    env: {
      ...process.env,
      ...env,
    },
  });

  if (result.status !== 0) {
    const code = result.status ?? result.signal ?? 1;
    throw new Error(`${label} failed with exit code ${code}`);
  }
}

console.log(`\n🔍 Running Sentry stress replay against ${baseUrl} for ${rounds} route rounds\n`);

for (let i = 0; i < rounds; i += 1) {
  runStep(
    `Progress route smoke round ${i + 1}/${rounds}`,
    'node',
    ['scripts/progress-routes.smoke.mjs'],
    { BASE_URL: baseUrl },
  );
}

runStep(
  'Edge function verifier',
  'node',
  ['scripts/verify_edge_function.mjs'],
);

console.log('\n✅ Sentry stress replay completed');
