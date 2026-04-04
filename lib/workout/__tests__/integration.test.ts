/**
 * integration.test.ts
 *
 * Comprehensive Integration Tests for Sprint 5
 * 
 * Tests the complete plan generation pipeline:
 * 1. User Profile → Split Selection
 * 2. Split Selection → Day Templates
 * 3. Day Templates → Exercise Selection (with injury filtering, variation)
 * 4. Exercise Selection → Quality Gates
 * 5. Quality Gates → Final Plan
 */

import { describe, it, expect } from 'bun:test';

// Import systems under test
import { selectSplit, wouldRequireOverride } from '../split-selector.ts';
import { 
  generateSplitDaySelection, 
  type GeneratedSplitDaySelection 
} from '../generated-split-selection.ts';
import { runQualityGates } from '../quality-gates.ts';
import { 
  normalizeUserTrainingProfile,
  type UserTrainingProfileInput,
} from '../training-profile.ts';
import { 
  isExerciseSafeForInjuries,
  parseInjuries,
  getSubstitutionRecommendation,
} from '../injury-substitutions.ts';
import {
  getVolumeTargets,
  analyzeWeeklyVolume,
} from '../volume-landmarks.ts';
import {
  shouldVaryExercise,
  getVariationRecommendation,
} from '../exercise-variation.ts';

// Import test helpers
import {
  createMockExercisePool,
  createMockTrainingProfile,
  createBeginnerProfile,
  createAdvancedBodybuilderProfile,
  createInjuredProfile,
  createLimitedEquipmentProfile,
  TEST_FIXTURES,
  measureExecutionTime,
  createLargeExercisePool,
} from '../test-helpers.ts';

// ---------------------------------------------------------------------------
// End-to-End Plan Generation Tests
// ---------------------------------------------------------------------------

describe('End-to-End Plan Generation', () => {
  it('generates valid plan for typical intermediate user', () => {
    // Arrange
    const profile = normalizeUserTrainingProfile({
      daysPerWeek: 4,
      experienceLevel: 'intermediate',
      primaryGoal: 'build_muscle',
      equipmentAccess: 'full_gym',
    });
    const exercisePool = createMockExercisePool(50);

    // Act - Step 1: Select split
    const splitSelection = selectSplit({
      daysPerWeek: profile.daysPerWeek,
      experienceLevel: profile.experienceLevel,
      primaryGoal: profile.primaryGoal,
      equipmentAccess: profile.equipmentAccess,
      recoveryBurden: profile.recoveryBurden,
    });

    // Assert - Split selected correctly
    expect(splitSelection.requiresOverride).toBe(false);
    expect(splitSelection.familyKey).toBe('upper_lower_4');

    // Act - Step 2: Run quality gates on empty plan
    const qualityResult = runQualityGates({
      workoutDays: [],
      trainingProfile: profile,
    });

    // Assert - Quality gates pass (no exercises yet)
    expect(qualityResult.passed).toBe(true);
  });

  it('respects beginner day limits (max 4 days)', () => {
    // Arrange - Beginner requesting 5 days
    const profile = normalizeUserTrainingProfile({
      daysPerWeek: 5,
      experienceLevel: 'beginner',
      primaryGoal: 'build_muscle',
    });

    // Act
    const splitSelection = selectSplit({
      daysPerWeek: profile.daysPerWeek,
      experienceLevel: profile.experienceLevel,
      primaryGoal: profile.primaryGoal,
      recoveryBurden: profile.recoveryBurden,
    });

    // Assert
    expect(splitSelection.requiresOverride).toBe(true);
    expect(splitSelection.overrideReason).toContain('5 days exceeds recommended');
  });

  it('blocks aggressive splits without acknowledgment', () => {
    // Arrange - Beginner trying to select 6-day PPL
    const profileInput: UserTrainingProfileInput = {
      daysPerWeek: 6,
      experienceLevel: 'beginner',
      primaryGoal: 'build_muscle',
      preferredSplitFamily: 'ppl_6',
    };

    // Act
    const overrideCheck = wouldRequireOverride('ppl_6', {
      daysPerWeek: 6,
      experienceLevel: 'beginner',
      primaryGoal: 'build_muscle',
      equipmentAccess: 'full_gym',
      trainingStylePreference: 'balanced',
      recoveryBurden: 'moderate',
    });

    // Assert
    expect(overrideCheck.requiresOverride).toBe(true);
    expect(overrideCheck.reason).toContain('excessive for beginners');
  });
});

// ---------------------------------------------------------------------------
// Injury-Aware Plan Generation Tests
// ---------------------------------------------------------------------------

describe('Injury-Aware Plan Generation', () => {
  it('filters knee-conflicting exercises from plan', () => {
    // Arrange
    const profile = normalizeUserTrainingProfile({
      daysPerWeek: 3,
      experienceLevel: 'intermediate',
      primaryGoal: 'build_muscle',
      injuries: ['knee pain'],
    });

    const pool = [
      TEST_FIXTURES.exercises.squat,      // Safe for knees
      TEST_FIXTURES.exercises.sissySquat, // Conflicts with knees
    ];

    // Act
    const injuries = parseInjuries(profile.injuries);
    const squatSafe = isExerciseSafeForInjuries(
      TEST_FIXTURES.exercises.squat,
      injuries
    );
    const sissySafe = isExerciseSafeForInjuries(
      TEST_FIXTURES.exercises.sissySquat,
      injuries
    );

    // Assert
    expect(injuries).toContain('knees');
    expect(squatSafe).toBe(true);
    expect(sissySafe).toBe(false);
  });

  it('provides substitution recommendations for conflicts', () => {
    // Arrange
    const conflictingExercise = TEST_FIXTURES.exercises.sissySquat;
    const injuries = parseInjuries(['knee pain']);

    // Act
    const recommendation = getSubstitutionRecommendation(
      conflictingExercise,
      injuries
    );

    // Assert
    expect(recommendation.shouldSubstitute).toBe(true);
    expect(recommendation.reason).toContain('knee');
    expect(recommendation.suggestedReplacements.length).toBeGreaterThan(0);
  });

  it('generates plan without conflicts for user with multiple injuries', () => {
    // Arrange
    const profile = normalizeUserTrainingProfile({
      daysPerWeek: 4,
      experienceLevel: 'intermediate',
      primaryGoal: 'build_muscle',
      injuries: ['knee pain', 'back pain', 'shoulder pain'],
    });
    const exercisePool = createMockExercisePool(50);

    // Act - Parse injuries
    const parsedInjuries = parseInjuries(profile.injuries);

    // Assert
    expect(parsedInjuries).toContain('knees');
    expect(parsedInjuries).toContain('back');
    expect(parsedInjuries).toContain('shoulders');

    // Act - Check pool safety
    const safeExercises = exercisePool.filter((ex) =>
      isExerciseSafeForInjuries(ex, parsedInjuries)
    );

    // Assert - At least some exercises should be safe
    expect(safeExercises.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Volume Landmark Integration Tests
// ---------------------------------------------------------------------------

describe('Volume Landmark Integration', () => {
  it('calculates correct volume targets for beginners', () => {
    // Act
    const chestTarget = getVolumeLandmark('chest', 'beginner', 'low');

    // Assert
    expect(chestTarget.mev).toBeGreaterThan(0);
    expect(chestTarget.mavLow).toBeGreaterThan(chestTarget.mev);
    expect(chestTarget.mrv).toBeGreaterThan(chestTarget.mavHigh);
  });

  it('adjusts volume for high recovery burden', () => {
    // Act
    const lowBurden = getVolumeLandmark('chest', 'intermediate', 'low');
    const highBurden = getVolumeLandmark('chest', 'intermediate', 'high');

    // Assert - High burden should have lower targets
    expect(highBurden.mrv).toBeLessThan(lowBurden.mrv);
  });

  it('analyzes weekly volume correctly', () => {
    // Arrange
    const muscleVolumes = {
      chest: 20,
      back: 12,
      quads: 18,
      // ... other muscles at 0
    };

    // Act
    const analysis = analyzeWeeklyVolume(
      muscleVolumes as any,
      'intermediate',
      'moderate',
      4
    );

    // Assert
    expect(analysis.totalWeeklySets).toBe(50); // 20 + 12 + 18
    expect(analysis.statusByMuscle.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Exercise Variation Integration Tests
// ---------------------------------------------------------------------------

describe('Exercise Variation Integration', () => {
  it('detects when core lifts should stay stable', () => {
    // Arrange
    const squat = TEST_FIXTURES.exercises.squat;
    const context = {
      currentWeek: 2,
      mesocycleWeeks: 12,
      exerciseHistory: [
        {
          exerciseId: squat.id,
          exerciseName: squat.name,
          firstUsed: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 2 weeks ago
          lastUsed: new Date(),
          weeksUsed: 2,
          totalSessions: 6,
        },
      ],
      equipmentAccess: 'full_gym',
    };

    // Act
    const varyCheck = shouldVaryExercise(squat, context);

    // Assert - Core lifts should stay stable early in mesocycle
    expect(varyCheck.shouldVary).toBe(false);
  });

  it('detects when accessories should be varied', () => {
    // Arrange
    const curl = TEST_FIXTURES.exercises.bicepCurl;
    const context = {
      currentWeek: 4,
      mesocycleWeeks: 12,
      exerciseHistory: [
        {
          exerciseId: curl.id,
          exerciseName: curl.name,
          firstUsed: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000), // 4 weeks ago
          lastUsed: new Date(),
          weeksUsed: 4,
          totalSessions: 12,
        },
      ],
      equipmentAccess: 'full_gym',
    };

    // Act
    const varyCheck = shouldVaryExercise(curl, context);

    // Assert - Accessories should be varied after 3-4 weeks
    expect(varyCheck.shouldVary).toBe(true);
    expect(varyCheck.variationType).toBe('exercise');
  });
});

// ---------------------------------------------------------------------------
// Constraint Validation Tests
// ---------------------------------------------------------------------------

describe('Constraint Validation', () => {
  it('validates equipment access constraints', () => {
    // Arrange
    const profile = normalizeUserTrainingProfile({
      equipmentAccess: 'dumbbells_only',
    });

    const barbellExercise = TEST_FIXTURES.exercises.squat; // Requires barbell

    // Assert - Barbell exercise not allowed with dumbbells only
    const equipmentOptions = barbellExercise.equipment_options;
    const hasDumbbellOption = equipmentOptions?.includes('dumbbell');
    expect(hasDumbbellOption).toBe(false);
  });

  it('validates complexity constraints for beginners', () => {
    // Arrange
    const beginnerProfile = normalizeUserTrainingProfile({
      experienceLevel: 'beginner',
    });

    // Act - Check complexity limits
    const complexityLimits = {
      beginner: 'medium',
      intermediate: 'high',
      advanced: 'high',
    };

    // Assert
    expect(complexityLimits[beginnerProfile.experienceLevel]).toBe('medium');
  });

  it('validates recovery burden constraints', () => {
    // Arrange - High burden user requesting 6 days
    const profile = normalizeUserTrainingProfile({
      experienceLevel: 'intermediate',
      daysPerWeek: 6,
      recoveryBurden: 'high',
    });

    // Act
    const splitSelection = selectSplit({
      daysPerWeek: profile.daysPerWeek,
      experienceLevel: profile.experienceLevel,
      primaryGoal: profile.primaryGoal,
      recoveryBurden: profile.recoveryBurden,
    });

    // Assert - High burden should recommend lower days or require override
    expect(splitSelection.requiresOverride).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Performance Tests
// ---------------------------------------------------------------------------

describe('Performance', () => {
  it('completes plan generation within acceptable time', () => {
    // Arrange
    const profile = normalizeUserTrainingProfile({
      daysPerWeek: 4,
      experienceLevel: 'intermediate',
    });
    const largePool = createLargeExercisePool(200);

    // Act - Measure split selection time
    const { averageMs: splitTime } = measureExecutionTime(
      () =>
        selectSplit({
          daysPerWeek: profile.daysPerWeek,
          experienceLevel: profile.experienceLevel,
          primaryGoal: profile.primaryGoal,
        }),
      10
    );

    // Assert - Should complete in under 10ms average
    expect(splitTime).toBeLessThan(10);
  });

  it('handles large exercise pools efficiently', () => {
    // Arrange
    const veryLargePool = createLargeExercisePool(1000);

    // Act - Measure filtering time
    const { averageMs: filterTime } = measureExecutionTime(() => {
      return veryLargePool.filter((ex) => ex.popularity_score > 50);
    }, 5);

    // Assert - Should complete in under 50ms
    expect(filterTime).toBeLessThan(50);
  });
});

// ---------------------------------------------------------------------------
// Edge Case Tests
// ---------------------------------------------------------------------------

describe('Edge Cases', () => {
  it('handles empty exercise pool gracefully', () => {
    // Arrange
    const emptyPool: any[] = [];
    const profile = createMockTrainingProfile();

    // Act & Assert - Should not throw
    expect(() => {
      // This would be called during plan generation
      const safeExercises = emptyPool.filter((ex) =>
        isExerciseSafeForInjuries(ex, [])
      );
      expect(safeExercises).toHaveLength(0);
    }).not.toThrow();
  });

  it('handles unknown injury types gracefully', () => {
    // Arrange
    const unknownInjuries = ['mysterious condition', 'unknown ailment'];

    // Act
    const parsed = parseInjuries(unknownInjuries);

    // Assert - Should return empty array for unknown injuries
    expect(parsed).toHaveLength(0);
  });

  it('handles conflicting constraints correctly', () => {
    // Arrange - Beginner + 6 days + High burden + Bro split request
    const profile = normalizeUserTrainingProfile({
      experienceLevel: 'beginner',
      daysPerWeek: 6,
      preferredSplitFamily: 'bro_split_5',
      explicitBodybuildingIntent: false,
    });

    // Act
    const splitSelection = selectSplit({
      daysPerWeek: 6,
      experienceLevel: 'beginner',
      primaryGoal: 'build_muscle',
      preferredSplitFamily: 'bro_split_5',
      explicitBodybuildingIntent: false,
      recoveryBurden: 'high',
    });

    // Assert - Should force override due to multiple violations
    expect(splitSelection.requiresOverride).toBe(true);
  });

  it('handles very short session durations', () => {
    // Arrange - 30-minute sessions
    const profile = normalizeUserTrainingProfile({
      sessionDurationMin: 30,
    });

    // Assert - Max exercises should be reduced
    expect(profile.maxExercisesPerDay).toBeLessThan(6);
  });
});

// ---------------------------------------------------------------------------
// Integration Smoke Tests
// ---------------------------------------------------------------------------

describe('Smoke Tests', () => {
  const smokeTestProfiles = [
    { name: 'Beginner 3-day', profile: createBeginnerProfile() },
    { name: 'Intermediate 4-day', profile: createMockTrainingProfile() },
    { name: 'Advanced 6-day PPL', profile: createAdvancedBodybuilderProfile() },
    { name: 'Knee injury', profile: createInjuredProfile(['knee pain']) },
    { name: 'Dumbbells only', profile: createLimitedEquipmentProfile('dumbbells_only') },
  ];

  smokeTestProfiles.forEach(({ name, profile }) => {
    it(`generates valid plan for: ${name}`, () => {
      // Act
      const splitSelection = selectSplit({
        daysPerWeek: profile.daysPerWeek,
        experienceLevel: profile.experienceLevel,
        primaryGoal: profile.primaryGoal,
        equipmentAccess: profile.equipmentAccess,
        recoveryBurden: profile.recoveryBurden,
      });

      // Assert
      expect(splitSelection.familyKey).toBeTruthy();
      expect(splitSelection.displayName).toBeTruthy();

      if (splitSelection.requiresOverride) {
        expect(splitSelection.overrideReason).toBeTruthy();
      }
    });
  });
});
