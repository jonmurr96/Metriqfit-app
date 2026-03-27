# 🚀 Apply Gamification Migration - Quick Guide

## Option 1: Supabase Dashboard (Easiest - 2 minutes)

1. **Open Supabase SQL Editor:**
   ```
   https://supabase.com/dashboard/project/hatskscplygyrrpepqmx/sql/new
   ```

2. **Copy the entire migration file:**
   - File: `supabase/migrations/043_gamification_system.sql`
   - Or use the command below to copy it to clipboard

3. **Paste and Run:**
   - Paste the SQL into the Supabase SQL Editor
   - Click "Run" button (bottom right)
   - Wait ~5 seconds for completion

4. **Verify:**
   ```sql
   -- Run this to verify tables were created:
   SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public'
   AND table_name LIKE 'user_%';
   ```

   You should see 6 tables including `user_xp_levels` and `user_streaks`.

---

## Option 2: Install Supabase CLI (Recommended for future)

```bash
# Install Supabase CLI
brew install supabase/tap/supabase

# Link to your project
supabase link --project-ref hatskscplygyrrpepqmx

# Apply all pending migrations
supabase db push
```

---

## Option 3: Copy Migration to Clipboard

```bash
# Copy the migration SQL to clipboard
cat supabase/migrations/043_gamification_system.sql | pbcopy

# Then paste into Supabase SQL Editor
```

---

## After Migration is Applied

1. **Reload your app** - The error will disappear
2. **Check Home screen** - You should see:
   - Level Progress Card showing "Level 1 - Rookie 1"
   - No errors
3. **Test the system:**
   - Complete a workout → Get +100 XP
   - Navigate to `/achievements` → See achievement grid
   - Navigate to `/streaks` → See all 5 streak types

---

## Quick Verification

After applying, run this in Supabase SQL Editor:

```sql
-- Check achievement count (should be 30)
SELECT COUNT(*) FROM achievement_definitions;

-- Check your user gamification is initialized
SELECT * FROM user_xp_levels WHERE user_id = auth.uid();
```

---

## Need Help?

The migration file is already created at:
`/Users/owner/Projects/Metriqfit-elite-remote-20260307-073401/supabase/migrations/043_gamification_system.sql`

Just copy it to Supabase Dashboard and run it!

**Direct link to SQL Editor:**
https://supabase.com/dashboard/project/hatskscplygyrrpepqmx/sql/new
