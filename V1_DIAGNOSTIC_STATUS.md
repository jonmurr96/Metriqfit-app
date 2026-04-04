# V1 Plan Generation - Diagnostic Status Report

**Date:** April 4, 2026  
**Branch:** feat/ai-prep-coach-elite  
**Commit:** 84381c0

## Summary

User reported "Something went wrong" error during V1 workout plan generation. Comprehensive diagnostics have been deployed to identify the exact failure point.

## Root Cause Analysis

### 1. Frontend Error Handling Issue (FIXED)
**Problem:** The frontend was swallowing actual error messages from the Edge Function.

**Location:** `services/planService.ts` (4 places)

**Before:**
```typescript
if (error) {
  throw new Error('Failed to regenerate plans. Please try again.');
}
```

**After:**
```typescript
if (error) {
  throw new Error(error.message || 'Failed to regenerate plans. Please try again.');
}

// NEW: Handle structured error responses from Edge Function
if (data?.success === false) {
  throw new Error(data.error || 'Plan generation failed. Please try again.');
}
```

**Result:** Users will now see the actual error message from the Edge Function instead of generic "Something went wrong".

### 2. Edge Function Diagnostic Logging (DEPLOYED)

The Edge Function now has comprehensive tracing at every step:

| Step | Log Output | Purpose |
|------|-----------|---------|
| Entry | `[generate-user-plans] Function invoked` | Confirms function reached |
| Auth | `Auth header present: true/false` | Validates JWT received |
| Auth | `Auth result: { hasUser, authError }` | Confirms user authenticated |
| Body | `Body parsed successfully: {...}` | Shows parsed parameters |
| Context | `Fetching user context...` | Starts context loading |
| Context | `User context fetched: { hasOnboarding, ... }` | Confirms data loaded |
| V1 Block | `[V1] Workout generation block entered` | Enters V1 code path |
| V1 Map | `[V1] Mapped profile: {...}` | Shows mapped V1 profile |
| V1 Route | `[V1] Router recommendation: {...}` | Shows family/template selection |
| V1 Family | `[V1] Family lookup: found/not found` | Validates family exists |
| V1 Template | `[V1] Template lookup: found/not found` | Validates template exists |
| V1 Hydrate | `5. Hydration Success: TRUE/FALSE` | Shows hydration result |
| V1 Storage | `6. DB Writes Success: TRUE/FALSE` | Shows storage result |
| V1 Activation | `[V1] Starting activation block...` | Starts activation |
| V1 Activation | `7. V1 Activation Success: TRUE/FALSE` | Shows activation result |
| V1 Error | `[V1] CRITICAL ERROR in V1 generation: {...}` | Captures any V1 errors |

### 3. Edge Function Error Response Structure

When V1 generation fails, the Edge Function returns:
```json
{
  "success": false,
  "error": "V1 Generation Failed: [specific error message]",
  "run_id": "...",
  "details": {
    "step": "v1_generation",
    "message": "[specific error message]"
  }
}
```

With HTTP status 500.

## Deployment Status

### Backend (Edge Function)
- ✅ **Deployed:** Version 95 (hatskscplygyrrpepqmx)
- ✅ **Diagnostics:** Comprehensive logging enabled
- ✅ **V1 Activation:** Fixed to properly activate plans (finalizeStoredWorkoutPlanActivation)

### Frontend
- ✅ **Error Handling:** Improved to propagate actual error messages
- ✅ **GitHub:** Pushed to feat/ai-prep-coach-elite branch
- ⏳ **EAS Build:** Needs to be triggered for live testing

## Next Steps

1. **Trigger EAS Build:**
   ```bash
   eas build --platform ios --profile development
   # or
   eas update --branch feat/ai-prep-coach-elite
   ```

2. **Test Plan Generation:**
   - Try generating a V1 workout plan
   - Check for specific error messages in the UI
   - Check Edge Function logs in Supabase Dashboard

3. **If Error Persists:**
   - Check Supabase Dashboard > Edge Functions > generate-user-plans > Logs
   - Look for diagnostic log entries matching the table above
   - Identify which step fails (auth, context, V1 mapping, hydration, storage, activation)

## Common Failure Points

### 1. Missing Onboarding Data
**Error:** "Onboarding answers not found"  
**Fix:** Complete onboarding flow first

### 2. Missing User Targets
**Error:** "User targets not found"  
**Fix:** Complete body stats onboarding

### 3. Missing Profile
**Error:** "Profile not found"  
**Fix:** Complete sign-up process

### 4. V1 Family/Template Not Found
**Error:** "V1 Family Reference not found" or "V1 Template not found"  
**Fix:** Check planFamilies and coreTemplates seeds are loaded

### 5. Hydration Error
**Error:** Error during hydrateTemplate()  
**Fix:** Check template structure matches expected format

## Test Commands

```bash
# Run V1 activation regression tests
npm run test:v1-activation

# Test V1 generation with user auth
node test-v1-auth.mjs

# Deploy Edge Function
npx supabase functions deploy generate-user-plans
```

## Files Modified

1. `services/planService.ts` - Improved error handling (4 functions)
2. `supabase/functions/generate-user-plans/index.ts` - Comprehensive diagnostics
3. `hooks/usePlan.ts` - Added plan-specific schedule fetching
4. `app/(onboarding)/plan-review.tsx` - Updated to use plan-specific schedule

## Verification Checklist

- [x] Edge Function deployed with diagnostics
- [x] Frontend error handling improved
- [x] GitHub branch updated
- [ ] EAS build triggered
- [ ] Live test with real user
- [ ] Verify error messages propagate correctly
- [ ] Check Edge Function logs for diagnostic output
