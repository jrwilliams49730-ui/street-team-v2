-- Street Team V2: hidden admin role support

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null,
  created_at timestamptz not null default now(),

  constraint user_roles_role_check
    check (role in ('admin')),
  constraint user_roles_user_id_role_key
    unique (user_id, role)
);

create index if not exists user_roles_user_id_idx
on public.user_roles (user_id);

create index if not exists user_roles_role_idx
on public.user_roles (role);

alter table public.user_roles enable row level security;

create or replace function public.current_user_has_role(
  p_role text
)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.user_roles
    where user_roles.user_id = auth.uid()
      and user_roles.role = lower(trim(coalesce(p_role, '')))
  );
$$;

grant execute on function public.current_user_has_role(text)
to authenticated;

drop policy if exists "Users can view their own roles"
on public.user_roles;

create policy "Users can view their own roles"
on public.user_roles
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Admins can view all roles"
on public.user_roles;

create policy "Admins can view all roles"
on public.user_roles
for select
to authenticated
using (public.current_user_has_role('admin'));

create or replace function public.get_admin_dashboard_counts()
returns table (
  metric text,
  value bigint
)
language plpgsql
security definer
set search_path = public, auth
stable
as $$
declare
  v_table_name text;
  v_table regclass;
begin
  if not public.current_user_has_role('admin') then
    raise exception 'Admin access required.';
  end if;

  foreach v_table_name in array array[
    'auth.users',
    'public.profiles',
    'public.performers',
    'public.producers',
    'public.venues',
    'public.events',
    'public.event_ticket_types',
    'public.ticket_reservations',
    'public.tickets',
    'public.follows',
    'public.performer_appearances',
    'public.event_performers'
  ] loop
    v_table := to_regclass(v_table_name);

    if v_table is not null then
      metric := v_table_name;
      execute format('select count(*)::bigint from %s', v_table)
      into value;
      return next;
    end if;
  end loop;
end;
$$;

grant execute on function public.get_admin_dashboard_counts()
to authenticated;
