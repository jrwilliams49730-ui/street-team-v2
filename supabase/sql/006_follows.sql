-- Street Team V2: follows for performers, producers, and venues

create table public.follows (
  id uuid primary key default gen_random_uuid(),
  follower_user_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('performer', 'producer', 'venue')),
  target_id uuid not null,
  created_at timestamptz not null default now(),

  constraint follows_one_target_per_user unique (
    follower_user_id,
    target_type,
    target_id
  )
);

alter table public.follows enable row level security;

create policy "Public can view follows"
on public.follows
for select
to anon, authenticated
using (true);

create policy "Users can create their own follows"
on public.follows
for insert
to authenticated
with check ((select auth.uid()) = follower_user_id);

create policy "Users can delete their own follows"
on public.follows
for delete
to authenticated
using ((select auth.uid()) = follower_user_id);
