-- Street Team V2: allow ticket holders to view reserved event and ticket details

create policy "Ticket holders can view their reserved events"
on public.events
for select
to authenticated
using (
  exists (
    select 1
    from public.ticket_reservations
    where ticket_reservations.event_id = events.id
      and ticket_reservations.purchaser_user_id = (select auth.uid())
  )
);

create policy "Ticket holders can view their reserved ticket types"
on public.event_ticket_types
for select
to authenticated
using (
  exists (
    select 1
    from public.ticket_reservations
    where ticket_reservations.ticket_type_id = event_ticket_types.id
      and ticket_reservations.purchaser_user_id = (select auth.uid())
  )
);
