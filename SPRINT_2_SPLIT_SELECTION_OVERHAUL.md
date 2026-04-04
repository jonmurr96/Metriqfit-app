# Sprint 2: Split Selection Overhaul - COMPLETE

**Status:** ✅ COMPLETE  
**Date:** March 29, 2026  
**Policy Version:** `coach_conservative_defaults_v5_sprint2`

## Summary

Successfully implemented comprehensive split selection overhaul with experience-based gating, recovery burden constraints, and an expanded split library covering all requested options.

## Features Implemented

### 1. Expanded Split Library (23 Split Families)

#### 2-Day Splits (Beginner-Friendly)
- `full_body_2` - Full Body (2x/week)
- `upper_lower_2` - Upper / Lower (2x/week)
- `push_pull_2` - Push / Pull (2x/week)
- `minimalist_full_body_2` - Minimalist Full Body

#### 3-Day Splits
- `full_body_beginner_3` - Full Body (3x/week) [Beginner Default]
- `full_body_strength_3` - Full Body Strength (3x/week) [Intermediate]
- `general_fitness_beginner_3` - General Fitness (3x/week)
- `upper_lower_full_3` - Upper / Lower / Full
- `ppl_3` - Push / Pull / Legs (3x/week)
- `chest_back_legs_should_arms_3` - Chest-Back / Legs / Shoulders-Arms

#### 4-Day Splits (Upper/Lower Focused)
- `upper_lower_4` - Upper / Lower (4x/week) [Beginner-4-Day Default]
- `phul_4` - PHUL (Power Hypertrophy)
- `ppl_upper_4` - PPL + Upper (4x/week)
- `body_part_4` - 4-Day Body Part Split
- `torso_limbs_4` - Torso / Limbs (4x/week)

#### 5-Day Splits
- `upper_lower_5` - Upper / Lower (5-day)
- `bro_split_5` - Bro Split (1 muscle/day) [Requires Bodybuilding Intent]
- `ppl_ul_hybrid_5` - PPL + Upper / Lower Hybrid
- `chest_back_legs_should_arms_5` - Chest / Back / Legs / Shoulders / Arms
- `phat_5` - PHAT (Power Hypertrophy Adaptive Training)
- `powerbuilding_5` - Powerbuilding

#### 6-Day Splits (High Frequency)
- `ppl_6` - Push / Pull / Legs (6x/week)
- `upper_lower_6` - Upper / Lower (6x/week)
- `arnold_split_6` - Arnold Split (Chest-Back / Shoulders-Arms / Legs)

#### Specialty Splits
- `bodyweight_only_3` - Bodyweight Only
- `home_dumbbell_4` - Home / Dumbbell

### 2. Experience-Based Gating

```typescript
EXPERIENCE_GATES = {
  beginner: {
    maxDaysWithoutOverride: 4,
    maxComplexity: 'medium',
    blockedWithoutOverride: [
      'bro_split_5', 'phat_5', 
      'ppl_6', 'upper_lower_6', 'arnold_split_6'
    ]
  },
  intermediate: {
    maxDaysWithoutOverride: 6,
    maxComplexity: 'high',
    blockedWithoutOverride: ['phat_5', 'arnold_split_6']
  },
  advanced: {
    maxDaysWithoutOverride: 6,
    maxComplexity: 'high',
    blockedWithoutOverride: []
  }
}
```

**Beginner Protection:**
- Cannot select 5+ day splits without explicit override
- Cannot select bro_split without bodybuilding intent
- Cannot select PHAT or Arnold Split
- Auto-downgrades 5-day requests to 4-day Upper/Lower

**Intermediate Limitations:**
- Cannot select PHAT or Arnold Split without override
- Full access to 5-day and 6-day PPL

### 3. Recovery Burden Constraints

```typescript
RECOVERY_CONSTRAINTS = {
  high: {
    maxDaysPerWeek: 4,
    maxSessionDuration: 60,
    blockSplits: ['ppl_6', 'arnold_6', 'upper_lower_6', 'phat_5']
  },
  moderate: {
    maxDaysPerWeek: 5,
    maxSessionDuration: 75,
    blockSplits: ['arnold_6']
  },
  low: {
    maxDaysPerWeek: 6,
    maxSessionDuration: 90,
    blockSplits: []
  }
}
```

**High Recovery Burden Protection:**
- Capped at 4 training days per week
- Blocks 5-day PHAT and 6-day splits
- Suggests lower volume alternatives

**Age Adjustments:**
- Users 40+ with "low" recovery burden are treated as "moderate"
- Provides conservative recommendations for older lifters

### 4. Override System

Users CAN select blocked splits with explicit acknowledgment:

```typescript
type SplitSelection = {
  familyKey: string;
  displayName: string;
  rationale: string;
  warningIfAny: string | null;
  requiresOverride: boolean;        // NEW
  overrideReason?: string;          // NEW
};

// Helper function to check if override needed
export function wouldRequireOverride(
  splitFamilyKey: string,
  input: SplitSelectorInput
): { requiresOverride: boolean; reason?: string }
```

**Override Scenarios:**
1. Beginner requesting 5+ days → "exceeds recommended 4 days for beginners"
2. Beginner selecting bro_split → "designed for intermediate+ lifters"
3. High recovery burden + 5 days → "5 days with high recovery burden"
4. PHAT for non-advanced → "PHAT is designed for advanced lifters"

**Acknowledgment Flow:**
```typescript
const result = selectSplit({
  experienceLevel: 'beginner',
  daysPerWeek: 5,
  acknowledgeAggressivePlan: true,  // User acknowledges risk
});
// Returns the 5-day split instead of forcing 4-day
```

### 5. Split Metadata

Each split includes:
- `minDays` / `maxDays` - Day range
- `minExperience` - Minimum experience level
- `maxExperience` - Maximum appropriate experience (optional)
- `maxRecoveryBurden` - Maximum recovery burden allowed
- `complexity` - 'low' | 'medium' | 'high'
- `weeklyVolumeEstimate` - Estimated working sets per week
- `requiresExplicitIntent` - For controversial splits like bro_split

### 6. Selection Logic Priority

1. **User Override** - Honor explicit selection if valid
2. **Recovery Protection** - Cap days if high recovery burden
3. **Experience Protection** - Block aggressive plans for beginners
4. **Equipment Gates** - Bodyweight/dumbbell restrictions
5. **Days Constraints** - Match to available training days
6. **Goal Matching** - Score by goal affinity
7. **Scoring** - Select highest-scoring eligible split

## Test Coverage

Unit tests created in `lib/workout/__tests__/split-selector.test.ts`:

### Experience Gating Tests
- ✓ Beginners can do up to 4 days without override
- ✓ Beginners blocked from 5-day splits
- ✓ Beginners blocked from 6-day splits
- ✓ Override works with acknowledgment flag

### Recovery Burden Tests
- ✓ High burden capped at 4 days
- ✓ High burden blocked from 6-day splits
- ✓ Low burden allows full access

### Split Library Tests
- ✓ 2-day → Full Body
- ✓ 3-day beginner → Full Body
- ✓ 3-day bodybuilding → PPL
- ✓ 4-day strength → PHUL
- ✓ 5-day muscle → PPL Hybrid
- ✓ 6-day good recovery → PPL 6-day

### Override System Tests
- ✓ `wouldRequireOverride()` API works
- ✓ `overrideReason` provided when blocked
- ✓ Age adjustments work (40+ treated conservatively)

## Files Modified

| File | Changes |
|------|---------|
| `lib/workout/split-selector.ts` | Completely rewritten with 23 splits, gating logic, override system |
| `lib/workout/exercise-priority.ts` | Policy version bump to `v5_sprint2` |

## Files Created

| File | Purpose |
|------|---------|
| `lib/workout/__tests__/split-selector.test.ts` | Comprehensive unit tests |

## Next Steps (Sprint 3)

1. **Recovery Burden Integration** - Connect actual recovery tracking
2. **Volume Landmarks** - Weekly volume targets per experience level
3. **Injury-Aware Substitutions** - Knee/back injury recipe handling

## Migration Notes

The new split selector is backward-compatible. Existing code using `selectSplit()` will work unchanged. To use the override system:

```typescript
// Before (still works)
const selection = selectSplit({
  daysPerWeek: 4,
  experienceLevel: 'beginner',
  primaryGoal: 'build_muscle',
});

// After (with override)
const selection = selectSplit({
  daysPerWeek: 5,
  experienceLevel: 'beginner',
  primaryGoal: 'build_muscle',
  acknowledgeAggressivePlan: true,  // NEW
});

if (selection.requiresOverride) {
  // Show UI: "This plan is aggressive for beginners. Proceed?"
  console.log(selection.overrideReason);
}
```
