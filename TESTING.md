# Testing Guide - Phase 1 & 2 Integration

## What's Been Implemented

### ✅ Phase 1: MacroDashboard
- **File**: `components/dashboard/MacroDashboard.tsx`
- **Changes**: Integrated with React Query hooks to fetch real data
- **Features**:
  - Fetches user targets from `user_targets` table
  - Fetches daily consumed macros from meal logs
  - Auto-refreshes every 30 seconds
  - Shows loading state

### ✅ Phase 2 (Partial): Nutrition Tab
- **File**: `app/(tabs)/nutrition/food-search.tsx`
  - Searches 175 seeded foods from database
  - Real-time search as you type
  - Empty state messaging
  
- **File**: `app/(tabs)/nutrition/food-detail.tsx`
  - Fetches food by ID from database
  - Displays actual nutrition data
  - ⚠️ Button needs manual fix (see below)

---

## Testing Prerequisites

### 1. Install Supabase CLI

```bash
# Install via Homebrew (macOS)
brew install supabase/tap/supabase

# Verify installation
supabase --version
```

Expected output: `1.x.x` or similar

### 2. Check Docker is Running

Supabase requires Docker to run locally:

```bash
# Check if Docker is running
docker ps

# If not running, start Docker Desktop app
```

---

## Step-by-Step Testing

### Step 1: Start Local Supabase

```bash
cd /Users/owner/Desktop/Metriqfit-elite

# Start Supabase (first time will download images ~1-2 min)
supabase start
```

**Expected output**:
```
Started supabase local development setup.

         API URL: http://localhost:54321
          DB URL: postgresql://postgres:postgres@localhost:54322/postgres
      Studio URL: http://localhost:54323
    Inbucket URL: http://localhost:54324
      JWT secret: super-secret-jwt-token-with-at-least-32-characters-long
        anon key: eyJhbGc...
service_role key: eyJhbGc...
```

**✅ Success criteria**: No errors, URLs displayed

---

### Step 2: Apply Migrations & Seed Data

```bash
# Reset database and run all migrations (including our seed data)
supabase db reset
```

**Expected output**:
```
Applying migration 001_initial_schema.sql...
Applying migration 002_workout_tables.sql...
Applying migration 003_plan_tables.sql...
Applying migration 004_ai_usage_tables.sql...
Applying migration 005_subscription_tables.sql...
Applying migration 006_seed_exercises.sql...
Applying migration 007_seed_food_items.sql...
Applying migration 008_seed_workout_templates.sql...
Seeded 175 exercises
Seeded 175 food items
Seeded 4 workout templates
```

**✅ Success criteria**: All migrations applied, seed counts match

---

### Step 3: Verify Seed Data

Open Supabase Studio: http://localhost:54323

Navigate to Table Editor and check:

**Exercises table**:
- Should have 175 rows
- Sample: "Back Squat", "Bench Press", etc.

**Food_items table**:
- Should have ~175 rows
- Sample: "Chicken Breast (Skinless, Cooked)", "Brown Rice", etc.
- Check a row has: `calories_per_100g`, `protein_per_100g`, etc.

**Workout_templates table**:
- Should have 4 rows
- Names: "Push Pull Legs - Beginner", "Upper Lower Split - Intermediate", etc.

**✅ Success criteria**: All tables populated with seed data

---

### Step 4: Create Test User & Data

In Supabase Studio (http://localhost:54323):

#### A. Create Test User

1. Go to **Authentication** → **Users** → **Add user**
   - Email: `test@metriqfit.com`
   - Password: `password123`
   - Click **Create user**

2. Copy the **User UUID** (you'll need it)

#### B. Insert User Targets

Go to **SQL Editor** → **New query**:

```sql
-- Replace <USER_UUID> with the actual UUID you copied
INSERT INTO public.user_targets (user_id, calories, protein_g, carbs_g, fat_g, water_ml)
VALUES ('<USER_UUID>', 2400, 180, 250, 70, 2500);
```

Click **Run**

**✅ Success criteria**: "Success. Rows: 1" message

#### C. Insert Test Profile (Optional but recommended)

```sql
INSERT INTO public.profiles (id, user_id, display_name, unit_system)
VALUES ('<USER_UUID>', '<USER_UUID>', 'Test User', 'imperial');
```

---

### Step 5: Start Expo Dev Server

Open a **new terminal** (keep Supabase running):

```bash
cd /Users/owner/Desktop/Metriqfit-elite

# Start Expo
npm start
```

**Expected output**:
```
› Metro waiting on exp://...
› Scan the QR code above with Expo Go (Android) or the Camera app (iOS)
```

**Options to run**:
- Press `w` for web
- Press `i` for iOS simulator
- Press `a` for Android emulator

**✅ Success criteria**: Dev server running, no compile errors

---

## Testing the Integration

### Test 1: MacroDashboard Loads Real Data

**Steps**:
1. Launch app (press `w` for web or `i` for iOS)
2. Sign in with: `test@metriqfit.com` / `password123`
3. Navigate to **Home** tab
4. Observe MacroDashboard

**Expected results**:
- ✅ Shows loading spinner briefly
- ✅ Displays target values: 2400 cal, 180g protein, 250g carbs, 70g fat
- ✅ Consumed values show 0 (no meals logged yet)
- ✅ Percentage shows 0% for all macros

**Screenshot this**: MacroDashboard with real targets

---

### Test 2: Food Search Works

**Steps**:
1. Navigate to **Nutrition** tab
2. Tap **search bar** or "+" to add food
3. Go to **Search Food** screen
4. Type `"chicken"` in search box

**Expected results**:
- ✅ Empty state shows "Start typing to search 175+ foods in database"
- ✅ After typing, loading spinner appears
- ✅ Results show: "Chicken Breast (Skinless, Cooked)"
- ✅ Shows: "165 cal / 100g"
- ✅ Multiple chicken results appear

**Try different searches**:
- `"rice"` → Should show Brown Rice, White Rice, etc.
- `"protein"` → Should show protein powder
- `"zxzxzx"` → Should show "No foods found" message

**Screenshot this**: Search results for "chicken"

---

### Test 3: Food Detail Displays Real Data

**Steps**:
1. From search results, tap **"Chicken Breast"**
2. Food detail screen opens

**Expected results**:
- ✅ Shows "Chicken Breast (Skinless, Cooked)" as title
- ✅ Nutrition shows for 100g:
  - Calories: 165 kcal
  - Protein: 31g
  - Carbs: 0g
  - Fat: 3.6g
- ✅ All values match the seeded data

**⚠️ Known Issue**: "Add to Meal" button currently just goes back. This needs manual fix (see below).

**Screenshot this**: Food detail for Chicken Breast

---

### Test 4 (Optional): Manually Log a Meal

Since the button isn't wired yet, let's manually insert a meal to test the dashboard updates:

**In Supabase Studio SQL Editor**:

```sql
-- Create a meal log for lunch
INSERT INTO public.meal_logs (user_id, meal_slot, logged_at)
VALUES ('<YOUR_USER_UUID>', 'lunch', NOW())
RETURNING id;

-- Copy the returned meal_log id, then:
INSERT INTO public.meal_log_items (meal_log_id, food_item_id, grams, calories, protein, carbs, fat)
SELECT 
  '<MEAL_LOG_ID>',
  id,
  150,
  248,  -- 165 * 150 / 100
  46.5, -- 31 * 150 / 100
  0,
  5.4   -- 3.6 * 150 / 100
FROM public.food_items 
WHERE name = 'Chicken Breast (Skinless, Cooked)'
LIMIT 1;
```

**After running**:
1. Go back to the app
2. **Home tab** → MacroDashboard
3. Wait up to 30 seconds (auto-refresh interval)

**Expected results**:
- ✅ Calories: 248 / 2400 (~10%)
- ✅ Protein: 47g / 180g (~26%)
- ✅ Carbs: 0g / 250g (0%)
- ✅ Fat: 5g / 70g (~7%)

**Screenshot this**: MacroDashboard after logging meal

---

## Known Issues to Fix

### Issue 1: Food Detail Button Not Wired

**File**: `app/(tabs)/nutrition/food-detail.tsx`  
**Line**: 267

**Current**:
```typescript
onPress={() => router.back()}
```

**Should be**:
```typescript
onPress={() => logMealMutation.mutate()}
disabled={logMealMutation.isPending}
```

**And update the button content** (lines 269-277):
```typescript
{logMealMutation.isPending ? (
  <ActivityIndicator color={c.bg} />
) : (
  <Text style={{ color: c.bg, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.lg }}>
    Add to Meal
  </Text>
)}
```

This is the only manual fix needed to complete Phase 2.

---

## Success Criteria Summary

| Test | Status | Description |
|------|--------|-------------|
| Supabase starts | ⬜ | `supabase start` succeeds |
| Migrations apply | ⬜ | All 8 migrations run |
| Seed data loads | ⬜ | 175 exercises, 175 foods, 4 templates |
| User created | ⬜ | Test account exists |
| Targets inserted | ⬜ | Macro targets in database |
| Expo starts | ⬜ | No compile errors |
| MacroDashboard loads | ⬜ | Shows real targets |
| Food search works | ⬜ | Finds seeded foods |
| Food detail works | ⬜ | Shows correct nutrition |
| Manual meal logged | ⬜ | Dashboard updates |

---

## Troubleshooting

### "Command not found: supabase"
**Solution**: Install Supabase CLI:
```bash
brew install supabase/tap/supabase
```

### "Docker is not running"
**Solution**: Start Docker Desktop application

### "Migration failed"
**Solution**: 
```bash
supabase stop
supabase start
supabase db reset
```

### "Expo compile errors"
**Solution**: 
```bash
npm install
npm start -- --clear
```

### "Can't connect to Supabase"
**Solution**: Check `EXPO_PUBLIC_SUPABASE_URL` in `.env`:
```
EXPO_PUBLIC_SUPABASE_URL=http://localhost:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc... # from supabase start output
```

### "MacroDashboard shows loading forever"
**Solution**: 
1. Check user_targets table has data for your user
2. Check console for errors
3. Verify AuthProvider is working (user logged in)

---

## Next Steps After Testing

Once testing is complete, report:
1. ✅ Which tests passed
2. ❌ Which tests failed (with error messages)
3. 📸 Screenshots of working features

Then we'll:
1. Fix the food detail button
2. Continue with Phase 3 (Workout integration)
3. Add meal slot selector UI
4. Complete end-to-end nutrition flow
