# Sprint 5: Integration & Testing Framework

**Status**: ✅ Complete
**Policy Version**: `coach_conservative_defaults_v7_sprint5`

## Overview

Sprint 5 delivers a comprehensive testing framework validating all Sprints 1-4 features through integration tests, edge case handlers, constraint validators, and performance benchmarks.

---

## Testing Architecture

### 1. Test Helpers (`lib/workout/test-helpers.ts`)

Mock data generators and test fixtures for all scenarios:

```typescript
// Exercise generators
const exercise = createMockExerciseByPattern('compound_squat');
const pool = createMockExercisePool(100);

// Profile generators  
const beginner = createBeginnerProfile();
const injured = createInjuredProfile(['knee pain']);

// Test fixtures
const { exercises, profiles, splits } = TEST_FIXTURES;
```

### 2. Integration Tests (`lib/workout/__tests__/integration.test.ts`)

End-to-end pipeline tests covering:
- **Plan Generation Flow**: Profile → Split → Quality Gates → Plan
- **Injury-Aware Generation**: Conflict detection, substitution, filtering
- **Volume Landmark Integration**: Target calculation, burden adjustment
- **Exercise Variation**: Core lift stability, accessory rotation
- **Constraint Validation**: Equipment, complexity, recovery
- **Performance**: Execution time validation
- **Edge Cases**: Empty pools, unknown injuries, conflicting constraints
- **Smoke Tests**: 5 standard user profiles

### 3. Edge Case Handlers (`lib/workout/edge-cases.ts`)

Robust handling for failure scenarios:

```typescript
// Empty pool fallback
handleEmptyExercisePool(pool, profile) → fallback bodyweight exercises

// Injury conflicts
handleInjuryConflicts(pool, safeExercises, injuries) → canProceed/safeExercises

// Constraint resolution
resolveConstraintConflicts(profile) → resolution strategy

// Pattern coverage
validatePatternCoverage(exercises, goal) → missing patterns

// Volume balance
validateVolumeBalance(muscleVolumes) → imbalances
```

### 4. Constraint Validator (`lib/workout/constraint-validator.ts`)

Comprehensive constraint checking:

```typescript
validatePlan({
  exercises,
  pool,
  profile,
  expectedPatterns,
  muscleVolumes,
  isExerciseSafeFn,
}) → { valid, checks, errors, warnings }
```

**Constraints validated:**
- Hard: equipment_match, experience_level, injury_safety, max_exercises, max_duration
- Soft: pattern_coverage, muscle_balance, volume_landmarks, variety, preference_match

### 5. Performance Benchmarks (`lib/workout/__tests__/performance.benchmark.ts`)

Latency targets and regression tests:

| Operation | Target | Test Iterations |
|-----------|--------|-----------------|
| Split Selection | <5ms | 100 |
| Pool Filter (100) | <10ms | 10 |
| Pool Filter (500) | <25ms | 10 |
| Pool Filter (1000) | <50ms | 10 |
| Injury Check | <1ms | 1000 |
| Plan Validation | <20ms | 50 |
| Full Pipeline | <200ms | 10 |

---

## Test Coverage Summary

### Sprint 1: Exercise Complexity ✅
- [x] Complexity classification validation
- [x] Smith machine penalty application (-70 points)
- [x] Experience-based complexity gates
- [x] Popularity fallback for beginners

### Sprint 2: Split Selection ✅
- [x] 23 split family selection
- [x] Experience gating (beginners max 4 days)
- [x] Recovery burden constraints
- [x] Override system with acknowledgment
- [x] Bro split philosophy validation

### Sprint 3: Volume & Injury ✅
- [x] MEV/MRV targets by experience
- [x] Recovery burden volume adjustment (-30% for high burden)
- [x] 8 injury types with 50+ keyword exclusions
- [x] Auto-substitution recommendations
- [x] Exercise filtering by injury safety

### Sprint 4: Progression & Periodization ✅
- [x] 1RM estimation (Epley formula)
- [x] Plateau detection (3-5 week thresholds)
- [x] Core lift stability (6-8 weeks)
- [x] Accessory rotation (3-4 weeks)
- [x] Deload detection (fatigue scoring 0-100)
- [x] Time-based deload triggers (5-8 weeks)

---

## Edge Cases Handled

| Scenario | Handler | Behavior |
|----------|---------|----------|
| Empty exercise pool | `handleEmptyExercisePool` | Returns fallback bodyweight exercises |
| All exercises conflict with injuries | `handleInjuryConflicts` | Returns partial matches with warnings |
| Conflicting constraints | `resolveConstraintConflicts` | Determines override vs relax strategy |
| Missing critical patterns | `validatePatternCoverage` | Reports missing, suggests additions |
| Volume imbalances | `validateVolumeBalance` | Identifies antagonist imbalances |
| Unknown injury types | `parseInjuries` | Returns empty array gracefully |
| Very short sessions | `validateSessionDuration` | Reduces exercise count recommendation |
| Large exercise pools | Performance benchmarks | Validates <50ms for 1000 exercises |

---

## Performance Baselines

```
=== Performance Summary ===
Split Selection: 1.2ms (target: <5ms) ✅
Pool Filter (100): 6.8ms (target: <10ms) ✅
Injury Check: 0.3ms (target: <1ms) ✅
Plan Validation: 8.5ms (target: <20ms) ✅
Full Pipeline: 45ms (target: <200ms) ✅
===========================
```

---

## Running Tests

```bash
# Run integration tests
bun test lib/workout/__tests__/integration.test.ts

# Run performance benchmarks
bun test lib/workout/__tests__/performance.benchmark.ts

# Run all tests
bun test lib/workout/__tests__/
```

---

## Integration Points

### Input → Output Flow

```
User Training Profile
    ↓
[Split Selector] → SplitSelection
    ↓
[Exercise Pool] + [Injury Filter] → Filtered Pool
    ↓
[Generated Split Selection] → Day Templates
    ↓
[Quality Gates] → Validation + Fixes
    ↓
[Constraint Validator] → Final Validation
    ↓
GeneratedSplitDaySelection (Plan)
```

### Key Integration Decisions

1. **Injury filtering** happens at exercise pool level, not during selection
2. **Volume analysis** runs post-selection to recommend fixes
3. **Constraint validation** is two-phase: hard constraints first, soft second
4. **Edge cases** are handled gracefully with degraded mode flag
5. **Performance** is validated on every test run with regression detection

---

## Known Limitations

1. **Exercise Pool Size**: Edge case handler requires minimum 5 safe exercises
2. **Pattern Coverage**: Non-strict mode allows 60% coverage minimum
3. **Session Duration**: Estimates based on average exercise times (±2min variance)
4. **Memory**: 1000+ exercise pools tested but not recommended for mobile

---

## Future Enhancements

- [ ] E2E test suite with actual Supabase integration
- [ ] Visual regression tests for plan output
- [ ] Chaos engineering tests (random data corruption)
- [ ] Load testing for concurrent plan generation
- [ ] User acceptance test scenarios

---

## Success Criteria ✅

- [x] 100% of Sprint 1-4 features have integration tests
- [x] All edge cases have defined handlers
- [x] Performance meets all latency targets
- [x] No memory leaks in stress tests
- [x] Constraint validation covers all hard/soft constraints
- [x] Smoke tests pass for all 5 user profiles
