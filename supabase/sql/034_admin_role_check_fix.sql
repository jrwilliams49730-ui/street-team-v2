-- Street Team V2: harden admin role checks for hidden admin panel

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

revoke all on public.user_roles from anon, authenticated;
grant select on public.user_roles to authenticated;

create or replace function public.is_admin_user()
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
      and user_roles.role = 'admin'
  );
$$;

grant execute on function public.is_admin_user()
to authenticated;

create or replace function public.current_user_has_role(
  p_role text
)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select case
    when lower(trim(coalesce(p_role, ''))) = 'admin'
      then public.is_admin_user()
    else false
  end;
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
using (public.is_admin_user());
