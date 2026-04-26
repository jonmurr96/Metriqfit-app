/**
 * split-selector.test.ts
 * 
 * Unit tests for the enhanced split selector with:
 * - Experience-based gating (beginner max 4 days)
 * - Recovery burden constraints
 * - Override system
 * - All split families
 */

import { describe, it, expect } from 'bun:test';
import { selectSplit, wouldRequireOverride } from '../split-selector.ts';
import type { SplitSelectorInput } from '../split-selector.ts';

const baseInput: SplitSelectorInput = {
  daysPerWeek: 4,
  experienceLevel: 'intermediate',
  primaryGoal: 'build_muscle',
  equipmentAccess: 'full_gym',
  trainingStylePreference: 'balanced',
  recoveryBurden: 'moderate',
};

describe('Split Selector - Experience Gating', () => {
  it('allows beginners up to 4 days without override', () => {
    const result = selectSplit({
      ...baseInput,
      experienceLevel: 'beginner',
      daysPerWeek: 4,
    });
    expect(result.requiresOverride).toBe(false);
    expect(result.familyKey).toBe('upper_lower_4');
  });

  it('requires override for beginner requesting 5 days', () => {
    const result = selectSplit({
      ...baseInput,
      experienceLevel: 'beginner',
      daysPerWeek: 5,
    });
    expect(result.requiresOverride).toBe(true);
    expect(result.overrideReason).toContain('5 days exceeds recommended');
  });

  it('requires override for beginner requesting 6 days', () => {
    const result = selectSplit({
      ...baseInput,
      experienceLevel: 'beginner',
      daysPerWeek: 6,
    });
    expect(result.requiresOverride).toBe(true);
    expect(result.overrideReason).toContain('excessive for beginners');
  });

  it('allows beginner to proceed with 5 days if they acknowledge', () => {
    const result = selectSplit({
      ...baseInput,
      experienceLevel: 'beginner',
      daysPerWeek: 5,
      acknowledgeAggressivePlan: true,
    });
    // Should not force override when acknowledged
    expect(result.familyKey).not.toBe('upper_lower_4');
  });

  it('requires override for bro_split for beginners', () => {
    const check = wouldRequireOverride('bro_split_5', {
      ...baseInput,
      experienceLevel: 'beginner',
      daysPerWeek: 5,
    });
    expect(check.requiresOverride).toBe(true);
  });
});

describe('Split Selector - Recovery Burden Constraints', () => {
  it('caps high recovery burden at 4 days', () => {
    const result = selectSplit({
      ...baseInput,
      experienceLevel: 'intermediate',
      daysPerWeek: 5,
      recoveryBurden: 'high',
    });
    expect(result.requiresOverride).toBe(true);
    expect(result.overrideReason).toContain('5 days with high recovery burden');
  });

  it('allows high recovery burden user to do 4 days', () => {
    const result = selectSplit({
      ...baseInput,
      experienceLevel: 'intermediate',
      daysPerWeek: 4,
      recoveryBurden: 'high',
    });
    expect(result.requiresOverride).toBe(false);
    expect(result.familyKey).toBe('upper_lower_4');
  });

  it('blocks high burden users from 6-day splits', () => {
    const check = wouldRequireOverride('ppl_6', {
      ...baseInput,
      experienceLevel: 'advanced',
      daysPerWeek: 6,
      recoveryBurden: 'high',
    });
    expect(check.requiresOverride).toBe(true);
    expect(check.reason).toContain('too demanding');
  });

  it('allows low recovery burden users full access', () => {
    const result = selectSplit({
      ...baseInput,
      experienceLevel: 'advanced',
      daysPerWeek: 6,
      recoveryBurden: 'low',
    });
    expect(result.requiresOverride).toBe(false);
  });
});

describe('Split Selector - Split Library Coverage', () => {
  it('selects 2-day full body for 2 days', () => {
    const result = selectSplit({
      ...baseInput,
      daysPerWeek: 2,
    });
    expect(result.familyKey).toBe('full_body_2');
  });

  it('selects 3-day full body for beginners', () => {
    const result = selectSplit({
      ...baseInput,
      experienceLevel: 'beginner',
      daysPerWeek: 3,
    });
    expect(result.familyKey).toBe('full_body_beginner_3');
  });

  it('selects PPL for 3 days with bodybuilding intent', () => {
    const result = selectSplit({
      ...baseInput,
      daysPerWeek: 3,
      trainingStylePreference: 'bodybuilding',
      explicitBodybuildingIntent: true,
    });
    expect(result.familyKey).toBe('ppl_3');
  });

  it('selects PHUL for 4-day strength goals', () => {
    const result = selectSplit({
      ...baseInput,
      daysPerWeek: 4,
      primaryGoal: 'get_stronger',
      trainingStylePreference: 'strength',
    });
    expect(result.familyKey).toBe('phul_4');
  });

  it('selects PPL hybrid for 5-day muscle building', () => {
    const result = selectSplit({
      ...baseInput,
      daysPerWeek: 5,
      primaryGoal: 'build_muscle',
    });
    expect(result.familyKey).toBe('ppl_ul_hybrid_5');
  });

  it('selects PPL 6-day for 6 days with good recovery', () => {
    const result = selectSplit({
      ...baseInput,
      experienceLevel: 'intermediate',
      daysPerWeek: 6,
      recoveryBurden: 'low',
    });
    expect(result.familyKey).toBe('ppl_6');
  });
});

describe('Split Selector - Override System', () => {
  it('wouldRequireOverride returns correct info for blocked split', () => {
    const check = wouldRequireOverride('phat_5', {
      ...baseInput,
      experienceLevel: 'intermediate',
      daysPerWeek: 5,
    });
    expect(check.requiresOverride).toBe(true);
    expect(check.reason).toContain('advanced');
  });

  it('wouldRequireOverride allows appropriate splits', () => {
    const check = wouldRequireOverride('upper_lower_4', {
      ...baseInput,
      experienceLevel: 'beginner',
      daysPerWeek: 4,
      recoveryBurden: 'high',
    });
    expect(check.requiresOverride).toBe(false);
  });

  it('selectSplit includes overrideReason when blocked', () => {
    const result = selectSplit({
      ...baseInput,
      experienceLevel: 'beginner',
      daysPerWeek: 5,
    });
    expect(result.requiresOverride).toBe(true);
    expect(result.overrideReason).toBeDefined();
  });
});

describe('Split Selector - Age Adjustments', () => {
  it('adjusts low recovery to moderate for users 40+', () => {
    // Age 40+ with low recovery burden gets treated as moderate
    const result = selectSplit({
      ...baseInput,
      experienceLevel: 'intermediate',
      daysPerWeek: 6,
      recoveryBurden: 'low',
      age: 45,
    });
    // Should now require override since burden is treated as moderate
    expect(result.requiresOverride).toBe(true);
  });
});

describe('Split Selector - Equipment Gates', () => {
  it('selects bodyweight for bodyweight_only access', () => {
    const result = selectSplit({
      ...baseInput,
      equipmentAccess: 'bodyweight_only',
      daysPerWeek: 3,
    });
    expect(result.familyKey).toBe('bodyweight_only_3');
  });

  it('selects home dumbbell for dumbbells_only', () => {
    const result = selectSplit({
      ...baseInput,
      equipmentAccess: 'dumbbells_only',
      daysPerWeek: 4,
    });
    expect(result.familyKey).toBe('home_dumbbell_4');
  });
});

describe('Split Selector - Complex Scenarios', () => {
  it('beginner + high burden + 5 days = strong protection', () => {
    const result = selectSplit({
      ...baseInput,
      experienceLevel: 'beginner',
      daysPerWeek: 5,
      recoveryBurden: 'high',
    });
    expect(result.requiresOverride).toBe(true);
    expect(result.familyKey).toBe('upper_lower_4');
  });

  it('advanced + low burden + 6 days = full access', () => {
    const result = selectSplit({
      ...baseInput,
      experienceLevel: 'advanced',
      daysPerWeek: 6,
      recoveryBurden: 'low',
    });
    expect(result.requiresOverride).toBe(false);
    expect(result.familyKey).toBe('ppl_6');
  });

  it('intermediate + explicit bro split + bodybuilding intent', () => {
    const result = selectSplit({
      ...baseInput,
      experienceLevel: 'intermediate',
      daysPerWeek: 5,
      trainingStylePreference: 'bodybuilding',
      explicitBodybuildingIntent: true,
      preferredSplitFamily: 'bro_split_5',
    });
    expect(result.familyKey).toBe('bro_split_5');
    expect(result.requiresOverride).toBe(false);
  });
});
