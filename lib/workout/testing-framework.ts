/**
 * testing-framework.ts
 *
 * Testing & Validation Framework
 * Part of Phase 5: Quality Assurance
 *
 * Comprehensive testing utilities including:
 * - Unit tests for calculation functions
 * - Integration tests for program generation
 * - Property-based testing
 * - Performance benchmarks
 * - Assertion helpers
 */

import type { ExperienceLevel, PrimaryGoal } from './training-profile.ts';
import type { DayRecipe } from './exercise-recipes-by-experience.ts';
import type { PeriodizationConfig, RecoveryScore } from './periodization-system.ts';
import type { ProgramWithRecovery } from './recovery-system.ts';

// ---------------------------------------------------------------------------
// Test Types
// ---------------------------------------------------------------------------

export type TestResult = {
  name: string;
  passed: boolean;
  duration: number; // ms
  error?: string;
  details?: Record<string, unknown>;
};

export type TestSuite = {
  name: string;
  tests: TestResult[];
  passed: number;
  failed: number;
  duration: number;
  timestamp: string;
};

export type ValidationRule<T> = {
  name: string;
  validate: (input: T) => boolean;
  message: string;
  severity: 'error' | 'warning' | 'info';
};

export type BenchmarkResult = {
  name: string;
  operations: number;
  duration: number;
  opsPerSecond: number;
  memoryUsage?: number;
};

// ---------------------------------------------------------------------------
// Assertion Helpers
// ---------------------------------------------------------------------------

export function assertEquals<T>(actual: T, expected: T, message?: string): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      message || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
    );
  }
}

export function assertTrue(value: boolean, message?: string): void {
  if (!value) {
    throw new Error(message || 'Expected true, got false');
  }
}

export function assertFalse(value: boolean, message?: string): void {
  if (value) {
    throw new Error(message || 'Expected false, got true');
  }
}

export function assertInRange(value: number, min: number, max: number, message?: string): void {
  if (value < min || value > max) {
    throw new Error(message || `Expected ${value} to be in range [${min}, ${max}]`);
  }
}

export function assertNotNull<T>(value: T | null | undefined, message?: string): T {
  if (value === null || value === undefined) {
    throw new Error(message || 'Expected non-null value');
  }
  return value;
}

export function assertArrayLength<T>(arr: T[], length: number, message?: string): void {
  if (arr.length !== length) {
    throw new Error(message || `Expected array length ${length}, got ${arr.length}`);
  }
}

// ---------------------------------------------------------------------------
// Test Runner
// ---------------------------------------------------------------------------

export class TestRunner {
  private suites: TestSuite[] = [];
  private currentSuite: TestSuite | null = null;

  describe(name: string, fn: () => void): void {
    this.currentSuite = {
      name,
      tests: [],
      passed: 0,
      failed: 0,
      duration: 0,
      timestamp: new Date().toISOString(),
    };

    const startTime = performance.now();
    fn();
    this.currentSuite.duration = performance.now() - startTime;

    this.suites.push(this.currentSuite);
    this.currentSuite = null;
  }

  it(name: string, fn: () => void): void {
    if (!this.currentSuite) {
      throw new Error('Test must be inside a describe block');
    }

    const startTime = performance.now();
    const result: TestResult = {
      name,
      passed: false,
      duration: 0,
    };

    try {
      fn();
      result.passed = true;
      this.currentSuite.passed++;
    } catch (error) {
      result.error = error instanceof Error ? error.message : String(error);
      this.currentSuite.failed++;
    }

    result.duration = performance.now() - startTime;
    this.currentSuite.tests.push(result);
  }

  async itAsync(name: string, fn: () => Promise<void>): Promise<void> {
    if (!this.currentSuite) {
      throw new Error('Test must be inside a describe block');
    }

    const startTime = performance.now();
    const result: TestResult = {
      name,
      passed: false,
      duration: 0,
    };

    try {
      await fn();
      result.passed = true;
      this.currentSuite.passed++;
    } catch (error) {
      result.error = error instanceof Error ? error.message : String(error);
      this.currentSuite.failed++;
    }

    result.duration = performance.now() - startTime;
    this.currentSuite.tests.push(result);
  }

  getResults(): TestSuite[] {
    return this.suites;
  }

  getSummary(): {
    totalSuites: number;
    totalTests: number;
    passed: number;
    failed: number;
    duration: number;
    successRate: number;
  } {
    const totalTests = this.suites.reduce((sum, s) => sum + s.tests.length, 0);
    const passed = this.suites.reduce((sum, s) => sum + s.passed, 0);
    const failed = this.suites.reduce((sum, s) => sum + s.failed, 0);
    const duration = this.suites.reduce((sum, s) => sum + s.duration, 0);

    return {
      totalSuites: this.suites.length,
      totalTests,
      passed,
      failed,
      duration,
      successRate: totalTests > 0 ? (passed / totalTests) * 100 : 0,
    };
  }

  printResults(): void {
    const summary = this.getSummary();

    console.log('\n' + '='.repeat(80));
    console.log('TEST RESULTS');
    console.log('='.repeat(80));

    this.suites.forEach((suite) => {
      console.log(`\n${suite.name}`);
      console.log('-'.repeat(80));

      suite.tests.forEach((test) => {
        const status = test.passed ? '✅ PASS' : '❌ FAIL';
        console.log(`  ${status} ${test.name} (${test.duration.toFixed(2)}ms)`);
        if (test.error) {
          console.log(`      Error: ${test.error}`);
        }
      });

      console.log(`\n  Suite Summary: ${suite.passed}/${suite.tests.length} passed`);
    });

    console.log('\n' + '='.repeat(80));
    console.log(`Total: ${summary.passed}/${summary.totalTests} passed (${summary.successRate.toFixed(1)}%)`);
    console.log(`Duration: ${summary.duration.toFixed(2)}ms`);
    console.log('='.repeat(80) + '\n');
  }
}

// ---------------------------------------------------------------------------
// Property-Based Testing
// ---------------------------------------------------------------------------

export function generateRandomExperienceLevel(): ExperienceLevel {
  const levels: ExperienceLevel[] = ['beginner', 'intermediate', 'advanced'];
  return levels[Math.floor(Math.random() * levels.length)];
}

export function generateRandomGoal(): PrimaryGoal {
  const goals: PrimaryGoal[] = ['lose_fat', 'build_muscle', 'build_strength', 'general_fitness'];
  return goals[Math.floor(Math.random() * goals.length)];
}

export function generateRandomMetrics(count: number = 7): Array<{
  sleepHours: number;
  sleepQuality: string;
  sorenessLevel: number;
  energyLevel: number;
}> {
  return Array.from({ length: count }, () => ({
    sleepHours: 5 + Math.random() * 4, // 5-9 hours
    sleepQuality: ['poor', 'fair', 'good', 'excellent'][Math.floor(Math.random() * 4)],
    sorenessLevel: Math.floor(Math.random() * 5) + 1,
    energyLevel: Math.floor(Math.random() * 5) + 1,
  }));
}

export function forAll<T>(
  generator: () => T,
  property: (input: T) => boolean,
  iterations: number = 100
): { passed: boolean; failures: T[] } {
  const failures: T[] = [];

  for (let i = 0; i < iterations; i++) {
    const input = generator();
    if (!property(input)) {
      failures.push(input);
    }
  }

  return {
    passed: failures.length === 0,
    failures,
  };
}

// ---------------------------------------------------------------------------
// Performance Benchmarking
// ---------------------------------------------------------------------------

export function benchmark(name: string, fn: () => void, iterations: number = 1000): BenchmarkResult {
  // Warm up
  for (let i = 0; i < 10; i++) {
    fn();
  }

  // Measure
  const startTime = performance.now();
  const startMemory = (performance as any).memory?.usedJSHeapSize;

  for (let i = 0; i < iterations; i++) {
    fn();
  }

  const duration = performance.now() - startTime;
  const endMemory = (performance as any).memory?.usedJSHeapSize;

  return {
    name,
    operations: iterations,
    duration,
    opsPerSecond: (iterations / duration) * 1000,
    memoryUsage: startMemory && endMemory ? endMemory - startMemory : undefined,
  };
}

export function printBenchmark(result: BenchmarkResult): void {
  console.log(`\n${result.name}`);
  console.log(`  Operations: ${result.operations.toLocaleString()}`);
  console.log(`  Duration: ${result.duration.toFixed(2)}ms`);
  console.log(`  Ops/sec: ${Math.round(result.opsPerSecond).toLocaleString()}`);
  if (result.memoryUsage) {
    console.log(`  Memory: ${(result.memoryUsage / 1024 / 1024).toFixed(2)}MB`);
  }
}

// ---------------------------------------------------------------------------
// Validation Framework
// ---------------------------------------------------------------------------

export class Validator<T> {
  private rules: ValidationRule<T>[] = [];

  addRule(rule: ValidationRule<T>): this {
    this.rules.push(rule);
    return this;
  }

  validate(input: T): Array<{ passed: boolean; message: string; severity: string }> {
    return this.rules.map((rule) => ({
      passed: rule.validate(input),
      message: rule.message,
      severity: rule.severity,
    }));
  }

  isValid(input: T): boolean {
    return this.validate(input).every((r) => r.passed || r.severity !== 'error');
  }
}

// ---------------------------------------------------------------------------
// Program Validators
// ---------------------------------------------------------------------------

export function createProgramValidator(): Validator<ProgramWithRecovery> {
  const validator = new Validator<ProgramWithRecovery>();

  // Basic structure validation
  validator.addRule({
    name: 'has_valid_id',
    validate: (p) => typeof p.programId === 'string' && p.programId.length > 0,
    message: 'Program must have a valid ID',
    severity: 'error',
  });

  validator.addRule({
    name: 'has_weeks',
    validate: (p) => Array.isArray(p.weeks) && p.weeks.length > 0,
    message: 'Program must have at least one week',
    severity: 'error',
  });

  validator.addRule({
    name: 'current_week_valid',
    validate: (p) => p.currentWeek >= 1 && p.currentWeek <= p.totalWeeks,
    message: 'Current week must be within program range',
    severity: 'error',
  });

  // Volume validation
  validator.addRule({
    name: 'min_exercises_per_day',
    validate: (p) => {
      const minExercises = p.profile.experienceLevel === 'beginner' ? 4 : 5;
      return p.weeks.every((w) => w.days.every((d) => d.exercises.length >= minExercises));
    },
    message: 'Each day must have minimum exercises for experience level',
    severity: 'error',
  });

  validator.addRule({
    name: 'max_exercises_per_day',
    validate: (p) => p.weeks.every((w) => w.days.every((d) => d.exercises.length <= 12)),
    message: 'No day should exceed 12 exercises',
    severity: 'warning',
  });

  // Recovery validation
  validator.addRule({
    name: 'recovery_tracking_enabled',
    validate: (p) => p.recoveryTracking !== undefined,
    message: 'Program should have recovery tracking enabled',
    severity: 'warning',
  });

  validator.addRule({
    name: 'adjustments_within_range',
    validate: (p) => {
      if (!p.adjustments) return true;
      return (
        p.adjustments.volumeReduction >= 0 &&
        p.adjustments.volumeReduction <= 1 &&
        (p.adjustments.intensityCap === null ||
          (p.adjustments.intensityCap >= 1 && p.adjustments.intensityCap <= 10))
      );
    },
    message: 'Adjustment values must be within valid ranges',
    severity: 'error',
  });

  return validator;
}

export function createRecipeValidator(): Validator<DayRecipe> {
  const validator = new Validator<DayRecipe>();

  validator.addRule({
    name: 'has_name',
    validate: (r) => typeof r.name === 'string' && r.name.length > 0,
    message: 'Recipe must have a name',
    severity: 'error',
  });

  validator.addRule({
    name: 'has_slots',
    validate: (r) => Array.isArray(r.slots) && r.slots.length > 0,
    message: 'Recipe must have exercise slots',
    severity: 'error',
  });

  validator.addRule({
    name: 'total_sets_matches',
    validate: (r) => r.totalSets === r.slots.reduce((sum, s) => sum + s.sets, 0),
    message: 'Total sets must match sum of slot sets',
    severity: 'error',
  });

  validator.addRule({
    name: 'positive_duration',
    validate: (r) => r.estimatedDurationMin > 0 && r.estimatedDurationMin <= 180,
    message: 'Duration must be between 1-180 minutes',
    severity: 'warning',
  });

  return validator;
}

// ---------------------------------------------------------------------------
// Test Data Generators
// ---------------------------------------------------------------------------

export const TestData = {
  users: {
    beginner: {
      experienceLevel: 'beginner' as const,
      primaryGoal: 'build_muscle' as const,
      daysPerWeek: 3,
      sessionDurationMin: 45,
      equipmentAccess: 'full_gym',
    },
    intermediate: {
      experienceLevel: 'intermediate' as const,
      primaryGoal: 'build_muscle' as const,
      daysPerWeek: 4,
      sessionDurationMin: 60,
      equipmentAccess: 'full_gym',
    },
    advanced: {
      experienceLevel: 'advanced' as const,
      primaryGoal: 'build_strength' as const,
      daysPerWeek: 5,
      sessionDurationMin: 75,
      equipmentAccess: 'full_gym',
    },
  },

  metrics: {
    excellent: {
      sleepHours: 8.5,
      sleepQuality: 'excellent' as const,
      sorenessLevel: 1 as const,
      energyLevel: 5 as const,
      stressLevel: 1 as const,
      motivationLevel: 'high' as const,
    },
    good: {
      sleepHours: 7.5,
      sleepQuality: 'good' as const,
      sorenessLevel: 2 as const,
      energyLevel: 4 as const,
      stressLevel: 2 as const,
      motivationLevel: 'high' as const,
    },
    poor: {
      sleepHours: 5,
      sleepQuality: 'poor' as const,
      sorenessLevel: 4 as const,
      energyLevel: 2 as const,
      stressLevel: 4 as const,
      motivationLevel: 'low' as const,
    },
  },
};

// ---------------------------------------------------------------------------
// Export Test Runner Singleton
// ---------------------------------------------------------------------------

export const testRunner = new TestRunner();
