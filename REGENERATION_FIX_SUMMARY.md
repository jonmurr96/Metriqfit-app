# Workout Plan Regeneration Fix Summary

## Problem
When users went through the regeneration questionnaire and changed their preferences (days/week, split type, progression style), the generated plan didn't reflect their answers - it produced the same plan as before.

## Root Cause
The regeneration flow was correctly:
1. ✅ Collecting user preferences in the frontend wizard
2. ✅ Sending preferences to the Edge Function
3. ✅ Applying preferences to the user context
4. ✅ Computing effective preferences for template selection

**BUT:** The template scoring algorithm had **penalties that were too weak** for preference mismatches:

| Preference | Match Bonus | Mismatch Penalty | Issue |
|------------|-------------|------------------|-------|
| Split family | +30 | **-4** | ❌ Too weak! Other factors override |
| Progression | +10 | **0** | ❌ No penalty at all! |
| Days/week | +55 | -200 (strict) or -12/day | ✅ Strong enough |

**Example Scenario:**
- User requests "Upper/Lower" split (+30 points)
- Template is "Push/Pull/Legs" (-4 points)
- But PPL template has: goal alignment (+28), equipment match (+22), experience match (+20)
- **Net result:** PPL template scores higher than Upper/Lower template
- **Outcome:** User gets PPL even though they explicitly requested Upper/Lower

## Solution

### 1. Added Comprehensive Diagnostic Logging
**File:** `supabase/functions/generate-user-plans/index.ts`

Added logging at 5 critical checkpoints:
- **~Line 3767:** Regeneration request received
- **~Line 3858:** Context after applying regeneration
- **~Line 3881:** Effective preferences for template selection
- **~Line 1175:** Template selection criteria
- **~Line 1238:** Selected template with top 3 candidates

These logs help diagnose exactly where preferences are being lost or overridden.

### 2. Strengthened Template Scoring Penalties
**File:** `supabase/functions/generate-user-plans/index.ts`

#### Split Family Penalty (Lines ~1119-1135)
**Before:**
```typescript
if (requestedFamily === familyKey) {
  score += 30;
} else {
  score -= 4;  // ❌ Too weak!
}
```

**After:**
```typescript
if (requestedFamily === familyKey) {
  score += 30;
} else {
  const explicitRequest = !!opts.programFamilyPreference;
  const penalty = explicitRequest ? -50 : -4;  // ✅ Stronger penalty when explicitly requested
  score += penalty;
  if (explicitRequest) {
    rationale.push(`Strong penalty for split mismatch (requested: ${requestedFamily}, template: ${familyKey}).`);
  }
}
```

**Impact:**
- When user explicitly selects a split during regeneration: **-50 penalty** for mismatch
- During initial onboarding (implicit preference): **-4 penalty** (unchanged)
- This ensures explicit user requests are respected while allowing flexibility for initial generation

#### Progression Penalty (Lines ~1141-1158)
**Before:**
```typescript
if (progressionModel.includes(requestedProgression)) {
  score += 10;
}
// ❌ No penalty for mismatch!
```

**After:**
```typescript
if (progressionModel.includes(requestedProgression)) {
  score += 10;
} else if (opts.progressionPreference) {
  score -= 25;  // ✅ Penalty when explicitly requested
  rationale.push(`Penalty for progression mismatch (requested: ${requestedProgression}, template: ${progressionModel}).`);
}
```

**Impact:**
- When user explicitly selects progression during regeneration: **-25 penalty** for mismatch
- During initial onboarding: **no penalty** (allows flexibility)

### 3. Created Testing Guide
**File:** `REGENERATION_TEST_GUIDE.md`

Comprehensive guide for testing the fix including:
- Step-by-step test procedure
- How to interpret diagnostic logs
- Diagnostic scenarios and their root causes
- Expected success/failure indicators

## Testing Instructions

### Quick Test
```bash
# Terminal 1: Start Edge Functions
cd /Users/owner/Projects/Metriqfit-elite-remote-20260307-073401
supabase functions serve

# Terminal 2: Start App
npx expo start
```

Then follow the test procedure in `REGENERATION_TEST_GUIDE.md`.

### Expected Outcome After Fix

When user changes preferences during regeneration:

**Before Fix:**
- User selects "Upper/Lower" split
- Gets "Push/Pull/Legs" plan anyway
- Preview shows >90% exercise overlap
- Plan appears unchanged

**After Fix:**
- User selects "Upper/Lower" split
- Gets "Upper/Lower" plan as requested
- Preview shows ~50-70% exercise overlap
- Plan is materially different

## Verification Checklist

Use this checklist to verify the fix works:

- [ ] Start Edge Functions locally (`supabase functions serve`)
- [ ] Navigate to Workout → My Plan → Regenerate with AI
- [ ] Change split family (e.g., PPL → Upper/Lower)
- [ ] Change days/week (e.g., 5 → 4)
- [ ] Change progression (e.g., Linear → Wave Volume)
- [ ] Turn OFF "Keep current split"
- [ ] Generate preview
- [ ] Check logs show correct values at all checkpoints
- [ ] Check selected template matches your preferences
- [ ] Check preview diff shows meaningful changes
- [ ] Accept preview and verify new plan is active
- [ ] New plan should respect all changed preferences

## Files Modified

1. **supabase/functions/generate-user-plans/index.ts**
   - Added 5 diagnostic log points
   - Strengthened split family mismatch penalty (-4 → -50 when explicit)
   - Added progression mismatch penalty (0 → -25 when explicit)

2. **REGENERATION_TEST_GUIDE.md** (new file)
   - Complete testing guide with log interpretation

3. **REGENERATION_FIX_SUMMARY.md** (this file)
   - Summary of problem, solution, and testing

## Rollback Plan

If the fix causes issues:

1. **Remove diagnostic logs:**
   ```bash
   # Find all diagnostic logs
   grep -n "🔍 DIAGNOSTIC" supabase/functions/generate-user-plans/index.ts

   # Remove them manually or revert the file
   ```

2. **Revert scoring changes:**
   - Change split penalty back to `-4` (line ~1131)
   - Remove progression penalty (line ~1153)

3. **Or revert entire file:**
   ```bash
   git checkout HEAD -- supabase/functions/generate-user-plans/index.ts
   ```

## Production Deployment

Before deploying to production:

1. ✅ Test locally with diagnostic logs
2. ✅ Verify all regeneration scenarios work correctly
3. ⚠️ Consider keeping diagnostic logs behind a feature flag:
   ```typescript
   const ENABLE_DIAGNOSTICS = Deno.env.get('ENABLE_REGENERATION_DIAGNOSTICS') === 'true';
   if (ENABLE_DIAGNOSTICS) {
     console.log('🔍 ...');
   }
   ```
4. Deploy Edge Function:
   ```bash
   supabase functions deploy generate-user-plans
   ```

## Future Improvements

Optional enhancements that could further improve regeneration:

1. **Template Catalog Expansion**
   - Add more template variations for each split family
   - Ensure coverage for all progression models × split families

2. **User Feedback Loop**
   - Track if users accept or discard previews
   - Use acceptance rate to tune scoring weights

3. **Smart Defaults**
   - Pre-populate regeneration form with current plan values
   - Save regeneration preferences to update onboarding_answers

4. **Plan Comparison UI**
   - Side-by-side comparison before accepting
   - Highlight specific exercises that changed

## Success Metrics

Monitor these metrics post-deployment:

- **Regeneration acceptance rate** - Should increase if fix works
- **Exercise overlap distribution** - Should shift toward 40-70% range
- **Template diversity** - Should see more variety in selected templates
- **User complaints** - Should decrease "same plan" complaints

## Questions?

Refer to:
- **REGENERATION_TEST_GUIDE.md** - For testing procedures
- Edge Function logs - For diagnostic information
- This file - For understanding the fix
