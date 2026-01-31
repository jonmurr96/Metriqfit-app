# Quick Test Script
# This tests if the integration is working without needing full seed data

## Option 1: Run migrations via CLI (EASIEST)

```bash
# In terminal:
cd /Users/owner/Desktop/Metriqfit-elite

# You'll be prompted for database password
npx supabase db push
```

Your database password is in Supabase: **Settings → Database → Database password**

---

## Option 2: Test with minimal data (If migrations fail)

If you just want to test the UI integration works, we can:

1. **Run the app now**:
```bash
npm start
# Press 'w' for web
```

2. **Sign up a new user** right in the app

3. **Manually insert test data via SQL Editor**:

Go to: https://supabase.com/dashboard/project/hatskscplygyrrpepqmx/sql/new

Paste this:

```sql
-- Get your user ID first
SELECT id FROM auth.users ORDER BY created_at DESC LIMIT 1;

-- Copy the ID, then insert targets (replace <USER_ID>):
INSERT INTO public.user_targets (user_id, calories, protein_g, carbs_g, fat_g, water_ml)
VALUES ('<USER_ID>', 2400, 180, 250, 70, 2500);

-- Insert ONE test food item
INSERT INTO public.food_items (
  name, category, calories_per_100g, protein_per_100g, 
  carbs_per_100g, fat_per_100g, source, is_verified
) VALUES (
  'Chicken Breast', 'Protein', 165, 31, 0, 3.6, 'test', true
);
```

4. **Test the integration**:
   - Home → Should show targets (2400 cal, etc.)
   - Nutrition → Search "chicken" → Should find it
   - Click it → Should show details

This proves the integration works! Then you can add full seed data later.

---

## Recommendation

**Do Option 1** - it's one command and loads all 175 foods + 175 exercises + 4 workout templates.

Just need your database password from Supabase Settings.
