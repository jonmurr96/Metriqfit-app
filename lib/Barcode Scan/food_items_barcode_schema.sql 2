-- food_items_barcode_schema.sql
-- Minimal schema to cache normalized barcode lookups (per 100g).
-- Canonical storage units: per 100g macros.
-- This table can coexist with your broader `food_items` dataset.

create table if not exists public.food_items (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('openfoodfacts', 'usda_fdc', 'manual', 'internal')),
  barcode text unique,
  name text,
  brand text,
  image_url text,

  kcal_100g numeric,
  protein_g_100g numeric,
  carbs_g_100g numeric,
  fat_g_100g numeric,

  raw jsonb,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Helpful indexes
create index if not exists food_items_barcode_idx on public.food_items (barcode);

-- Requires pg_trgm extension for fuzzy search (optional):
-- create extension if not exists pg_trgm;
-- create index if not exists food_items_name_trgm_idx on public.food_items using gin (name gin_trgm_ops);

-- RLS (recommended)
alter table public.food_items enable row level security;

-- Read-only for authenticated users (or public if you prefer)
drop policy if exists "food_items_read" on public.food_items;
create policy "food_items_read"
on public.food_items
for select
to authenticated
using (true);

-- Writes restricted: only service role should write.
-- (Edge Functions using SUPABASE_SERVICE_ROLE_KEY bypass RLS by default.)
