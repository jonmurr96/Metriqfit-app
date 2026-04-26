-- Nutrition AI expansion: recipe import, menu scan, pantry, grocery planner.

-- ---------------------------------------------------------------------------
-- Recipes metadata extension
-- ---------------------------------------------------------------------------
alter table public.recipes
  add column if not exists source_type text not null default 'manual',
  add column if not exists source_url text,
  add column if not exists source_domain text,
  add column if not exists import_status text not null default 'parsed',
  add column if not exists import_confidence numeric(5,2);

alter table public.recipes
  drop constraint if exists recipes_source_type_check;
alter table public.recipes
  add constraint recipes_source_type_check
  check (source_type in ('manual', 'url_import', 'menu_import', 'ai_generated'));

alter table public.recipes
  drop constraint if exists recipes_import_status_check;
alter table public.recipes
  add constraint recipes_import_status_check
  check (import_status in ('parsed', 'needs_review', 'failed'));

create index if not exists idx_recipes_source_type on public.recipes(source_type);
create index if not exists idx_recipes_source_domain on public.recipes(source_domain);

-- ---------------------------------------------------------------------------
-- Recipe import events
-- ---------------------------------------------------------------------------
create table if not exists public.recipe_import_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  normalized_url_hash text not null,
  source_url text not null,
  source_domain text,
  parser_path text not null default 'jsonld',
  parse_warnings_json jsonb not null default '[]'::jsonb,
  parse_result_json jsonb,
  error_message text,
  elapsed_ms integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, normalized_url_hash)
);

alter table public.recipe_import_events
  drop constraint if exists recipe_import_events_parser_path_check;
alter table public.recipe_import_events
  add constraint recipe_import_events_parser_path_check
  check (parser_path in ('jsonld', 'html_heuristic', 'ai_fallback'));

create index if not exists idx_recipe_import_events_user_created
  on public.recipe_import_events(user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Menu scan sessions
-- ---------------------------------------------------------------------------
create table if not exists public.menu_scan_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  input_type text not null,
  goal_context_json jsonb not null default '{}'::jsonb,
  constraints_json jsonb not null default '{}'::jsonb,
  ranked_items_json jsonb not null default '[]'::jsonb,
  selected_item_json jsonb,
  explanations_json jsonb not null default '{}'::jsonb,
  applied_plan_meal_id uuid references public.user_nutrition_plan_meals(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.menu_scan_sessions
  drop constraint if exists menu_scan_sessions_input_type_check;
alter table public.menu_scan_sessions
  add constraint menu_scan_sessions_input_type_check
  check (input_type in ('text', 'photo'));

create index if not exists idx_menu_scan_sessions_user_created
  on public.menu_scan_sessions(user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Pantry
-- ---------------------------------------------------------------------------
create table if not exists public.pantry_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  food_item_id uuid references public.food_items(id) on delete set null,
  quantity_value numeric not null default 0,
  quantity_unit text not null default 'g',
  location text,
  expires_at date,
  reorder_threshold numeric not null default 0,
  estimated_cost_per_unit numeric,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_pantry_items_user_active
  on public.pantry_items(user_id, is_active);
create index if not exists idx_pantry_items_user_expires
  on public.pantry_items(user_id, expires_at);

create table if not exists public.pantry_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  pantry_item_id uuid references public.pantry_items(id) on delete set null,
  transaction_type text not null,
  quantity_delta numeric not null,
  quantity_unit text not null default 'g',
  source_type text not null default 'manual',
  source_ref_id uuid,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.pantry_transactions
  drop constraint if exists pantry_transactions_transaction_type_check;
alter table public.pantry_transactions
  add constraint pantry_transactions_transaction_type_check
  check (transaction_type in ('add', 'consume', 'waste', 'adjust'));

create index if not exists idx_pantry_transactions_user_created
  on public.pantry_transactions(user_id, created_at desc);
create index if not exists idx_pantry_transactions_item
  on public.pantry_transactions(pantry_item_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Grocery lists
-- ---------------------------------------------------------------------------
create table if not exists public.grocery_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  week_start_date date,
  source text not null default 'meal_builder',
  budget_limit numeric,
  total_estimated_cost numeric,
  status text not null default 'draft',
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.grocery_lists
  drop constraint if exists grocery_lists_status_check;
alter table public.grocery_lists
  add constraint grocery_lists_status_check
  check (status in ('draft', 'active', 'completed', 'archived'));

create index if not exists idx_grocery_lists_user_week
  on public.grocery_lists(user_id, week_start_date desc);

create table if not exists public.grocery_list_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.grocery_lists(id) on delete cascade,
  item_name text not null,
  food_item_id uuid references public.food_items(id) on delete set null,
  required_quantity numeric not null default 0,
  on_hand_quantity numeric not null default 0,
  to_buy_quantity numeric not null default 0,
  quantity_unit text not null default 'g',
  estimated_unit_cost numeric,
  estimated_total_cost numeric,
  substitution_suggestions_json jsonb not null default '[]'::jsonb,
  leftovers_json jsonb not null default '{}'::jsonb,
  priority integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_grocery_list_items_list_priority
  on public.grocery_list_items(list_id, priority desc, item_name);

-- ---------------------------------------------------------------------------
-- AI usage counters
-- ---------------------------------------------------------------------------
alter table public.ai_usage_daily
  add column if not exists recipe_url_imports integer not null default 0,
  add column if not exists menu_scans integer not null default 0,
  add column if not exists meal_builder_runs integer not null default 0;

create or replace function public.increment_ai_usage(
  p_user_id uuid,
  p_usage_type text
)
returns public.ai_usage_daily as $$
declare
  v_result public.ai_usage_daily;
begin
  insert into public.ai_usage_daily (
    user_id,
    usage_date,
    coach_messages,
    plan_regenerations,
    food_photo_scans,
    recipe_url_imports,
    menu_scans,
    meal_builder_runs
  )
  values (
    p_user_id,
    current_date,
    case when p_usage_type = 'coach_messages' then 1 else 0 end,
    case when p_usage_type = 'plan_regenerations' then 1 else 0 end,
    case when p_usage_type = 'food_photo_scans' then 1 else 0 end,
    case when p_usage_type = 'recipe_url_imports' then 1 else 0 end,
    case when p_usage_type = 'menu_scans' then 1 else 0 end,
    case when p_usage_type = 'meal_builder_runs' then 1 else 0 end
  )
  on conflict (user_id, usage_date) do update set
    coach_messages = case
      when p_usage_type = 'coach_messages' then ai_usage_daily.coach_messages + 1
      else ai_usage_daily.coach_messages
    end,
    plan_regenerations = case
      when p_usage_type = 'plan_regenerations' then ai_usage_daily.plan_regenerations + 1
      else ai_usage_daily.plan_regenerations
    end,
    food_photo_scans = case
      when p_usage_type = 'food_photo_scans' then ai_usage_daily.food_photo_scans + 1
      else ai_usage_daily.food_photo_scans
    end,
    recipe_url_imports = case
      when p_usage_type = 'recipe_url_imports' then ai_usage_daily.recipe_url_imports + 1
      else ai_usage_daily.recipe_url_imports
    end,
    menu_scans = case
      when p_usage_type = 'menu_scans' then ai_usage_daily.menu_scans + 1
      else ai_usage_daily.menu_scans
    end,
    meal_builder_runs = case
      when p_usage_type = 'meal_builder_runs' then ai_usage_daily.meal_builder_runs + 1
      else ai_usage_daily.meal_builder_runs
    end,
    updated_at = now()
  returning * into v_result;

  return v_result;
end;
$$ language plpgsql security definer;

create or replace function public.check_ai_quota(
  p_user_id uuid,
  p_usage_type text,
  p_is_elite boolean default false
)
returns boolean as $$
declare
  v_usage public.ai_usage_daily;
  v_limit integer;
begin
  select * into v_usage
  from public.ai_usage_daily
  where user_id = p_user_id and usage_date = current_date;

  if p_is_elite then
    v_limit := 999999;
  else
    case p_usage_type
      when 'coach_messages' then v_limit := 10;
      when 'plan_regenerations' then v_limit := 1;
      when 'food_photo_scans' then v_limit := 3;
      when 'recipe_url_imports' then v_limit := 0;
      when 'menu_scans' then v_limit := 0;
      when 'meal_builder_runs' then v_limit := 0;
      else v_limit := 0;
    end case;
  end if;

  if v_usage is null then
    return true;
  end if;

  case p_usage_type
    when 'coach_messages' then return v_usage.coach_messages < v_limit;
    when 'plan_regenerations' then return v_usage.plan_regenerations < v_limit;
    when 'food_photo_scans' then return v_usage.food_photo_scans < v_limit;
    when 'recipe_url_imports' then return v_usage.recipe_url_imports < v_limit;
    when 'menu_scans' then return v_usage.menu_scans < v_limit;
    when 'meal_builder_runs' then return v_usage.meal_builder_runs < v_limit;
    else return false;
  end case;
end;
$$ language plpgsql security definer;

create or replace function public.get_ai_usage_summary(p_user_id uuid)
returns table (
  usage_type text,
  used integer,
  limit_free integer,
  remaining integer
) as $$
begin
  return query
  with current_usage as (
    select
      coalesce(coach_messages, 0) as coach_messages,
      coalesce(plan_regenerations, 0) as plan_regenerations,
      coalesce(food_photo_scans, 0) as food_photo_scans,
      coalesce(recipe_url_imports, 0) as recipe_url_imports,
      coalesce(menu_scans, 0) as menu_scans,
      coalesce(meal_builder_runs, 0) as meal_builder_runs
    from public.ai_usage_daily
    where user_id = p_user_id and usage_date = current_date
  ),
  defaults as (
    select
      0 as coach_messages,
      0 as plan_regenerations,
      0 as food_photo_scans,
      0 as recipe_url_imports,
      0 as menu_scans,
      0 as meal_builder_runs
  )
  select 'coach_messages'::text, coalesce(cu.coach_messages, 0), 10, greatest(0, 10 - coalesce(cu.coach_messages, 0))
  from defaults d left join current_usage cu on true
  union all
  select 'plan_regenerations'::text, coalesce(cu.plan_regenerations, 0), 1, greatest(0, 1 - coalesce(cu.plan_regenerations, 0))
  from defaults d left join current_usage cu on true
  union all
  select 'food_photo_scans'::text, coalesce(cu.food_photo_scans, 0), 3, greatest(0, 3 - coalesce(cu.food_photo_scans, 0))
  from defaults d left join current_usage cu on true
  union all
  select 'recipe_url_imports'::text, coalesce(cu.recipe_url_imports, 0), 0, greatest(0, 0 - coalesce(cu.recipe_url_imports, 0))
  from defaults d left join current_usage cu on true
  union all
  select 'menu_scans'::text, coalesce(cu.menu_scans, 0), 0, greatest(0, 0 - coalesce(cu.menu_scans, 0))
  from defaults d left join current_usage cu on true
  union all
  select 'meal_builder_runs'::text, coalesce(cu.meal_builder_runs, 0), 0, greatest(0, 0 - coalesce(cu.meal_builder_runs, 0))
  from defaults d left join current_usage cu on true;
end;
$$ language plpgsql security definer;

-- ---------------------------------------------------------------------------
-- RLS + policies
-- ---------------------------------------------------------------------------
alter table public.recipe_import_events enable row level security;
alter table public.menu_scan_sessions enable row level security;
alter table public.pantry_items enable row level security;
alter table public.pantry_transactions enable row level security;
alter table public.grocery_lists enable row level security;
alter table public.grocery_list_items enable row level security;

drop policy if exists "Users can manage own recipe import events" on public.recipe_import_events;
create policy "Users can manage own recipe import events" on public.recipe_import_events
for all using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can manage own menu scan sessions" on public.menu_scan_sessions;
create policy "Users can manage own menu scan sessions" on public.menu_scan_sessions
for all using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can manage own pantry items" on public.pantry_items;
create policy "Users can manage own pantry items" on public.pantry_items
for all using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can manage own pantry transactions" on public.pantry_transactions;
create policy "Users can manage own pantry transactions" on public.pantry_transactions
for all using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can manage own grocery lists" on public.grocery_lists;
create policy "Users can manage own grocery lists" on public.grocery_lists
for all using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can manage own grocery list items" on public.grocery_list_items;
create policy "Users can manage own grocery list items" on public.grocery_list_items
for all using (
  exists (
    select 1
    from public.grocery_lists gl
    where gl.id = grocery_list_items.list_id
      and gl.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.grocery_lists gl
    where gl.id = grocery_list_items.list_id
      and gl.user_id = auth.uid()
  )
);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_recipe_import_events_updated_at on public.recipe_import_events;
create trigger trg_recipe_import_events_updated_at
before update on public.recipe_import_events
for each row execute function public.set_updated_at_timestamp();

drop trigger if exists trg_menu_scan_sessions_updated_at on public.menu_scan_sessions;
create trigger trg_menu_scan_sessions_updated_at
before update on public.menu_scan_sessions
for each row execute function public.set_updated_at_timestamp();

drop trigger if exists trg_pantry_items_updated_at on public.pantry_items;
create trigger trg_pantry_items_updated_at
before update on public.pantry_items
for each row execute function public.set_updated_at_timestamp();

drop trigger if exists trg_grocery_lists_updated_at on public.grocery_lists;
create trigger trg_grocery_lists_updated_at
before update on public.grocery_lists
for each row execute function public.set_updated_at_timestamp();

drop trigger if exists trg_grocery_list_items_updated_at on public.grocery_list_items;
create trigger trg_grocery_list_items_updated_at
before update on public.grocery_list_items
for each row execute function public.set_updated_at_timestamp();
