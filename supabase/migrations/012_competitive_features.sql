-- Create recipes table
create table public.recipes (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references public.users(id) not null,
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
-- Create recipe_ingredients table
create table public.recipe_ingredients (
    id uuid default gen_random_uuid() primary key,
    recipe_id uuid references public.recipes(id) on delete cascade not null,
    food_item_id uuid references public.food_items(id) not null,
    quantity_grams numeric not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
-- Add measurements to user_measurements
alter table public.user_measurements
add column if not exists waist_cm numeric,
    add column if not exists chest_cm numeric,
    add column if not exists arms_cm numeric,
    add column if not exists thighs_cm numeric,
    add column if not exists hips_cm numeric;
-- RLS Policies
alter table public.recipes enable row level security;
alter table public.recipe_ingredients enable row level security;
create policy "Users can view their own recipes" on public.recipes for
select using (auth.uid() = user_id);
create policy "Users can insert their own recipes" on public.recipes for
insert with check (auth.uid() = user_id);
create policy "Users can update their own recipes" on public.recipes for
update using (auth.uid() = user_id);
create policy "Users can delete their own recipes" on public.recipes for delete using (auth.uid() = user_id);
create policy "Users can view ingredients of their recipes" on public.recipe_ingredients for
select using (
        exists (
            select 1
            from public.recipes
            where recipes.id = recipe_ingredients.recipe_id
                and recipes.user_id = auth.uid()
        )
    );
create policy "Users can insert ingredients to their recipes" on public.recipe_ingredients for
insert with check (
        exists (
            select 1
            from public.recipes
            where recipes.id = recipe_ingredients.recipe_id
                and recipes.user_id = auth.uid()
        )
    );
create policy "Users can delete ingredients from their recipes" on public.recipe_ingredients for delete using (
    exists (
        select 1
        from public.recipes
        where recipes.id = recipe_ingredients.recipe_id
            and recipes.user_id = auth.uid()
    )
);