ALTER TABLE public.food_items
  ADD COLUMN IF NOT EXISTS created_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_food_items_created_by_user
  ON public.food_items(created_by_user_id);

CREATE OR REPLACE FUNCTION public.create_user_food_item(
  p_name TEXT,
  p_brand TEXT DEFAULT NULL,
  p_category TEXT DEFAULT NULL,
  p_calories_per_100g NUMERIC DEFAULT 0,
  p_protein_per_100g NUMERIC DEFAULT 0,
  p_carbs_per_100g NUMERIC DEFAULT 0,
  p_fat_per_100g NUMERIC DEFAULT 0,
  p_fiber_per_100g NUMERIC DEFAULT NULL,
  p_sugar_per_100g NUMERIC DEFAULT NULL,
  p_sodium_per_100g NUMERIC DEFAULT NULL,
  p_serving_size_g NUMERIC DEFAULT NULL,
  p_serving_description TEXT DEFAULT NULL,
  p_image_url TEXT DEFAULT NULL,
  p_barcode TEXT DEFAULT NULL
)
RETURNS public.food_items
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_existing public.food_items;
  v_created public.food_items;
BEGIN
  SELECT *
  INTO v_existing
  FROM public.food_items
  WHERE created_by_user_id = auth.uid()
    AND source = 'manual'
    AND lower(trim(name)) = lower(trim(p_name))
    AND coalesce(lower(trim(brand)), '') = coalesce(lower(trim(p_brand)), '')
    AND abs(calories_per_100g - coalesce(p_calories_per_100g, 0)) <= 1
    AND abs(protein_per_100g - coalesce(p_protein_per_100g, 0)) <= 1
    AND abs(carbs_per_100g - coalesce(p_carbs_per_100g, 0)) <= 1
    AND abs(fat_per_100g - coalesce(p_fat_per_100g, 0)) <= 1
  LIMIT 1;

  IF v_existing.id IS NOT NULL THEN
    RETURN v_existing;
  END IF;

  INSERT INTO public.food_items (
    name,
    brand,
    category,
    calories_per_100g,
    protein_per_100g,
    carbs_per_100g,
    fat_per_100g,
    fiber_per_100g,
    sugar_per_100g,
    sodium_per_100g,
    serving_size_g,
    serving_description,
    barcode,
    source,
    image_url,
    is_verified,
    created_by_user_id
  )
  VALUES (
    p_name,
    p_brand,
    p_category,
    coalesce(p_calories_per_100g, 0),
    coalesce(p_protein_per_100g, 0),
    coalesce(p_carbs_per_100g, 0),
    coalesce(p_fat_per_100g, 0),
    p_fiber_per_100g,
    p_sugar_per_100g,
    p_sodium_per_100g,
    p_serving_size_g,
    p_serving_description,
    p_barcode,
    'manual',
    p_image_url,
    false,
    auth.uid()
  )
  RETURNING *
  INTO v_created;

  RETURN v_created;
END;
$$;

DROP POLICY IF EXISTS "Anyone can view food items" ON public.food_items;
DROP POLICY IF EXISTS "Users can view visible food items" ON public.food_items;
DROP POLICY IF EXISTS "Users can insert own manual food items" ON public.food_items;
DROP POLICY IF EXISTS "Users can update own manual food items" ON public.food_items;
DROP POLICY IF EXISTS "Users can delete own manual food items" ON public.food_items;

CREATE POLICY "Users can view visible food items" ON public.food_items
  FOR SELECT
  USING (
    created_by_user_id IS NULL
    OR created_by_user_id = auth.uid()
  );

CREATE POLICY "Users can insert own manual food items" ON public.food_items
  FOR INSERT
  WITH CHECK (
    created_by_user_id = auth.uid()
    AND source = 'manual'
  );

CREATE POLICY "Users can update own manual food items" ON public.food_items
  FOR UPDATE
  USING (
    created_by_user_id = auth.uid()
    AND source = 'manual'
  )
  WITH CHECK (
    created_by_user_id = auth.uid()
    AND source = 'manual'
  );

CREATE POLICY "Users can delete own manual food items" ON public.food_items
  FOR DELETE
  USING (
    created_by_user_id = auth.uid()
    AND source = 'manual'
  );
