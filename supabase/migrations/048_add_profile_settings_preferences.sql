alter table public.profiles
  add column if not exists notification_preferences jsonb not null default jsonb_build_object(
    'workoutReminders', false,
    'mealReminders', false,
    'waterReminders', false,
    'weeklySummary', true
  ),
  add column if not exists display_preferences jsonb not null default jsonb_build_object(
    'reduceMotion', false,
    'highContrast', false,
    'preferredAppearanceLabel', 'MetriqFit Dark'
  );

update public.profiles
set
  notification_preferences = coalesce(
    notification_preferences,
    jsonb_build_object(
      'workoutReminders', false,
      'mealReminders', false,
      'waterReminders', false,
      'weeklySummary', true
    )
  ),
  display_preferences = coalesce(
    display_preferences,
    jsonb_build_object(
      'reduceMotion', false,
      'highContrast', false,
      'preferredAppearanceLabel', 'MetriqFit Dark'
    )
  );
