# Phase 4: Recovery Management - Implementation Complete

## Overview

Phase 4 has been successfully implemented, adding comprehensive recovery tracking and optimization to the workout generation system. This phase integrates with Phases 1-3 to provide auto-adjustments based on recovery status.

## Files Created

### 1. `lib/workout/recovery-management.ts`

**Purpose**: Core recovery calculations, assessments, and recommendations.

**Recovery Score Components** (0-100):

| Component | Weight | Input Metrics |
|-----------|--------|---------------|
| **Sleep** | 35% | Hours (0-60 pts) + Quality (0-40 pts) |
| **Muscle Recovery** | 30% | Soreness level + Performance trend |
| **Nervous System** | 25% | HRV + Resting HR + Energy level |
| **Hydration** | 10% | Estimated from energy/stress |

**Sleep Scoring**:
```typescript
Hours:  ≥9h = 60pts | ≥8h = 55pts | ≥7h = 45pts | ≥6h = 30pts | ≥5h = 15pts
Quality: excellent = 40pts | good = 30pts | fair = 20pts | poor = 10pts
```

**Recovery Status Levels**:

| Score | Status | Training Action |
|-------|--------|-----------------|
| 85-100 | Excellent | Full training, can push intensity |
| 70-84 | Good | Normal training as planned |
| 50-69 | Fair | Proceed with caution, monitor fatigue |
| 30-49 | Poor | Reduce volume 20%, cap RPE |
| 0-29 | Critical | Suspend training, focus on recovery |

**Overreaching Detection**:

```typescript
interface OverreachingStatus {
  state: 'fresh' | 'adequate' | 'overreached' | 'overtrained';
  functional: boolean; // True = beneficial, False = harmful
  daysInState: number;
  indicators: string[];
  actions: string[];
}
```

**Detection Criteria**:

| State | Indicators | Duration | Action |
|-------|------------|----------|--------|
| **Fresh** | Energy ≥4, Soreness ≤2, Sleep good | - | Ready for overload |
| **Adequate** | Normal training fatigue | - | Standard recovery |
| **Functional Overreaching** | High fatigue, performance maintained | 3-7 days | Planned deload |
| **Non-Functional Overreaching** | Performance declining | 5-10 days | Mandatory deload |
| **Overtrained** | Chronic suppression | 10+ days | Medical consultation |

**Active Recovery Types**:

| Type | Duration | Best For | Benefits |
|------|----------|----------|----------|
| Light Cardio | 20 min | Rest days | Blood flow, mental refresh |
| Mobility | 15 min | Daily | Joint health, movement prep |
| Yoga | 30 min | Nervous system fatigue | Cortisol reduction, HRV |
| Stretching | 20 min | Muscle soreness | Tension release, relaxation |
| Foam Rolling | 15 min | DOMS | Myofascial release, circulation |
| Contrast Therapy | 20 min | Inflammation | Reduce soreness, speed recovery |

### 2. `lib/workout/recovery-integration.ts`

**Purpose**: Integration layer connecting recovery to periodized programs.

**Key Features**:

- **Program Enhancement**: Adds recovery tracking to any periodized program
- **Daily Check-In**: Processes daily metrics and generates recommendations
- **Auto-Adjustments**: Automatically modifies training based on recovery
- **Alert System**: Three-tier alert system (info/warning/critical)

**Auto-Adjustment Matrix**:

| Recovery Status | Volume | Intensity Cap | Auto-Deload |
|----------------|--------|---------------|-------------|
| Excellent | 100% | None | No |
| Good | 100% | None | No |
| Fair | 80% | RPE 8 | No |
| Poor | 50% | RPE 7.5 | Yes |
| Critical | 25% | RPE 7 | Yes (suspend) |

**Alert Types**:

```typescript
// Critical (immediate action)
{
  level: 'critical',
  title: 'Overtraining Detected',
  message: 'Training suspended. Consult sports medicine professional.',
  actions: ['Schedule doctor appointment', 'Complete rest protocol']
}

// Warning (adjustments needed)
{
  level: 'warning',
  title: 'Functional Overreaching',
  message: 'Deload recommended next week.',
  actions: ['Reduce volume 50%', 'Prioritize sleep 9+ hours']
}

// Info (optimization suggestions)
{
  level: 'info',
  title: 'Sleep Quality Low',
  message: 'Your sleep could be improved.',
  actions: ['Set consistent bedtime', 'Eliminate pre-bed screens']
}
```

### 3. `lib/workout/recovery-system.ts`

**Purpose**: Main export module for all Phase 4 functionality.

## Recovery Metrics Tracked

### Daily Metrics

```typescript
interface RecoveryMetric {
  date: string;
  sleepHours: number;        // 0-12 hours
  sleepQuality: 'poor'|'fair'|'good'|'excellent';
  restingHR?: number;        // Optional wearable data
  hrvScore?: number;         // 0-100 scale
  sorenessLevel: 1-5;        // 1=none, 5=severe
  energyLevel: 1-5;          // 1=exhausted, 5=energized
  stressLevel: 1-5;          // 1=none, 5=extreme
  motivationLevel: 'low'|'moderate'|'high';
}
```

### Recovery Score Output

```typescript
interface RecoveryScore {
  overall: number;           // 0-100 weighted composite
  sleep: number;             // Sleep component
  muscleRecovery: number;    // Muscle recovery component
  nervousSystem: number;     // CNS recovery component
  hydration: number;         // Hydration estimate
  timestamp: string;
  trend: 'improving'|'stable'|'declining';
  status: 'excellent'|'good'|'fair'|'poor'|'critical';
}
```

## Integration with Previous Phases

### Phase 1 (Foundation)
- Volume landmarks respected even when auto-adjusting
- Complexity filtering maintained
- Quality gates still applied post-adjustment

### Phase 2 (Recipes)
- Rest day placements consider recipe structure
- Active recovery sessions match training focus
- Nutrition timing aligns with goals

### Phase 3 (Periodization)
- Deload weeks can be auto-triggered by recovery
- Progressive overload paused during poor recovery
- Week structures adjusted based on metrics

## Usage Examples

### Basic Recovery Tracking

```typescript
import { calculateRecoveryScore } from './recovery-system';

const score = calculateRecoveryScore(
  [{
    date: '2024-01-15',
    sleepHours: 7.5,
    sleepQuality: 'good',
    sorenessLevel: 2,
    energyLevel: 4,
    stressLevel: 2,
    motivationLevel: 'high',
    hrvScore: 68,
  }],
  [], // performance history
  'intermediate'
);

console.log(score.overall); // 82
console.log(score.status);  // "good"
console.log(score.trend);   // "stable"
```

### Full Integration Workflow

```typescript
import {
  generatePeriodizedProgram,
  enhanceProgramWithRecovery,
  processDailyCheckIn,
  adjustWeekPlanForRecovery,
} from './workout-system';

// 1. Create base program (Phase 1-3)
const baseProgram = generatePeriodizedProgram('user_123', profile);

// 2. Add recovery tracking (Phase 4)
let program = enhanceProgramWithRecovery(baseProgram);

// 3. Daily check-in
const { program: updated, checkIn } = processDailyCheckIn(program, {
  date: new Date().toISOString(),
  sleepHours: 5.5,
  sleepQuality: 'poor',
  sorenessLevel: 4,
  energyLevel: 2,
  stressLevel: 4,
  motivationLevel: 'low',
});

program = updated;

// 4. Check alerts
if (checkIn.alerts.length > 0) {
  checkIn.alerts.forEach(alert => {
    console.log(`[${alert.level}] ${alert.title}: ${alert.message}`);
  });
}
// Output: [critical] Poor Recovery Status: Training adjustments recommended

// 5. Get adjusted week
const currentWeek = getCurrentWeek(program);
const adjustedWeek = adjustWeekPlanForRecovery(currentWeek, program);

// Adjusted: Volume reduced 50%, RPE capped at 7.5
```

### Rest Day Optimization

```typescript
import { optimizeRestDays } from './recovery-system';

const restDays = optimizeRestDays(
  4, // days per week
  [1, 2, 4, 5], // Mon, Tue, Thu, Fri training
  recoveryScores,
  'intermediate'
);

// Returns:
// [
//   { dayOfWeek: 0 (Sun), priority: "recommended", reason: "Post-weekend recovery" },
//   { dayOfWeek: 3 (Wed), priority: "required", reason: "Between split sessions" },
//   { dayOfWeek: 6 (Sat), priority: "recommended", reason: "Pre-week prep" }
// ]
```

### Sleep Protocol

```typescript
import { generateSleepProtocol } from './recovery-system';

const protocol = generateSleepProtocol(6, 'poor', 'high');

console.log(protocol.targetHours); // 9
console.log(protocol.preSleepRoutine);
// [
//   "2 hours before: No caffeine or heavy meals",
//   "90 min before: Last meal (light protein + carbs)",
//   "60 min before: Stop all screens",
//   ...
// ]
```

### Nutrition Timing

```typescript
import { getNutritionTiming } from './recovery-system';

const postWorkout = getNutritionTiming('post_workout', 'morning', 'build_muscle');

console.log(postWorkout.timing);    // "Within 2 hours (ideally 30-60 min)"
console.log(postWorkout.macros);    // { protein: 40, carbs: 60, fats: 10 }
console.log(postWorkout.foods);     // ["lean protein", "rice", "vegetables"]
```

## Recovery Recommendations by Priority

### Critical Priority
- **Training Cessation**: Overtraining detected
- **Mandatory Deload**: Non-functional overreaching

### High Priority
- **Sleep Optimization**: Score <60
- **Protein Timing**: Muscle recovery <60
- **Parasympathetic Activation**: Nervous system <60

### Medium Priority
- **Hydration Protocol**: Hydration <60
- **Active Recovery**: Rest day recommendations
- **Contrast Therapy**: Soreness level ≥4

### Low Priority
- **Supplement Suggestions**: Optional optimizations
- **Technique Cues**: Minor adjustments

## Complete Architecture (Phases 1-4)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    COMPLETE WORKOUT SYSTEM                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ PHASE 1: FOUNDATION                                                 │   │
│  │  • Exercise Complexity   • Volume Landmarks   • Quality Gates       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    ↓                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ PHASE 2: RECIPE SYSTEM                                              │   │
│  │  • Per-Experience Recipes   • Goal Priorities   • Volume Validation │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    ↓                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ PHASE 3: PERIODIZATION                                              │   │
│  │  • Linear/Block/DUP   • Overload Protocols   • Week Progression     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    ↓                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ PHASE 4: RECOVERY MANAGEMENT                                        │   │
│  │  • Recovery Score   • Overreaching Detection   • Auto-Adjustments   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    ↓                                        │
│                    ┌──────────────────────────┐                            │
│                    │  PERSONALIZED TRAINING   │                            │
│                    │    Auto-adjusted based   │                            │
│                    │    on daily recovery     │                            │
│                    └──────────────────────────┘                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Testing

Run the demo:
```bash
cd /Users/owner/Projects/Metriqfit-elite-remote-20260307-073401
npx ts-node scripts/demo-recovery.ts
```

Expected output:
- Recovery score calculations
- Rest day optimizations for each experience level
- Overreaching detection scenarios
- Recovery recommendations
- Active recovery sessions by status
- Nutrition timing examples
- Sleep protocols
- Full integration with periodized program
- Enhanced summary generation

## Configuration

### Experience-Specific Defaults

| Level | Min Rest Days | Recovery Check Frequency | Auto-Deload Threshold |
|-------|---------------|--------------------------|----------------------|
| Beginner | 3/week | Daily | Score <40 |
| Intermediate | 2/week | Daily | Score <35 |
| Advanced | 1-2/week | Daily | Score <30 |

### Wearable Integration (Optional)

The system supports optional HRV and resting HR data:

```typescript
const metric = {
  // ... other fields
  restingHR: 58,     // From Apple Watch, Whoop, etc.
  hrvScore: 72,      // Normalized 0-100
};
```

Without wearable data, system uses self-reported metrics.

## Files Summary

| Phase | Files | Lines | Key Features |
|-------|-------|-------|--------------|
| Phase 1 | 5+ | ~2,500 | Complexity, volume, quality gates |
| Phase 2 | 4+ | ~2,000 | Per-experience recipes |
| Phase 3 | 4+ | ~2,300 | Periodization, progression |
| Phase 4 | 4+ | ~2,800 | Recovery, auto-adjustments |
| **Total** | **17+** | **~9,600** | **Complete system** |

## Next: Phase 5 (Testing & Validation)

Planned features:
- A/B testing framework
- User feedback collection
- Performance analytics
- Effectiveness metrics
- Integration testing

## Status

✅ **Phase 1 Complete** - Exercise complexity, volume landmarks, quality gates
✅ **Phase 2 Complete** - Per-experience recipes, goal prioritization
✅ **Phase 3 Complete** - Periodization, progressive overload
✅ **Phase 4 Complete** - Recovery management, auto-adjustments

⏳ **Phase 5 Ready** - Testing & validation
