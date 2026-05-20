-- Street Team V2: prepare paid reservations for Stripe Checkout and expiration

alter table public.ticket_reservations
add column if not exists expires_at timestamptz,
add column if not exists stripe_checkout_session_id text,
add column if not exists stripe_payment_intent_id text,
add column if not exists paid_at timestamptz;

create unique index if not exists ticket_reservations_unique_checkout_session
on public.ticket_reservations (stripe_checkout_session_id)
where stripe_checkout_session_id is not null;

create unique index if not exists ticket_reservations_unique_payment_intent
on public.ticket_reservations (stripe_payment_intent_id)
where stripe_payment_intent_id is not null;

create or replace function public.create_paid_ticket_reservation(
  p_ticket_type_id uuid,
  p_quantity integer default 1,
  p_buyer_name text default null,
  p_buyer_email text default null
)
returns public.ticket_reservations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_ticket_type public.event_ticket_types%rowtype;
  v_event public.events%rowtype;
  v_reserved_quantity integer;
  v_reservation public.ticket_reservations%rowtype;
  v_clean_buyer_name text;
  v_clean_buyer_email text;
  v_total_price_cents integer;
  v_expires_at timestamptz;
begin
  v_user_id := auth.uid();

  v_clean_buyer_name := nullif(trim(coalesce(p_buyer_name, '')), '');
  v_clean_buyer_email := nullif(lower(trim(coalesce(p_buyer_email, ''))), '');

  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Ticket quantity must be at least 1.';
  end if;

  if p_quantity > 4 then
    raise exception 'You can reserve a maximum of 4 paid tickets at a time.';
  end if;

  if v_clean_buyer_name is null then
    raise exception 'Buyer name is required.';
  end if;

  if v_clean_buyer_email is null or position('@' in v_clean_buyer_email) <= 1 then
    raise exception 'A valid buyer email is required.';
  end if;

  select *
  into v_ticket_type
  from public.event_ticket_types
  where id = p_ticket_type_id
  for update;

  if not found then
    raise exception 'Ticket type not found.';
  end if;

  if v_ticket_type.ticket_kind <> 'paid' then
    raise exception 'This ticket type is not a paid ticket.';
  end if;

  select *
  into v_event
  from public.events
  where id = v_ticket_type.event_id;

  if not found then
    raise exception 'Event not found.';
  end if;

  if v_event.status <> 'published' then
    raise exception 'Tickets can only be reserved for published events.';
  end if;

  update public.ticket_reservations
  set
    reservation_status = 'expired',
    updated_at = now()
  where ticket_type_id = v_ticket_type.id
    and reservation_status = 'pending'
    and expires_at is not null
    and expires_at <= now();

  select coalesce(sum(quantity), 0)
  into v_reserved_quantity
  from public.ticket_reservations
  where ticket_type_id = v_ticket_type.id
    and (
      reservation_status = 'confirmed'
      or (
        reservation_status = 'pending'
        and expires_at is not null
        and expires_at > now()
      )
    );

  if v_reserved_quantity + p_quantity > v_ticket_type.quantity_total then
    raise exception 'Not enough tickets remaining.';
  end if;

  v_total_price_cents := v_ticket_type.price_cents * p_quantity;
  v_expires_at := now() + interval '30 minutes';

  insert into public.ticket_reservations (
    event_id,
    ticket_type_id,
    purchaser_user_id,
    buyer_name,
    buyer_email,
    quantity,
    reservation_status,
    ticket_kind_snapshot,
    unit_price_cents_snapshot,
    total_price_cents_snapshot,
    expires_at
  )
  values (
    v_ticket_type.event_id,
    v_ticket_type.id,
    v_user_id,
    v_clean_buyer_name,
    v_clean_buyer_email,
    p_quantity,
    'pending',
    'paid',
    v_ticket_type.price_cents,
    v_total_price_cents,
    v_expires_at
  )
  returning * into v_reservation;

  return v_reservation;
end;
$$;

grant execute on function public.create_paid_ticket_reservation(uuid, integer, text, text)
to anon, authenticated;
