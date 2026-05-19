-- Street Team V2: venue profiles

create table public.venues (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  slug text not null unique,
  venue_type text not null,
  city text,
  state text,
  description text,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger venues_set_updated_at
before update on public.venues
for each row
execute function public.handle_updated_at();

alter table public.venues enable row level security;

create policy "Public can view venues"
on public.venues
for select
to anon, authenticated
using (true);

create policy "Users can create their own venues"
on public.venues
for insert
to authenticated
with check ((select auth.uid()) = owner_user_id);

create policy "Users can update their own venues"
on public.venues
for update
to authenticated
using ((select auth.uid()) = owner_user_id)
with check ((select auth.uid()) = owner_user_id);

create policy "Users can delete their own venues"
on public.venues
for delete
to authenticated
using ((select auth.uid()) = owner_user_id);
