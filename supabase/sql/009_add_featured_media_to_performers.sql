-- Street Team V2: featured media fields for performer profiles

alter table public.performers
add column featured_media_url text,
add column featured_media_type text
check (featured_media_type in ('video', 'audio'));
