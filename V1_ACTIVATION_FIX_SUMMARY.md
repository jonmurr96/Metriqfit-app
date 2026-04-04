# V1 Workout Plan Activation Fix

## Root Cause
The V1 workout engine successfully generates and stores workout plans with all days/blocks/exercises/schedule rows, but the V1 path did NOT finalize activation after storage. As a result, generated plans remained `is_active = false`.

The frontend review screen could render the workout shell from preview/latest plan data, but the weekly schedule fetch only queried active workout plans, causing the week/day schedule to appear empty.

## Changes Made

### 1. Backend Fix - `supabase/functions/generate-user-plans/index.ts`

Added activation finalization after V1 workout plan storage:

```typescript
// V1 Activation: Finalize activation after successful storage
if (activationMode !== 'preview' && workoutResult?.planId) {
  try {
    await finalizeStoredWorkoutPlanActivation(supabase, {
      userId,
      planId: workoutResult.planId,
      activationMode,
      currentPlanId: currentPlanContext?.planId || null,
    });
    console.log('\n7. V1 Activation Success: TRUE');
    console.log('   Activated Plan ID:', workoutResult.planId);
  } catch (e: any) {
    console.log('\n7. V1 Activation Success: FALSE', e.message);
    warnings.push(`V1 activation warning: ${e.message}`);
  }
}
```

**Lines modified**: ~4637-4652

### 2. Frontend Service - `services/planService.ts`

Added new function `getWorkoutScheduleByPlanId()` to fetch schedule by specific plan ID:

```typescript
export async function getWorkoutScheduleByPlanId(
  planId: string,
  startDate: string,
  endDate: string,
): Promise<WorkoutScheduleEntry[]>
```

**Lines added**: 3035-3076

### 3. Frontend Hook - `hooks/usePlan.ts`

- Added import for `getWorkoutScheduleByPlanId`
- Added new hook `useWorkoutScheduleByPlanId()`:

```typescript
export function useWorkoutScheduleByPlanId(
  planId: string | null,
  startDate: string,
  endDate: string,
  options?: { enabled?: boolean }
)
```

**Lines modified**: Import at line 34, new hook at lines 239-255

### 4. Frontend Component - `app/(onboarding)/plan-review.tsx`

- Changed import from `useWorkoutSchedule` to `useWorkoutScheduleByPlanId`
- Updated schedule fetch to use plan-specific query:

```typescript
const { data: weekSchedule, isLoading: weekScheduleLoading } = useWorkoutScheduleByPlanId(
  workoutPlan?.id || null,
  weekRange.startDate,
  weekRange.endDate,
  { enabled: Boolean(workoutPlan?.id) },
);
```

**Lines modified**: Import at line 33, usage at lines 152-158

## Files Modified

1. `supabase/functions/generate-user-plans/index.ts` - Added V1 activation finalization
2. `services/planService.ts` - Added `getWorkoutScheduleByPlanId()` function
3. `hooks/usePlan.ts` - Added `useWorkoutScheduleByPlanId()` hook and import
4. `app/(onboarding)/plan-review.tsx` - Updated to use plan-specific schedule fetch

## Verification Steps

1. Deploy backend changes to Supabase Edge Functions
2. Run `npm run build` to verify TypeScript compiles without errors
3. Test plan generation in the app
4. Verify the workout week preview displays actual scheduled workout days
5. Verify nutrition still renders correctly

## Data Repair

See `scripts/repair-v1-inactive-plans.sql` for SQL to identify and repair any V1 plans that were stored but not activated.

## Expected Behavior After Fix

1. **New V1 Plans**: When a user generates a workout plan, it will now be properly activated (is_active = true)
2. **Schedule Display**: The plan review screen will correctly display the weekly workout schedule
3. **Consistency**: Both workout and nutrition plans will display consistently in the review screen
4. **Older Plans**: Any existing active plans will be archived when a new plan is activated
