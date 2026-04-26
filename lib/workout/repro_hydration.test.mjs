
import { execFileSync } from 'node:child_process';
import { test } from 'node:test';

test('AptHotel (Dumbbells Only) should hydrate Bulgarian Split Squats', () => {
  execFileSync('deno', ['run', 'scripts/repro_hydration_check.ts'], {
    cwd: process.cwd(),
    stdio: 'inherit',
  });
});
