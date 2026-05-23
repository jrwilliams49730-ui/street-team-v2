-- Street Team V2: practical hidden admin panel tools

create or replace function public.admin_get_panel_data()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_overview jsonb;
  v_users jsonb;
  v_events jsonb;
  v_reservations jsonb;
  v_check_ins jsonb;
  v_platform_analytics jsonb;
begin
  if not public.current_user_has_role('admin') then
    raise exception 'Admin access required.' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'totalUsers', (select count(*) from auth.users),
    'fans', (
      select count(*)
      from public.profiles
      where account_type = 'Fan'
    ),
    'performers', (
      select count(*)
      from public.profiles
      where account_type = 'Performer'
    ),
    'producers', (
      select count(*)
      from public.profiles
      where account_type = 'Producer'
    ),
    'venues', (
      select count(*)
      from public.profiles
      where account_type = 'Venue'
    ),
    'events', (select count(*) from public.events),
    'paidEvents', (
      select count(distinct event_ticket_types.event_id)
      from public.event_ticket_types
      where event_ticket_types.ticket_kind = 'paid'
    ),
    'freeEvents', (
      select count(*)
      from public.events
      where exists (
        select 1
        from public.event_ticket_types
        where event_ticket_types.event_id = events.id
          and event_ticket_types.ticket_kind = 'free'
      )
      and not exists (
        select 1
        from public.event_ticket_types
        where event_ticket_types.event_id = events.id
          and event_ticket_types.ticket_kind = 'paid'
      )
    ),
    'ticketReservations', (
      select count(*)
      from public.ticket_reservations
    ),
    'checkedInTickets', (
      select count(*)
      from public.tickets
      where ticket_status = 'checked_in'
    )
  )
  into v_overview;

  select coalesce(jsonb_agg(row_payload order by sort_created_at desc), '[]'::jsonb)
  into v_users
  from (
    select
      users.created_at as sort_created_at,
      jsonb_build_object(
        'id', users.id,
        'email', users.email,
        'displayName', profiles.display_name,
        'accountType', profiles.account_type,
        'createdAt', users.created_at,
        'roles', coalesce(roles.role_list, ''),
        'isAdmin', coalesce(roles.is_admin, false),
        'hasProfile', profiles.id is not null
      ) as row_payload
    from auth.users
    left join public.profiles
      on profiles.id = users.id
    left join lateral (
      select
        string_agg(user_roles.role, ', ' order by user_roles.role) as role_list,
        bool_or(user_roles.role = 'admin') as is_admin
      from public.user_roles
      where user_roles.user_id = users.id
    ) as roles on true
    order by users.created_at desc
    limit 200
  ) rows;

  select coalesce(jsonb_agg(row_payload order by sort_event_date desc nulls last, sort_created_at desc), '[]'::jsonb)
  into v_events
  from (
    select
      events.event_date as sort_event_date,
      events.created_at as sort_created_at,
      jsonb_build_object(
        'id', events.id,
        'title', events.title,
        'slug', events.slug,
        'publicPath', case
          when nullif(trim(coalesce(events.slug, '')), '') is null then null
          else '/events/' || events.slug
        end,
        'ownerEmail', owner_users.email,
        'ownerName', owner_profiles.display_name,
        'organizerType', events.organizer_type,
        'status', events.status,
        'ticketMode', case
          when exists (
            select 1
            from public.event_ticket_types
            where event_ticket_types.event_id = events.id
              and event_ticket_types.ticket_kind = 'paid'
          ) then 'paid'
          when exists (
            select 1
            from public.event_ticket_types
            where event_ticket_types.event_id = events.id
              and event_ticket_types.ticket_kind = 'free'
          ) then 'free'
          else 'unticketed'
        end,
        'eventDate', events.event_date,
        'startTime', events.start_time,
        'venueName', events.venue_name,
        'city', events.city,
        'state', events.state,
        'ticketCapacity', coalesce((
          select sum(event_ticket_types.quantity_total)
          from public.event_ticket_types
          where event_ticket_types.event_id = events.id
        ), 0),
        'ticketsSold', coalesce((
          select sum(ticket_reservations.quantity)
          from public.ticket_reservations
          where ticket_reservations.event_id = events.id
            and ticket_reservations.reservation_status = 'confirmed'
        ), 0),
        'checkedInTickets', coalesce((
          select count(*)
          from public.tickets
          where tickets.event_id = events.id
            and tickets.ticket_status = 'checked_in'
        ), 0),
        'createdAt', events.created_at
      ) as row_payload
    from public.events
    left join auth.users as owner_users
      on owner_users.id = events.owner_user_id
    left join public.profiles as owner_profiles
      on owner_profiles.id = events.owner_user_id
    order by events.event_date desc nulls last, events.created_at desc
    limit 200
  ) rows;

  select coalesce(jsonb_agg(row_payload order by sort_created_at desc), '[]'::jsonb)
  into v_reservations
  from (
    select
      ticket_reservations.created_at as sort_created_at,
      jsonb_build_object(
        'id', ticket_reservations.id,
        'eventId', ticket_reservations.event_id,
        'eventTitle', events.title,
        'ticketTypeName', event_ticket_types.name,
        'buyerName', ticket_reservations.buyer_name,
        'buyerEmail', ticket_reservations.buyer_email,
        'buyerType', case
          when ticket_reservations.purchaser_user_id is null then 'guest'
          else 'signed-in'
        end,
        'quantity', ticket_reservations.quantity,
        'reservationStatus', ticket_reservations.reservation_status,
        'ticketKind', ticket_reservations.ticket_kind_snapshot,
        'salesChannel', coalesce(ticket_reservations.sales_channel, 'online'),
        'isDoorSale', coalesce(ticket_reservations.sales_channel, 'online') = 'door',
        'totalPriceCents', ticket_reservations.total_price_cents_snapshot,
        'streetTeamFeeCents', ticket_reservations.street_team_fee_cents_snapshot,
        'ticketEmailSentAt', ticket_reservations.ticket_email_sent_at,
        'ticketEmailError', ticket_reservations.ticket_email_error,
        'ticketCount', coalesce(ticket_summary.ticket_count, 0),
        'checkedInCount', coalesce(ticket_summary.checked_in_count, 0),
        'createdAt', ticket_reservations.created_at
      ) as row_payload
    from public.ticket_reservations
    left join public.events
      on events.id = ticket_reservations.event_id
    left join public.event_ticket_types
      on event_ticket_types.id = ticket_reservations.ticket_type_id
    left join lateral (
      select
        count(*) as ticket_count,
        count(*) filter (where tickets.ticket_status = 'checked_in') as checked_in_count
      from public.tickets
      where tickets.reservation_id = ticket_reservations.id
    ) as ticket_summary on true
    order by ticket_reservations.created_at desc
    limit 250
  ) rows;

  select coalesce(jsonb_agg(row_payload order by sort_created_at desc), '[]'::jsonb)
  into v_check_ins
  from (
    select
      tickets.created_at as sort_created_at,
      jsonb_build_object(
        'ticketId', tickets.id,
        'reservationId', tickets.reservation_id,
        'eventId', tickets.event_id,
        'eventTitle', events.title,
        'ticketTypeName', event_ticket_types.name,
        'ticketNumber', tickets.ticket_number,
        'ticketStatus', tickets.ticket_status,
        'checkedInAt', tickets.checked_in_at,
        'buyerName', ticket_reservations.buyer_name,
        'buyerEmail', ticket_reservations.buyer_email,
        'salesChannel', coalesce(ticket_reservations.sales_channel, 'online'),
        'isDoorSale', coalesce(ticket_reservations.sales_channel, 'online') = 'door',
        'createdAt', tickets.created_at
      ) as row_payload
    from public.tickets
    left join public.ticket_reservations
      on ticket_reservations.id = tickets.reservation_id
    left join public.events
      on events.id = tickets.event_id
    left join public.event_ticket_types
      on event_ticket_types.id = tickets.ticket_type_id
    order by tickets.created_at desc
    limit 250
  ) rows;

  select jsonb_build_object(
    'totalTicketsSold', coalesce((
      select sum(quantity)
      from public.ticket_reservations
      where reservation_status = 'confirmed'
    ), 0),
    'grossTicketRevenueCents', coalesce((
      select sum(total_price_cents_snapshot)
      from public.ticket_reservations
      where reservation_status = 'confirmed'
        and ticket_kind_snapshot = 'paid'
    ), 0),
    'estimatedStreetTeamFeesCents', coalesce((
      select sum(street_team_fee_cents_snapshot)
      from public.ticket_reservations
      where reservation_status = 'confirmed'
    ), 0),
    'guestPurchases', coalesce((
      select count(*)
      from public.ticket_reservations
      where reservation_status = 'confirmed'
        and purchaser_user_id is null
    ), 0),
    'signedInFanPurchases', coalesce((
      select count(*)
      from public.ticket_reservations
      where reservation_status = 'confirmed'
        and purchaser_user_id is not null
    ), 0),
    'doorBoxOfficeSales', coalesce((
      select count(*)
      from public.ticket_reservations
      where reservation_status = 'confirmed'
        and sales_channel = 'door'
    ), 0),
    'totalCheckIns', coalesce((
      select count(*)
      from public.tickets
      where ticket_status = 'checked_in'
    ), 0)
  )
  into v_platform_analytics;

  return jsonb_build_object(
    'overview', v_overview,
    'users', v_users,
    'events', v_events,
    'reservations', v_reservations,
    'checkIns', v_check_ins,
    'platformAnalytics', v_platform_analytics
  );
end;
$$;

grant execute on function public.admin_get_panel_data()
to authenticated;

create or replace function public.admin_cancel_event(
  p_event_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.events%rowtype;
begin
  if not public.current_user_has_role('admin') then
    raise exception 'Admin access required.' using errcode = '42501';
  end if;

  if p_event_id is null then
    raise exception 'Event id is required.';
  end if;

  update public.events
  set
    status = 'cancelled',
    updated_at = now()
  where id = p_event_id
  returning * into v_event;

  if not found then
    raise exception 'Event not found.';
  end if;

  return jsonb_build_object(
    'eventId', v_event.id,
    'status', v_event.status
  );
end;
$$;

grant execute on function public.admin_cancel_event(uuid)
to authenticated;

create or replace function public.admin_delete_event(
  p_event_id uuid,
  p_confirmation text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_title text;
  v_deleted_count integer := 0;
begin
  if not public.current_user_has_role('admin') then
    raise exception 'Admin access required.' using errcode = '42501';
  end if;

  if p_confirmation <> 'DELETE EVENT' then
    raise exception 'Delete confirmation phrase is incorrect.';
  end if;

  select title
  into v_title
  from public.events
  where id = p_event_id;

  if not found then
    raise exception 'Event not found.';
  end if;

  delete from public.events
  where id = p_event_id;

  get diagnostics v_deleted_count = row_count;

  return jsonb_build_object(
    'eventId', p_event_id,
    'title', v_title,
    'deletedEvents', v_deleted_count
  );
end;
$$;

grant execute on function public.admin_delete_event(uuid, text)
to authenticated;

create or replace function public.admin_remove_user_app_profile(
  p_user_id uuid,
  p_confirmation text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_deleted_profiles integer := 0;
  v_deleted_roles integer := 0;
begin
  if not public.current_user_has_role('admin') then
    raise exception 'Admin access required.' using errcode = '42501';
  end if;

  if p_user_id is null then
    raise exception 'User id is required.';
  end if;

  if p_confirmation <> 'REMOVE TEST USER' then
    raise exception 'Remove-user confirmation phrase is incorrect.';
  end if;

  if exists (
    select 1
    from public.user_roles
    where user_id = p_user_id
      and role = 'admin'
  ) then
    raise exception 'Admin users cannot be removed from the admin panel.';
  end if;

  select email
  into v_email
  from auth.users
  where id = p_user_id;

  delete from public.user_roles
  where user_id = p_user_id
    and role <> 'admin';

  get diagnostics v_deleted_roles = row_count;

  delete from public.profiles
  where id = p_user_id;

  get diagnostics v_deleted_profiles = row_count;

  return jsonb_build_object(
    'userId', p_user_id,
    'email', v_email,
    'deletedProfiles', v_deleted_profiles,
    'deletedRoles', v_deleted_roles,
    'authUserPreserved', true
  );
end;
$$;

grant execute on function public.admin_remove_user_app_profile(uuid, text)
to authenticated;

create or replace function public.admin_clean_slate_reset(
  p_confirmation text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_user_ids uuid[];
  v_deleted jsonb := '{}'::jsonb;
  v_count integer := 0;
  v_table regclass;
begin
  if not public.current_user_has_role('admin') then
    raise exception 'Admin access required.' using errcode = '42501';
  end if;

  if p_confirmation <> 'RESET PRIVATE TESTING DATA' then
    raise exception 'Reset confirmation phrase is incorrect.';
  end if;

  select coalesce(array_agg(distinct user_id), array[auth.uid()]::uuid[])
  into v_admin_user_ids
  from public.user_roles
  where role = 'admin';

  if v_admin_user_ids is null or array_length(v_admin_user_ids, 1) is null then
    v_admin_user_ids := array[auth.uid()]::uuid[];
  end if;

  v_table := to_regclass('storage.objects');

  if v_table is not null then
    execute
      'delete from storage.objects as objects
       where objects.bucket_id in (''event-images'', ''performer-media'')
          or (
            objects.bucket_id = ''profile-images''
            and not exists (
              select 1
              from unnest($1::uuid[]) as preserved_admins(admin_user_id)
              where objects.name like preserved_admins.admin_user_id::text || ''/%''
            )
          )'
    using v_admin_user_ids;

    get diagnostics v_count = row_count;
    v_deleted := v_deleted || jsonb_build_object('storageObjects', v_count);
  else
    v_deleted := v_deleted || jsonb_build_object('storageObjects', 'storage.objects not found');
  end if;

  delete from public.tickets;
  get diagnostics v_count = row_count;
  v_deleted := v_deleted || jsonb_build_object('tickets', v_count);

  delete from public.ticket_reservations;
  get diagnostics v_count = row_count;
  v_deleted := v_deleted || jsonb_build_object('ticketReservations', v_count);

  v_table := to_regclass('public.event_performers');
  if v_table is not null then
    execute format('delete from %s', v_table);
    get diagnostics v_count = row_count;
    v_deleted := v_deleted || jsonb_build_object('eventPerformers', v_count);
  else
    v_deleted := v_deleted || jsonb_build_object('eventPerformers', 'table not found');
  end if;

  delete from public.event_ticket_types;
  get diagnostics v_count = row_count;
  v_deleted := v_deleted || jsonb_build_object('eventTicketTypes', v_count);

  delete from public.events;
  get diagnostics v_count = row_count;
  v_deleted := v_deleted || jsonb_build_object('events', v_count);

  delete from public.performer_appearances
  where not (owner_user_id = any(v_admin_user_ids));
  get diagnostics v_count = row_count;
  v_deleted := v_deleted || jsonb_build_object('performerAppearances', v_count);

  delete from public.follows
  where not (follower_user_id = any(v_admin_user_ids));
  get diagnostics v_count = row_count;
  v_deleted := v_deleted || jsonb_build_object('follows', v_count);

  v_table := to_regclass('public.fan_point_history');
  if v_table is not null then
    execute format('delete from %s', v_table);
    get diagnostics v_count = row_count;
    v_deleted := v_deleted || jsonb_build_object('fanPointHistory', v_count);
  end if;

  v_table := to_regclass('public.point_history');
  if v_table is not null then
    execute format('delete from %s', v_table);
    get diagnostics v_count = row_count;
    v_deleted := v_deleted || jsonb_build_object('pointHistory', v_count);
  end if;

  v_table := to_regclass('public.points_history');
  if v_table is not null then
    execute format('delete from %s', v_table);
    get diagnostics v_count = row_count;
    v_deleted := v_deleted || jsonb_build_object('pointsHistory', v_count);
  end if;

  v_table := to_regclass('public.reward_redemptions');
  if v_table is not null then
    execute format('delete from %s', v_table);
    get diagnostics v_count = row_count;
    v_deleted := v_deleted || jsonb_build_object('rewardRedemptions', v_count);
  end if;

  v_table := to_regclass('public.redemptions');
  if v_table is not null then
    execute format('delete from %s', v_table);
    get diagnostics v_count = row_count;
    v_deleted := v_deleted || jsonb_build_object('redemptions', v_count);
  end if;

  delete from public.user_roles
  where role <> 'admin'
     or not (user_id = any(v_admin_user_ids));
  get diagnostics v_count = row_count;
  v_deleted := v_deleted || jsonb_build_object('nonAdminUserRoles', v_count);

  delete from public.performers
  where not (owner_user_id = any(v_admin_user_ids));
  get diagnostics v_count = row_count;
  v_deleted := v_deleted || jsonb_build_object('performers', v_count);

  delete from public.producers
  where not (owner_user_id = any(v_admin_user_ids));
  get diagnostics v_count = row_count;
  v_deleted := v_deleted || jsonb_build_object('producers', v_count);

  delete from public.venues
  where not (owner_user_id = any(v_admin_user_ids));
  get diagnostics v_count = row_count;
  v_deleted := v_deleted || jsonb_build_object('venues', v_count);

  delete from public.profiles
  where not (id = any(v_admin_user_ids));
  get diagnostics v_count = row_count;
  v_deleted := v_deleted || jsonb_build_object('profiles', v_count);

  return jsonb_build_object(
    'deleted', v_deleted,
    'preservedAdminUserIds', v_admin_user_ids,
    'authUsersPreserved', true,
    'schemaPreserved', true
  );
end;
$$;

grant execute on function public.admin_clean_slate_reset(text)
to authenticated;
