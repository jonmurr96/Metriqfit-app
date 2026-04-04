# V1 Plan Generation - Unilateral Exercise Group Bug Fix

**Date:** April 4, 2026  
**Status:** ✅ FIXED AND DEPLOYED  
**Commit:** 3396279

---

## Problem Summary

V1 workout plan generation was failing with error:
```
"V1 Generation Failed: Fatally failed to hydrate slot 2 in day 6. 
No valid exercises found for group Unilateral_Hinge."
```

This occurred when users selected 6-day workout templates that included unilateral accessory exercises.

---

## Root Cause Analysis

### The Template Requests Unilateral Groups

In `loaders/seeds/templates.ts`, the 6-day template (Legs B day) includes:
```typescript
{
  day_number: 6,
  day_type: DayType.Legs,
  slots: [
    { order_index: 0, architectural_group: ReplacementGroup.Primary_Bilateral_Squat, ... },
    { order_index: 1, architectural_group: ReplacementGroup.Primary_Bilateral_Hinge, ... },
    { order_index: 2, architectural_group: ReplacementGroup.Unilateral_Hinge, ... },  // ← FAILS HERE
    { order_index: 3, architectural_group: ReplacementGroup.Isolation_Calf_Raise, ... },
  ]
}
```

### The Exercise Catalog Uses Different Groups

In `supabase/seed.sql`, exercises are tagged with bilateral groups even when unilateral:
```sql
-- Single Arm DB RDL (unilateral exercise)
INSERT INTO public.v1_exercises (...)
VALUES (...,
  'Single Arm DB RDL',
  'Hinge',
  'Primary_Bilateral_Hinge',  -- ← Uses bilateral group
  'DB',
  true,  -- ← is_unilateral flag indicates it's unilateral
  ...
);
```

### The Hydrate Function Did Exact Matching

In `lib/workout/v1_architect.ts`, `findExerciseInGroup()` used exact matching:
```typescript
// OLD CODE (line 122)
if (ex.architectural_group !== group) return false;
```

When template requested `Unilateral_Hinge`:
1. Function searched for exercises with `architectural_group = 'Unilateral_Hinge'`
2. No exercises have this exact group value
3. All unilateral exercises have `architectural_group = 'Primary_Bilateral_Hinge'` + `is_unilateral = true`
4. No candidates found → Fatal error

---

## The Fix

### Added Unilateral Group Mapping

```typescript
const UnilateralGroupMapping: Record<string, { baseGroup: ReplacementGroup; requiresUnilateral: boolean }> = {
  [ReplacementGroup.Unilateral_Hinge]: { baseGroup: ReplacementGroup.Primary_Bilateral_Hinge, requiresUnilateral: true },
  [ReplacementGroup.Unilateral_Squat_Lunge]: { baseGroup: ReplacementGroup.Primary_Bilateral_Squat, requiresUnilateral: true },
};
```

### Modified findExerciseInGroup Function

```typescript
function findExerciseInGroup(...) {
  // Check if this is a unilateral group that needs special handling
  const unilateralMapping = UnilateralGroupMapping[group];
  const targetGroup = unilateralMapping?.baseGroup ?? group;
  const requireUnilateral = unilateralMapping?.requiresUnilateral ?? false;

  const candidates = coreExercises.filter((ex) => {
    // Match the base group (e.g., Primary_Bilateral_Hinge for Unilateral_Hinge)
    if (ex.architectural_group !== targetGroup) return false;
    
    // For unilateral groups, require is_unilateral = true
    if (requireUnilateral && !ex.is_unilateral) return false;
    
    // ... rest of filters
  });
  // ...
}
```

### Mapping Logic

| Template Requests | Search For | Filter By |
|-------------------|------------|-----------|
| `Unilateral_Hinge` | `Primary_Bilateral_Hinge` | `is_unilateral = true` |
| `Unilateral_Squat_Lunge` | `Primary_Bilateral_Squat` | `is_unilateral = true` |
| `Primary_Bilateral_Hinge` | `Primary_Bilateral_Hinge` | (no extra filter) |
| Other groups | Same group | (no extra filter) |

---

## Files Changed

1. **lib/workout/v1_architect.ts**
   - Added `UnilateralGroupMapping` constant
   - Modified `findExerciseInGroup()` to handle unilateral group mapping

2. **V1_DIAGNOSTIC_STATUS.md** (documentation)

---

## Deployment Status

| Component | Status | Version |
|-----------|--------|---------|
| Edge Function (generate-user-plans) | ✅ Deployed | Version 96 |
| Frontend Error Handling | ✅ Committed | 84381c0 |
| Unilateral Fix | ✅ Deployed | 3396279 |
| GitHub Branch | ✅ Pushed | feat/ai-prep-coach-elite |

---

## Testing

### Regression Tests (All Pass)
```bash
npm run test:v1-activation

✅ V1 plan generation with live activation
✅ V1 plan generation - schedule rows exist
✅ V1 plan generation in preview mode
✅ V1 plan activation archives previous plan
✅ review screen schedule query by plan ID
```

### Manual Verification
To verify the fix works:
1. Trigger EAS update: `eas update --branch feat/ai-prep-coach-elite`
2. Try generating a V1 workout plan with 6-day split
3. Should complete successfully instead of showing "Something went wrong"

---

## Related Issues

- **Error handling improvement**: Frontend now shows actual error messages from Edge Function
- **Diagnostic logging**: Comprehensive tracing added to identify future issues quickly

---

## Prevention

To prevent similar issues:
1. Ensure all `ReplacementGroup` enum values have corresponding exercises OR mapping logic
2. When adding new template slots, verify the requested group exists in exercise catalog
3. Run `v1-activation-regression.test.mjs` before deploying V1 changes
