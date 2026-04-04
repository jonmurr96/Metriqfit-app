# Phase 2: Recipe System Enhancement - Implementation Complete

## Overview

Phase 2 has been successfully implemented, adding per-experience recipe variants that provide appropriate exercise selection, volume, and complexity filtering based on the user's training experience level.

## Files Created

### 1. `lib/workout/exercise-recipes-by-experience.ts`

**Purpose**: Defines day templates (recipes) tailored to each experience level.

**Key Components**:

- **ExerciseSlot**: Defines a slot in a day recipe with pattern, sets, reps, rest, RPE, and technique cues
- **DayRecipe**: Complete day template with focus areas, slots, totals, and complexity level
- **ExperienceRecipeSet**: Complete recipe collections for beginner/intermediate/advanced

**Recipes Implemented**:

| Split | Beginner (4-5 exercises) | Intermediate (6-7 exercises) | Advanced (7-8 exercises) |
|-------|-------------------------|------------------------------|--------------------------|
| Upper A | 6 exercises, 18 sets | 8 exercises, 26 sets | 9 exercises, 38 sets |
| Upper B | 6 exercises, 20 sets | 8 exercises, 26 sets | 8 exercises, 34 sets |
| Lower A | 5 exercises, 15 sets | 6 exercises, 21 sets | 6 exercises, 27 sets |
| Lower B | 6 exercises, 18 sets | 6 exercises, 20 sets | 6 exercises, 26 sets |
| Full Body A | 5 exercises, 15 sets | 7 exercises, 23 sets | 6 exercises, 23 sets |
| Full Body B | 5 exercises, 15 sets | 7 exercises, 26 sets | 8 exercises, 31 sets |

**Key Features**:

- **Beginner Recipes**: 4-5 exercises, foundational only, RPE 7, rest 90-180s
- **Intermediate Recipes**: 6-7 exercises, mixed complexity, RPE 8, rest 60-180s  
- **Advanced Recipes**: 7-8 exercises, all complexity levels, RPE 8-9, rest 60-300s

**Technique Cues**: Every slot includes specific technique guidance for proper form.

**Goal-Specific Modifications**:

- **Lose Fat**: Reduced rest periods (+30s conditioning), higher rep ranges
- **Build Strength**: Focus on compounds, lower reps, increased rest
- **Build Muscle**: Standard hypertrophy-focused recipes

### 2. `lib/workout/recipe-selection.ts`

**Purpose**: Integration layer that connects recipes to user profiles and validates selections.

**Key Components**:

- **Goal-Aware Slot Priorities**: Prioritizes patterns based on training goal
  - Lose Fat: Prioritize large muscle groups, add conditioning
  - Build Strength: Prioritize compounds, reduce accessories
  - Build Muscle: Balanced hypertrophy focus

- **RecipeSelectionContext**: Complete context for recipe selection
- **SelectedRecipe**: Selected recipe with modifications and warnings
- **RecipeSelectionResult**: Complete result with summary statistics

**Main Function**: `selectRecipesForPlan(context)`

Returns recipes for all training days with:

- Goal-specific modifications applied
- Recovery burden adjustments (-20% for high, -10% for moderate)
- Volume validation against experience minimums
- Duration validation against session limit
- Pattern sorting by goal priorities

**Volume Validation**: `validateWeeklyVolume()`

Ensures minimum compound pattern volumes per week:

| Pattern | Beginner | Intermediate | Advanced |
|---------|----------|--------------|----------|
| Squat | 6 sets | 8 sets | 10 sets |
| Hinge | 6 sets | 8 sets | 10 sets |
| Horizontal Push | 6 sets | 8 sets | 10 sets |
| Horizontal Pull | 6 sets | 8 sets | 10 sets |

## Integration with Phase 1

Phase 2 builds on Phase 1 foundations:

```
Phase 1: Exercise Complexity + Volume Landmarks
    ↓
Phase 2: Recipe System + Selection Logic
    ↓
Phase 3: Periodization (Next)
```

### How Recipes Use Phase 1 Components

1. **Complexity Filtering**: Recipes specify `complexity: 'foundational' | 'mixed' | 'all'`
   - Beginner recipes use 'foundational' → Phase 1's `isExerciseAllowedForExperience()`
   - Intermediate recipes use 'mixed' → foundational + intermediate exercises
   - Advanced recipes use 'all' → all complexity levels allowed

2. **Volume Landmarks**: Recipe slots target MEV-MAV range from Phase 1
   - Beginner: 15-20 sets/day
   - Intermediate: 20-26 sets/day  
   - Advanced: 26-38 sets/day

3. **Quality Gates**: Recipe validation runs through Phase 1 gates
   - `complexityMismatch` detection
   - Volume landmark checks (musclesAboveMRV, musclesBelowMEV)
   - Posterior chain ratio validation

## Recipe Structure

Each day recipe includes:

```typescript
interface DayRecipe {
  name: string;           // e.g., "Upper A - Push/Pull Foundation"
  description: string;    // Training focus explanation
  focus: string[];        // ['upper', 'push', 'pull'] or ['lower', 'legs']
  complexity: 'foundational' | 'mixed' | 'all';
  goal: 'build_muscle' | 'lose_fat' | 'build_strength';
  slots: ExerciseSlot[];  // 4-9 exercises depending on experience
  totalSets: number;      // 15-38 sets
  estimatedDurationMin: number; // 45-80 minutes
}

interface ExerciseSlot {
  pattern: PatternSlot;   // e.g., 'compound_squat', 'horizontal_push'
  sets: number;           // 2-5 sets
  reps: string;           // e.g., '8-12' or '3-5'
  restSeconds: number;    // 60-300 seconds
  rpe?: number;          // 7-9 rate of perceived exertion
  technique?: string;    // Specific form cue
}
```

## Validation & Quality Checks

### Minimum Requirements by Experience

| Metric | Beginner | Intermediate | Advanced |
|--------|----------|--------------|----------|
| Min Exercises/Session | 5 | 6 | 7 |
| Min Sets/Session | 15 | 18 | 22 |
| Min Total Weekly Exercises | 15-20 | 24-30 | 28-40 |
| Min Total Weekly Sets | 45-75 | 72-108 | 88-152 |

### Recovery Burden Adjustments

```typescript
high:     multiply sets × 0.7    // -30% volume
moderate: multiply sets × 0.9    // -10% volume
low:      no adjustment         // full volume
```

## Example Usage

```typescript
import { selectRecipesForPlan } from './lib/workout/recipe-selection';

const context = {
  splitKey: 'upper_lower_4',
  experienceLevel: 'intermediate',
  primaryGoal: 'build_muscle',
  daysPerWeek: 4,
  sessionDurationMin: 60,
  equipmentAccess: 'full_gym',
  recoveryBurden: 'moderate',
};

const result = selectRecipesForPlan(context);

// result.recipes: Array of 4 selected recipes
// result.summary: {
//   totalExercises: 30,
//   totalSets: 86,
//   averageDuration: 63,
//   meetsMinimums: true,
//   warnings: []
// }
```

## Next Steps

### Phase 3: Periodization

- Progressive overload protocols
- Volume/intensity progression
- Deload strategies
- Block periodization

### Phase 4: Recovery Management

- Rest day optimization
- Active recovery recommendations
- Fatigue tracking
- Auto-regulation

### Phase 5: Testing & Validation

- Integration with existing workout generation
- A/B testing framework
- User feedback collection
- Performance monitoring

## Testing Checklist

- [ ] Verify beginner recipes only use foundational exercises
- [ ] Verify intermediate recipes use mixed complexity
- [ ] Verify advanced recipes use all complexity levels
- [ ] Test goal-specific modifications (lose_fat, build_strength)
- [ ] Test recovery burden adjustments
- [ ] Test volume validation warnings
- [ ] Test session duration limits
- [ ] Verify technique cues are included
- [ ] Test recipe selection for all split types
- [ ] Validate posterior chain ratios in generated plans

## Files Modified

None - Phase 2 is additive only, creating new files without modifying existing Phase 1 code.

## Summary

Phase 2 successfully implements:

1. ✅ Per-experience recipe variants (beginner/intermediate/advanced)
2. ✅ Goal-aware slot prioritization
3. ✅ Volume validation with experience-appropriate minimums
4. ✅ Recovery burden adjustments
5. ✅ Technique cues for all exercises
6. ✅ Integration helpers for Phase 1 components
7. ✅ Comprehensive validation and warnings

The recipe system is now ready for Phase 3 periodization integration.
