# Sprint 4: Progression Tracking & Periodization - COMPLETE

**Status:** ✅ COMPLETE  
**Date:** March 29, 2026  
**Policy Version:** `coach_conservative_defaults_v7_sprint4`

## Summary

Successfully implemented comprehensive progression tracking, exercise variation, and deload detection systems. The system now auto-substitutes injury-conflicting exercises during plan generation, tracks user progression over time, recommends when to increase weight/volume, and automatically detects when a deload is needed.

## Features Implemented

### 1. Exercise Variation System (`exercise-variation.ts`)

Prevents accommodation by intelligently rotating exercises.

#### Core Lift Stability
Core compound lifts remain stable for long-term progression tracking:
- Squat pattern (8-week rotation)
- Hip hinge pattern (8-week rotation)
- Horizontal push (6-week rotation)
- Horizontal pull (4-week rotation)
- Vertical push (6-week rotation)
- Vertical pull (4-week rotation)

#### Accessory Rotation
Accessory exercises rotate more frequently:
- Chest fly, shoulder raise, rear delt: 3 weeks
- Bicep curl, tricep extension: 3 weeks
- Leg extension, leg curl: 4 weeks
- Core, conditioning: 2 weeks

#### Variation Strategies
1. **Equipment variation** - Dumbbell → Barbell → Machine
2. **Grip variation** - Wide → Close → Neutral
3. **Angle variation** - Flat → Incline → Decline
4. **Full exercise rotation** - Different exercise, same pattern

#### API Functions
```typescript
// Check if exercise should be varied
shouldVaryExercise(exercise, context)

// Get variation candidates
getVariationCandidates(exercise, pool, variationType, context)

// Generate mesocycle periodization plan
generateMesocyclePlan(weeks, experienceLevel)
// Returns: Week-by-week volume/intensity/variation prescription

// Track exercise usage history
updateExerciseHistory(currentHistory, exercisesUsed, date)
```

### 2. Progression Tracker (`progression-tracker.ts`)

Tracks performance over time and provides progression recommendations.

#### 1RM Estimation
- Uses Epley formula: `1RM = weight × (1 + reps/30)`
- Calculates from logged sets automatically

#### Expected Progression Rates
| Experience | Strength Goal | Hypertrophy Goal |
|------------|---------------|------------------|
| Beginner | 2.5% / week | 1.5% / week |
| Intermediate | 1% / week | 0.8% / week |
| Advanced | 0.5% / week | 0.4% / week |

#### Progression Recommendations
The system analyzes recent performance and recommends:

**Increase Weight**: When stagnant at low RPE
```
"Performance stagnant but effort level is low.
Increase weight by 5-10 lbs. Current RPE (6.5) is below target (8)"
```

**Add Reps**: When progressing but below benchmark
```
"Progressing but below target rate.
Add 1-2 reps before increasing weight."
```

**Deload**: When stagnant at high effort
```
"Stagnant at high effort - potential overreaching.
Reduce volume by 40% for 1 week."
```

**Maintain**: When progressing well
```
"Progressing above expected rate.
Continue with current progression."
```

#### Plateau Detection
Detects when user has plateaued for 3+ weeks:
- **Mild plateau** (3 weeks): Recommend deload
- **Moderate plateau** (4 weeks): Recommend exercise variation
- **Severe plateau** (5+ weeks): Recommend program change

#### API Functions
```typescript
// Analyze single performance
analyzePerformance(exerciseId, exerciseName, date, sets)

// Analyze progression trend
analyzeProgressionTrend(exerciseId, performances, context)

// Detect plateau
detectPlateau(performances, weeksToCheck)

// Generate overall summary
generateProgressionSummary(trends)
```

### 3. Deload Detection (`deload-detection.ts`)

Automatically detects when a deload week is needed.

#### Fatigue Score Calculation
Multi-factor fatigue score (0-100):
- Time since last deload (20%)
- Performance trend (25%)
- RPE elevation (25%)
- Volume/recovery analysis (20%)
- Fatigue markers (10%)

#### Deload Triggers
1. **Performance decline** - 3+ weeks of declining performance
2. **Elevated RPE** - Consistently at RPE 9+
3. **Volume accumulation** - Weekly volume exceeds MRV
4. **Time-based** - Exceeded max weeks without deload
5. **Fatigue markers** - Poor sleep, low motivation, low energy
6. **Recovery poor** - Extended muscle soreness

#### Maximum Weeks Without Deload
| Experience | Max Weeks |
|------------|-----------|
| Beginner | 8 weeks |
| Intermediate | 6 weeks |
| Advanced | 5 weeks |

#### Deload Plans
Automatically generated based on fatigue level:

**Standard Deload** (Fatigue 40-69):
- Volume: 60-70% of normal
- Intensity: RPE -1
- Duration: 1 week

**Aggressive Deload** (Fatigue 70-84):
- Volume: 50-60% of normal
- Intensity: RPE -1.5
- Duration: 1 week

**Extended Deload** (Fatigue 85+):
- Volume: 40-50% of normal
- Intensity: RPE -2
- Duration: 2 weeks

#### API Functions
```typescript
// Generate complete deload recommendation
generateDeloadRecommendation(context)

// Quick checks
isOverdueForDeload(weeksSinceLastDeload, experienceLevel)
isRPETooHigh(recentRPEs, threshold)
getDaysUntilDeload(context)

// Apply deload to plan
applyDeloadToPlan(exercises, deloadPlan)
```

### 4. Auto-Substitution Integration

Injury-aware exercise selection is now automatic in plan generation.

#### How It Works
1. User's injuries parsed from profile: `['knee pain', 'back']` → `['knees', 'back']`
2. During `pickForSlot()`, exercises are filtered for safety
3. Exercises conflicting with injuries are excluded from selection
4. Quality gates still flag any conflicts that slip through

#### Example
```typescript
// User has knee injury
const qualityContext = {
  experienceLevel: 'intermediate',
  injuries: ['knee pain'],
};

// During slot filling:
const pick = pickForSlot(candidates, recipeSlot, ..., qualityContext);

// Barbell Squat is excluded (knee conflict)
// Leg Press is selected instead (safe for knees)
```

## Files Created

| File | Lines | Purpose |
|------|-------|---------|
| `exercise-variation.ts` | 500 | Exercise rotation & periodization |
| `progression-tracker.ts` | 500 | Performance tracking & recommendations |
| `deload-detection.ts` | 500 | Fatigue detection & deload plans |

## Files Modified

| File | Changes |
|------|---------|
| `generated-split-selection.ts` | Added injury filtering to `pickForSlot()` |
| `exercise-priority.ts` | Policy version bump to `v7_sprint4` |

## Integration Example

### Complete Workflow
```typescript
// 1. Generate periodized plan
const mesocycle = generateMesocyclePlan(12, 'intermediate');
// Week 1: Volume 100%, Week 2: 110%, Week 3: 120%, Week 4: Deload 60%

// 2. Check exercise history for variations
const history = updateExerciseHistory([], exercisesUsed, new Date());
const needVariation = getExercisesNeedingVariation(currentExercises, history, currentWeek);

// 3. Generate daily workout (auto-filters injuries)
const selection = generateSplitDaySelection({
  day,
  exercises: pool,
  qualityContext: {
    experienceLevel: 'intermediate',
    injuries: ['knee pain'], // Auto-filtered
  }
});

// 4. Track progression
const trend = analyzeProgressionTrend(exerciseId, performances, context);
if (trend.recommendation.action === 'increase_weight') {
  // Suggest next workout load
}

// 5. Check for deload
const deloadRec = generateDeloadRecommendation({
  weeksSinceLastDeload: 5,
  experienceLevel: 'intermediate',
  progressionTrends: [trend1, trend2, ...],
  volumeAnalysis: weeklyVolumeAnalysis,
});

if (deloadRec.recommended && deloadRec.urgency === 'immediate') {
  // Apply deload plan
  const deloadedExercises = applyDeloadToPlan(exercises, deloadRec.deloadPlan);
}
```

## Scientific Basis

### Progression Rates
Based on:
- **Helms et al.** - "The Muscle and Strength Training Pyramid"
- **Tuchscherer** - Autoregulation and RPE-based training
- **Zourdos et al.** - Auto-regulatory progressive overload

### Deload Science
Based on:
- **General Adaptation Syndrome (GAS)** - Hans Selye
- **Fitness-Fatigue Model** - Banister
- **ACSM position stand** - Progression models in resistance training

### Exercise Variation
Based on:
- **Accommodation theory** - Verkhoshansky
- **Periodization research** - Issurin, Stone
- **Movement variability** - Functional anatomy principles

## Testing Recommendations

### Unit Test Priorities
1. **Progression tracker accuracy**
   - 1RM estimation accuracy
   - Trend detection correctness
   - Recommendation appropriateness

2. **Deload detection sensitivity**
   - Correctly identifies high fatigue
   - No false positives for healthy athletes
   - Appropriate urgency levels

3. **Exercise variation timing**
   - Rotates at correct intervals
   - Keeps core lifts stable
   - Respects equipment access

4. **Integration tests**
   - Injury filtering in plan generation
   - End-to-end progression workflow
   - Deload plan application

## Migration Notes

### Backward Compatibility
All new systems are additive:
- Existing code without progression data works unchanged
- Deload recommendations are advisory only
- Exercise variation can be disabled

### Opt-in Features
To enable Sprint 4 features:
```typescript
// Pass exercise history for variation tracking
const qualityContext = {
  ...baseContext,
  exerciseHistory: userHistory, // Enable variation
};

// Pass recent performances for progression tracking
const progressionContext = {
  experienceLevel: 'intermediate',
  primaryGoal: 'hypertrophy',
};

// Pass fatigue markers for deload detection
const deloadContext = {
  ...baseContext,
  fatigueMarkers: {
    sleepQuality: 4,
    motivation: 5,
    energy: 4,
  }
};
```

## Next Steps (Sprint 5 Ideas)

1. **Auto-regulation**: Adjust workouts in real-time based on RPE
2. **Failure analysis**: Detect when form is breaking down
3. **Mobility integration**: Recommend mobility work based on movement patterns
4. **Nutrition timing**: Pre/post workout nutrition recommendations
5. **Recovery optimization**: HRV, sleep, stress integration
6. **AI coach**: Conversational interface for plan adjustments

## Sprint 4 Complete! 🎯

The system now provides:
- ✅ **Auto-substitution** of injury-conflicting exercises
- ✅ **Exercise rotation** to prevent accommodation
- ✅ **Progression tracking** with weight/rep/set recommendations
- ✅ **Deload detection** with fatigue scoring
- ✅ **Periodization support** for mesocycle planning
