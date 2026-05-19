-- Street Team V2: ticket reservations foundation + safe free ticket claiming

create table public.ticket_reservations (
  id uuid primary key default gen_random_uuid(),

  event_id uuid not null references public.events(id) on delete cascade,
  ticket_type_id uuid not null references public.event_ticket_types(id) on delete cascade,
  purchaser_user_id uuid not null references public.profiles(id) on delete cascade,

  quantity integer not null default 1
    check (quantity > 0),

  reservation_status text not null default 'pending'
    check (reservation_status in ('pending', 'confirmed', 'cancelled', 'expired')),

  ticket_kind_snapshot text not null
    check (ticket_kind_snapshot in ('free', 'paid')),

  unit_price_cents_snapshot integer not null default 0
    check (unit_price_cents_snapshot >= 0),

  total_price_cents_snapshot integer not null default 0
    check (total_price_cents_snapshot >= 0),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger ticket_reservations_set_updated_at
before update on public.ticket_reservations
for each row
execute function public.handle_updated_at();

alter table public.ticket_reservations enable row level security;

create policy "Users can view their own ticket reservations"
on public.ticket_reservations
for select
to authenticated
using ((select auth.uid()) = purchaser_user_id);

create policy "Event owners can view reservations for their events"
on public.ticket_reservations
for select
to authenticated
using (
  exists (
    select 1
    from public.events
    where events.id = ticket_reservations.event_id
      and events.owner_user_id = (select auth.uid())
  )
);

create or replace function public.claim_free_ticket(
  p_ticket_type_id uuid,
  p_quantity integer default 1
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
  v_claimed_quantity integer;
  v_reservation public.ticket_reservations%rowtype;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'You must be signed in to claim a ticket.';
  end if;

  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Ticket quantity must be at least 1.';
  end if;

  select *
  into v_ticket_type
  from public.event_ticket_types
  where id = p_ticket_type_id
  for update;

  if not found then
    raise exception 'Ticket type not found.';
  end if;

  if v_ticket_type.ticket_kind <> 'free' then
    raise exception 'This ticket type is not free.';
  end if;

  select *
  into v_event
  from public.events
  where id = v_ticket_type.event_id;

  if not found then
    raise exception 'Event not found.';
  end if;

  if v_event.status <> 'published' then
    raise exception 'Tickets can only be claimed for published events.';
  end if;

  select coalesce(sum(quantity), 0)
  into v_claimed_quantity
  from public.ticket_reservations
  where ticket_type_id = v_ticket_type.id
    and reservation_status in ('pending', 'confirmed');

  if v_claimed_quantity + p_quantity > v_ticket_type.quantity_total then
    raise exception 'Not enough tickets remaining.';
  end if;

  insert into public.ticket_reservations (
    event_id,
    ticket_type_id,
    purchaser_user_id,
    quantity,
    reservation_status,
    ticket_kind_snapshot,
    unit_price_cents_snapshot,
    total_price_cents_snapshot
  )
  values (
    v_ticket_type.event_id,
    v_ticket_type.id,
    v_user_id,
    p_quantity,
    'confirmed',
    'free',
    0,
    0
  )
  returning * into v_reservation;

  return v_reservation;
end;
$$;

grant execute on function public.claim_free_ticket(uuid, integer) to authenticated;
