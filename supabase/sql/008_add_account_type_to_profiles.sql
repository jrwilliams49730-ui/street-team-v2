-- Street Team V2: store account type in profiles, safely

alter table public.profiles
add column if not exists account_type text;

update public.profiles as p
set account_type = case lower(coalesce(u.raw_user_meta_data->>'account_type', 'fan'))
  when 'performer' then 'Performer'
  when 'producer' then 'Producer'
  when 'venue' then 'Venue'
  else 'Fan'
end
from auth.users as u
where p.id = u.id
  and p.account_type is null;

alter table public.profiles
add constraint profiles_account_type_check
check (account_type in ('Fan', 'Performer', 'Producer', 'Venue'));

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    display_name,
    account_type
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', ''),
    case lower(coalesce(new.raw_user_meta_data->>'account_type', 'fan'))
      when 'performer' then 'Performer'
      when 'producer' then 'Producer'
      when 'venue' then 'Venue'
      else 'Fan'
    end
  );

  return new;
end;
$$;
