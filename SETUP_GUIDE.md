# MetriqFit Elite - Setup Guide

Complete guide to set up your development environment and test Slice A.

---

## Prerequisites

- Node.js 18+ installed
- Expo CLI installed (`npm install -g expo-cli`)
- Supabase CLI installed (`npm install -g supabase`)
- OpenAI API key (for plan generation)
- iOS Simulator (Mac) or Android Emulator, or Expo Go app on physical device

---

## 1. Install Dependencies

```bash
cd /Users/owner/Desktop/Metriqfit-elite
npm install
```

---

## 2. Supabase Setup

### Option A: Use Existing Supabase Project

If you already have a Supabase project:

1. **Get your credentials:**
   - Go to https://supabase.com/dashboard
   - Select your project
   - Go to Settings → API
   - Copy `Project URL` and `anon/public` key

2. **Create `.env` file:**
   ```bash
   cat > .env << 'EOF'
   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   EXPO_PUBLIC_APP_ENV=local
   EOF
   ```

3. **Run migrations:**
   ```bash
   # Link to your project
   supabase link --project-ref your-project-ref

   # Push migrations
   supabase db push
   ```

4. **Deploy Edge Functions:**
   ```bash
   # Set OpenAI API key secret
   supabase secrets set OPENAI_API_KEY=sk-your-key-here

   # Deploy all Edge Functions
   supabase functions deploy generate-user-plans
   supabase functions deploy ai-coach-message
   supabase functions deploy delete-account
   ```

### Option B: Create New Local Supabase Project

1. **Start local Supabase:**
   ```bash
   supabase start
   ```

   This will output:
   ```
   API URL: http://localhost:54321
   anon key: eyJh...
   service_role key: eyJh...
   ```

2. **Create `.env` file with local URLs:**
   ```bash
   cat > .env << 'EOF'
   EXPO_PUBLIC_SUPABASE_URL=http://localhost:54321
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-local-anon-key-from-above
   EXPO_PUBLIC_APP_ENV=local
   EOF
   ```

3. **Migrations are auto-applied** when you run `supabase start`

4. **Set up Edge Functions locally:**
   ```bash
   # Create .env file for functions
   echo "OPENAI_API_KEY=sk-your-key-here" > supabase/.env

   # Serve functions locally
   supabase functions serve
   ```

---

## 3. Seed Database (Optional but Recommended)

To test without entering data manually:

```bash
# Create seed script
cat > supabase/seed.sql << 'EOF'
-- Insert sample food items
INSERT INTO food_items (name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g) VALUES
  ('Chicken Breast', 165, 31, 0, 3.6),
  ('Brown Rice', 111, 2.6, 23, 0.9),
  ('Broccoli', 34, 2.8, 7, 0.4),
  ('Banana', 89, 1.1, 23, 0.3),
  ('Oatmeal', 389, 16.9, 66.3, 6.9),
  ('Salmon', 208, 20, 0, 13),
  ('Sweet Potato', 86, 1.6, 20, 0.1),
  ('Eggs', 155, 13, 1.1, 11),
  ('Almonds', 579, 21, 22, 50),
  ('Greek Yogurt', 59, 10, 3.6, 0.4);

-- Insert sample exercises
INSERT INTO exercises (name, category, equipment_required, primary_muscle, pattern, difficulty, is_compound) VALUES
  ('Barbell Bench Press', 'strength', ARRAY['barbell', 'bench'], 'chest', 'push', 'intermediate', true),
  ('Barbell Squat', 'strength', ARRAY['barbell', 'rack'], 'quadriceps', 'squat', 'intermediate', true),
  ('Deadlift', 'strength', ARRAY['barbell'], 'back', 'hinge', 'advanced', true),
  ('Pull-ups', 'strength', ARRAY['pull-up bar'], 'back', 'pull', 'intermediate', true),
  ('Push-ups', 'strength', ARRAY['bodyweight'], 'chest', 'push', 'beginner', true),
  ('Dumbbell Row', 'strength', ARRAY['dumbbells'], 'back', 'pull', 'beginner', true),
  ('Overhead Press', 'strength', ARRAY['barbell'], 'shoulders', 'push', 'intermediate', true),
  ('Lunges', 'strength', ARRAY['bodyweight'], 'quadriceps', 'lunge', 'beginner', true),
  ('Plank', 'core', ARRAY['bodyweight'], 'core', 'isometric', 'beginner', false),
  ('Bicep Curls', 'strength', ARRAY['dumbbells'], 'biceps', 'pull', 'beginner', false);
EOF

# Apply seed data
supabase db reset --db-seed seed.sql
```

---

## 4. Start Development Server

### For iOS:
```bash
npm run ios
```

### For Android:
```bash
npm run android
```

### For Web:
```bash
npm run web
```

### Or start with Expo and choose platform:
```bash
npm start
```

Then press:
- `i` for iOS simulator
- `a` for Android emulator
- `w` for web browser

---

## 5. Testing Checklist

### ✅ Test 1: Complete Onboarding Flow

**Steps:**
1. Launch app
2. Tap "Sign Up" or create new account
3. Complete all 5 onboarding steps:
   - Step 1: Name
   - Step 2: Body metrics (height, weight, DOB, sex)
   - Step 3: Goals and activity
   - Step 4: Training preferences
   - Step 5: Nutrition preferences
4. On final step, tap "Complete Setup"

**Expected Results:**
- ✅ Loading spinner appears
- ✅ Console logs show:
  ```
  [Onboarding] Saving answers...
  [Onboarding] Calculating targets...
  [Onboarding] Saving targets...
  [Onboarding] Triggering AI plan generation...
  [Onboarding] Plans generated successfully
  [Onboarding] Updating profile...
  [Onboarding] Navigating to home...
  ```
- ✅ App navigates to Home dashboard
- ✅ MacroDashboard shows your calculated targets (not placeholder data)

**Verify in Database:**
```sql
-- Check user_targets created
SELECT * FROM user_targets WHERE user_id = 'your-user-id';

-- Check onboarding answers saved
SELECT * FROM onboarding_answers WHERE user_id = 'your-user-id';

-- Check plans generated
SELECT * FROM user_workout_plans WHERE user_id = 'your-user-id';
SELECT * FROM user_nutrition_plans WHERE user_id = 'your-user-id';
```

---

### ✅ Test 2: Water Logging

**Steps:**
1. From Home screen, tap the `+` FAB button (bottom right)
2. In Quick Add sheet, tap "Log Water"
3. Select amount (or use presets)
4. Tap "Log 250ml" button

**Expected Results:**
- ✅ Sheet closes automatically
- ✅ Home dashboard water ring updates immediately
- ✅ Water consumed shows new total
- ✅ No manual refresh needed

**Verify in Database:**
```sql
SELECT * FROM water_logs WHERE user_id = 'your-user-id' ORDER BY logged_at DESC LIMIT 5;
```

---

### ✅ Test 3: Quick Add Navigation

**Steps:**
1. Tap the `+` FAB button
2. Try each action:
   - Scan Meal Photo (should show Elite badge)
   - Scan Barcode (should show Elite badge)
   - Search Food
   - Start Workout
   - Log Weight
   - Log Water
   - Log Steps

**Expected Results:**
- ✅ Each action navigates to correct screen
- ✅ No "Screen not found" errors
- ✅ Elite badges show on correct items
- ✅ Back navigation works

---

### ✅ Test 4: MacroDashboard Real-Time Updates

**Steps:**
1. Note current macro values on Home dashboard
2. Navigate to Nutrition tab
3. Search for a food (e.g., "chicken")
4. Add food with grams
5. Save
6. Navigate back to Home tab

**Expected Results:**
- ✅ Macro rings update with new values
- ✅ Protein/Carbs/Fat consumed increases
- ✅ Percentages recalculate
- ✅ No manual refresh needed

---

## 6. Troubleshooting

### Issue: "Failed to fetch" or network errors

**Solution:**
```bash
# If using local Supabase, ensure it's running
supabase status

# If stopped, restart
supabase start
```

### Issue: Edge Functions fail with "Missing OpenAI API key"

**Solution:**
```bash
# Set the secret
supabase secrets set OPENAI_API_KEY=sk-your-key-here

# Redeploy function
supabase functions deploy generate-user-plans
```

### Issue: "No database connection"

**Solution:**
1. Check `.env` file exists and has correct values
2. Restart dev server: `npm start`
3. Clear Metro cache: `npm start -- --clear`

### Issue: App shows placeholder data instead of real targets

**Possible causes:**
1. User hasn't completed onboarding yet
2. `user_targets` row not created
3. React Query not fetching

**Debug:**
```typescript
// In MacroDashboard component, check:
console.log('Targets:', targets);
console.log('Consumed:', consumed);
```

Should see real values from database, not fallback defaults.

---

## 7. Development Commands

```bash
# Type checking
npm run typecheck

# Linting
npm run lint

# Clear cache and restart
npm start -- --clear

# View Supabase logs (local)
supabase functions logs generate-user-plans

# View database studio (local)
supabase db studio
```

---

## 8. Next Steps After Slice A

Once all tests pass:

1. **Review TASKS.md** - Mark Slice A as complete
2. **Start Slice B** - Nutrition logging (food search, meal tracking)
3. **Check SLICE_A_COMPLETION.md** - Review implementation details

---

## Quick Reference

| Task | Command |
|------|---------|
| Start app | `npm start` |
| Start iOS | `npm run ios` |
| Start Android | `npm run android` |
| Start Supabase | `supabase start` |
| Deploy function | `supabase functions deploy <name>` |
| View DB | `supabase db studio` |
| View logs | `supabase functions logs <name>` |
| Reset DB | `supabase db reset` |

---

**Need Help?**
- Check [CLAUDE.md](CLAUDE.md) for project structure
- Check [TASKS.md](TASKS.md) for implementation roadmap
- Check [SLICE_A_COMPLETION.md](SLICE_A_COMPLETION.md) for what was implemented

Happy coding! 🚀
