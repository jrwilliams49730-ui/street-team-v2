-- Street Team V2: performer appearances / tour dates

create table public.performer_appearances (
  id uuid primary key default gen_random_uuid(),
  performer_id uuid not null references public.performers(id) on delete cascade,
  owner_user_id uuid not null references public.profiles(id) on delete cascade,

  title text,
  venue_name text not null,
  venue_city text,
  venue_state text,

  appearance_date date not null,
  appearance_time time,

  ticket_url text,
  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger performer_appearances_set_updated_at
before update on public.performer_appearances
for each row
execute function public.handle_updated_at();

alter table public.performer_appearances enable row level security;

create policy "Public can view performer appearances"
on public.performer_appearances
for select
to anon, authenticated
using (true);

create policy "Performers can create their own appearances"
on public.performer_appearances
for insert
to authenticated
with check (
  (select auth.uid()) = owner_user_id
  and exists (
    select 1
    from public.performers
    where performers.id = performer_appearances.performer_id
      and performers.owner_user_id = (select auth.uid())
  )
);

create policy "Performers can update their own appearances"
on public.performer_appearances
for update
to authenticated
using (
  (select auth.uid()) = owner_user_id
  and exists (
    select 1
    from public.performers
    where performers.id = performer_appearances.performer_id
      and performers.owner_user_id = (select auth.uid())
  )
)
with check (
  (select auth.uid()) = owner_user_id
  and exists (
    select 1
    from public.performers
    where performers.id = performer_appearances.performer_id
      and performers.owner_user_id = (select auth.uid())
  )
);

create policy "Performers can delete their own appearances"
on public.performer_appearances
for delete
to authenticated
using (
  (select auth.uid()) = owner_user_id
  and exists (
    select 1
    from public.performers
    where performers.id = performer_appearances.performer_id
      and performers.owner_user_id = (select auth.uid())
  )
);
