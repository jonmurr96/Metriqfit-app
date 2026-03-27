# Workout Plan Regeneration Diagnostic Test Guide

## Purpose
Identify why AI plan regeneration isn't respecting user preferences by tracing the complete data flow.

## What Was Added
Diagnostic logging has been added to the Edge Function at these critical checkpoints:

1. **Line ~3767** - When regeneration request is received
2. **Line ~3858** - After applying regeneration to context
3. **Line ~3881** - Effective preferences for template selection
4. **Line ~1175** - Template selection criteria
5. **Line ~1238** - Selected template details with top 3 candidates

## Test Procedure

### Step 1: Start Edge Functions Locally

```bash
cd /Users/owner/Projects/Metriqfit-elite-remote-20260307-073401
supabase functions serve
```

**Expected output:** Edge Functions server starts on port 54321

### Step 2: Run the App

In a separate terminal:

```bash
cd /Users/owner/Projects/Metriqfit-elite-remote-20260307-073401
npx expo start
```

### Step 3: Execute Regeneration Test

1. Navigate to: **Workout tab → My Plan → Regenerate with AI**
2. **Step 1** - Select reason: "Want a different split"
3. **Step 2** - Change settings:
   - Days/week: **4** (if currently 5, or vice versa)
   - Split family: **Upper/Lower** (if currently PPL, or vice versa)
   - Progression: **Wave Volume** (if currently Linear, or vice versa)
   - Turn OFF "Keep current split"
4. **Step 3** - Constraints:
   - Add **Monday** as a day off (if not already set)
5. **Step 4** - Review and tap "Generate Preview"
6. **Step 5** - Review the preview

### Step 4: Analyze the Logs

In the terminal running `supabase functions serve`, look for these log entries:

#### 🔍 **Log Point 1: Request Received**
```
🔍 Regeneration request received:
{
  has_workout_regen: true,
  days_per_week: 4,                    ← Should match your input
  split_family: 'upper_lower',         ← Should match your selection
  progression: 'volume_wave',          ← Should match your selection
  days_off: ['mon'],                   ← Should include Monday
  goal_emphasis: ...,
  keep_current_split: false,           ← Should be false
  start_fresh: false/true
}
```

#### 🔍 **Log Point 2: Context After Regeneration**
```
🔍 Context after applying regeneration:
{
  training_days: 4,                    ← Should match days_per_week
  split_family: 'upper_lower',         ← Should match preferred_split_family
  progression: 'volume_wave',          ← Should match progression_preference
  days_off: ['mon'],                   ← Should match preferred_days_off
  session_emphasis: ...,
  equipment: ...
}
```

#### 🔍 **Log Point 3: Effective Preferences**
```
🔍 Effective preferences for template selection:
{
  programFamily: 'upper_lower',        ← Should match split_family from context
  progression: 'volume_wave',          ← Should match progression from request
  trainingStyles: [...],
  splitOverride: null,
  currentPlanFamily: 'push_pull_legs'  ← Your OLD plan family (for reference)
}
```

#### 🔍 **Log Point 4: Template Selection Criteria**
```
🔍 Template selection criteria:
{
  targetDays: 4,                       ← Should match days_per_week
  preferredSplit: 'upper_lower',       ← Should match from context
  programFamilyPref: 'upper_lower',    ← Should match from options
  progression: 'volume_wave',          ← Should match from options
  trainingStyles: [...],
  strictDaysMatch: true,
  excludeFamily: null
}
```

#### 🔍 **Log Point 5: Selected Template**
```
🔍 Selected template:
{
  templateId: '...',
  templateName: 'Upper/Lower 4-Day',   ← Should match your preferences
  familyKey: 'upper_lower',            ← Should match your selection
  daysPerWeek: 4,                      ← Should match your selection
  progressionModel: 'volume_wave',     ← Should match your selection
  score: 155,                          ← High score means good match
  rationale: [
    'Exact match on requested training days/week.',
    'Matched preferred split family.',
    ...
  ],
  topThree: [                          ← Shows top 3 candidates and their scores
    { name: 'Upper/Lower 4-Day', family: 'upper_lower', score: 155 },
    { name: 'PPL 4-Day', family: 'push_pull_legs', score: 102 },
    { name: 'Full Body 4-Day', family: 'full_body', score: 88 }
  ]
}
```

## Diagnostic Scenarios

### ✅ **SCENARIO A: All Logs Show Correct Values**
- Request received with correct preferences ✅
- Context modified correctly ✅
- Effective preferences computed correctly ✅
- Template criteria correct ✅
- **BUT selected template is wrong** ❌

**Root Cause:** Template catalog doesn't have a matching template OR scoring algorithm is too weak

**Fix Required:**
- If catalog is missing templates → Add more templates to database
- If scoring is weak → Increase penalty for mismatches or add stricter matching

---

### ❌ **SCENARIO B: Context NOT Modified**
- Request received with correct preferences ✅
- **Context still shows old values** ❌

**Root Cause:** `applyWorkoutRegenerationToContext()` function not applying all fields

**Fix Required:** Update lines 1823-1875 in Edge Function to apply missing fields

---

### ❌ **SCENARIO C: Effective Preferences Wrong**
- Request received ✅
- Context modified ✅
- **Effective preferences don't use regeneration values** ❌

**Root Cause:** Lines 3866-3872 have incorrect logic for computing effective preferences

**Fix Required:** Update the fallback logic to prioritize regeneration values

---

### ❌ **SCENARIO D: Template Criteria Missing Preferences**
- Request received ✅
- Context modified ✅
- Effective preferences correct ✅
- **Template criteria don't include the preferences** ❌

**Root Cause:** `chooseTemplateFromCatalog()` not receiving or using the options

**Fix Required:** Check lines 3881-3892 to ensure all options are passed

---

## Expected Results

After testing with DIFFERENT values than current plan:

### ✅ **Success Indicators:**
1. All log points show the regeneration values you entered
2. Selected template matches your preferences:
   - Split family matches
   - Days per week matches
   - Progression model matches (or close)
3. Preview diff shows **meaningful changes** (>30% exercise overlap is fine, but <70% is better)
4. Preview plan is materially different from current plan

### ❌ **Failure Indicators:**
1. Any log point shows old values instead of new ones
2. Selected template doesn't match your preferences
3. Preview diff shows >90% exercise overlap
4. Preview plan looks the same as current plan

## Next Steps Based on Findings

### If logs show correct values but plan is still the same:
→ The issue is in **template catalog** or **scoring algorithm**
→ Check database for available templates matching your criteria
→ Increase scoring penalties for mismatches

### If logs show incorrect values at any checkpoint:
→ The issue is in the **data flow** (not template selection)
→ Fix the specific function where values are lost
→ Re-test after fix

## Cleanup After Testing

Once the issue is identified and fixed, remove the diagnostic logs:

```bash
# Search for all diagnostic logs
grep -n "🔍 DIAGNOSTIC" supabase/functions/generate-user-plans/index.ts

# Or keep them behind a feature flag
const ENABLE_DIAGNOSTICS = Deno.env.get('ENABLE_REGENERATION_DIAGNOSTICS') === 'true';
if (ENABLE_DIAGNOSTICS) {
  console.log('🔍 ...');
}
```

## Contact

If you encounter issues during testing or need clarification on the logs, refer back to this diagnostic guide.
