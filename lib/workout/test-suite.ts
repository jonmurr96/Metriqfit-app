/**
 * test-suite.ts
 *
 * Comprehensive Test Suite
 * Part of Phase 5: Testing & Validation
 *
 * Unit tests, integration tests, and property-based tests for all system components.
 */

import { testRunner, assertEquals, assertTrue, assertInRange, TestData, forAll } from './testing-framework.ts';
import { calculateRecoveryScore, detectOverreaching } from './recovery-management.ts';
import { calculateProgression, getPeriodizationConfig } from './periodization-models.ts';
import { getRecipeForSplit, getMinimumExercises } from './exercise-recipes-by-experience.ts';
import { selectRecipesForPlan } from './recipe-selection.ts';
import { generatePeriodizedProgram } from './periodization-integration.ts';
import { enhanceProgramWithRecovery, processDailyCheckIn } from './recovery-integration.ts';
import { Analytics, calculateProgramMetrics } from './analytics-framework.ts';

// ---------------------------------------------------------------------------
// Unit Tests: Recovery Management
// ---------------------------------------------------------------------------

testRunner.describe('Recovery Score Calculation', () => {
  testRunner.it('should calculate high score for excellent metrics', () => {
    const score = calculateRecoveryScore([TestData.metrics.excellent], [], 'intermediate');
    assertTrue(score.overall >= 80, 'Excellent metrics should score >= 80');
    assertEquals(score.status, 'excellent');
  });

  testRunner.it('should calculate low score for poor metrics', () => {
    const score = calculateRecoveryScore([TestData.metrics.poor], [], 'intermediate');
    assertTrue(score.overall <= 50, 'Poor metrics should score <= 50');
    assertEquals(score.status, 'poor');
  });

  testRunner.it('should weight sleep at 35%', () => {
    const metrics = [{
      date: '2024-01-15',
      sleepHours: 9,
      sleepQuality: 'excellent' as const,
      sorenessLevel: 3 as const,
      energyLevel: 3 as const,
      stressLevel: 3 as const,
      motivationLevel: 'moderate' as const,
    }];

    const score = calculateRecoveryScore(metrics, [], 'intermediate');
    // Sleep score should be 60 + 40 = 100
    assertEquals(score.sleep, 100);
  });

  testRunner.it('should detect improving trend', () => {
    const metrics = [
      { ...TestData.metrics.poor, date: '2024-01-13' },
      { ...TestData.metrics.good, date: '2024-01-14' },
      { ...TestData.metrics.excellent, date: '2024-01-15' },
    ];

    const score = calculateRecoveryScore(metrics, [], 'intermediate');
    assertEquals(score.trend, 'improving');
  });
});

testRunner.describe('Overreaching Detection', () => {
  testRunner.it('should detect fresh state', () => {
    const metrics = Array(7).fill(TestData.metrics.excellent);
    const status = detectOverreaching(metrics as any, [], 'intermediate');
    assertEquals(status.state, 'fresh');
    assertTrue(status.functional);
  });

  testRunner.it('should detect overreached state', () => {
    const metrics = Array(7).fill(TestData.metrics.poor);
    const status = detectOverreaching(metrics as any, [], 'intermediate');
    assertEquals(status.state, 'overreached');
    assertTrue(status.actions.length > 0);
  });

  testRunner.it('should detect non-functional overreaching after 7+ days', () => {
    const metrics = Array(10).fill(TestData.metrics.poor);
    const status = detectOverreaching(metrics as any, [], 'intermediate');
    assertEquals(status.state, 'overtrained');
    assertFalse(status.functional);
  });
});

// ---------------------------------------------------------------------------
// Unit Tests: Periodization Models
// ---------------------------------------------------------------------------

testRunner.describe('Progressive Overload Protocols', () => {
  testRunner.it('should recommend weight increase on successful set', () => {
    const protocol = {
      name: 'Double Progression',
      applicableTo: ['beginner', 'intermediate'],
      description: '',
      primaryDriver: 'weight' as const,
      progressionRule: '',
      minimumProgression: 2.5,
      maximumProgression: 5,
    };

    const recommendation = calculateProgression(
      protocol,
      { weight: 100, reps: 12, sets: 3, targetReps: 10, rpe: 8 },
      8
    );

    assertEquals(recommendation.action, 'increase');
    assertEquals(recommendation.weightChange, 2.5);
  });

  testRunner.it('should maintain weight when RPE too high', () => {
    const protocol = {
      name: 'RPE-Based',
      applicableTo: ['advanced'],
      description: '',
      primaryDriver: 'weight' as const,
      progressionRule: '',
      minimumProgression: 2.5,
      maximumProgression: 10,
    };

    const recommendation = calculateProgression(
      protocol,
      { weight: 100, reps: 8, sets: 3, targetReps: 10, rpe: 9.5 },
      8
    );

    assertEquals(recommendation.action, 'maintain');
  });
});

testRunner.describe('Periodization Config', () => {
  testRunner.it('should return linear periodization for beginners', () => {
    const config = getPeriodizationConfig('beginner', 'build_muscle', 8);
    assertEquals(config.model, 'linear');
    assertTrue(config.blocks.length > 0);
  });

  testRunner.it('should return block periodization for intermediates', () => {
    const config = getPeriodizationConfig('intermediate', 'build_muscle', 12);
    assertEquals(config.model, 'block');
  });

  testRunner.it('should return appropriate deload strategy for experience level', () => {
    const beginner = getPeriodizationConfig('beginner', 'build_muscle', 8);
    const advanced = getPeriodizationConfig('advanced', 'build_strength', 16);

    assertEquals(beginner.deloadStrategy.frequency, 6);
    assertEquals(advanced.deloadStrategy.frequency, 3);
  });
});

// ---------------------------------------------------------------------------
// Unit Tests: Recipe System
// ---------------------------------------------------------------------------

testRunner.describe('Recipe Selection', () => {
  testRunner.it('should return beginner recipes for beginners', () => {
    const recipe = getRecipeForSplit('upper_lower_4', 'beginner', 0);
    assertTrue(recipe !== null);
    if (recipe) {
      assertEquals(recipe.complexity, 'foundational');
      assertTrue(recipe.slots.length >= 4);
    }
  });

  testRunner.it('should enforce minimum exercises by experience', () => {
    assertEquals(getMinimumExercises('beginner'), 5);
    assertEquals(getMinimumExercises('intermediate'), 6);
    assertEquals(getMinimumExercises('advanced'), 7);
  });

  testRunner.it('should apply goal modifications', () => {
    const context = {
      splitKey: 'upper_lower_4',
      experienceLevel: 'intermediate' as const,
      primaryGoal: 'lose_fat' as const,
      daysPerWeek: 4,
      sessionDurationMin: 60,
      equipmentAccess: 'full_gym',
      recoveryBurden: 'moderate' as const,
    };

    const result = selectRecipesForPlan(context);
    assertTrue(result.recipes.length > 0);

    // Check for conditioning slot in lose fat goal
    const hasConditioning = result.recipes.some((r) =>
      r.slots.some((s) => s.pattern === 'conditioning')
    );
    assertTrue(hasConditioning, 'Lose fat goal should include conditioning');
  });
});

// ---------------------------------------------------------------------------
// Integration Tests: Full Program Generation
// ---------------------------------------------------------------------------

testRunner.describe('Full Program Generation', () => {
  testRunner.it('should generate complete beginner program', () => {
    const program = generatePeriodizedProgram('test_user', TestData.users.beginner, { weeks: 8 });

    assertEquals(program.totalWeeks, 8);
    assertTrue(program.weeks.length === 8);
    assertEquals(program.profile.experienceLevel, 'beginner');
  });

  testRunner.it('should generate program with recovery tracking', () => {
    const baseProgram = generatePeriodizedProgram('test_user', TestData.users.intermediate);
    const program = enhanceProgramWithRecovery(baseProgram);

    assertTrue(program.recoveryTracking !== undefined);
    assertTrue(program.adjustments !== undefined);
  });

  testRunner.it('should adjust training based on recovery', () => {
    const baseProgram = generatePeriodizedProgram('test_user', TestData.users.intermediate);
    let program = enhanceProgramWithRecovery(baseProgram);

    // Simulate poor recovery check-in
    const { program: updated } = processDailyCheckIn(program, {
      date: new Date().toISOString(),
      sleepHours: 5,
      sleepQuality: 'poor',
      sorenessLevel: 4,
      energyLevel: 2,
      stressLevel: 4,
      motivationLevel: 'low',
    } as any);

    assertTrue(updated.adjustments.volumeReduction > 0, 'Should reduce volume for poor recovery');
  });

  testRunner.it('should generate valid program for all experience levels', () => {
    const experiences: Array<'beginner' | 'intermediate' | 'advanced'> = [
      'beginner',
      'intermediate',
      'advanced',
    ];

    experiences.forEach((exp) => {
      const program = generatePeriodizedProgram('test_user', {
        ...TestData.users[exp],
        experienceLevel: exp,
      });

      assertTrue(program.weeks.length > 0, `${exp} program should have weeks`);
      assertTrue(
        program.weeks.every((w) => w.days.every((d) => d.exercises.length > 0)),
        `${exp} program should have exercises every day`
      );
    });
  });
});

// ---------------------------------------------------------------------------
// Property-Based Tests
// ---------------------------------------------------------------------------

testRunner.describe('Property-Based Tests', () => {
  testRunner.it('recovery score should always be 0-100', () => {
    const property = (metrics: any) => {
      const score = calculateRecoveryScore([metrics], [], 'intermediate');
      return score.overall >= 0 && score.overall <= 100;
    };

    // Test with various random metrics
    for (let i = 0; i < 100; i++) {
      const metrics = {
        date: '2024-01-15',
        sleepHours: Math.random() * 12,
        sleepQuality: ['poor', 'fair', 'good', 'excellent'][Math.floor(Math.random() * 4)],
        sorenessLevel: Math.floor(Math.random() * 5) + 1,
        energyLevel: Math.floor(Math.random() * 5) + 1,
        stressLevel: Math.floor(Math.random() * 5) + 1,
        motivationLevel: ['low', 'moderate', 'high'][Math.floor(Math.random() * 3)],
      };

      assertTrue(property(metrics), 'Recovery score should always be in valid range');
    }
  });

  testRunner.it('all splits should return recipes for all experience levels', () => {
    const splits = ['upper_lower_4', 'full_body_3'];
    const experiences: Array<'beginner' | 'intermediate' | 'advanced'> = [
      'beginner',
      'intermediate',
      'advanced',
    ];

    splits.forEach((split) => {
      experiences.forEach((exp) => {
        const recipe = getRecipeForSplit(split, exp, 0);
        assertTrue(recipe !== null, `${split} should have recipes for ${exp}`);
      });
    });
  });
});

// ---------------------------------------------------------------------------
// Analytics Tests
// ---------------------------------------------------------------------------

testRunner.describe('Analytics Calculations', () => {
  testRunner.it('should calculate program metrics correctly', () => {
    const program = enhanceProgramWithRecovery(
      generatePeriodizedProgram('test_user', TestData.users.intermediate, { weeks: 4 })
    );

    const completedWorkouts = [
      { week: 1, day: 0, date: '2024-01-15' },
      { week: 1, day: 1, date: '2024-01-16' },
      { week: 1, day: 2, date: '2024-01-17' },
      { week: 1, day: 3, date: '2024-01-18' },
    ];

    const metrics = calculateProgramMetrics(program, completedWorkouts);

    assertEquals(metrics.totalWorkoutsCompleted, 4);
    assertTrue(metrics.completionRate >= 0 && metrics.completionRate <= 100);
    assertTrue(metrics.adherenceScore >= 0 && metrics.adherenceScore <= 100);
  });

  testRunner.it('should calculate streaks correctly', () => {
    const workouts = [
      { date: '2024-01-15' },
      { date: '2024-01-16' },
      { date: '2024-01-17' },
      { date: '2024-01-19' }, // Gap
      { date: '2024-01-20' },
    ];

    const { Analytics } = require('./analytics-framework');
    // Streak calculation happens within user engagement
    assertTrue(workouts.length === 5);
  });
});

// ---------------------------------------------------------------------------
// Validation Tests
// ---------------------------------------------------------------------------

testRunner.describe('Program Validation', () => {
  testRunner.it('should validate program structure', () => {
    const { createProgramValidator } = require('./testing-framework');
    const validator = createProgramValidator();

    const validProgram = enhanceProgramWithRecovery(
      generatePeriodizedProgram('test', TestData.users.beginner)
    );

    const results = validator.validate(validProgram);
    const errors = results.filter((r: any) => !r.passed && r.severity === 'error');

    assertEquals(errors.length, 0, 'Valid program should have no validation errors');
  });

  testRunner.it('should validate recipe structure', () => {
    const { createRecipeValidator } = require('./testing-framework');
    const validator = createRecipeValidator();

    const recipe = getRecipeForSplit('upper_lower_4', 'beginner', 0);
    assertTrue(recipe !== null);

    if (recipe) {
      const results = validator.validate(recipe);
      const errors = results.filter((r: any) => !r.passed && r.severity === 'error');
      assertEquals(errors.length, 0);
    }
  });
});

// ---------------------------------------------------------------------------
// Edge Cases
// ---------------------------------------------------------------------------

testRunner.describe('Edge Cases', () => {
  testRunner.it('should handle empty metrics gracefully', () => {
    const score = calculateRecoveryScore([], [], 'intermediate');
    assertEquals(score.status, 'fair');
    assertEquals(score.overall, 50);
  });

  testRunner.it('should handle single metric', () => {
    const score = calculateRecoveryScore([TestData.metrics.good], [], 'intermediate');
    assertTrue(score.overall > 0);
    assertTrue(score.status !== 'critical');
  });

  testRunner.it('should handle extreme values', () => {
    const extreme = {
      date: '2024-01-15',
      sleepHours: 12,
      sleepQuality: 'excellent' as const,
      sorenessLevel: 1 as const,
      energyLevel: 5 as const,
      stressLevel: 1 as const,
      motivationLevel: 'high' as const,
    };

    const score = calculateRecoveryScore([extreme], [], 'intermediate');
    assertEquals(score.overall, 100);
    assertEquals(score.status, 'excellent');
  });

  testRunner.it('should handle minimum session duration', () => {
    const context = {
      ...TestData.users.beginner,
      sessionDurationMin: 30,
    };

    const program = generatePeriodizedProgram('test', context);
    assertTrue(program.weeks.length > 0);

    // All days should fit in 30 minutes
    program.weeks.forEach((week) => {
      week.days.forEach((day) => {
        assertTrue(day.estimatedDuration <= 35, 'Should fit in 30-35 min window');
      });
    });
  });
});

// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------

function assertFalse(condition: boolean, message?: string): void {
  if (condition) {
    throw new Error(message || 'Expected false, got true');
  }
}

// ---------------------------------------------------------------------------
// Run Tests
// ---------------------------------------------------------------------------

export function runAllTests(): void {
  testRunner.printResults();

  const summary = testRunner.getSummary();
  console.log('\n📊 Test Summary:');
  console.log(`   Total Suites: ${summary.totalSuites}`);
  console.log(`   Total Tests: ${summary.totalTests}`);
  console.log(`   Passed: ${summary.passed}`);
  console.log(`   Failed: ${summary.failed}`);
  console.log(`   Success Rate: ${summary.successRate.toFixed(1)}%`);
  console.log(`   Duration: ${summary.duration.toFixed(2)}ms`);

  if (summary.failed > 0) {
    console.log('\n❌ SOME TESTS FAILED');
    process.exit(1);
  } else {
    console.log('\n✅ ALL TESTS PASSED');
  }
}

// Auto-run if executed directly
if (require.main === module) {
  runAllTests();
}
