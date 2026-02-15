-- Repair migration for competitive features where 012 could fail due invalid FK target.
-- This migration is idempotent and safe to run in environments with partial 012 execution.

create table if not exists public.recipes (
    id uuid default gen_random_uuid() primary key,
    user_id uuid not null references auth.users(id) on delete cascade,
    name text not null,
    description text,
    instructions text,
    serving_size integer default 1,
    prep_time_minutes integer,
    cook_time_minutes integer,
    is_public boolean default false,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);
-- If table already existed with incorrect FK, repair it.
do $$
begin
  if exists (
    select 1
    from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'recipes'
      and constraint_type = 'FOREIGN KEY'
      and constraint_name = 'recipes_user_id_fkey'
  ) then
    alter table public.recipes drop constraint recipes_user_id_fkey;
  end if;

  alter table public.recipes
    add constraint recipes_user_id_fkey
    foreign key (user_id) references auth.users(id) on delete cascade;
exception
  when duplicate_object then
    null;
end $$;
create table if not exists public.recipe_ingredients (
    id uuid default gen_random_uuid() primary key,
    recipe_id uuid references public.recipes(id) on delete cascade not null,
    food_item_id uuid references public.food_items(id) not null,
    quantity_grams numeric not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
create index if not exists idx_recipes_user_id on public.recipes(user_id);
create index if not exists idx_recipe_ingredients_recipe_id on public.recipe_ingredients(recipe_id);
-- Ensure the measurements additions are present even if 012 never completed.
alter table public.user_measurements
    add column if not exists waist_cm numeric,
    add column if not exists chest_cm numeric,
    add column if not exists arms_cm numeric,
    add column if not exists thighs_cm numeric,
    add column if not exists hips_cm numeric;
alter table public.recipes enable row level security;
alter table public.recipe_ingredients enable row level security;
drop policy if exists "Users can view their own recipes" on public.recipes;
create policy "Users can view their own recipes" on public.recipes
for select using (auth.uid() = user_id);
drop policy if exists "Users can insert their own recipes" on public.recipes;
create policy "Users can insert their own recipes" on public.recipes
for insert with check (auth.uid() = user_id);
drop policy if exists "Users can update their own recipes" on public.recipes;
create policy "Users can update their own recipes" on public.recipes
for update using (auth.uid() = user_id);
drop policy if exists "Users can delete their own recipes" on public.recipes;
create policy "Users can delete their own recipes" on public.recipes
for delete using (auth.uid() = user_id);
drop policy if exists "Users can view ingredients of their recipes" on public.recipe_ingredients;
create policy "Users can view ingredients of their recipes" on public.recipe_ingredients
for select using (
  exists (
    select 1
    from public.recipes
    where recipes.id = recipe_ingredients.recipe_id
      and recipes.user_id = auth.uid()
  )
);
drop policy if exists "Users can insert ingredients to their recipes" on public.recipe_ingredients;
create policy "Users can insert ingredients to their recipes" on public.recipe_ingredients
for insert with check (
  exists (
    select 1
    from public.recipes
    where recipes.id = recipe_ingredients.recipe_id
      and recipes.user_id = auth.uid()
  )
);
drop policy if exists "Users can delete ingredients from their recipes" on public.recipe_ingredients;
create policy "Users can delete ingredients from their recipes" on public.recipe_ingredients
for delete using (
  exists (
    select 1
    from public.recipes
    where recipes.id = recipe_ingredients.recipe_id
      and recipes.user_id = auth.uid()
  )
);
