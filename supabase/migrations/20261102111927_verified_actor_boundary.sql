grant debug_duel_profile_engine to postgres;

-- Supabase owns auth.users and enables RLS with no client policies. Keep the
-- privileged lookup isolated: it accepts no user ID and returns only the current
-- active, confirmed actor. It performs no writes and is not a client-callable RPC.
create function private.verified_actor_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select u.id from auth.users u where u.id = auth.uid()
    and u.email_confirmed_at is not null and u.deleted_at is null
    and (u.banned_until is null or u.banned_until < now());
$$;
revoke all on function private.verified_actor_id() from public, anon, authenticated;
grant execute on function private.verified_actor_id() to debug_duel_profile_engine;

-- Restore the profile writer to its own explicit table/column grants only.
revoke authenticated from debug_duel_profile_engine;
revoke select (id,email_confirmed_at,deleted_at,banned_until) on auth.users from debug_duel_profile_engine;

create or replace function private.ensure_profile() returns public.profiles
language plpgsql security definer set search_path = '' as $$
declare actor uuid := private.verified_actor_id(); result public.profiles;
begin
  if actor is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  insert into public.profiles(id) values(actor) on conflict (id) do nothing;
  select * into result from public.profiles where id = actor;
  return result;
end $$;

create or replace function private.update_profile(p_username text, p_display_name text, p_avatar_seed text) returns public.profiles
language plpgsql security definer set search_path = '' as $$
declare actor uuid; result public.profiles; requests integer; window_time timestamptz := date_trunc('minute',clock_timestamp());
begin
  result := private.ensure_profile();
  actor := result.id;
  if p_username is null or p_username !~ '^[a-zA-Z0-9_]{3,20}$'
     or p_display_name is null or char_length(trim(p_display_name)) not between 1 and 40
     or p_avatar_seed is null or p_avatar_seed not in ('violet','mint','amber','rose')
  then raise exception 'INVALID_PROFILE' using errcode = '22023'; end if;
  insert into private.profile_write_limits as limits(user_id,window_start) values(actor,window_time)
  on conflict(user_id,window_start) do update set request_count = limits.request_count + 1
  returning request_count into requests;
  if requests > 10 then raise exception 'RATE_LIMITED' using errcode = 'P0001'; end if;
  delete from private.profile_write_limits where user_id=actor and window_start < window_time - interval '1 hour';
  update public.profiles set username=p_username, display_name=trim(p_display_name), avatar_seed=p_avatar_seed,
    onboarding_completed_at=coalesce(onboarding_completed_at,clock_timestamp()),updated_at=clock_timestamp()
    where id=actor returning * into result;
  return result;
end $$;

revoke debug_duel_profile_engine from postgres;
