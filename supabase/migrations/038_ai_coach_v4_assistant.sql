-- AI Coach v4: threads, action proposals, tool receipts, richer memory metadata

CREATE TABLE IF NOT EXISTS public.ai_coach_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New coach chat',
  title_source TEXT NOT NULL DEFAULT 'auto' CHECK (title_source IN ('auto', 'user', 'model')),
  last_message_preview TEXT,
  last_intent_mode TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ai_coach_threads_user_updated
  ON public.ai_coach_threads(user_id, updated_at DESC);

ALTER TABLE public.ai_coach_threads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own coach threads" ON public.ai_coach_threads;
CREATE POLICY "Users can manage own coach threads" ON public.ai_coach_threads
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.ai_coach_action_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  thread_id UUID NOT NULL REFERENCES public.ai_coach_threads(id) ON DELETE CASCADE,
  source_message_id UUID REFERENCES public.ai_coach_messages(id) ON DELETE SET NULL,
  tool_name TEXT NOT NULL,
  tool_input_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  risk_level TEXT NOT NULL CHECK (risk_level IN ('low', 'medium', 'high')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'executed', 'failed', 'expired')),
  summary TEXT NOT NULL,
  receipt_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  executed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ai_coach_action_proposals_user_status
  ON public.ai_coach_action_proposals(user_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_coach_action_proposals_thread
  ON public.ai_coach_action_proposals(thread_id, created_at DESC);

ALTER TABLE public.ai_coach_action_proposals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own coach action proposals" ON public.ai_coach_action_proposals;
CREATE POLICY "Users can manage own coach action proposals" ON public.ai_coach_action_proposals
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.ai_coach_tool_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  thread_id UUID NOT NULL REFERENCES public.ai_coach_threads(id) ON DELETE CASCADE,
  proposal_id UUID REFERENCES public.ai_coach_action_proposals(id) ON DELETE SET NULL,
  tool_name TEXT NOT NULL,
  mutation_level TEXT NOT NULL CHECK (mutation_level IN ('none', 'low', 'medium', 'high')),
  summary TEXT NOT NULL,
  metadata_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_coach_tool_receipts_user_created
  ON public.ai_coach_tool_receipts(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_coach_tool_receipts_thread
  ON public.ai_coach_tool_receipts(thread_id, created_at DESC);

ALTER TABLE public.ai_coach_tool_receipts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own coach tool receipts" ON public.ai_coach_tool_receipts;
CREATE POLICY "Users can manage own coach tool receipts" ON public.ai_coach_tool_receipts
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.ai_coach_messages
  ADD COLUMN IF NOT EXISTS thread_id UUID REFERENCES public.ai_coach_threads(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS intent_mode TEXT,
  ADD COLUMN IF NOT EXISTS intent_confidence DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS tool_calls_json JSONB,
  ADD COLUMN IF NOT EXISTS web_used BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS approval_required BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS proposal_id UUID REFERENCES public.ai_coach_action_proposals(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS receipt_id UUID REFERENCES public.ai_coach_tool_receipts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ai_coach_messages_user_thread_created
  ON public.ai_coach_messages(user_id, thread_id, created_at ASC);

ALTER TABLE public.ai_coach_memory_items
  ADD COLUMN IF NOT EXISTS thread_id UUID REFERENCES public.ai_coach_threads(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS proposal_id UUID REFERENCES public.ai_coach_action_proposals(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS origin_type TEXT NOT NULL DEFAULT 'conversation' CHECK (origin_type IN ('derived', 'conversation', 'tool', 'profile')),
  ADD COLUMN IF NOT EXISTS scope TEXT NOT NULL DEFAULT 'conversation' CHECK (scope IN ('global', 'nutrition', 'workout', 'settings', 'conversation'));

CREATE INDEX IF NOT EXISTS idx_ai_coach_memory_items_thread
  ON public.ai_coach_memory_items(thread_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_coach_memory_items_proposal
  ON public.ai_coach_memory_items(proposal_id);

CREATE OR REPLACE FUNCTION public.touch_ai_coach_threads_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ai_coach_threads_updated_at ON public.ai_coach_threads;
CREATE TRIGGER trg_ai_coach_threads_updated_at
  BEFORE UPDATE ON public.ai_coach_threads
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_ai_coach_threads_updated_at();

CREATE OR REPLACE FUNCTION public.touch_ai_coach_action_proposals_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ai_coach_action_proposals_updated_at ON public.ai_coach_action_proposals;
CREATE TRIGGER trg_ai_coach_action_proposals_updated_at
  BEFORE UPDATE ON public.ai_coach_action_proposals
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_ai_coach_action_proposals_updated_at();

WITH seeded_threads AS (
  SELECT
    gen_random_uuid() AS id,
    m.user_id,
    ('Coach chat · ' || TO_CHAR(DATE_TRUNC('day', m.created_at), 'Mon DD')) AS title,
    'auto'::TEXT AS title_source,
    MAX(m.content) FILTER (WHERE m.role = 'assistant') AS last_message_preview,
    DATE_TRUNC('day', MIN(m.created_at)) AS created_day,
    MIN(m.created_at) AS created_at,
    MAX(m.created_at) AS updated_at
  FROM public.ai_coach_messages m
  LEFT JOIN public.ai_coach_threads existing
    ON existing.user_id = m.user_id
   AND DATE_TRUNC('day', existing.created_at) = DATE_TRUNC('day', m.created_at)
  WHERE existing.id IS NULL
  GROUP BY m.user_id, DATE_TRUNC('day', m.created_at)
)
INSERT INTO public.ai_coach_threads (id, user_id, title, title_source, last_message_preview, created_at, updated_at)
SELECT id, user_id, title, title_source, last_message_preview, created_at, updated_at
FROM seeded_threads;

UPDATE public.ai_coach_messages m
SET thread_id = t.id
FROM public.ai_coach_threads t
WHERE m.thread_id IS NULL
  AND t.user_id = m.user_id
  AND DATE_TRUNC('day', t.created_at) = DATE_TRUNC('day', m.created_at);
