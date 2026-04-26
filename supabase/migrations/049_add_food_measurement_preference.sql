-- Add food_measurement preference to display_preferences
-- Default: imperial users get imperial_mixed (oz for protein), metric users get metric (grams)

alter table public.profiles
  add column if not exists _food_measurement_backfill_done boolean default false;

update public.profiles
set display_preferences = jsonb_set(
  coalesce(display_preferences, '{}'::jsonb),
  '{food_measurement}',
  case
    when unit_system = 'imperial' then '"imperial_mixed"'::jsonb
    else '"metric"'::jsonb
  end,
  true
),
_food_measurement_backfill_done = true
where coalesce(_food_measurement_backfill_done, false) = false;

-- Future code can rely on display_preferences->>food_measurement being non-null.
-- The _food_measurement_backfill_done column can be dropped in a later cleanup migration.
