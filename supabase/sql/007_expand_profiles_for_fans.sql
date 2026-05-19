-- Street Team V2: expand fan/user profiles

alter table public.profiles
add column bio text,
add column city text,
add column state text;
