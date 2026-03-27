# 🚀 Gamification Setup Guide

## Quick Fix for the Error

The error you're seeing (`[GamificationService] Error getting user str...`) is because the gamification database tables don't exist yet.

### Step 1: Apply the Database Migration

```bash
# Option 1: Reset database (recommended for development)
cd /Users/owner/Projects/Metriqfit-elite-remote-20260307-073401
supabase db reset

# Option 2: Apply specific migration
supabase migration up

# Option 3: Run migrations individually
supabase db push
```

### Step 2: Verify Tables Exist

```bash
# Check that tables were created
supabase db list
```

Expected tables:
- ✅ `user_xp_levels`
- ✅ `user_xp_events`
- ✅ `user_streaks`
- ✅ `user_streak_freezes`
- ✅ `achievement_definitions`
- ✅ `user_achievements`

### Step 3: Seed Achievement Definitions

The migration automatically seeds 30 achievement definitions. Verify:

```sql
SELECT COUNT(*) FROM achievement_definitions;
-- Expected: 30
```

### Step 4: Test in App

1. Reload the app
2. Navigate to Home screen
3. You should see:
   - ✅ Streak counter (if you have any streaks)
   - ✅ Level progress card showing "Level 1 - Rookie 1"
   - ✅ No errors in the notification area

---

## Alternative: Manual Table Creation

If you can't run migrations, here's a quick SQL script to create the essential tables:

```sql
-- Create user_xp_levels table
CREATE TABLE IF NOT EXISTS user_xp_levels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users UNIQUE NOT NULL,
  current_level INT DEFAULT 1,
  current_xp INT DEFAULT 0,
  total_xp_earned INT DEFAULT 0,
  level_up_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_streaks table
CREATE TABLE IF NOT EXISTS user_streaks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users NOT NULL,
  streak_type TEXT NOT NULL CHECK (streak_type IN ('fitness', 'workout', 'nutrition', 'hydration', 'weigh_in')),
  current_streak INT DEFAULT 0,
  longest_streak INT DEFAULT 0,
  last_activity_date DATE,
  freeze_tokens INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, streak_type)
);

-- Enable RLS
ALTER TABLE user_xp_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_streaks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own XP" ON user_xp_levels FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own streaks" ON user_streaks FOR SELECT USING (auth.uid() = user_id);
```

---

## Troubleshooting

### Error: "relation 'user_xp_levels' does not exist"
**Solution:** Apply the migration using `supabase db reset`

### Error: "PGRST116 - no rows returned"
**Solution:** The service auto-initializes users. Just reload the app.

### Components not showing up
**Solution:** The components hide themselves gracefully if there's an error or no data. This is intentional.

### Still seeing errors after migration
**Solution:**
1. Check Supabase logs: `supabase functions logs award-xp`
2. Verify RLS policies are enabled
3. Check that the user is authenticated

---

## Testing the System

### 1. Complete a Workout
- Navigate to Workout tab
- Complete a workout session
- Expected: +100 XP awarded, XP toast appears, level card updates

### 2. Log 3 Meals
- Navigate to Nutrition tab
- Log breakfast, lunch, dinner
- Expected: +45 XP (15 per meal), nutrition streak starts

### 3. Check Achievements Screen
- Navigate to `/achievements`
- Expected: See grid of 30 achievements, most locked
- Complete your first workout
- Expected: "First Workout Completed" badge unlocked

### 4. Check Streaks Screen
- Navigate to `/streaks`
- Expected: See all 5 streak types (fitness, workout, nutrition, hydration, weigh-in)
- All should show 0 days if you're a new user

### 5. Check Level Progress Screen
- Navigate to `/level-progress`
- Expected: See full 30-level ladder grouped by 6 tiers
- Your current level (1) should be highlighted

---

## Next Steps

Once the migration is applied and you see the components working:

1. **Test XP System:** Complete a workout and verify XP is awarded
2. **Test Streaks:** Log meals for 3 consecutive days and check streak counter
3. **Test Achievements:** Unlock your first achievement
4. **Deploy Edge Functions:**
   ```bash
   supabase functions deploy award-xp
   supabase functions deploy update-streak
   supabase functions deploy check-achievements
   ```

---

## Production Deployment

When deploying to production:

1. **Apply Migration:**
   ```bash
   supabase db push --db-url $PRODUCTION_DB_URL
   ```

2. **Deploy Edge Functions:**
   ```bash
   supabase functions deploy --project-ref $PROJECT_REF
   ```

3. **Verify in Production:**
   - Create a test account
   - Complete a workout
   - Check that XP is awarded
   - Verify achievements can be unlocked

---

**Need help?** Check [GAMIFICATION_IMPLEMENTATION_COMPLETE.md](GAMIFICATION_IMPLEMENTATION_COMPLETE.md) for full documentation.
