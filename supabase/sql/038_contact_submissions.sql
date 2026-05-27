create table if not exists public.contact_submissions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  email text not null,
  phone text,
  interest_type text not null,
  message text not null,
  source text not null default 'street_team_landing_page',
  status text not null default 'new'
);

alter table public.contact_submissions enable row level security;
