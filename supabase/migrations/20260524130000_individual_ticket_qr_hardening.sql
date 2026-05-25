-- Street Team V2: harden individual ticket QR/check-in behavior

create extension if not exists pgcrypto;

insert into public.tickets (
  reservation_id,
  event_id,
  ticket_type_id,
  ticket_number,
  qr_token
)
select
  ticket_reservations.id,
  ticket_reservations.event_id,
  ticket_reservations.ticket_type_id,
  generated.ticket_number,
  gen_random_uuid()
from public.ticket_reservations
cross join lateral generate_series(1, greatest(ticket_reservations.quantity, 0)) as generated(ticket_number)
left join public.tickets
  on tickets.reservation_id = ticket_reservations.id
  and tickets.ticket_number = generated.ticket_number
where ticket_reservations.reservation_status = 'confirmed'
  and tickets.id is null;

update public.tickets
set
  qr_token = gen_random_uuid(),
  updated_at = now()
where qr_token is null;

with ranked_ticket_tokens as (
  select
    id,
    row_number() over (
      partition by qr_token
      order by created_at, id
    ) as token_rank
  from public.tickets
)
update public.tickets
set
  qr_token = gen_random_uuid(),
  updated_at = now()
from ranked_ticket_tokens
where tickets.id = ranked_ticket_tokens.id
  and ranked_ticket_tokens.token_rank > 1;

alter table public.tickets
alter column qr_token set default gen_random_uuid(),
alter column qr_token set not null;

create unique index if not exists tickets_qr_token_unique_idx
on public.tickets (qr_token);

create or replace function public.confirm_paid_ticket_reservation(
  p_reservation_id uuid,
  p_checkout_session_id text,
  p_payment_intent_id text default null
)
returns public.ticket_reservations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reservation public.ticket_reservations%rowtype;
begin
  if p_reservation_id is null then
    raise exception 'Reservation id is required.';
  end if;

  if nullif(trim(coalesce(p_checkout_session_id, '')), '') is null then
    raise exception 'Stripe checkout session id is required.';
  end if;

  select *
  into v_reservation
  from public.ticket_reservations
  where id = p_reservation_id
  for update;

  if not found then
    raise exception 'Reservation not found.';
  end if;

  if v_reservation.ticket_kind_snapshot <> 'paid' then
    raise exception 'Only paid ticket reservations can be confirmed by Stripe.';
  end if;

  if v_reservation.stripe_checkout_session_id is not null
     and v_reservation.stripe_checkout_session_id <> p_checkout_session_id then
    raise exception 'Stripe checkout session does not match this reservation.';
  end if;

  if v_reservation.reservation_status = 'confirmed' then
    update public.ticket_reservations
    set
      stripe_checkout_session_id = coalesce(stripe_checkout_session_id, p_checkout_session_id),
      stripe_payment_intent_id = coalesce(stripe_payment_intent_id, p_payment_intent_id),
      paid_at = coalesce(paid_at, now()),
      updated_at = now()
    where id = v_reservation.id
    returning * into v_reservation;
  else
    if v_reservation.reservation_status = 'cancelled' then
      raise exception 'Cancelled reservations cannot be confirmed.';
    end if;

    update public.ticket_reservations
    set
      reservation_status = 'confirmed',
      stripe_checkout_session_id = coalesce(stripe_checkout_session_id, p_checkout_session_id),
      stripe_payment_intent_id = coalesce(stripe_payment_intent_id, p_payment_intent_id),
      paid_at = coalesce(paid_at, now()),
      updated_at = now()
    where id = v_reservation.id
    returning * into v_reservation;
  end if;

  insert into public.tickets (
    reservation_id,
    event_id,
    ticket_type_id,
    ticket_number,
    qr_token
  )
  select
    v_reservation.id,
    v_reservation.event_id,
    v_reservation.ticket_type_id,
    generated.ticket_number,
    gen_random_uuid()
  from generate_series(1, v_reservation.quantity) as generated(ticket_number)
  on conflict (reservation_id, ticket_number) do nothing;

  return v_reservation;
end;
$$;

grant execute on function public.confirm_paid_ticket_reservation(uuid, text, text)
to service_role;

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

  if lower(v_clean_qr) like 'street-team-ticket:%' then
    v_clean_qr := substring(v_clean_qr from length('street-team-ticket:') + 1);
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
