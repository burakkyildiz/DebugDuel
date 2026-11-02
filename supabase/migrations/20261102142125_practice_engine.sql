-- Practice has its own writer: no match, ledger, statistics or Auth table rights.
create role debug_duel_practice_engine nologin noinherit;
grant debug_duel_practice_engine, debug_duel_profile_engine to postgres;
grant usage on schema public, private to debug_duel_practice_engine;
grant create on schema private to debug_duel_practice_engine, debug_duel_profile_engine;
grant select on private.questions to debug_duel_practice_engine;
grant select,insert,update on private.practice_sessions to debug_duel_practice_engine;
grant select,insert,update,delete on private.rate_limits to debug_duel_practice_engine;
create policy practice_question_read on private.questions for select to debug_duel_practice_engine using (true);
create policy practice_writer on private.practice_sessions for all to debug_duel_practice_engine using (true) with check (true);
create policy practice_limits on private.rate_limits for all to debug_duel_practice_engine using (true) with check (true);
grant execute on function private.code_line_count(text), private.check_question_snapshot() to debug_duel_practice_engine;

alter table private.practice_sessions add column start_idempotency_key uuid not null default gen_random_uuid();
create unique index practice_start_guest on private.practice_sessions(guest_subject_hash,start_idempotency_key) where guest_subject_hash is not null;
create unique index practice_start_account on private.practice_sessions(user_id,start_idempotency_key) where user_id is not null;

create function private.practice_limit(p_subject text,p_action text,p_max integer,p_window interval) returns void
language plpgsql security invoker set search_path = '' as $$
declare n integer; bucket timestamptz := date_bin(p_window,clock_timestamp(),'2000-01-01'::timestamptz);
begin
  insert into private.rate_limits as lim(subject_hash,action,window_start) values(p_subject,p_action,bucket)
  on conflict(subject_hash,action,window_start) do update set request_count=lim.request_count+1 returning request_count into n;
  if n>p_max then raise exception 'RATE_LIMITED' using errcode='P0001'; end if;
  delete from private.rate_limits where subject_hash=p_subject and window_start<bucket-interval '24 hours';
end $$;

create function private.practice_dto(s private.practice_sessions, t timestamptz) returns jsonb
language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'sessionId',s.id,'serverNow',t,'startsAt',s.starts_at,'endsAt',s.ends_at,
    'identity',case when s.user_id is null then 'guest' else 'account' end,
    'status',case when s.status='resolved' or t>=s.ends_at then 'resolved' else 'active' end,
    'question',jsonb_build_object('title',s.title_snapshot,'prompt',s.prompt_snapshot,'code',s.code_snapshot,'lineCount',s.line_count,'language','python'),
    'selectedLine',s.selected_line,
    'solution',case when s.status='resolved' or t>=s.ends_at then
      jsonb_build_object('correctLine',s.correct_line,'explanation',s.explanation_snapshot,'correctedCode',s.corrected_code_snapshot,'isCorrect',s.is_correct)
      else null end
  );
$$;

create function private.practice_command(
  p_action text, p_guest_hash text, p_user_id uuid, p_ip_hash text,
  p_session_id uuid, p_selected_line integer, p_key uuid
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare s private.practice_sessions; q private.questions; t timestamptz;
  owner_key text; owner_hash text; body_hash text;
begin
  if (p_guest_hash is null) = (p_user_id is null)
    or (p_guest_hash is not null and (p_guest_hash !~ '^[0-9a-f]{64}$' or p_ip_hash is null or p_ip_hash !~ '^[0-9a-f]{64}$'))
    or p_action is null or p_action not in ('create','get','answer','reveal') then
    raise exception 'INVALID_REQUEST' using errcode='22023';
  end if;
  if (p_action='create' and (p_key is null or p_session_id is not null or p_selected_line is not null))
    or (p_action<>'create' and p_session_id is null)
    or (p_action='answer' and (p_key is null or p_selected_line is null))
    or (p_action in ('get','reveal') and p_selected_line is not null) then
    raise exception 'INVALID_REQUEST' using errcode='22023';
  end if;
  owner_key := coalesce('guest:'||p_guest_hash,'user:'||p_user_id::text);
  owner_hash := encode(sha256(convert_to(owner_key,'UTF8')),'hex');
  if p_action='create' then
    -- Serializes concurrent starts/retries for this owner before random selection.
    perform pg_advisory_xact_lock(hashtextextended(owner_key,0));
    select * into s from private.practice_sessions where start_idempotency_key=p_key
      and ((p_user_id is not null and user_id=p_user_id) or (p_guest_hash is not null and guest_subject_hash=p_guest_hash));
    if found then
      t := clock_timestamp();
      if t>=s.expires_at then raise exception 'SESSION_UNAVAILABLE' using errcode='P0001'; end if;
      return private.practice_dto(s,t);
    end if;
    perform private.practice_limit(owner_hash,'practice_create',20,interval '1 hour');
    if p_guest_hash is not null then perform private.practice_limit(p_ip_hash,'practice_create_ip',20,interval '1 hour'); end if;
    select * into q from private.questions where pool='practice' and language='python' and is_active order by random() limit 1;
    if not found then raise exception 'PRACTICE_UNAVAILABLE' using errcode='P0001'; end if;
    t := clock_timestamp();
    insert into private.practice_sessions(guest_subject_hash,user_id,question_id,question_version,title_snapshot,prompt_snapshot,
      code_snapshot,line_count,correct_line,explanation_snapshot,corrected_code_snapshot,starts_at,ends_at,expires_at,start_idempotency_key)
      values(p_guest_hash,p_user_id,q.id,q.version,q.title,q.prompt,q.code,q.line_count,q.correct_line,q.explanation,q.corrected_code,
        t,t+interval '45 seconds',t+interval '24 hours',p_key) returning * into s;
    return private.practice_dto(s,t);
  end if;
  perform private.practice_limit(owner_hash,'practice_command',180,interval '1 minute');
  if p_action='get' then
    select * into s from private.practice_sessions where id=p_session_id
      and ((p_user_id is not null and user_id=p_user_id) or (p_guest_hash is not null and guest_subject_hash=p_guest_hash));
  else
    select * into s from private.practice_sessions where id=p_session_id
      and ((p_user_id is not null and user_id=p_user_id) or (p_guest_hash is not null and guest_subject_hash=p_guest_hash)) for update;
  end if;
  -- Take time after acquiring the row lock; transaction-start time is insufficient.
  t := clock_timestamp();
  if s.id is null or t>=s.expires_at or s.status='expired' then raise exception 'SESSION_UNAVAILABLE' using errcode='P0001'; end if;
  if p_action='answer' then
    body_hash := encode(sha256(convert_to(p_selected_line::text,'UTF8')),'hex');
    if s.answer_idempotency_key=p_key then
      if s.answer_request_hash<>body_hash then raise exception 'IDEMPOTENCY_CONFLICT' using errcode='P0001'; end if;
      return private.practice_dto(s,t);
    end if;
    if s.answer_idempotency_key is not null then raise exception 'ALREADY_SUBMITTED' using errcode='P0001'; end if;
    if s.status<>'active' or t>=s.ends_at then raise exception 'ROUND_CLOSED' using errcode='P0001'; end if;
    if t<s.starts_at then raise exception 'ROUND_NOT_STARTED' using errcode='P0001'; end if;
    if p_selected_line not between 1 and s.line_count then raise exception 'INVALID_LINE' using errcode='22023'; end if;
    update private.practice_sessions set status='resolved',selected_line=p_selected_line,is_correct=(p_selected_line=correct_line),
      resolved_at=t,answer_idempotency_key=p_key,answer_request_hash=body_hash where id=s.id returning * into s;
  elsif p_action='reveal' and s.status='active' then
    if t<s.ends_at then raise exception 'ROUND_NOT_ENDED' using errcode='P0001'; end if;
    update private.practice_sessions set status='resolved',resolved_at=t where id=s.id returning * into s;
  end if;
  return private.practice_dto(s,t);
end $$;
alter function private.practice_command(text,text,uuid,text,uuid,integer,uuid) owner to debug_duel_practice_engine;

-- Reuses the existing verified-profile command; the privileged Auth adapter keeps
-- exactly its existing owner, definition and EXECUTE boundary.
create function private.practice_account(p_action text,p_session_id uuid,p_selected_line integer,p_key uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare actor uuid;
begin
  actor := (private.ensure_profile()).id;
  return private.practice_command(p_action,null,actor,null,p_session_id,p_selected_line,p_key);
end $$;
alter function private.practice_account(text,uuid,integer,uuid) owner to debug_duel_profile_engine;
create function public.practice_account(p_action text,p_session_id uuid default null,p_selected_line integer default null,p_key uuid default null) returns jsonb
language sql security invoker set search_path = '' as $$
  select private.practice_account(p_action,p_session_id,p_selected_line,p_key);
$$;
create function public.practice_guest(p_action text,p_guest_hash text,p_ip_hash text,p_session_id uuid default null,p_selected_line integer default null,p_key uuid default null) returns jsonb
language sql security invoker set search_path = '' as $$
  select private.practice_command(p_action,p_guest_hash,null,p_ip_hash,p_session_id,p_selected_line,p_key);
$$;
revoke all on function private.practice_limit(text,text,integer,interval), private.practice_dto(private.practice_sessions,timestamptz),
  private.practice_command(text,text,uuid,text,uuid,integer,uuid),private.practice_account(text,uuid,integer,uuid),
  public.practice_account(text,uuid,integer,uuid),public.practice_guest(text,text,text,uuid,integer,uuid) from public,anon,authenticated,service_role;
grant execute on function private.practice_limit(text,text,integer,interval), private.practice_dto(private.practice_sessions,timestamptz) to debug_duel_practice_engine;
grant execute on function private.practice_command(text,text,uuid,text,uuid,integer,uuid) to debug_duel_profile_engine,service_role;
grant execute on function private.practice_account(text,uuid,integer,uuid),public.practice_account(text,uuid,integer,uuid) to authenticated;
grant execute on function public.practice_guest(text,text,text,uuid,integer,uuid) to service_role;
grant usage on schema private to service_role;
revoke create on schema private from debug_duel_practice_engine,debug_duel_profile_engine;
revoke debug_duel_practice_engine,debug_duel_profile_engine from postgres;
