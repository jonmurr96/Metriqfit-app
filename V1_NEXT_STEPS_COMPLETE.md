# V1 Fix - Next Steps Execution Guide

**Status:** Backend fix deployed ✅ | Frontend fix committed ✅ | EAS Update Required ⏳

---

## ✅ Completed Steps

### 1. Backend Fix Deployed
- **Edge Function Version:** 96
- **Fix:** Unilateral exercise group mapping in `lib/workout/v1_architect.ts`
- **Error Fixed:** "No valid exercises found for group Unilateral_Hinge"

### 2. Frontend Error Handling Improved
- **Commit:** 84381c0
- **Files Modified:** `services/planService.ts` (4 functions)
- **Improvement:** Edge Function error messages now propagate to UI

### 3. Fix Verified in Database
Recent failed runs confirm the error was:
```
"V1 Generation Failed: Fatally failed to hydrate slot 2 in day 6. 
No valid exercises found for group Unilateral_Hinge."
```

After deploying the fix, new attempts should succeed.

---

## ⏳ Manual Steps Required (You Need to Do These)

### Step 1: Push EAS Update (REQUIRED for simulator)

```bash
# Navigate to project
cd /Users/owner/Projects/Metriqfit-elite-remote-20260307-073401

# Login to EAS (if not already logged in)
eas login

# Push update to your branch
eas update --branch feat/ai-prep-coach-elite \
  --message "Fix unilateral exercise hydration bug + error message propagation"
```

**Expected Output:**
```
✔ Built bundle!
✔ Uploaded 2.4 MB
✔ Published update!

Update Group ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
Android: https://u.expo.dev/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
iOS: https://u.expo.dev/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

### Step 2: Test on iOS Simulator

#### Option A: If using Expo Go
1. Ensure Metro bundler is running:
   ```bash
   npx expo start
   ```

2. In Expo Go on the simulator, pull down to refresh and get the update

3. Navigate to plan generation and test

#### Option B: If using Development Build
1. Install the update:
   ```bash
   eas build:run --platform ios
   ```

2. Launch the app on simulator

### Step 3: Verify the Fix

1. **Navigate to:** Workout → My Plan → Regenerate Plan
2. **Select:** 6-day split (or any template with unilateral exercises)
3. **Expected Result:** Plan generates successfully
4. **If Error Occurs:** You should now see the actual error message (not "Something went wrong")

---

## 🔍 Verification Checklist

After completing the steps above, verify:

- [ ] EAS update pushed successfully
- [ ] Simulator has latest update (check app logs)
- [ ] V1 plan generation works for 6-day templates
- [ ] Error messages show actual backend errors (if any)

---

## 🐛 Troubleshooting

### If EAS update fails
```bash
# Check EAS status
eas whoami

# Ensure project is linked
eas project:info

# If not linked, run:
eas init
```

### If simulator doesn't get update
1. Kill Expo Go app completely
2. Reopen Expo Go
3. Pull down to refresh
4. Check update URL matches: `https://u.expo.dev/[your-project-id]`

### If V1 still fails
Check Edge Function logs:
```bash
npx supabase functions logs generate-user-plans --tail
```

Or check database for recent run status:
```sql
SELECT id, status, validation_errors, created_at
FROM plan_generation_runs
ORDER BY created_at DESC
LIMIT 5;
```

---

## 📋 Summary

| Task | Status | Notes |
|------|--------|-------|
| Backend fix (unilateral groups) | ✅ Done | Deployed to Edge Function v96 |
| Frontend error handling | ✅ Done | Committed to feat/ai-prep-coach-elite |
| GitHub push | ✅ Done | 3396279 |
| EAS Update | ⏳ You do this | `eas update --branch feat/ai-prep-coach-elite` |
| Simulator test | ⏳ You do this | Verify 6-day template works |

---

## 📞 Need Help?

If the fix doesn't work after EAS update:
1. Check Edge Function logs in Supabase Dashboard
2. Verify the simulator is running the correct branch
3. Try a fresh simulator: `xcrun simctl erase all`
4. Rebuild: `eas build --platform ios --profile development`
