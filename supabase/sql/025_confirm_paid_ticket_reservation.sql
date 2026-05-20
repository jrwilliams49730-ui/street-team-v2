-- Street Team V2: confirm paid reservation and issue tickets after Stripe webhook

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

    insert into public.tickets (
      reservation_id,
      event_id,
      ticket_type_id,
      ticket_number
    )
    select
      v_reservation.id,
      v_reservation.event_id,
      v_reservation.ticket_type_id,
      generated.ticket_number
    from generate_series(1, v_reservation.quantity) as generated(ticket_number)
    on conflict (reservation_id, ticket_number) do nothing;

    return v_reservation;
  end if;

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

  insert into public.tickets (
    reservation_id,
    event_id,
    ticket_type_id,
    ticket_number
  )
  select
    v_reservation.id,
    v_reservation.event_id,
    v_reservation.ticket_type_id,
    generated.ticket_number
  from generate_series(1, v_reservation.quantity) as generated(ticket_number)
  on conflict (reservation_id, ticket_number) do nothing;

  return v_reservation;
end;
$$;

grant execute on function public.confirm_paid_ticket_reservation(uuid, text, text)
to service_role;
