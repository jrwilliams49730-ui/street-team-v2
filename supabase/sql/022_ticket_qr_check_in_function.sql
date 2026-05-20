-- Street Team V2: secure ticket QR check-in function

create or replace function public.check_in_ticket_by_qr(
  p_qr_value text
)
returns table (
  outcome text,
  message text,
  ticket_id uuid,
  ticket_number integer,
  ticket_status text,
  checked_in_at timestamptz,
  event_title text,
  ticket_type_name text,
  buyer_name text,
  buyer_email text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_clean_qr text;
  v_qr_token uuid;
  v_ticket public.tickets%rowtype;
  v_event public.events%rowtype;
  v_ticket_type public.event_ticket_types%rowtype;
  v_reservation public.ticket_reservations%rowtype;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    return query
    select
      'forbidden'::text,
      'You must be signed in to scan tickets.'::text,
      null::uuid,
      null::integer,
      null::text,
      null::timestamptz,
      null::text,
      null::text,
      null::text,
      null::text;
    return;
  end if;

  v_clean_qr := trim(coalesce(p_qr_value, ''));

  if v_clean_qr = '' then
    return query
    select
      'invalid'::text,
      'No QR code value was received.'::text,
      null::uuid,
      null::integer,
      null::text,
      null::timestamptz,
      null::text,
      null::text,
      null::text,
      null::text;
    return;
  end if;

  if v_clean_qr like 'street-team-ticket:%' then
    v_clean_qr := replace(v_clean_qr, 'street-team-ticket:', '');
  end if;

  begin
    v_qr_token := v_clean_qr::uuid;
  exception
    when others then
      return query
      select
        'invalid'::text,
        'This QR code is not a valid Street Team ticket.'::text,
        null::uuid,
        null::integer,
        null::text,
        null::timestamptz,
        null::text,
        null::text,
        null::text,
        null::text;
      return;
  end;

  select *
  into v_ticket
  from public.tickets
  where qr_token = v_qr_token
  for update;

  if not found then
    return query
    select
      'invalid'::text,
      'Ticket not found.'::text,
      null::uuid,
      null::integer,
      null::text,
      null::timestamptz,
      null::text,
      null::text,
      null::text,
      null::text;
    return;
  end if;

  if not public.current_user_owns_event(v_ticket.event_id) then
    return query
    select
      'forbidden'::text,
      'This ticket is not for one of your events.'::text,
      v_ticket.id,
      v_ticket.ticket_number,
      v_ticket.ticket_status,
      v_ticket.checked_in_at,
      null::text,
      null::text,
      null::text,
      null::text;
    return;
  end if;

  select *
  into v_event
  from public.events
  where id = v_ticket.event_id;

  select *
  into v_ticket_type
  from public.event_ticket_types
  where id = v_ticket.ticket_type_id;

  select *
  into v_reservation
  from public.ticket_reservations
  where id = v_ticket.reservation_id;

  if v_ticket.ticket_status = 'checked_in' then
    return query
    select
      'already_checked_in'::text,
      'This ticket has already been checked in.'::text,
      v_ticket.id,
      v_ticket.ticket_number,
      v_ticket.ticket_status,
      v_ticket.checked_in_at,
      v_event.title,
      v_ticket_type.name,
      v_reservation.buyer_name,
      v_reservation.buyer_email;
    return;
  end if;

  if v_ticket.ticket_status = 'void' then
    return query
    select
      'void'::text,
      'This ticket is void and cannot be checked in.'::text,
      v_ticket.id,
      v_ticket.ticket_number,
      v_ticket.ticket_status,
      v_ticket.checked_in_at,
      v_event.title,
      v_ticket_type.name,
      v_reservation.buyer_name,
      v_reservation.buyer_email;
    return;
  end if;

  update public.tickets
  set
    ticket_status = 'checked_in',
    checked_in_at = now(),
    updated_at = now()
  where id = v_ticket.id
  returning * into v_ticket;

  return query
  select
    'checked_in'::text,
    'Ticket checked in successfully.'::text,
    v_ticket.id,
    v_ticket.ticket_number,
    v_ticket.ticket_status,
    v_ticket.checked_in_at,
    v_event.title,
    v_ticket_type.name,
    v_reservation.buyer_name,
    v_reservation.buyer_email;
end;
$$;

grant execute on function public.check_in_ticket_by_qr(text)
to authenticated;
