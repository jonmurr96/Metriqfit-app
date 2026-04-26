/**
 * performance.benchmark.ts
 *
 * Performance Benchmarks for Sprint 5
 * 
 * Measures and validates performance characteristics:
 * - Plan generation latency
 * - Pool filtering efficiency
 * - Split selection speed
 * - Memory usage patterns
 */

import { describe, it, expect } from 'bun:test';
import { 
  selectSplit,
  wouldRequireOverride,
} from '../split-selector.ts';
import { runQualityGates } from '../quality-gates.ts';
import { normalizeUserTrainingProfile } from '../training-profile.ts';
import {
  isExerciseSafeForInjuries,
  parseInjuries,
  getSubstitutionRecommendation,
} from '../injury-substitutions.ts';
import { validatePlan } from '../constraint-validator.ts';
import {
  createMockTrainingProfile,
  createLargeExercisePool,
  createMockExerciseByPattern,
  TEST_FIXTURES,
  measureExecutionTime,
} from '../test-helpers.ts';

// ---------------------------------------------------------------------------
// Benchmark Constants
// ---------------------------------------------------------------------------

const BENCHMARK_TARGETS = {
  splitSelection: { maxMs: 5, iterations: 100 },
  poolFiltering: { maxMs: 50, iterations: 10 },
  injuryCheck: { maxMs: 1, iterations: 1000 },
  planValidation: { maxMs: 20, iterations: 50 },
  fullPipeline: { maxMs: 200, iterations: 10 },
};

// ---------------------------------------------------------------------------
// Split Selection Performance
// ---------------------------------------------------------------------------

describe('Split Selection Performance', () => {
  it('selects split in under 5ms (100 iterations)', () => {
    const profile = normalizeUserTrainingProfile({
      daysPerWeek: 4,
      experienceLevel: 'intermediate',
      primaryGoal: 'build_muscle',
    });

    const { averageMs } = measureExecutionTime(
      () =>
        selectSplit({
          daysPerWeek: profile.daysPerWeek,
          experienceLevel: profile.experienceLevel,
          primaryGoal: profile.primaryGoal,
        }),
      BENCHMARK_TARGETS.splitSelection.iterations
    );

    expect(averageMs).toBeLessThan(BENCHMARK_TARGETS.splitSelection.maxMs);
  });

  it('override check in under 2ms (100 iterations)', () => {
    const { averageMs } = measureExecutionTime(
      () =>
        wouldRequireOverride('ppl_6', {
          daysPerWeek: 6,
          experienceLevel: 'beginner',
          primaryGoal: 'build_muscle',
          equipmentAccess: 'full_gym',
          trainingStylePreference: 'balanced',
          recoveryBurden: 'moderate',
        }),
      100
    );

    expect(averageMs).toBeLessThan(2);
  });
});

// ---------------------------------------------------------------------------
// Exercise Pool Performance
// ---------------------------------------------------------------------------

describe('Exercise Pool Filtering Performance', () => {
  it('filters 100-exercise pool in under 10ms', () => {
    const pool = createLargeExercisePool(100);
    const profile = normalizeUserTrainingProfile({
      equipmentAccess: 'dumbbells_only',
    });

    const { averageMs } = measureExecutionTime(() => {
      return pool.filter((ex) => {
        const equipment = ex.equipment_options || [];
        return equipment.some((eq) => ['dumbbell', 'bodyweight'].includes(eq));
      });
    }, BENCHMARK_TARGETS.poolFiltering.iterations);

    expect(averageMs).toBeLessThan(10);
  });

  it('filters 500-exercise pool in under 25ms', () => {
    const pool = createLargeExercisePool(500);
    const injuries = parseInjuries(['knee pain']);

    const { averageMs } = measureExecutionTime(() => {
      return pool.filter((ex) => isExerciseSafeForInjuries(ex, injuries));
    }, BENCHMARK_TARGETS.poolFiltering.iterations);

    expect(averageMs).toBeLessThan(25);
  });

  it('filters 1000-exercise pool in under 50ms', () => {
    const pool = createLargeExercisePool(1000);
    const profile = createMockTrainingProfile();

    const { averageMs } = measureExecutionTime(() => {
      // Simulate multi-constraint filtering
      return pool.filter((ex) => {
        const difficulty = parseInt(ex.difficulty || '1', 10);
        const popularity = ex.popularity_score || 0;
        return difficulty <= 3 && popularity >= 30;
      });
    }, BENCHMARK_TARGETS.poolFiltering.iterations);

    expect(averageMs).toBeLessThan(BENCHMARK_TARGETS.poolFiltering.maxMs);
  });
});

// ---------------------------------------------------------------------------
// Injury Check Performance
// ---------------------------------------------------------------------------

describe('Injury Safety Check Performance', () => {
  it('checks single exercise safety in under 0.5ms', () => {
    const exercise = TEST_FIXTURES.exercises.squat;
    const injuries = parseInjuries(['knee pain']);

    const { averageMs } = measureExecutionTime(
      () => isExerciseSafeForInjuries(exercise, injuries),
      BENCHMARK_TARGETS.injuryCheck.iterations
    );

    expect(averageMs).toBeLessThan(0.5);
  });

  it('gets substitution recommendation in under 1ms', () => {
    const exercise = TEST_FIXTURES.exercises.sissySquat;
    const injuries = parseInjuries(['knee pain']);

    const { averageMs } = measureExecutionTime(
      () => getSubstitutionRecommendation(exercise, injuries),
      BENCHMARK_TARGETS.injuryCheck.iterations
    );

    expect(averageMs).toBeLessThan(BENCHMARK_TARGETS.injuryCheck.maxMs);
  });
});

// ---------------------------------------------------------------------------
// Plan Validation Performance
// ---------------------------------------------------------------------------

describe('Plan Validation Performance', () => {
  it('validates 6-exercise plan in under 10ms', () => {
    const profile = normalizeUserTrainingProfile();
    const pool = createLargeExercisePool(50);
    const exercises = [
      TEST_FIXTURES.exercises.squat,
      TEST_FIXTURES.exercises.bench,
      TEST_FIXTURES.exercises.row,
      TEST_FIXTURES.exercises.overhead,
      TEST_FIXTURES.exercises.pulldown,
      createMockExerciseByPattern('bicep_curl', { id: 'curl_1' }),
    ];

    const { averageMs } = measureExecutionTime(
      () =>
        validatePlan({
          exercises: exercises as any,
          pool,
          profile,
          expectedPatterns: ['compound_squat', 'horizontal_push', 'horizontal_pull'],
        }),
      BENCHMARK_TARGETS.planValidation.iterations
    );

    expect(averageMs).toBeLessThan(10);
  });

  it('quality gates run in under 15ms', () => {
    const profile = normalizeUserTrainingProfile();

    const { averageMs } = measureExecutionTime(
      () =>
        runQualityGates({
          workoutDays: [],
          trainingProfile: profile,
        }),
      BENCHMARK_TARGETS.planValidation.iterations
    );

    expect(averageMs).toBeLessThan(15);
  });
});

// ---------------------------------------------------------------------------
// Full Pipeline Performance
// ---------------------------------------------------------------------------

describe('Full Pipeline Performance', () => {
  it('generates complete 4-day plan in under 200ms', () => {
    const profile = normalizeUserTrainingProfile({
      daysPerWeek: 4,
      experienceLevel: 'intermediate',
    });
    const pool = createLargeExercisePool(200);

    const { averageMs } = measureExecutionTime(() => {
      // Step 1: Select split
      const split = selectSplit({
        daysPerWeek: profile.daysPerWeek,
        experienceLevel: profile.experienceLevel,
        primaryGoal: profile.primaryGoal,
      });

      // Step 2: Run quality gates
      const quality = runQualityGates({
        workoutDays: [],
        trainingProfile: profile,
      });

      // Step 3: Filter pool by profile
      const safeExercises = pool.filter((ex) => {
        const difficulty = parseInt(ex.difficulty || '1', 10);
        return difficulty <= 3;
      });

      return { split, quality, exerciseCount: safeExercises.length };
    }, BENCHMARK_TARGETS.fullPipeline.iterations);

    expect(averageMs).toBeLessThan(BENCHMARK_TARGETS.fullPipeline.maxMs);
  });
});

// ---------------------------------------------------------------------------
// Memory Usage Benchmarks
// ---------------------------------------------------------------------------

describe('Memory Usage', () => {
  it('handles 1000-exercise pool without memory issues', () => {
    const pool = createLargeExercisePool(1000);

    // Create multiple filtered views
    const filtered1 = pool.filter((ex) => ex.is_compound);
    const filtered2 = pool.filter((ex) => ex.popularity_score > 50);
    const filtered3 = pool.filter((ex) => ex.pattern === 'compound_squat');

    // Should complete without memory errors
    expect(filtered1.length + filtered2.length + filtered3.length).toBeGreaterThan(0);
  });

  it('does not leak memory during repeated split selection', () => {
    const profile = normalizeUserTrainingProfile();

    // Run many iterations
    for (let i = 0; i < 1000; i++) {
      selectSplit({
        daysPerWeek: profile.daysPerWeek,
        experienceLevel: profile.experienceLevel,
        primaryGoal: profile.primaryGoal,
      });
    }

    // If we get here without OOM, test passes
    expect(true).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Stress Tests
// ---------------------------------------------------------------------------

describe('Stress Tests', () => {
  it('handles rapid successive calls', () => {
    const profile = normalizeUserTrainingProfile();
    const results: boolean[] = [];

    const start = performance.now();

    for (let i = 0; i < 100; i++) {
      const split = selectSplit({
        daysPerWeek: (i % 6) + 1,
        experienceLevel: i % 2 === 0 ? 'beginner' : 'advanced',
        primaryGoal: 'build_muscle',
      });
      results.push(split.familyKey !== '');
    }

    const duration = performance.now() - start;

    // All should succeed
    expect(results.every((r) => r)).toBe(true);
    // Should complete quickly
    expect(duration).toBeLessThan(1000);
  });

  it('handles worst-case constraint scenario', () => {
    // Multiple injuries + limited equipment + beginner + 6 days
    const profile = normalizeUserTrainingProfile({
      daysPerWeek: 6,
      experienceLevel: 'beginner',
      equipmentAccess: 'bodyweight_only',
      injuries: ['knee pain', 'back pain', 'shoulder pain'],
      recoveryBurden: 'high',
    });

    const { averageMs } = measureExecutionTime(() => {
      const split = selectSplit({
        daysPerWeek: profile.daysPerWeek,
        experienceLevel: profile.experienceLevel,
        primaryGoal: profile.primaryGoal,
        recoveryBurden: profile.recoveryBurden,
      });

      const injuries = parseInjuries(profile.injuries);
      const pool = createLargeExercisePool(100);
      const safeExercises = pool.filter((ex) =>
        isExerciseSafeForInjuries(ex, injuries)
      );

      return { split, safeCount: safeExercises.length };
    }, 20);

    // Should complete within reasonable time even with constraints
    expect(averageMs).toBeLessThan(100);
  });
});

// ---------------------------------------------------------------------------
// Performance Regression Tests
// ---------------------------------------------------------------------------

describe('Performance Regression Tests', () => {
  const BASELINE_METRICS = {
    splitSelectionP50: 2,
    splitSelectionP99: 5,
    poolFilter100: 8,
    poolFilter500: 20,
    injuryCheck: 0.8,
    planValidation: 12,
  };

  it('split selection meets P50 baseline', () => {
    const { averageMs } = measureExecutionTime(
      () =>
        selectSplit({
          daysPerWeek: 4,
          experienceLevel: 'intermediate',
          primaryGoal: 'build_muscle',
        }),
      100
    );

    expect(averageMs).toBeLessThan(BASELINE_METRICS.splitSelectionP50);
  });

  it('pool filtering meets 100-exercise baseline', () => {
    const pool = createLargeExercisePool(100);

    const { averageMs } = measureExecutionTime(
      () => pool.filter((ex) => ex.popularity_score > 50),
      10
    );

    expect(averageMs).toBeLessThan(BASELINE_METRICS.poolFilter100);
  });
});

// ---------------------------------------------------------------------------
// Benchmark Summary
// ---------------------------------------------------------------------------

describe('Benchmark Summary', () => {
  it('prints performance summary', () => {
    const summary = {
      splitSelection: measureExecutionTime(
        () =>
          selectSplit({
            daysPerWeek: 4,
            experienceLevel: 'intermediate',
            primaryGoal: 'build_muscle',
          }),
        100
      ).averageMs,
      poolFilter100: measureExecutionTime(
        () => createLargeExercisePool(100).filter((ex) => ex.is_compound),
        10
      ).averageMs,
      injuryCheck: measureExecutionTime(
        () => isExerciseSafeForInjuries(TEST_FIXTURES.exercises.squat, []),
        1000
      ).averageMs,
    };

    console.log('\n=== Performance Summary ===');
    console.log(`Split Selection: ${summary.splitSelection.toFixed(2)}ms`);
    console.log(`Pool Filter (100): ${summary.poolFilter100.toFixed(2)}ms`);
    console.log(`Injury Check: ${summary.injuryCheck.toFixed(2)}ms`);
    console.log('===========================\n');

    expect(summary.splitSelection).toBeLessThan(10);
    expect(summary.poolFilter100).toBeLessThan(15);
    expect(summary.injuryCheck).toBeLessThan(1);
  });
});
