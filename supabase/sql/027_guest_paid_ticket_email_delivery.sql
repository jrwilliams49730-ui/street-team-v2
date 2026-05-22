-- Street Team V2: guest paid ticket delivery support

alter table public.ticket_reservations
add column if not exists ticket_email_sent_at timestamptz,
add column if not exists ticket_email_last_attempted_at timestamptz,
add column if not exists ticket_email_error text;

create or replace function public.get_public_ticket_by_qr_token(
  p_qr_token text
)
returns table (
  ticket_id uuid,
  reservation_id uuid,
  event_id uuid,
  ticket_type_id uuid,
  ticket_number integer,
  ticket_status text,
  qr_token uuid,
  buyer_name text,
  buyer_email text,
  quantity integer,
  event_title text,
  event_slug text,
  event_date date,
  start_time time,
  event_timezone text,
  venue_name text,
  address_line_1 text,
  address_line_2 text,
  city text,
  state text,
  postal_code text,
  country text,
  ticket_type_name text
)
language sql
security definer
set search_path = public
stable
as $$
  select
    tickets.id as ticket_id,
    ticket_reservations.id as reservation_id,
    events.id as event_id,
    event_ticket_types.id as ticket_type_id,
    tickets.ticket_number,
    tickets.ticket_status,
    tickets.qr_token,
    ticket_reservations.buyer_name,
    ticket_reservations.buyer_email,
    ticket_reservations.quantity,
    events.title as event_title,
    events.slug as event_slug,
    events.event_date,
    events.start_time,
    events.event_timezone,
    events.venue_name,
    events.address_line_1,
    events.address_line_2,
    events.city,
    events.state,
    events.postal_code,
    events.country,
    event_ticket_types.name as ticket_type_name
  from public.tickets
  join public.ticket_reservations
    on ticket_reservations.id = tickets.reservation_id
  join public.events
    on events.id = tickets.event_id
  join public.event_ticket_types
    on event_ticket_types.id = tickets.ticket_type_id
  where tickets.qr_token::text = replace(trim(coalesce(p_qr_token, '')), 'street-team-ticket:', '')
    and ticket_reservations.reservation_status = 'confirmed'
    and events.status = 'published'
  limit 1;
$$;

grant execute on function public.get_public_ticket_by_qr_token(text)
to anon, authenticated;
