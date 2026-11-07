-- Server-only distributed admission, isolated from game/profile/settlement writers.
create role debug_duel_admission_engine nologin noinherit;
grant debug_duel_admission_engine to postgres;
grant usage on schema private to debug_duel_admission_engine;
grant create on schema public to debug_duel_admission_engine;
grant select,insert,update on private.rate_limits to debug_duel_admission_engine;
create policy public_read_limits on private.rate_limits for all to debug_duel_admission_engine
  using (action in ('public_leaderboard','public_health'))
  with check (action in ('public_leaderboard','public_health'));
create function public.public_read_admission(p_subject text,p_action text) returns boolean
language plpgsql security definer set search_path='' as $$
declare n integer; maximum integer;
  bucket timestamptz:=date_bin(interval '1 minute',clock_timestamp(),'2000-01-01'::timestamptz);
begin
  maximum:=case p_action when 'leaderboard' then 60 when 'health' then 120 else null end;
  if maximum is null or p_subject is null or p_subject !~ '^[0-9a-f]{64}$' then return false; end if;
  insert into private.rate_limits as lim(subject_hash,action,window_start)
    values(p_subject,'public_'||p_action,bucket)
  on conflict(subject_hash,action,window_start) do update
    set request_count=least(lim.request_count+1,maximum+1) returning request_count into n;
  -- Returning false commits the counter, even for denied requests. Daily cleanup owns TTL.
  return n<=maximum;
end $$;
alter function public.public_read_admission(text,text) owner to debug_duel_admission_engine;
revoke all on function public.public_read_admission(text,text) from public,anon,authenticated;
grant execute on function public.public_read_admission(text,text) to service_role;
revoke create on schema public from debug_duel_admission_engine;
revoke debug_duel_admission_engine from postgres;
