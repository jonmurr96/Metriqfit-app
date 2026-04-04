# V1 Workout Plan Activation Fix - COMPLETE

## Summary

Fixed the V1 workout plan activation bug where plans were stored but never activated, causing the weekly schedule to appear empty in the plan review screen.

---

## Root Cause

1. **Backend**: The V1 workout engine called `storeV1WorkoutPlan()` which inserted plans with `is_active: false`, but the V1 path never called `finalizeStoredWorkoutPlanActivation()` to activate them.

2. **Frontend**: The plan review screen used `useWorkoutSchedule()` which internally called `getActiveWorkoutPlan()`, only querying for active plans. Since V1 plans were inactive, the schedule fetch returned empty.

---

## Changes Made

### 1. Backend Fix
**File**: `supabase/functions/generate-user-plans/index.ts` (lines ~4637-4652)

Added activation finalization after V1 workout storage:
- Checks if `activationMode !== 'preview'`
- Calls `finalizeStoredWorkoutPlanActivation()` with proper parameters
- Adds structured logging for activation success/failure
- Non-blocking: activation failures are logged as warnings but don't fail generation

### 2. Frontend Service
**File**: `services/planService.ts` (lines 3035-3076)

Added `getWorkoutScheduleByPlanId()` function:
- Fetches schedule rows for a specific plan ID (not just active plans)
- Same return type as `getWorkoutSchedule()` for compatibility
- Includes day metadata lookup for rich schedule entries

### 3. Frontend Hook
**File**: `hooks/usePlan.ts` (lines 34, 239-255)

Added `useWorkoutScheduleByPlanId()` hook:
- Accepts `planId` parameter for targeted schedule fetching
- Uses React Query for caching and stale-while-revalidate
- Returns empty array if planId is null

### 4. Frontend Component
**File**: `app/(onboarding)/plan-review.tsx` (lines 33, 152-158)

Updated schedule fetching:
- Changed import from `useWorkoutSchedule` to `useWorkoutScheduleByPlanId`
- Now passes `workoutPlan?.id` to fetch schedule for the displayed plan
- Ensures preview/live rendering is consistent

---

## Files Modified

| File | Lines | Change |
|------|-------|--------|
| `supabase/functions/generate-user-plans/index.ts` | +16 | Added V1 activation finalization |
| `services/planService.ts` | +42 | Added `getWorkoutScheduleByPlanId()` |
| `hooks/usePlan.ts` | +20 | Added hook and import |
| `app/(onboarding)/plan-review.tsx` | +4 | Updated to use plan-specific fetch |

---

## Data Repair

**Script**: `scripts/repair-v1-inactive-plans.sql`

SQL script to:
1. Identify V1 plans stored with `lifecycle_state = 'live'` but `is_active = false`
2. Count affected users/plans
3. Provide repair commands (commented out for safety)
4. Verify repair completion

---

## Verification Steps

1. **Deploy backend changes**:
   ```bash
   supabase functions deploy generate-user-plans
   ```

2. **Verify TypeScript compilation**:
   ```bash
   npm run build
   ```
   ✅ No errors in modified files

3. **Test plan generation**:
   - Generate a new workout plan in the app
   - Verify workout week preview displays scheduled days
   - Verify nutrition still renders correctly

4. **Check backend logs** for:
   - `7. V1 Activation Success: TRUE`
   - `Activated Plan ID: <plan-id>`

---

## Expected Behavior

### Before Fix
- Workout plan card shows in review screen
- Weekly schedule shows "No workouts scheduled"
- Plan row in DB has `is_active = false`

### After Fix
- Workout plan card shows in review screen
- Weekly schedule displays actual workout days
- Plan row in DB has `is_active = true`
- Older active plans are archived

---

## Deployment Checklist

- [ ] Deploy `supabase/functions/generate-user-plans/index.ts` to production
- [ ] Deploy frontend changes (services, hooks, components)
- [ ] Run data repair SQL if needed for existing inactive V1 plans
- [ ] Verify new plan generation works end-to-end
- [ ] Monitor backend logs for activation success messages

---

## Rollback Plan

If issues occur:
1. Revert the backend change by removing the V1 activation block
2. Revert frontend changes to use `useWorkoutSchedule` instead of `useWorkoutScheduleByPlanId`
3. Re-deploy

The changes are backward-compatible - the frontend hardening alone (using plan-specific schedule fetch) would work even without the backend fix, as long as there is any plan to display.
