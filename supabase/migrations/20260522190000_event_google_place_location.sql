-- Street Team V2: Google Places-backed event locations

alter table public.events
add column if not exists venue_name text,
add column if not exists address_line_1 text,
add column if not exists city text,
add column if not exists state text,
add column if not exists postal_code text,
add column if not exists formatted_address text,
add column if not exists google_place_id text,
add column if not exists latitude double precision,
add column if not exists longitude double precision;

create index if not exists events_google_place_id_idx
on public.events (google_place_id)
where google_place_id is not null;

create index if not exists events_latitude_longitude_idx
on public.events (latitude, longitude)
where latitude is not null
  and longitude is not null;
