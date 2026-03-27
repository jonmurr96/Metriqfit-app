alter table public.user_xp_levels
  drop constraint if exists user_xp_levels_user_id_fkey;

alter table public.user_xp_levels
  add constraint user_xp_levels_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;

alter table public.user_xp_events
  drop constraint if exists user_xp_events_user_id_fkey;

alter table public.user_xp_events
  add constraint user_xp_events_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;

alter table public.user_streaks
  drop constraint if exists user_streaks_user_id_fkey;

alter table public.user_streaks
  add constraint user_streaks_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;

alter table public.user_streak_freezes
  drop constraint if exists user_streak_freezes_user_id_fkey;

alter table public.user_streak_freezes
  add constraint user_streak_freezes_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;

alter table public.user_achievements
  drop constraint if exists user_achievements_user_id_fkey;

alter table public.user_achievements
  add constraint user_achievements_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;
