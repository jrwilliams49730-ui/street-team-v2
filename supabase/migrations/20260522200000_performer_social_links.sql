-- Street Team V2: optional performer social/media links

alter table public.performers
add column if not exists instagram_url text,
add column if not exists tiktok_url text,
add column if not exists facebook_url text,
add column if not exists youtube_url text,
add column if not exists website_url text;
