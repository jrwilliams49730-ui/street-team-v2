-- Street Team V2: event ticket types foundation

create table public.event_ticket_types (
  id uuid primary key default gen_random_uuid(),

  event_id uuid not null references public.events(id) on delete cascade,

  name text not null,
  description text,

  ticket_kind text not null
    check (ticket_kind in ('free', 'paid')),

  price_cents integer not null default 0
    check (price_cents >= 0),

  quantity_total integer not null
    check (quantity_total > 0),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint event_ticket_types_price_matches_kind check (
    (
      ticket_kind = 'free'
      and price_cents = 0
    )
    or
    (
      ticket_kind = 'paid'
      and price_cents > 0
    )
  )
);

create trigger event_ticket_types_set_updated_at
before update on public.event_ticket_types
for each row
execute function public.handle_updated_at();

alter table public.event_ticket_types enable row level security;

create policy "Public can view ticket types for published events"
on public.event_ticket_types
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.events
    where events.id = event_ticket_types.event_id
      and events.status = 'published'
  )
);

create policy "Event owners can view their ticket types"
on public.event_ticket_types
for select
to authenticated
using (
  exists (
    select 1
    from public.events
    where events.id = event_ticket_types.event_id
      and events.owner_user_id = (select auth.uid())
  )
);

create policy "Event owners can create ticket types"
on public.event_ticket_types
for insert
to authenticated
with check (
  exists (
    select 1
    from public.events
    where events.id = event_ticket_types.event_id
      and events.owner_user_id = (select auth.uid())
  )
);

create policy "Event owners can update ticket types"
on public.event_ticket_types
for update
to authenticated
using (
  exists (
    select 1
    from public.events
    where events.id = event_ticket_types.event_id
      and events.owner_user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.events
    where events.id = event_ticket_types.event_id
      and events.owner_user_id = (select auth.uid())
  )
);

create policy "Event owners can delete ticket types"
on public.event_ticket_types
for delete
to authenticated
using (
  exists (
    select 1
    from public.events
    where events.id = event_ticket_types.event_id
      and events.owner_user_id = (select auth.uid())
  )
);
