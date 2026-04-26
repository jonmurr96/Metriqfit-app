alter table public.user_nutrition_plans
  add column if not exists lifecycle_state text not null default 'live',
  add column if not exists replaces_plan_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_nutrition_plans_lifecycle_state_check'
  ) then
    alter table public.user_nutrition_plans
      add constraint user_nutrition_plans_lifecycle_state_check
      check (lifecycle_state in ('live', 'archived', 'preview'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_nutrition_plans_replaces_plan_id_fkey'
  ) then
    alter table public.user_nutrition_plans
      add constraint user_nutrition_plans_replaces_plan_id_fkey
      foreign key (replaces_plan_id)
      references public.user_nutrition_plans(id)
      on delete set null;
  end if;
end $$;

update public.user_nutrition_plans
set lifecycle_state = case
  when is_active then 'live'
  else 'archived'
end
where lifecycle_state is null
   or lifecycle_state not in ('live', 'archived', 'preview');

create index if not exists idx_user_nutrition_plans_lifecycle_state
  on public.user_nutrition_plans(user_id, lifecycle_state);

create index if not exists idx_user_nutrition_plans_replaces_plan_id
  on public.user_nutrition_plans(replaces_plan_id);

create or replace function public.apply_nutrition_plan_preview(preview_plan_id uuid)
returns uuid as $$
declare
  v_preview public.user_nutrition_plans;
begin
  select *
  into v_preview
  from public.user_nutrition_plans
  where id = preview_plan_id
    and user_id = auth.uid();

  if not found then
    raise exception 'Nutrition preview not found';
  end if;

  if v_preview.lifecycle_state <> 'preview' then
    raise exception 'Selected nutrition plan is not a preview';
  end if;

  update public.user_nutrition_plans
  set
    is_active = false,
    lifecycle_state = 'archived',
    updated_at = now()
  where user_id = auth.uid()
    and is_active = true
    and id <> preview_plan_id;

  update public.user_nutrition_plans
  set
    is_active = true,
    lifecycle_state = 'live',
    replaces_plan_id = null,
    name = case
      when left(name, 10) = 'Preview · '
        then substr(name, 11)
      else name
    end,
    updated_at = now()
  where id = preview_plan_id
    and user_id = auth.uid();

  return preview_plan_id;
end;
$$ language plpgsql security definer;

create or replace function public.discard_nutrition_plan_preview(preview_plan_id uuid)
returns boolean as $$
declare
  v_preview public.user_nutrition_plans;
begin
  select *
  into v_preview
  from public.user_nutrition_plans
  where id = preview_plan_id
    and user_id = auth.uid();

  if not found then
    raise exception 'Nutrition preview not found';
  end if;

  if v_preview.lifecycle_state <> 'preview' then
    raise exception 'Selected nutrition plan is not a preview';
  end if;

  delete from public.user_nutrition_plans
  where id = preview_plan_id
    and user_id = auth.uid();

  return true;
end;
$$ language plpgsql security definer;

grant execute on function public.apply_nutrition_plan_preview(uuid) to authenticated;
grant execute on function public.apply_nutrition_plan_preview(uuid) to service_role;
grant execute on function public.discard_nutrition_plan_preview(uuid) to authenticated;
grant execute on function public.discard_nutrition_plan_preview(uuid) to service_role;
