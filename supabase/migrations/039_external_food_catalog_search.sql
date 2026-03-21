ALTER TABLE public.food_items
  ADD COLUMN IF NOT EXISTS external_source_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_food_items_unique_external_source
  ON public.food_items(source, external_source_id)
  WHERE external_source_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_food_items_lower_name
  ON public.food_items (lower(name));

CREATE INDEX IF NOT EXISTS idx_food_items_lower_brand
  ON public.food_items (lower(brand));
