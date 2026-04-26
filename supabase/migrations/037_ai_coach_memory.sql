-- AI Coach persistent memory

CREATE TABLE IF NOT EXISTS public.ai_coach_memory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_message_id UUID REFERENCES public.ai_coach_messages(id) ON DELETE SET NULL,
  memory_type TEXT NOT NULL CHECK (memory_type IN ('goal', 'constraint', 'preference', 'commitment', 'summary', 'intervention')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'dismissed')),
  priority INTEGER NOT NULL DEFAULT 50,
  metadata_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ai_coach_memory_items_user ON public.ai_coach_memory_items(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_coach_memory_items_status ON public.ai_coach_memory_items(user_id, status, priority DESC, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_coach_memory_items_message ON public.ai_coach_memory_items(source_message_id);

ALTER TABLE public.ai_coach_memory_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own coach memory" ON public.ai_coach_memory_items;
CREATE POLICY "Users can manage own coach memory" ON public.ai_coach_memory_items
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.touch_ai_coach_memory_items_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ai_coach_memory_items_updated_at ON public.ai_coach_memory_items;
CREATE TRIGGER trg_ai_coach_memory_items_updated_at
  BEFORE UPDATE ON public.ai_coach_memory_items
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_ai_coach_memory_items_updated_at();
