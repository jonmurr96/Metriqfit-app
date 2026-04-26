import { execFileSync } from 'node:child_process';
import test from 'node:test';

test('V1 hydration regression matrix', () => {
  execFileSync('deno', ['run', 'scripts/v1_hydration_regression_check.ts'], {
    cwd: process.cwd(),
    stdio: 'inherit',
  });
});
