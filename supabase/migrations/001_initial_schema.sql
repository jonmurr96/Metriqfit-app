-- MetriqFit Initial Schema
-- Migration 001: Core tables for user profiles, targets, nutrition, and water tracking

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===========================================
-- PROFILES TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  date_of_birth DATE,
  sex TEXT CHECK (sex IN ('male', 'female', 'other')),
  height_cm NUMERIC,
  current_weight_kg NUMERIC,
  unit_system TEXT DEFAULT 'imperial' CHECK (unit_system IN ('imperial', 'metric')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- ONBOARDING ANSWERS TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS public.onboarding_answers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  answers JSONB NOT NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- ===========================================
-- USER TARGETS TABLE (Deterministically Computed)
-- ===========================================
CREATE TABLE IF NOT EXISTS public.user_targets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  calories INTEGER NOT NULL,
  protein_g NUMERIC NOT NULL,
  carbs_g NUMERIC NOT NULL,
  fat_g NUMERIC NOT NULL,
  fiber_g NUMERIC,
  water_ml INTEGER NOT NULL DEFAULT 2500,
  computation_method TEXT DEFAULT 'mifflin_st_jeor',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- ===========================================
-- WATER LOGS TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS public.water_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_ml INTEGER NOT NULL CHECK (amount_ml > 0),
  logged_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- USER MEASUREMENTS TABLE (Weight History)
-- ===========================================
CREATE TABLE IF NOT EXISTS public.user_measurements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  weight_kg NUMERIC NOT NULL,
  body_fat_percentage NUMERIC,
  notes TEXT,
  logged_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- FOOD ITEMS TABLE (Nutrition Database)
-- ===========================================
CREATE TABLE IF NOT EXISTS public.food_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  brand TEXT,
  category TEXT,
  calories_per_100g NUMERIC NOT NULL,
  protein_per_100g NUMERIC NOT NULL,
  carbs_per_100g NUMERIC NOT NULL,
  fat_per_100g NUMERIC NOT NULL,
  fiber_per_100g NUMERIC,
  sugar_per_100g NUMERIC,
  sodium_per_100g NUMERIC,
  serving_size_g NUMERIC,
  serving_description TEXT,
  barcode TEXT,
  source TEXT DEFAULT 'internal' CHECK (source IN ('internal', 'usda_fdc', 'openfoodfacts', 'manual')),
  image_url TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- MEAL LOGS TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS public.meal_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  meal_slot TEXT NOT NULL CHECK (meal_slot IN ('breakfast', 'lunch', 'dinner', 'snack')),
  logged_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- MEAL LOG ITEMS TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS public.meal_log_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meal_log_id UUID NOT NULL REFERENCES public.meal_logs(id) ON DELETE CASCADE,
  food_item_id UUID NOT NULL REFERENCES public.food_items(id),
  grams NUMERIC NOT NULL CHECK (grams > 0),
  calories NUMERIC NOT NULL,
  protein NUMERIC NOT NULL,
  carbs NUMERIC NOT NULL,
  fat NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- STEP LOGS TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS public.step_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  steps INTEGER NOT NULL CHECK (steps >= 0),
  logged_date DATE NOT NULL DEFAULT CURRENT_DATE,
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'healthkit', 'google_fit')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, logged_date)
);

-- ===========================================
-- INDEXES
-- ===========================================
CREATE INDEX IF NOT EXISTS idx_water_logs_user_date ON public.water_logs(user_id, logged_at);
CREATE INDEX IF NOT EXISTS idx_user_measurements_user_date ON public.user_measurements(user_id, logged_at);
CREATE INDEX IF NOT EXISTS idx_meal_logs_user_date ON public.meal_logs(user_id, logged_at);
CREATE INDEX IF NOT EXISTS idx_meal_log_items_meal ON public.meal_log_items(meal_log_id);
CREATE INDEX IF NOT EXISTS idx_food_items_name ON public.food_items(name);
CREATE INDEX IF NOT EXISTS idx_food_items_barcode ON public.food_items(barcode) WHERE barcode IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_step_logs_user_date ON public.step_logs(user_id, logged_date);

-- ===========================================
-- ROW LEVEL SECURITY
-- ===========================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.water_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_log_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.step_logs ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Onboarding answers policies
CREATE POLICY "Users can manage own onboarding" ON public.onboarding_answers
  FOR ALL USING (auth.uid() = user_id);

-- User targets policies
CREATE POLICY "Users can manage own targets" ON public.user_targets
  FOR ALL USING (auth.uid() = user_id);

-- Water logs policies
CREATE POLICY "Users can manage own water logs" ON public.water_logs
  FOR ALL USING (auth.uid() = user_id);

-- User measurements policies
CREATE POLICY "Users can manage own measurements" ON public.user_measurements
  FOR ALL USING (auth.uid() = user_id);

-- Food items policies (public read, admin write)
CREATE POLICY "Anyone can view food items" ON public.food_items
  FOR SELECT USING (true);

-- Meal logs policies
CREATE POLICY "Users can manage own meal logs" ON public.meal_logs
  FOR ALL USING (auth.uid() = user_id);

-- Meal log items policies
CREATE POLICY "Users can manage own meal log items" ON public.meal_log_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.meal_logs
      WHERE id = meal_log_id AND user_id = auth.uid()
    )
  );

-- Step logs policies
CREATE POLICY "Users can manage own step logs" ON public.step_logs
  FOR ALL USING (auth.uid() = user_id);

-- ===========================================
-- FUNCTIONS & TRIGGERS
-- ===========================================

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_onboarding_updated_at
  BEFORE UPDATE ON public.onboarding_answers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_user_targets_updated_at
  BEFORE UPDATE ON public.user_targets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_food_items_updated_at
  BEFORE UPDATE ON public.food_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
