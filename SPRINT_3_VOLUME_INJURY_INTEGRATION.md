# Sprint 3: Volume Landmarks & Injury-Aware Substitutions - COMPLETE

**Status:** ✅ COMPLETE  
**Date:** March 29, 2026  
**Policy Version:** `coach_conservative_defaults_v6_sprint3`

## Summary

Successfully implemented comprehensive volume landmark enforcement and injury-aware exercise substitution system. The system now tracks weekly volume per muscle group against scientific landmarks and automatically flags exercises that conflict with user-reported injuries.

## Features Implemented

### 1. Volume Landmarks System (`volume-landmarks.ts`)

#### Volume Landmark Definitions
Based on scientific literature (Helms et al., Israetel et al.) with practical adjustments:

```typescript
type VolumeLandmark = {
  mv: number;      // Maintenance Volume (minimum to maintain)
  mev: number;     // Minimum Effective Volume (minimum to grow)
  mavLow: number;  // Maximum Adaptive Volume lower bound (optimal)
  mavHigh: number; // Maximum Adaptive Volume upper bound (optimal)
  mrv: number;     // Maximum Recoverable Volume (upper limit)
};
```

#### Per-Experience Level Targets

| Experience | MV | MEV | MAV Range | MRV |
|------------|-----|-----|-----------|-----|
| **Beginner** | 4 | 6 | 8-12 | 16 |
| **Intermediate** | 6 | 10 | 12-18 | 22 |
| **Advanced** | 8 | 12 | 16-22 | 28 |

#### Muscle Group Multipliers
- Large muscles (back, quads): 1.2x
- Medium muscles (shoulders, hamstrings, glutes): 1.0x
- Small muscles (biceps, triceps): 0.8x
- Very small (calves, abs, forearms): 0.5-0.7x

#### Recovery Burden Adjustments
- **Low recovery burden**: 100% volume
- **Moderate burden**: 85% volume (15% reduction)
- **High burden**: 70% volume (30% reduction)

#### API Functions

```typescript
// Get volume targets for a specific muscle
getVolumeLandmark(muscleGroup, experienceLevel, recoveryBurden)

// Get all volume targets
getVolumeTargets(experienceLevel, recoveryBurden)

// Analyze weekly volume against landmarks
analyzeWeeklyVolume(muscleVolumes, experienceLevel, recoveryBurden, daysPerWeek)

// Validate a planned volume distribution
validateVolumePlan(plannedVolumes, experienceLevel, recoveryBurden)
```

### 2. Injury-Aware Substitution System (`injury-substitutions.ts`)

#### Supported Injury Types
- `knees` - Knee pain, ACL issues, meniscus, patellar tendinopathy
- `back` - Lower back pain, herniated disc, spinal issues
- `shoulders` - Rotator cuff, impingement, labrum issues
- `wrists` - Carpal tunnel, wrist strain, TFCC
- `ankles` - Sprains, instability, Achilles issues
- `hips` - Hip impingement, labrum, glute issues
- `elbows` - Tennis elbow, golfer's elbow, distal biceps
- `neck` - Cervical issues, neck strain

#### Conflict Detection
Keywords that flag exercises as conflicting:

**Knee Conflicts:**
- sissy squat, nordic hamstring, plyometric, box jump
- lunging, split squat, step up, pistol squat

**Back Conflicts:**
- deadlift, RDL, stiff leg, good morning
- bent over row, pendlay row, t-bar row
- kettlebell swing, snatch, clean

**Shoulder Conflicts:**
- overhead press, push press, upright row
- behind neck press, skull crusher, arnold press
- dips, muscle up

#### Substitution Rules

Curated replacements for common conflicts:

| Conflict Exercise | Injury | Substitutions |
|-------------------|--------|---------------|
| Barbell Squat | Knees | Leg Press, Hack Squat, Smith Machine Squat |
| Deadlift | Back | Leg Press, Hack Squat, Glute-Ham Raise |
| Bent Over Row | Back | Chest Supported Row, Machine Row, Cable Row |
| Overhead Press | Shoulders | Machine Shoulder Press, Landmine Press |
| Upright Row | Shoulders | Lateral Raise, Cable Lateral Raise |
| Barbell Curl | Wrists | Dumbbell Curl, Hammer Curl, Cable Curl |

#### API Functions

```typescript
// Check if exercise conflicts with injury
exerciseConflictsWithInjury(exercise, injuryType)

// Check if exercise is safe for all injuries
isExerciseSafeForInjuries(exercise, injuries)

// Get substitution recommendation
getSubstitutionRecommendation(exercise, injuries)

// Select best substitute from pool
selectBestSubstitute(originalExercise, options)

// Parse injury strings from user profile
parseInjuries(injuryStrings)
```

### 3. Quality Gates Integration

#### New Fix Types Added
```typescript
type QualityGateFix = {
  dayIndex: number;
  type: 
    | 'reduce_excessive_volume'      // Sprint 3
    | 'increase_insufficient_volume' // Sprint 3  
    | 'substitute_injury_conflict';  // Sprint 3
  exerciseIndex?: number;
  muscleGroup?: string;  // For volume fixes
};
```

#### New Metrics Added
```typescript
type QualityGateMetrics = {
  // ... existing metrics ...
  
  // Sprint 3: Volume landmarks
  weeklyVolumeAnalysis: WeeklyVolumeAnalysis | null;
  musclesAboveMRV: number;
  musclesBelowMEV: number;
  
  // Sprint 3: Injury conflicts  
  injuryConflictCount: number;
  injuryConflictsByType: Record<InjuryType, number>;
};
```

#### New Output Fields
```typescript
type QualityGateResult = {
  // ... existing fields ...
  
  // Sprint 3: Detailed volume analysis
  volumeAnalysis: WeeklyVolumeAnalysis | null;
  
  // Sprint 3: Injury conflict details
  injuryConflicts: Array<{
    dayIndex: number;
    exerciseIndex: number;
    exerciseName: string;
    conflictingInjuries: InjuryType[];
    suggestedReplacement?: string;
  }>;
};
```

### 4. Quality Gate Warnings

#### Volume Warnings
- `"Volume: chest has 24 sets, exceeding MRV (20). Reduce chest from 24 to 18 sets max"`
- `"Volume: back has 8 sets, below MEV (12). Increase back from 8 to 10-12 sets"`

#### Injury Conflict Warnings
- `"Injury conflicts detected: 3 exercise(s) conflict with reported injuries. 2 for knees, 1 for back"`

#### Recovery Risk Assessment
- **Low**: All muscles within MAV range
- **Moderate**: 1 muscle approaching MRV or high weekly volume
- **High**: 2+ muscles exceeding MRV or very high weekly volume

## Files Created

| File | Purpose |
|------|---------|
| `lib/workout/volume-landmarks.ts` | Volume landmark definitions and analysis |
| `lib/workout/injury-substitutions.ts` | Injury-aware substitution system |

## Files Modified

| File | Changes |
|------|---------|
| `lib/workout/quality-gates.ts` | Added volume and injury checks to quality gates |
| `lib/workout/exercise-priority.ts` | Policy version bump to `v6_sprint3` |

## Usage Examples

### Volume Analysis
```typescript
import { analyzeWeeklyVolume } from './volume-landmarks.ts';

const muscleVolumes = {
  chest: 16, back: 14, shoulders: 12, quads: 18,
  hamstrings: 10, biceps: 8, triceps: 8, // ...etc
};

const analysis = analyzeWeeklyVolume(
  muscleVolumes,
  'intermediate',
  'moderate',
  4  // days per week
);

// Results:
// - recoveryRisk: 'low' | 'moderate' | 'high'
// - statusByMuscle: Array of per-muscle status
// - recommendations: Actionable advice
```

### Injury Substitution
```typescript
import { getSubstitutionRecommendation, parseInjuries } from './injury-substitutions.ts';

const userInjuries = parseInjuries(['knee pain', 'lower back']);
// Returns: ['knees', 'back']

const recommendation = getSubstitutionRecommendation(
  { name: 'Barbell Squat', id: 'squat_1' },
  userInjuries
);

// Results:
// - shouldSubstitute: true
// - reason: 'Barbell squat loads the knees heavily...'
// - suggestedReplacements: ['Leg Press', 'Hack Squat', 'Smith Machine Squat']
```

### Quality Gates with Sprint 3
```typescript
import { runQualityGates } from './quality-gates.ts';

const result = runQualityGates({
  workoutDays: [...],
  trainingProfile: {
    experienceLevel: 'intermediate',
    equipmentAccess: 'full_gym',
    primaryGoal: 'build_muscle',
    injuries: ['knee pain', 'shoulder impingement'],
  }
});

// New in Sprint 3:
// - result.metrics.musclesAboveMRV
// - result.metrics.injuryConflictCount
// - result.volumeAnalysis
// - result.injuryConflicts
```

## Integration Points

### 1. Plan Generation
Volume landmarks should guide exercise selection:
- Target MAV- (lower bound of optimal) as default
- Cap at MRV to prevent overreaching
- Adjust for recovery burden

### 2. User Profile
Injuries stored in `UserTrainingProfile.injuries`:
- Array of strings (e.g., `['knee pain', 'back']`)
- Parsed by `parseInjuries()` into typed `InjuryType[]`

### 3. Recovery Burden
Derived from `training-profile.ts`:
- Factors: injuries, days/week, session duration, recovery reason, experience, activity level
- Used to adjust volume targets

## Scientific Basis

### Volume Landmarks
Based on research from:
- **Helms et al.** "The Muscle and Strength Training Pyramid" (2015)
- **Israetel et al.** "Scientific Principles of Hypertrophy Training" (2016)
- **Schoenfeld et al.** Meta-analyses on dose-response of training volume

### Injury Considerations
Based on:
- **Exercise biomechanics literature**
- **Physical therapy guidelines**
- **Common contraindications** for musculoskeletal conditions

## Testing

### Unit Tests (to be added)
```typescript
// Volume landmark tests
describe('Volume Landmarks', () => {
  it('calculates correct MRV for beginner chest', () => {
    const landmark = getVolumeLandmark('chest', 'beginner', 'low');
    expect(landmark.mrv).toBe(Math.round(16 * 1.1)); // Base * muscle multiplier
  });
  
  it('adjusts for high recovery burden', () => {
    const low = getVolumeLandmark('chest', 'intermediate', 'low');
    const high = getVolumeLandmark('chest', 'intermediate', 'high');
    expect(high.mrv).toBe(Math.round(low.mrv * 0.7));
  });
});

// Injury substitution tests
describe('Injury Substitutions', () => {
  it('detects knee conflict in barbell squat', () => {
    const conflict = exerciseConflictsWithInjury(
      { name: 'Barbell Squat' },
      'knees'
    );
    expect(conflict).toBe(true);
  });
  
  it('suggests leg press for barbell squat with knee injury', () => {
    const rec = getSubstitutionRecommendation(
      { name: 'Barbell Squat' },
      ['knees']
    );
    expect(rec.suggestedReplacements).toContain('Leg Press');
  });
});
```

## Next Steps (Sprint 4 Ideas)

1. **Auto-substitution**: Automatically replace conflicting exercises instead of just flagging
2. **Volume periodization**: Weekly volume targets that change across mesocycle
3. **Deload detection**: Automatic deload recommendations when approaching overreaching
4. **Exercise progression tracking**: Track if user is progressing at current volume

## Migration Notes

### Backward Compatibility
- Quality gates remain backward compatible
- New fields are additive only
- Existing code without injuries/volume analysis works unchanged

### Opt-in Features
To use Sprint 3 features:
```typescript
const result = runQualityGates({
  workoutDays: [...],
  trainingProfile: {
    // ...existing fields...
    injuries: ['knee pain'],  // NEW: Enable injury detection
    recoveryBurden: 'high',   // NEW: Enable volume adjustment
  }
});

// Access new results
console.log(result.volumeAnalysis?.recoveryRisk);
console.log(result.injuryConflicts.length);
```
