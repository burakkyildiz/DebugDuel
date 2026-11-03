-- Server-only admission limit commits even when a subsequent invite is invalid.
-- The browser has no EXECUTE and never supplies this HMAC network identifier.
grant debug_duel_game_engine to postgres;
grant create on schema public to debug_duel_game_engine;
create function public.match_join_admission(p_subject text) returns boolean
language plpgsql security definer set search_path='' as $$
declare n integer; bucket timestamptz:=date_bin(interval '1 minute',clock_timestamp(),'2000-01-01'::timestamptz);
begin
  if p_subject is null or p_subject !~ '^[0-9a-f]{64}$' then return false; end if;
  insert into private.rate_limits as lim(subject_hash,action,window_start) values(p_subject,'match_join_ip',bucket)
  on conflict(subject_hash,action,window_start) do update set request_count=least(lim.request_count+1,11) returning request_count into n;
  delete from private.rate_limits where subject_hash=p_subject and window_start<bucket-interval '24 hours';
  return n<=10;
end $$;
alter function public.match_join_admission(text) owner to debug_duel_game_engine;
revoke all on function public.match_join_admission(text) from public,anon,authenticated;
grant execute on function public.match_join_admission(text) to service_role;
revoke create on schema public from debug_duel_game_engine;
revoke debug_duel_game_engine from postgres;
