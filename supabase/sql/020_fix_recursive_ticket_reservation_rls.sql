-- Street Team V2: fix recursive RLS loop affecting My Tickets

create or replace function public.current_user_owns_event(
  p_event_id uuid
)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.events
    where events.id = p_event_id
      and events.owner_user_id = auth.uid()
  );
$$;

grant execute on function public.current_user_owns_event(uuid) to authenticated;

drop policy if exists "Event owners can view reservations for their events"
on public.ticket_reservations;

create policy "Event owners can view reservations for their events"
on public.ticket_reservations
for select
to authenticated
using (
  public.current_user_owns_event(ticket_reservations.event_id)
);
