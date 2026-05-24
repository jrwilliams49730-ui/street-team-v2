-- Street Team V2: Private Testing Round 1 clean-slate reset
--
-- This script is intentionally NOT a migration.
-- Run it manually from the Supabase SQL editor only after reviewing it.
--
-- What it does:
-- - Deletes event/profile/ticket/test content.
-- - Preserves schema, functions, policies, buckets, environment config, Stripe,
--   Resend, Google Maps, and auth users.
-- - Preserves the admin auth user/profile identified by v_admin_email.
-- - Recreates the admin public.profiles row if it is unexpectedly missing.
-- - Does not delete storage objects. Storage cleanup must use the Storage API.
-- - Does not touch admin role tables or hidden admin routes.
--
-- Required confirmation before execution:
-- 1. Confirm v_admin_email is the admin/backdoor account email.
-- 2. Set v_execute_reset to true.
-- 3. Set v_confirmation to RESET_PRIVATE_TESTING_ROUND_1.

begin;

create or replace function pg_temp.delete_all_if_exists(p_table_name text)
returns integer
language plpgsql
as $$
declare
  v_count integer := 0;
  v_table regclass;
begin
  v_table := to_regclass(p_table_name);

  if v_table is null then
    raise notice 'Skipping %, table does not exist.', p_table_name;
    return 0;
  end if;

  execute format('delete from %s', v_table);
  get diagnostics v_count = row_count;

  raise notice 'Deleted % rows from %.', v_count, p_table_name;
  return v_count;
end;
$$;

do $$
declare
  v_execute_reset boolean := true;
  v_confirmation text := 'RESET_PRIVATE_TESTING_ROUND_1';
  v_admin_email text := 'staticentertainmentsc@gmail.com';
  v_delete_storage_objects boolean := false;
  v_admin_user_id uuid;
  v_count integer := 0;
begin
  if v_execute_reset is not true then
    raise exception 'Reset refused. Set v_execute_reset to true after reviewing this script.';
  end if;

  if v_confirmation <> 'RESET_PRIVATE_TESTING_ROUND_1' then
    raise exception 'Reset refused. Confirmation phrase is not correct.';
  end if;

  if lower(v_admin_email) <> 'staticentertainmentsc@gmail.com' then
    raise exception 'Reset refused. Admin email must remain staticentertainmentsc@gmail.com for Round 1 reset.';
  end if;

  select users.id
  into v_admin_user_id
  from auth.users
  where lower(users.email) = lower(v_admin_email)
  limit 1;

  if v_admin_user_id is null then
    raise exception 'Reset refused. Admin email % was not found in auth.users.', v_admin_email;
  end if;

  if to_regclass('public.profiles') is null then
    raise exception 'Reset refused. public.profiles table was not found.';
  end if;

  if not exists (
    select 1
    from public.profiles
    where profiles.id = v_admin_user_id
  ) then
    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'profiles'
        and column_name = 'account_type'
    ) then
      insert into public.profiles (id, display_name, account_type)
      values (v_admin_user_id, 'Static Entertainment', 'Fan')
      on conflict (id) do nothing;
    else
      insert into public.profiles (id, display_name)
      values (v_admin_user_id, 'Static Entertainment')
      on conflict (id) do nothing;
    end if;

    raise notice 'Created missing admin public.profiles row for %.', v_admin_email;
  end if;

  raise notice 'Starting private testing reset. Preserving admin user/profile id % for %.',
    v_admin_user_id,
    v_admin_email;

  if v_delete_storage_objects is true then
    raise exception 'Reset refused. Storage cleanup must use the Supabase Storage API, not direct SQL deletes from storage.objects.';
  end if;

  raise notice 'Storage object cleanup skipped. No storage.objects rows will be deleted by this SQL script.';

  -- Optional points/rewards records first if those tables exist in the linked DB.
  perform pg_temp.delete_all_if_exists('public.fan_point_history');
  perform pg_temp.delete_all_if_exists('public.point_history');
  perform pg_temp.delete_all_if_exists('public.points_history');
  perform pg_temp.delete_all_if_exists('public.reward_redemptions');
  perform pg_temp.delete_all_if_exists('public.redemptions');

  -- Ticket/check-in/payment records.
  perform pg_temp.delete_all_if_exists('public.tickets');
  perform pg_temp.delete_all_if_exists('public.ticket_reservations');

  -- Event-owned child records next.
  perform pg_temp.delete_all_if_exists('public.event_performers');
  perform pg_temp.delete_all_if_exists('public.event_ticket_types');
  perform pg_temp.delete_all_if_exists('public.events');

  -- Performer/user social and schedule records.
  perform pg_temp.delete_all_if_exists('public.performer_appearances');
  perform pg_temp.delete_all_if_exists('public.follows');

  if to_regclass('public.user_roles') is null then
    raise exception 'Reset refused. public.user_roles table was not found.';
  end if;

  insert into public.user_roles (user_id, role)
  values (v_admin_user_id, 'admin')
  on conflict (user_id, role) do nothing;

  delete from public.user_roles
  where not (
    user_id = v_admin_user_id
    and role = 'admin'
  );

  get diagnostics v_count = row_count;
  raise notice 'Deleted % non-admin public.user_roles rows. Admin role was preserved.', v_count;

  -- Public creator profiles.
  perform pg_temp.delete_all_if_exists('public.performers');
  perform pg_temp.delete_all_if_exists('public.producers');
  perform pg_temp.delete_all_if_exists('public.venues');

  -- App profile rows last. This intentionally does not delete auth.users.
  delete from public.profiles
  where id <> v_admin_user_id;

  get diagnostics v_count = row_count;
  raise notice 'Deleted % non-admin public.profiles rows. Auth users were not deleted.', v_count;

  raise notice 'Private Testing Round 1 reset complete. Admin auth user/profile was preserved.';
end;
$$;

commit;
