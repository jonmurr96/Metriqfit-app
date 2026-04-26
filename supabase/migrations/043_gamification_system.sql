-- =====================================================
-- MetriqFit Elite - Gamification System Migration
-- Version: 1.0.0
-- Description: Streaks, XP, Levels, Achievements
-- =====================================================

-- =====================================================
-- 1. USER XP & LEVELS
-- =====================================================

CREATE TABLE IF NOT EXISTS user_xp_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL UNIQUE,
  current_level INT DEFAULT 1 CHECK (current_level >= 1 AND current_level <= 30),
  current_xp INT DEFAULT 0 CHECK (current_xp >= 0),
  total_xp_earned INT DEFAULT 0 CHECK (total_xp_earned >= 0),
  level_up_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- XP Event Log
CREATE TABLE IF NOT EXISTS user_xp_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  event_type TEXT NOT NULL,
  xp_amount INT NOT NULL,
  multiplier NUMERIC(4,2) DEFAULT 1.00 CHECK (multiplier >= 1.00),
  final_xp INT NOT NULL CHECK (final_xp >= 0),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =====================================================
-- 2. STREAKS
-- =====================================================

CREATE TABLE IF NOT EXISTS user_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  streak_type TEXT NOT NULL CHECK (
    streak_type IN ('fitness', 'workout', 'nutrition', 'hydration', 'weigh_in')
  ),
  current_streak INT DEFAULT 0 CHECK (current_streak >= 0),
  longest_streak INT DEFAULT 0 CHECK (longest_streak >= 0),
  last_activity_date DATE,
  freeze_tokens INT DEFAULT 0 CHECK (freeze_tokens >= 0 AND freeze_tokens <= 10),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, streak_type)
);

-- Streak Freeze Log
CREATE TABLE IF NOT EXISTS user_streak_freezes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  streak_type TEXT NOT NULL CHECK (
    streak_type IN ('fitness', 'workout', 'nutrition', 'hydration', 'weigh_in')
  ),
  frozen_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =====================================================
-- 3. ACHIEVEMENTS
-- =====================================================

CREATE TABLE IF NOT EXISTS achievement_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (
    category IN ('milestone', 'streak', 'consistency', 'pr', 'nutrition', 'transformation', 'elite', 'hidden')
  ),
  icon_name TEXT NOT NULL,
  xp_reward INT NOT NULL CHECK (xp_reward >= 0),
  tier TEXT DEFAULT 'free' CHECK (tier IN ('free', 'elite')),
  rarity TEXT DEFAULT 'common' CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
  unlock_condition JSONB NOT NULL,
  is_hidden BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- User Unlocked Achievements
CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  achievement_id UUID REFERENCES achievement_definitions NOT NULL,
  unlocked_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  progress_percentage INT DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  metadata JSONB DEFAULT '{}'::jsonb,
  UNIQUE(user_id, achievement_id)
);

-- =====================================================
-- 4. INDEXES FOR PERFORMANCE
-- =====================================================

-- XP Levels
CREATE INDEX idx_user_xp_levels_user_id ON user_xp_levels(user_id);
CREATE INDEX idx_user_xp_levels_current_level ON user_xp_levels(current_level);
CREATE INDEX idx_user_xp_levels_total_xp ON user_xp_levels(total_xp_earned DESC);

-- XP Events
CREATE INDEX idx_user_xp_events_user_id ON user_xp_events(user_id);
CREATE INDEX idx_user_xp_events_event_type ON user_xp_events(event_type);
CREATE INDEX idx_user_xp_events_created_at ON user_xp_events(created_at DESC);
CREATE INDEX idx_user_xp_events_user_created ON user_xp_events(user_id, created_at DESC);

-- Streaks
CREATE INDEX idx_user_streaks_user_id ON user_streaks(user_id);
CREATE INDEX idx_user_streaks_type ON user_streaks(streak_type);
CREATE INDEX idx_user_streaks_current ON user_streaks(current_streak DESC);

-- Streak Freezes
CREATE INDEX idx_user_streak_freezes_user_date ON user_streak_freezes(user_id, frozen_date);

-- Achievements
CREATE INDEX idx_achievement_defs_external_id ON achievement_definitions(external_id);
CREATE INDEX idx_achievement_defs_category ON achievement_definitions(category);
CREATE INDEX idx_achievement_defs_tier ON achievement_definitions(tier);
CREATE INDEX idx_achievement_defs_active ON achievement_definitions(is_active) WHERE is_active = true;

-- User Achievements
CREATE INDEX idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX idx_user_achievements_achievement_id ON user_achievements(achievement_id);
CREATE INDEX idx_user_achievements_unlocked_at ON user_achievements(unlocked_at DESC);

-- =====================================================
-- 5. ROW LEVEL SECURITY POLICIES
-- =====================================================

-- XP Levels
ALTER TABLE user_xp_levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own XP levels"
  ON user_xp_levels FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own XP levels"
  ON user_xp_levels FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own XP levels"
  ON user_xp_levels FOR UPDATE
  USING (auth.uid() = user_id);

-- XP Events
ALTER TABLE user_xp_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own XP events"
  ON user_xp_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert XP events"
  ON user_xp_events FOR INSERT
  WITH CHECK (true); -- Edge Functions use service role

-- Streaks
ALTER TABLE user_streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own streaks"
  ON user_streaks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own streaks"
  ON user_streaks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own streaks"
  ON user_streaks FOR UPDATE
  USING (auth.uid() = user_id);

-- Streak Freezes
ALTER TABLE user_streak_freezes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own streak freezes"
  ON user_streak_freezes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert streak freezes"
  ON user_streak_freezes FOR INSERT
  WITH CHECK (true);

-- Achievement Definitions (public read)
ALTER TABLE achievement_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active achievements"
  ON achievement_definitions FOR SELECT
  USING (is_active = true OR auth.role() = 'service_role');

-- User Achievements
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own achievements"
  ON user_achievements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert achievements"
  ON user_achievements FOR INSERT
  WITH CHECK (true);

-- =====================================================
-- 6. HELPER FUNCTIONS
-- =====================================================

-- Function to get level info from XP total
CREATE OR REPLACE FUNCTION get_level_from_xp(total_xp INT)
RETURNS TABLE(level INT, level_name TEXT, tier_name TEXT, xp_for_next_level INT, xp_needed INT) AS $$
DECLARE
  level_thresholds INT[] := ARRAY[
    0, 500, 1200, 2000, 3000, 4200, 5600, 7200, 9000, 11000,
    13500, 16200, 19200, 22500, 26000, 30000, 34500, 39500, 45000, 51000,
    58000, 65500, 73500, 82000, 91000, 101000, 112000, 124000, 137000, 151000
  ];
  current_level INT := 1;
  current_tier TEXT;
  current_name TEXT;
  next_threshold INT;
  needed INT;
BEGIN
  -- Find current level
  FOR i IN 1..30 LOOP
    IF total_xp >= level_thresholds[i] THEN
      current_level := i;
    ELSE
      EXIT;
    END IF;
  END LOOP;

  -- Get tier name
  CASE
    WHEN current_level <= 5 THEN current_tier := 'Rookie';
    WHEN current_level <= 10 THEN current_tier := 'Builder';
    WHEN current_level <= 15 THEN current_tier := 'Athlete';
    WHEN current_level <= 20 THEN current_tier := 'Elite';
    WHEN current_level <= 25 THEN current_tier := 'Legend';
    ELSE current_tier := 'Master';
  END CASE;

  -- Build level name
  current_name := current_tier || ' ' || ((current_level - 1) % 5 + 1)::TEXT;

  -- Calculate XP needed for next level
  IF current_level < 30 THEN
    next_threshold := level_thresholds[current_level + 1];
    needed := next_threshold - total_xp;
  ELSE
    next_threshold := level_thresholds[30];
    needed := 0; -- Max level
  END IF;

  RETURN QUERY SELECT current_level, current_name, current_tier, next_threshold, needed;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to initialize user gamification data
CREATE OR REPLACE FUNCTION initialize_user_gamification(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Insert XP level (Rookie 1, Level 1)
  INSERT INTO user_xp_levels (user_id, current_level, current_xp, total_xp_earned)
  VALUES (p_user_id, 1, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;

  -- Insert all 5 streak types
  INSERT INTO user_streaks (user_id, streak_type, current_streak, longest_streak, freeze_tokens)
  VALUES
    (p_user_id, 'fitness', 0, 0, 0),
    (p_user_id, 'workout', 0, 0, 0),
    (p_user_id, 'nutrition', 0, 0, 0),
    (p_user_id, 'hydration', 0, 0, 0),
    (p_user_id, 'weigh_in', 0, 0, 0)
  ON CONFLICT (user_id, streak_type) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to initialize gamification data on new user
CREATE OR REPLACE FUNCTION trigger_initialize_user_gamification()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM initialize_user_gamification(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created_initialize_gamification
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION trigger_initialize_user_gamification();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_user_xp_levels_updated_at
  BEFORE UPDATE ON user_xp_levels
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_streaks_updated_at
  BEFORE UPDATE ON user_streaks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_achievement_definitions_updated_at
  BEFORE UPDATE ON achievement_definitions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 7. INITIAL DATA - ACHIEVEMENT DEFINITIONS
-- =====================================================

-- Milestone Achievements
INSERT INTO achievement_definitions (external_id, name, description, category, icon_name, xp_reward, tier, rarity, unlock_condition, is_hidden, sort_order)
VALUES
  ('first_workout_completed', 'First Workout', 'Complete your first workout session', 'milestone', 'dumbbell', 50, 'free', 'common', '{"type": "workout_count", "threshold": 1}', false, 1),
  ('first_meal_logged', 'First Meal', 'Log your first meal', 'milestone', 'restaurant', 25, 'free', 'common', '{"type": "meal_count", "threshold": 1}', false, 2),
  ('10_workouts_completed', '10 Workouts', 'Complete 10 workout sessions', 'milestone', 'fitness', 100, 'free', 'common', '{"type": "workout_count", "threshold": 10}', false, 3),
  ('25_workouts_completed', '25 Workouts', 'Complete 25 workout sessions', 'milestone', 'barbell', 250, 'free', 'common', '{"type": "workout_count", "threshold": 25}', false, 4),
  ('50_workouts_completed', '50 Workouts', 'Complete 50 workout sessions', 'milestone', 'medal', 500, 'free', 'rare', '{"type": "workout_count", "threshold": 50}', false, 5),
  ('100_workouts_completed', 'Century', 'Complete 100 workout sessions', 'milestone', 'trophy', 1000, 'free', 'rare', '{"type": "workout_count", "threshold": 100}', false, 6),
  ('250_workouts_completed', 'Quarter Grand', 'Complete 250 workout sessions', 'milestone', 'star', 2500, 'free', 'epic', '{"type": "workout_count", "threshold": 250}', false, 7),
  ('500_workouts_completed', 'Half Grand', 'Complete 500 workout sessions', 'milestone', 'diamond', 5000, 'free', 'legendary', '{"type": "workout_count", "threshold": 500}', false, 8);

-- Streak Achievements
INSERT INTO achievement_definitions (external_id, name, description, category, icon_name, xp_reward, tier, rarity, unlock_condition, is_hidden, sort_order)
VALUES
  ('3_day_streak', '3-Day Streak', 'Maintain any streak for 3 consecutive days', 'streak', 'flame', 50, 'free', 'common', '{"type": "streak_length", "threshold": 3}', false, 10),
  ('7_day_streak', 'Week Warrior', 'Maintain any streak for 7 consecutive days', 'streak', 'fire', 150, 'free', 'common', '{"type": "streak_length", "threshold": 7}', false, 11),
  ('14_day_streak', 'Two Weeks', 'Maintain any streak for 14 consecutive days', 'streak', 'flame-outline', 350, 'free', 'rare', '{"type": "streak_length", "threshold": 14}', false, 12),
  ('30_day_streak', 'Month Master', 'Maintain any streak for 30 consecutive days', 'streak', 'bonfire', 1000, 'free', 'rare', '{"type": "streak_length", "threshold": 30}', false, 13),
  ('60_day_streak', 'Two Months', 'Maintain any streak for 60 consecutive days', 'streak', 'bonfire-outline', 2500, 'free', 'epic', '{"type": "streak_length", "threshold": 60}', false, 14),
  ('90_day_streak', 'Quarter Year', 'Maintain any streak for 90 consecutive days', 'streak', 'infinite', 5000, 'free', 'epic', '{"type": "streak_length", "threshold": 90}', false, 15);

-- Consistency Achievements
INSERT INTO achievement_definitions (external_id, name, description, category, icon_name, xp_reward, tier, rarity, unlock_condition, is_hidden, sort_order)
VALUES
  ('4_workouts_week', 'Consistent', 'Complete 4 workouts in one week', 'consistency', 'calendar-check', 100, 'free', 'common', '{"type": "workouts_per_week", "threshold": 4}', false, 20),
  ('5_workouts_week', 'Dedicated', 'Complete 5 workouts in one week', 'consistency', 'calendar-star', 150, 'free', 'common', '{"type": "workouts_per_week", "threshold": 5}', false, 21),
  ('6_workouts_week', 'Unstoppable', 'Complete 6 workouts in one week', 'consistency', 'calendar-heart', 250, 'free', 'rare', '{"type": "workouts_per_week", "threshold": 6}', false, 22),
  ('triple_threat_day', 'Triple Threat', 'Complete workout, log 3+ meals, and hit water goal in one day', 'consistency', 'checkmark-done', 100, 'free', 'common', '{"type": "triple_threat_day", "threshold": 1}', false, 23),
  ('perfect_week', 'Perfect Week', 'Complete all workouts, log all meals, and hit water goal every day for 7 days', 'consistency', 'ribbon', 500, 'free', 'rare', '{"type": "perfect_week", "threshold": 1}', false, 24);

-- PR Achievements
INSERT INTO achievement_definitions (external_id, name, description, category, icon_name, xp_reward, tier, rarity, unlock_condition, is_hidden, sort_order)
VALUES
  ('first_pr', 'First PR', 'Set your first personal record', 'pr', 'trending-up', 100, 'free', 'common', '{"type": "pr_count", "threshold": 1}', false, 30),
  ('10_prs', 'PR Collector', 'Set 10 personal records', 'pr', 'podium', 500, 'free', 'rare', '{"type": "pr_count", "threshold": 10}', false, 31),
  ('squat_pr', 'Squat Strength', 'Set a new squat personal record', 'pr', 'barbell-outline', 150, 'free', 'common', '{"type": "pr_exercise", "exercise_name": "Barbell Squat"}', false, 32),
  ('deadlift_pr', 'Deadlift Domination', 'Set a new deadlift personal record', 'pr', 'fitness-outline', 150, 'free', 'common', '{"type": "pr_exercise", "exercise_name": "Deadlift"}', false, 33),
  ('bench_pr', 'Bench Beast', 'Set a new bench press personal record', 'pr', 'body-outline', 150, 'free', 'common', '{"type": "pr_exercise", "exercise_name": "Bench Press"}', false, 34);

-- Nutrition Achievements
INSERT INTO achievement_definitions (external_id, name, description, category, icon_name, xp_reward, tier, rarity, unlock_condition, is_hidden, sort_order)
VALUES
  ('100_meals_logged', '100 Meals', 'Log 100 meals', 'nutrition', 'fast-food', 200, 'free', 'common', '{"type": "meal_count", "threshold": 100}', false, 40),
  ('protein_champion', 'Protein Champion', 'Hit protein goal 30 days in a row', 'nutrition', 'nutrition', 250, 'free', 'rare', '{"type": "protein_streak", "threshold": 30}', false, 41),
  ('macro_master', 'Macro Master', 'Hit all macros within ±10% for 7 consecutive days', 'nutrition', 'analytics', 300, 'free', 'rare', '{"type": "macro_adherence", "threshold": 7}', false, 42),
  ('hydration_hero', 'Hydration Hero', 'Hit water goal 30 consecutive days', 'nutrition', 'water', 300, 'free', 'rare', '{"type": "water_streak", "threshold": 30}', false, 43);

-- Body Transformation Achievements
INSERT INTO achievement_definitions (external_id, name, description, category, icon_name, xp_reward, tier, rarity, unlock_condition, is_hidden, sort_order)
VALUES
  ('first_weigh_in', 'First Weigh-In', 'Log your first weight measurement', 'transformation', 'scale', 25, 'free', 'common', '{"type": "weight_log_count", "threshold": 1}', false, 50),
  ('10_weigh_ins', 'Tracking Progress', 'Log 10 weight measurements', 'transformation', 'trending-down', 100, 'free', 'common', '{"type": "weight_log_count", "threshold": 10}', false, 51);

-- Hidden Achievements
INSERT INTO achievement_definitions (external_id, name, description, category, icon_name, xp_reward, tier, rarity, unlock_condition, is_hidden, sort_order)
VALUES
  ('night_owl', 'Night Owl', 'Complete a workout between 11pm-2am', 'hidden', 'moon', 100, 'free', 'common', '{"type": "workout_time", "start_hour": 23, "end_hour": 2}', true, 60),
  ('early_bird', 'Early Bird', 'Complete a workout between 5am-6am', 'hidden', 'sunny', 100, 'free', 'common', '{"type": "workout_time", "start_hour": 5, "end_hour": 6}', true, 61),
  ('comeback_kid', 'Comeback Kid', 'Return and log activity after 30+ days of inactivity', 'hidden', 'return-up-back', 250, 'free', 'rare', '{"type": "comeback", "inactive_days": 30}', true, 62);

-- =====================================================
-- 8. GRANT PERMISSIONS
-- =====================================================

-- Grant usage on tables to authenticated users
GRANT SELECT, INSERT, UPDATE ON user_xp_levels TO authenticated;
GRANT SELECT ON user_xp_events TO authenticated;
GRANT SELECT, INSERT, UPDATE ON user_streaks TO authenticated;
GRANT SELECT ON user_streak_freezes TO authenticated;
GRANT SELECT ON achievement_definitions TO authenticated, anon;
GRANT SELECT ON user_achievements TO authenticated;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

COMMENT ON TABLE user_xp_levels IS 'Stores user XP and level progression (Rookie 1 through Master 5)';
COMMENT ON TABLE user_xp_events IS 'Audit log of all XP-earning events';
COMMENT ON TABLE user_streaks IS 'Tracks 5 streak types: fitness, workout, nutrition, hydration, weigh_in';
COMMENT ON TABLE user_streak_freezes IS 'Log of streak freeze token usage';
COMMENT ON TABLE achievement_definitions IS 'Master list of all achievable badges';
COMMENT ON TABLE user_achievements IS 'User-unlocked achievements with timestamps';
