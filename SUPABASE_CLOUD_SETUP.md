# Supabase Cloud Setup Guide

## Step 1: Create Supabase Project

1. Go to: https://supabase.com
2. Click **"Start your project"** or **"Sign in"** (if you have an account)
3. Sign up/Sign in with GitHub (recommended) or email
4. Click **"New Project"**

**Project Settings**:
- **Name**: `metriqfit-dev` (or your preference)
- **Database Password**: Choose a strong password (save it!)
- **Region**: Choose closest to you
- **Plan**: Free tier is perfect for testing

5. Click **"Create new project"**
6. Wait ~2 minutes for project to provision

---

## Step 2: Get Your API Credentials

Once the project is ready:

1. In Supabase dashboard, go to **Settings** (gear icon) → **API**
2. Copy these values (you'll need them):

```
Project URL: https://[your-project-ref].supabase.co
anon public key: eyJhbGc... (long token)
service_role key: eyJhbGc... (even longer token, keep secret!)
```

---

## Step 3: Update Your .env File

In your project, create/update `.env` file:

**File**: `/Users/owner/Desktop/Metriqfit-elite/.env`

```bash
# Supabase Cloud Credentials
EXPO_PUBLIC_SUPABASE_URL=https://[your-project-ref].supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...your-anon-key...

# Server-side only (for Edge Functions)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...your-service-role-key...

# App environment
EXPO_PUBLIC_APP_ENV=development
```

Replace the placeholders with your actual values from Step 2.

---

## Step 4: Apply Migrations to Cloud Database

You have two options:

### Option A: Use Supabase Dashboard (Easiest)

1. In Supabase dashboard, go to **SQL Editor**
2. Click **"New query"**
3. Copy and paste each migration file content one by one:
   - `001_initial_schema.sql`
   - `002_workout_tables.sql`
   - `003_plan_tables.sql`
   - `004_ai_usage_tables.sql`
   - `005_subscription_tables.sql`
   - `006_seed_exercises.sql` ← 175 exercises
   - `007_seed_food_items.sql` ← 175 foods
   - `008_seed_workout_templates.sql` ← 4 templates

4. Run each one in order
5. Check for success messages

### Option B: Use npx supabase link (Recommended if you want CLI)

```bash
cd /Users/owner/Desktop/Metriqfit-elite

# Link to your cloud project
npx supabase link --project-ref [your-project-ref]
# When prompted, enter your database password

# Push all migrations
npx supabase db push
```

This will automatically apply all migrations in order.

---

## Step 5: Verify Seed Data

1. In Supabase dashboard, go to **Table Editor**
2. Check these tables:

| Table | Expected Rows | Quick Check |
|-------|---------------|-------------|
| exercises | 175 | Look for "Back Squat", "Bench Press" |
| food_items | ~175 | Look for "Chicken Breast", "Rice" |
| workout_templates | 4 | Should see "Push Pull Legs", etc. |
| workout_template_days | 15 | Days within templates |

If you see these numbers, you're good! ✅

---

## Step 6: Create Test User & Data

### A. Create Test User

In Supabase dashboard:
1. Go to **Authentication** → **Users**
2. Click **"Add user"** → **"Create new user"**
3. Email: `test@metriqfit.com`
4. Password: `Test123!@#`
5. Click **"Create user"**
6. **Copy the User ID** (UUID shown in the table)

### B. Insert User Targets

1. Go to **SQL Editor** → **New query**
2. Paste this (replace `<USER_ID>` with the UUID you copied):

```sql
-- Insert user targets
INSERT INTO public.user_targets (user_id, calories, protein_g, carbs_g, fat_g, water_ml)
VALUES ('<USER_ID>', 2400, 180, 250, 70, 2500);

-- Insert user profile
INSERT INTO public.profiles (id, user_id, display_name, unit_system)
VALUES ('<USER_ID>', '<USER_ID>', 'Test User', 'imperial');
```

3. Click **"Run"**
4. Should see: "Success. No rows returned"

---

## Step 7: Test the App

```bash
cd /Users/owner/Desktop/Metriqfit-elite

# Clear cache and start
npm start -- --clear
```

When the dev server starts, press:
- `w` for web
- `i` for iOS simulator
- `a` for Android emulator

### Login
- Email: `test@metriqfit.com`
- Password: `Test123!@#`

### What to Test

1. **Home Tab → MacroDashboard**
   - ✅ Should show: 2400 cal, 180g protein, 250g carbs, 70g fat targets
   - ✅ Consumed should be 0 (no meals logged)

2. **Nutrition Tab → Search**
   - ✅ Type "chicken" → See seeded foods
   - ✅ Type "rice" → See rice varieties
   - ✅ Tap a food → See nutrition details

3. **Log a Meal (via SQL for now)**
   Go to SQL Editor in Supabase:
   
   ```sql
   -- Get chicken breast ID
   SELECT id FROM public.food_items 
   WHERE name LIKE '%Chicken Breast%' 
   LIMIT 1;
   
   -- Copy the ID, then create meal log
   INSERT INTO public.meal_logs (user_id, meal_slot, logged_at)
   VALUES ('<YOUR_USER_ID>', 'lunch', NOW())
   RETURNING id;
   
   -- Copy the meal_log id, then insert the item
   INSERT INTO public.meal_log_items 
   (meal_log_id, food_item_id, grams, calories, protein, carbs, fat)
   VALUES (
     '<MEAL_LOG_ID>',
     '<CHICKEN_BREAST_ID>',
     150,
     248,  -- 165 * 150 / 100
     46.5, -- 31 * 150 / 100
     0,
     5.4   -- 3.6 * 150 / 100
   );
   ```

4. **Check Dashboard Updates**
   - Go back to app
   - Home tab should now show consumed macros
   - Wait up to 30 seconds for auto-refresh

---

## Troubleshooting

### "Can't connect to Supabase"
- Check `.env` file has correct `EXPO_PUBLIC_SUPABASE_URL`
- Restart Expo dev server: `npm start -- --clear`

### "Authentication error"
- Make sure user was created in Authentication tab
- Password meets requirements (8+ chars)
- Email is confirmed (in Auth settings, disable email confirmation for testing)

### "Migrations failed"
- Run them one by one in SQL Editor
- Check error messages
- Make sure UUID extension is enabled: `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`

### "No data showing"
- Check user_targets table has row for your user
- Check Console in browser DevTools for errors
- Verify you're logged in (check AuthProvider state)

---

## Quick Start Script

Once everything is set up, this is all you need:

```bash
cd /Users/owner/Desktop/Metriqfit-elite
npm start
# Press 'w' for web
# Login with test@metriqfit.com / Test123!@#
```

---

## Next Steps

Once testing works with Supabase Cloud:
1. ✅ Verify MacroDashboard shows real data
2. ✅ Verify food search works
3. 🔧 Fix food detail button (1 line change)
4. 🚀 Continue Phase 3: Workout integration

---

**Estimated setup time**: 10-15 minutes
**Advantage**: Persistent database, no Docker needed, accessible anywhere
