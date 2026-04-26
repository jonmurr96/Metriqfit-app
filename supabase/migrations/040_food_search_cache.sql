create table if not exists public.external_food_search_cache (
  query_key text primary key,
  normalized_query text not null,
  result_limit integer not null,
  results jsonb not null,
  provider_status jsonb not null default '{}'::jsonb,
  provider_timings_ms jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists external_food_search_cache_expires_at_idx
  on public.external_food_search_cache (expires_at);

create index if not exists external_food_search_cache_query_limit_idx
  on public.external_food_search_cache (normalized_query, result_limit);

alter table public.external_food_search_cache enable row level security;
