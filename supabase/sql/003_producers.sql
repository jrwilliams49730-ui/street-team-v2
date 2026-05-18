-- Street Team V2: producer profiles

create table public.producers (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  slug text not null unique,
  producer_type text not null,
  city text,
  state text,
  bio text,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger producers_set_updated_at
before update on public.producers
for each row
execute function public.handle_updated_at();

alter table public.producers enable row level security;

create policy "Public can view producers"
on public.producers
for select
to anon, authenticated
using (true);

create policy "Users can create their own producers"
on public.producers
for insert
to authenticated
with check ((select auth.uid()) = owner_user_id);

create policy "Users can update their own producers"
on public.producers
for update
to authenticated
using ((select auth.uid()) = owner_user_id)
with check ((select auth.uid()) = owner_user_id);

create policy "Users can delete their own producers"
on public.producers
for delete
to authenticated
using ((select auth.uid()) = owner_user_id);
