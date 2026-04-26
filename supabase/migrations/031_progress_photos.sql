-- Progress photo timeline backend:
-- - metadata table tied to user + optional measurement linkage
-- - private storage bucket for physique photos
-- - RLS + storage object policies scoped to owner folder

create table if not exists public.progress_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  measurement_id uuid references public.user_measurements(id) on delete set null,
  angle text not null check (angle in ('front', 'side', 'back', 'custom')),
  storage_path text not null unique,
  captured_at timestamptz not null default now(),
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_progress_photos_user_captured
  on public.progress_photos(user_id, captured_at desc);

create index if not exists idx_progress_photos_measurement
  on public.progress_photos(measurement_id, created_at desc);

alter table public.progress_photos enable row level security;

drop policy if exists "Users can manage own progress photos" on public.progress_photos;
create policy "Users can manage own progress photos"
  on public.progress_photos
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop trigger if exists trg_progress_photos_updated_at on public.progress_photos;
create trigger trg_progress_photos_updated_at
before update on public.progress_photos
for each row execute function public.set_updated_at_timestamp();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'progress-photos',
  'progress-photos',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Progress photos read own objects" on storage.objects;
create policy "Progress photos read own objects"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'progress-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Progress photos upload own objects" on storage.objects;
create policy "Progress photos upload own objects"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'progress-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Progress photos update own objects" on storage.objects;
create policy "Progress photos update own objects"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'progress-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'progress-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Progress photos delete own objects" on storage.objects;
create policy "Progress photos delete own objects"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'progress-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

