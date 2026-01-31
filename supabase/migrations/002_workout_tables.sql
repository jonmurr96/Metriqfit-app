-- MetriqFit Workout Schema
-- Migration 002: Exercise library, workout templates, sessions, sets, and PRs

-- ===========================================
-- EXERCISES TABLE (Reference Library)
-- ===========================================
CREATE TABLE IF NOT EXISTS public.exercises (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  external_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  equipment_required TEXT[] DEFAULT '{}',
  primary_muscle TEXT,
  secondary_muscles TEXT[] DEFAULT '{}',
  pattern TEXT,
  difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  instructions TEXT,
  video_url TEXT,
  image_url TEXT,
  is_compound BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- WORKOUT TEMPLATES TABLE (Program Library)
-- ===========================================
CREATE TABLE IF NOT EXISTS public.workout_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  external_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  duration_weeks INTEGER,
  days_per_week INTEGER NOT NULL CHECK (days_per_week BETWEEN 1 AND 7),
  equipment_required TEXT[] DEFAULT '{}',
  goal_tags TEXT[] DEFAULT '{}',
  target_audience TEXT,
  is_public BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- WORKOUT TEMPLATE DAYS TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS public.workout_template_days (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID NOT NULL REFERENCES public.workout_templates(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL CHECK (day_number >= 1),
  name TEXT NOT NULL,
  focus TEXT,
  estimated_duration_min INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(template_id, day_number)
);

-- ===========================================
-- WORKOUT TEMPLATE EXERCISES TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS public.workout_template_exercises (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_day_id UUID NOT NULL REFERENCES public.workout_template_days(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES public.exercises(id),
  order_index INTEGER NOT NULL,
  sets_target INTEGER NOT NULL DEFAULT 3 CHECK (sets_target BETWEEN 1 AND 20),
  reps_min INTEGER NOT NULL DEFAULT 8 CHECK (reps_min BETWEEN 1 AND 100),
  reps_max INTEGER NOT NULL DEFAULT 12 CHECK (reps_max BETWEEN 1 AND 100),
  rest_seconds INTEGER DEFAULT 90 CHECK (rest_seconds BETWEEN 0 AND 600),
  tempo TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_rep_range CHECK (reps_max >= reps_min)
);

-- ===========================================
-- WORKOUT SESSIONS TABLE (User Logged Workouts)
-- ===========================================
CREATE TABLE IF NOT EXISTS public.workout_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_day_id UUID REFERENCES public.workout_template_days(id),
  plan_day_id UUID, -- Will reference user_workout_plan_days
  name TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  notes TEXT,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- SESSION EXERCISES TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS public.session_exercises (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES public.exercises(id),
  order_index INTEGER NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- WORKOUT SETS TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS public.workout_sets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_exercise_id UUID NOT NULL REFERENCES public.session_exercises(id) ON DELETE CASCADE,
  set_number INTEGER NOT NULL CHECK (set_number >= 1),
  reps INTEGER NOT NULL CHECK (reps BETWEEN 0 AND 100),
  weight_lb NUMERIC CHECK (weight_lb >= 0 AND weight_lb <= 2000),
  rpe NUMERIC CHECK (rpe >= 1 AND rpe <= 10),
  is_warmup BOOLEAN DEFAULT FALSE,
  is_pr BOOLEAN DEFAULT FALSE,
  logged_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- USER PRS TABLE (Personal Records)
-- ===========================================
CREATE TABLE IF NOT EXISTS public.user_prs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES public.exercises(id),
  weight_lb NUMERIC NOT NULL CHECK (weight_lb > 0),
  reps INTEGER NOT NULL CHECK (reps >= 1),
  estimated_1rm NUMERIC,
  achieved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  set_id UUID REFERENCES public.workout_sets(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, exercise_id)
);

-- ===========================================
-- INDEXES
-- ===========================================
CREATE INDEX IF NOT EXISTS idx_exercises_category ON public.exercises(category);
CREATE INDEX IF NOT EXISTS idx_exercises_difficulty ON public.exercises(difficulty);
CREATE INDEX IF NOT EXISTS idx_exercises_external_id ON public.exercises(external_id);

CREATE INDEX IF NOT EXISTS idx_workout_templates_public ON public.workout_templates(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_workout_templates_difficulty ON public.workout_templates(difficulty);

CREATE INDEX IF NOT EXISTS idx_template_days_template ON public.workout_template_days(template_id);
CREATE INDEX IF NOT EXISTS idx_template_exercises_day ON public.workout_template_exercises(template_day_id);

CREATE INDEX IF NOT EXISTS idx_workout_sessions_user ON public.workout_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_date ON public.workout_sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_finished ON public.workout_sessions(user_id, finished_at) WHERE finished_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_session_exercises_session ON public.session_exercises(session_id);
CREATE INDEX IF NOT EXISTS idx_workout_sets_session_exercise ON public.workout_sets(session_exercise_id);

CREATE INDEX IF NOT EXISTS idx_user_prs_user ON public.user_prs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_prs_exercise ON public.user_prs(exercise_id);

-- ===========================================
-- ROW LEVEL SECURITY
-- ===========================================
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_template_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_template_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_prs ENABLE ROW LEVEL SECURITY;

-- Public read for reference tables
CREATE POLICY "Anyone can view exercises" ON public.exercises
  FOR SELECT USING (true);

CREATE POLICY "Anyone can view public templates" ON public.workout_templates
  FOR SELECT USING (is_public = true);

CREATE POLICY "Anyone can view template days" ON public.workout_template_days
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.workout_templates
      WHERE id = template_id AND is_public = true
    )
  );

CREATE POLICY "Anyone can view template exercises" ON public.workout_template_exercises
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.workout_template_days d
      JOIN public.workout_templates t ON d.template_id = t.id
      WHERE d.id = template_day_id AND t.is_public = true
    )
  );

-- User-owned data policies
CREATE POLICY "Users can manage own sessions" ON public.workout_sessions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own session exercises" ON public.session_exercises
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.workout_sessions
      WHERE id = session_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own sets" ON public.workout_sets
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.session_exercises se
      JOIN public.workout_sessions ws ON se.session_id = ws.id
      WHERE se.id = session_exercise_id AND ws.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own PRs" ON public.user_prs
  FOR ALL USING (auth.uid() = user_id);

-- ===========================================
-- FUNCTIONS
-- ===========================================

-- Calculate estimated 1RM using Brzycki formula
CREATE OR REPLACE FUNCTION public.calculate_estimated_1rm(weight NUMERIC, reps INTEGER)
RETURNS NUMERIC AS $$
BEGIN
  IF reps = 1 THEN
    RETURN weight;
  ELSIF reps > 12 THEN
    RETURN weight; -- Formula less accurate for high reps
  ELSE
    RETURN ROUND(weight * (36.0 / (37.0 - reps)), 1);
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Auto-calculate session duration on finish
CREATE OR REPLACE FUNCTION public.calculate_session_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.finished_at IS NOT NULL AND OLD.finished_at IS NULL THEN
    NEW.duration_seconds = EXTRACT(EPOCH FROM (NEW.finished_at - NEW.started_at))::INTEGER;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_session_duration_trigger
  BEFORE UPDATE ON public.workout_sessions
  FOR EACH ROW EXECUTE FUNCTION public.calculate_session_duration();
