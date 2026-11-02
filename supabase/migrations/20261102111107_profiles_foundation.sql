-- Phase 2 foundation. Gameplay and XP writes are deliberately not exposed.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'debug_duel_profile_engine') then
    create role debug_duel_profile_engine nologin noinherit;
  end if;
end $$;
-- Migration runner may assign function ownership, then drops this temporary membership.
grant debug_duel_profile_engine to postgres;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete restrict,
  username text check (username is null or username ~ '^[a-zA-Z0-9_]{3,20}$'),
  display_name text not null default '' check (char_length(display_name) <= 40),
  avatar_seed text not null default 'violet' check (avatar_seed in ('violet','mint','amber','rose')),
  onboarding_completed_at timestamptz,
  xp bigint not null default 0 check (xp >= 0),
  wins integer not null default 0 check (wins >= 0),
  losses integer not null default 0 check (losses >= 0),
  draws integer not null default 0 check (draws >= 0),
  matches_played integer not null default 0 check (matches_played >= 0),
  correct_answers integer not null default 0 check (correct_answers >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (matches_played = wins + losses + draws),
  check ((username is null) = (onboarding_completed_at is null))
);
create unique index profiles_username_ci on public.profiles (lower(username)) where username is not null;
create index profiles_leaderboard on public.profiles (xp desc, wins desc, created_at, id) where onboarding_completed_at is not null and matches_played > 0;

alter table public.profiles enable row level security;
revoke all on public.profiles from public, anon, authenticated;
grant select on public.profiles to anon, authenticated;
create policy profiles_public_completed on public.profiles for select to anon, authenticated
  using (onboarding_completed_at is not null or id = (select auth.uid()));

grant usage on schema public, private, auth to debug_duel_profile_engine;
grant create on schema private to debug_duel_profile_engine;
grant select (id, email_confirmed_at, deleted_at, banned_until) on auth.users to debug_duel_profile_engine;
grant select, insert on public.profiles to debug_duel_profile_engine;
grant update (username, display_name, avatar_seed, onboarding_completed_at, updated_at) on public.profiles to debug_duel_profile_engine;
create policy profiles_engine on public.profiles for all to debug_duel_profile_engine using (true) with check (true);

create table private.profile_write_limits (
  user_id uuid not null references auth.users(id) on delete restrict,
  window_start timestamptz not null,
  request_count integer not null default 1,
  primary key(user_id, window_start)
);
alter table private.profile_write_limits enable row level security;
revoke all on private.profile_write_limits from public, anon, authenticated;
grant select, insert, update, delete on private.profile_write_limits to debug_duel_profile_engine;
create policy profile_limits_engine on private.profile_write_limits for all to debug_duel_profile_engine using (true) with check (true);

create function private.ensure_profile() returns public.profiles
language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); result public.profiles;
begin
  if actor is null or not exists (
    select 1 from auth.users u where u.id = actor and u.email_confirmed_at is not null
      and u.deleted_at is null and (u.banned_until is null or u.banned_until < clock_timestamp())
  ) then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  insert into public.profiles(id) values(actor) on conflict (id) do nothing;
  select * into result from public.profiles where id = actor;
  return result;
end $$;
alter function private.ensure_profile() owner to debug_duel_profile_engine;
revoke all on function private.ensure_profile() from public, anon, authenticated;
grant execute on function private.ensure_profile() to authenticated;

create function public.ensure_profile() returns public.profiles
language sql security invoker set search_path = '' as $$ select private.ensure_profile(); $$;
revoke all on function public.ensure_profile() from public, anon, authenticated;
grant execute on function public.ensure_profile() to authenticated;

create function private.update_profile(p_username text, p_display_name text, p_avatar_seed text) returns public.profiles
language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); result public.profiles; requests integer; window_time timestamptz := date_trunc('minute',clock_timestamp());
begin
  result := private.ensure_profile();
  if p_username is null or p_username !~ '^[a-zA-Z0-9_]{3,20}$'
     or p_display_name is null or char_length(trim(p_display_name)) not between 1 and 40
     or p_avatar_seed is null or p_avatar_seed not in ('violet','mint','amber','rose')
  then raise exception 'INVALID_PROFILE' using errcode = '22023'; end if;
  insert into private.profile_write_limits as limits(user_id, window_start) values(actor, window_time)
  on conflict(user_id, window_start) do update set request_count = limits.request_count + 1
  returning request_count into requests;
  if requests > 10 then raise exception 'RATE_LIMITED' using errcode = 'P0001'; end if;
  delete from private.profile_write_limits where user_id = actor and window_start < window_time - interval '1 hour';
  update public.profiles set username = p_username, display_name = trim(p_display_name), avatar_seed = p_avatar_seed,
    onboarding_completed_at = coalesce(onboarding_completed_at,clock_timestamp()), updated_at = clock_timestamp()
    where id = actor returning * into result;
  return result;
end $$;
alter function private.update_profile(text,text,text) owner to debug_duel_profile_engine;
revoke all on function private.update_profile(text,text,text) from public, anon, authenticated;
grant execute on function private.update_profile(text,text,text) to authenticated;

create function public.update_profile(p_username text, p_display_name text, p_avatar_seed text) returns public.profiles
language sql security invoker set search_path = '' as $$ select private.update_profile(p_username,p_display_name,p_avatar_seed); $$;
revoke all on function public.update_profile(text,text,text) from public, anon, authenticated;
grant execute on function public.update_profile(text,text,text) to authenticated;

-- Every future private function must receive explicit EXECUTE grants.
alter default privileges in schema private revoke execute on functions from public;
alter default privileges in schema public revoke execute on functions from public;
revoke create on schema private from debug_duel_profile_engine;
revoke debug_duel_profile_engine from postgres;
