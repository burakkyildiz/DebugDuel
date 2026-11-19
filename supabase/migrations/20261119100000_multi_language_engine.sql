-- Multi-language duels and Practice. Existing signatures, owners and ACLs are kept:
-- the language travels as the 'create:<language>' qualifier on the create action,
-- is validated against an allow-list in the database, and is stored on the match
-- or Practice session so every later selection and DTO uses that language.
grant debug_duel_game_engine,debug_duel_practice_engine to postgres;
alter table public.matches drop constraint matches_language_check;
alter table public.matches add constraint matches_language_check check (language in ('python','javascript'));
alter table private.questions drop constraint questions_language_check;
alter table private.questions add constraint questions_language_check check (language in ('python','javascript'));
alter table private.practice_sessions add column language text not null default 'python' check (language in ('python','javascript'));

CREATE OR REPLACE FUNCTION private.match_command(p_actor uuid, p_action text, p_match uuid, p_key uuid, p_ready boolean, p_round uuid, p_line integer, p_hash text, p_cipher text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_lang text:='python'; m public.matches; r public.match_rounds; q private.round_questions; chosen private.questions; a private.answers; rec private.command_receipts; inv private.match_invites;
  actor_profile public.profiles; t timestamptz; request_digest text; command text; points integer; elapsed integer; changed boolean:=false; result jsonb;
begin
  -- A create action may carry the room language as 'create:<language>'.
  if p_action like 'create:%' then v_lang:=split_part(p_action,':',2); p_action:='create'; end if;
  if v_lang not in ('python','javascript') then raise exception 'INVALID_REQUEST' using errcode='22023'; end if;
  if p_actor is null or p_actor::text is distinct from (current_setting('request.jwt.claims',true)::jsonb->>'sub') then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  select * into actor_profile from public.profiles where id=p_actor;
  if actor_profile.onboarding_completed_at is null then raise exception 'PROFILE_REQUIRED' using errcode='P0001'; end if;
  if p_action is null or p_action not in ('create','join','invite','ready','heartbeat','sync','get','answer','leave','active') then raise exception 'INVALID_REQUEST' using errcode='22023'; end if;
  if p_action='active' then
    select * into m from public.matches where id=(select match_id from public.match_players where user_id=p_actor and is_active);
    if not found then return jsonb_build_object('matchId',null); end if;
    return jsonb_build_object('matchId',m.id);
  end if;
  if p_action='get' then
    perform private.practice_limit(encode(sha256(convert_to('match:'||p_actor::text,'UTF8')),'hex'),'match_read',180,interval '1 minute');
    return private.match_dto(p_match,p_actor);
  end if;
  if p_action in ('create','join','invite','ready','answer','leave') and p_key is null then raise exception 'INVALID_REQUEST' using errcode='22023'; end if;
  if p_action in ('create','invite') and (p_hash is null or p_hash !~ '^[0-9a-f]{64}$' or p_cipher is null or length(p_cipher)>2048) then raise exception 'INVALID_REQUEST' using errcode='22023'; end if;
  if p_action='join' and (p_hash is null or p_hash !~ '^[0-9a-f]{64}$') then raise exception 'ROOM_UNAVAILABLE' using errcode='P0001'; end if;
  if p_action='ready' and p_ready is null then raise exception 'INVALID_REQUEST' using errcode='22023'; end if;
  -- Per-actor transaction lock serializes create/join across different rooms.
  perform pg_advisory_xact_lock(hashtextextended('match-actor:'||p_actor::text,0));
  command:=case p_action when 'create' then 'create_match' when 'join' then 'join_match' when 'invite' then 'rotate_invite' when 'ready' then 'set_ready' else 'leave_match' end;
  request_digest:=encode(sha256(convert_to((jsonb_build_object('action',p_action,'match',p_match,'ready',p_ready,'token',case when p_action='join' then p_hash else null end)||case when v_lang<>'python' then jsonb_build_object('language',v_lang) else '{}'::jsonb end)::text,'UTF8')),'hex');
  if p_action in ('create','join','invite','ready','leave') then
    select * into rec from private.command_receipts where user_id=p_actor and command_name=command and idempotency_key=p_key;
    if found then
      if rec.request_hash<>request_digest then raise exception 'IDEMPOTENCY_CONFLICT' using errcode='P0001'; end if;
      if rec.sensitive_response_expired or (rec.sensitive_response_ciphertext is not null and clock_timestamp()>=rec.ciphertext_expires_at) then
        return rec.safe_response||jsonb_build_object('inviteResponseExpired',true);
      end if;
      return rec.safe_response||case when rec.sensitive_response_ciphertext is null then '{}'::jsonb else jsonb_build_object('inviteCiphertext',encode(rec.sensitive_response_ciphertext,'base64')) end;
    end if;
  end if;
  perform private.practice_limit(encode(sha256(convert_to('match:'||p_actor::text,'UTF8')),'hex'),
    case when p_action in ('create','invite') then 'match_create' when p_action='join' then 'match_join' when p_action='answer' then 'match_answer' else 'match_read' end,
    case when p_action in ('create','invite') then 5 when p_action='join' then 10 when p_action='answer' then 30 else 180 end,interval '1 minute');
  if p_action='create' then
    if not exists(select 1 from private.engine_health where id and last_successful_tick_at>=clock_timestamp()-interval '5 seconds') then raise exception 'ENGINE_UNAVAILABLE' using errcode='P0001'; end if;
    if exists(select 1 from public.match_players where user_id=p_actor and is_active) then raise exception 'ALREADY_IN_ACTIVE_MATCH' using errcode='P0001'; end if;
    insert into public.matches(host_user_id,next_transition_at,language) values(p_actor,clock_timestamp()+interval '15 minutes',v_lang) returning * into m;
    insert into public.match_players(match_id,user_id,slot,username_snapshot) values(m.id,p_actor,1,actor_profile.username);
    insert into public.match_rounds(match_id,round_number) select m.id,n from generate_series(1,3) n;
    insert into private.match_invites(match_id,token_hash,expires_at) values(m.id,p_hash,m.lobby_expires_at);
    changed:=true;
  else
    if p_action='join' then
      select match_id into p_match from private.match_invites where token_hash=p_hash;
    end if;
    select * into m from public.matches where id=p_match for update;
    if not found then
      -- Unknown invitations are an expected denial. Returning commits the account
      -- admission counter, including calls made directly through PostgREST RPC.
      if p_action='join' then return jsonb_build_object('commandError','ROOM_UNAVAILABLE'); end if;
      raise exception 'ROOM_UNAVAILABLE' using errcode='P0001';
    end if;
    if m.engine_stage=5 then return private.match_command_stage5(p_actor,p_action,p_match,p_key,p_ready,p_round,p_line,p_hash,p_cipher); end if;
    if p_action<>'join' and p_actor not in (m.host_user_id,coalesce(m.guest_user_id,m.host_user_id)) then raise exception 'ROOM_UNAVAILABLE' using errcode='P0001'; end if;
    perform private.match_advance(m.id);
    select * into m from public.matches where id=m.id;
    if p_action='join' then
      select * into inv from private.match_invites where match_id=m.id and token_hash=p_hash;
      if not found or clock_timestamp()>=inv.expires_at or m.status<>'waiting' or p_actor=m.host_user_id then return jsonb_build_object('commandError','ROOM_UNAVAILABLE'); end if;
      if m.guest_user_id=p_actor then return jsonb_build_object('matchId',m.id); end if;
      if m.guest_user_id is not null or inv.consumed_at is not null then return jsonb_build_object('commandError','ROOM_FULL'); end if;
      if exists(select 1 from public.match_players where user_id=p_actor and is_active) then return jsonb_build_object('commandError','ALREADY_IN_ACTIVE_MATCH'); end if;
      update public.matches set guest_user_id=p_actor,state_version=state_version+1,updated_at=clock_timestamp() where id=m.id;
      insert into public.match_players(match_id,user_id,slot,username_snapshot) values(m.id,p_actor,2,actor_profile.username);
      update private.match_invites set consumed_by=p_actor,consumed_at=clock_timestamp() where match_id=m.id;
      -- Preserve the active host's explicit readiness; match_advance already clears stale readiness.
      changed:=true;
    elsif p_action='invite' then
      if p_actor<>m.host_user_id or m.status<>'waiting' or m.guest_user_id is not null then return jsonb_build_object('commandError','ROOM_UNAVAILABLE'); end if;
      update private.match_invites set token_hash=p_hash,expires_at=m.lobby_expires_at,consumed_by=null,consumed_at=null,rotated_at=clock_timestamp() where match_id=m.id;
      update public.matches set state_version=state_version+1,updated_at=clock_timestamp() where id=m.id;
      changed:=true;
    elsif p_action in ('heartbeat','sync') then
      if p_action='heartbeat' and m.status in ('waiting','countdown','playing','between_rounds') then update public.match_players set last_seen_at=clock_timestamp() where match_id=m.id and user_id=p_actor; end if;
      changed:=true;
    elsif p_action='ready' then
      if m.status<>'waiting' then return jsonb_build_object('commandError','ROUND_CLOSED'); end if;
      update public.match_players set ready_at=case when p_ready then clock_timestamp() else null end,last_seen_at=clock_timestamp() where match_id=m.id and user_id=p_actor;
      update public.match_players set ready_at=null where match_id=m.id and last_seen_at<clock_timestamp()-interval '15 seconds';
      if (select count(*)=2 and bool_and(ready_at is not null and last_seen_at>=clock_timestamp()-interval '15 seconds') from public.match_players where match_id=m.id) then
        if not exists(select 1 from private.engine_health where id and last_successful_tick_at>=clock_timestamp()-interval '5 seconds') then return jsonb_build_object('commandError','ENGINE_UNAVAILABLE'); end if;
        for r in select * from public.match_rounds where match_id=m.id order by round_number for update loop
          select candidate.* into chosen from private.questions candidate where candidate.pool='duel' and candidate.language=m.language and candidate.is_active
            and candidate.difficulty=case r.round_number when 1 then 'easy' when 2 then 'medium' else 'hard' end
            and not exists(select 1 from private.questions newer where newer.slug=candidate.slug and newer.is_active and newer.version>candidate.version)
            and not exists(select 1 from private.round_questions rq join public.match_rounds mr on mr.id=rq.round_id join private.questions used on used.id=rq.question_id where mr.match_id=m.id and used.slug=candidate.slug)
            order by random() limit 1;
          if not found then raise exception 'ENGINE_UNAVAILABLE' using errcode='P0001'; end if;
          insert into private.round_questions values(r.id,chosen.id,chosen.version,chosen.title,chosen.prompt,chosen.code,chosen.line_count,chosen.correct_line,chosen.explanation,chosen.corrected_code);
        end loop;
        select * into strict r from public.match_rounds where match_id=m.id and round_number=1;
        t:=clock_timestamp();
        update public.match_rounds set starts_at=t+interval '3 seconds',ends_at=t+interval '48 seconds' where id=r.id;
        update public.matches set status='countdown',started_at=t+interval '3 seconds',current_round_number=1,next_transition_at=t+interval '3 seconds' where id=m.id;
      end if;
      update public.matches set state_version=state_version+1,updated_at=clock_timestamp() where id=m.id;
      changed:=true;
    elsif p_action='answer' then
      select * into r from public.match_rounds where match_id=m.id and id=p_round for update;
      if not found then return jsonb_build_object('commandError','ROOM_UNAVAILABLE'); end if;
      select * into a from private.answers where user_id=p_actor and idempotency_key=p_key;
      if found then
        if a.round_id<>p_round or a.selected_line is distinct from p_line then return jsonb_build_object('commandError','IDEMPOTENCY_CONFLICT'); end if;
        return private.match_dto(m.id,p_actor);
      end if;
      t:=clock_timestamp();
      if m.status not in ('countdown','playing') or r.round_number<>m.current_round_number or r.status='resolved' or t>=r.ends_at then return jsonb_build_object('commandError','ROUND_CLOSED'); end if;
      if r.starts_at is null or t<r.starts_at then return jsonb_build_object('commandError','ROUND_NOT_STARTED'); end if;
      if exists(select 1 from private.answers where round_id=r.id and user_id=p_actor) then return jsonb_build_object('commandError','ALREADY_SUBMITTED'); end if;
      select * into strict q from private.round_questions where round_id=r.id;
      if p_line is null or p_line not between 1 and q.line_count then return jsonb_build_object('commandError','INVALID_LINE'); end if;
      elapsed:=floor(extract(epoch from(t-r.starts_at))*1000)::integer;
      points:=case when p_line=q.correct_line then 100+floor(50.0*(45000-elapsed)/45000)::integer else 0 end;
      insert into private.answers(round_id,match_id,user_id,selected_line,accepted_at,elapsed_ms,is_correct,awarded_points,idempotency_key,request_hash)
        values(r.id,m.id,p_actor,p_line,t,elapsed,p_line=q.correct_line,points,p_key,encode(sha256(convert_to(jsonb_build_object('roundId',r.id,'selectedLine',p_line)::text,'UTF8')),'hex'));
      if points>0 then
        perform private.resolve_match_round(m.id,r.id,p_actor,points,'correct_answer',t);
      elsif (select count(*)=2 from private.answers where round_id=r.id) then
        perform private.resolve_match_round(m.id,r.id,null,0,'both_incorrect',t);
      else update public.matches set state_version=state_version+1,updated_at=t where id=m.id;
      end if;
      changed:=true;
    elsif p_action='leave' then
      if m.status='waiting' and p_actor=m.guest_user_id then
        delete from public.match_players where match_id=m.id and user_id=p_actor;
        update public.matches set guest_user_id=null,state_version=state_version+1,updated_at=clock_timestamp() where id=m.id;
        update public.match_players set ready_at=null where match_id=m.id;
        -- Existing consumed invite stays invalid until host explicitly rotates it.
      elsif m.status='waiting' then
        update public.matches set status='cancelled',ended_reason='host_left',finished_at=clock_timestamp(),next_transition_at=null,state_version=state_version+1 where id=m.id;
        update public.match_players set is_active=false where match_id=m.id;
      elsif m.status in ('countdown','playing','between_rounds') then perform private.finish_match(m.id,case when p_actor=m.host_user_id then m.guest_user_id else m.host_user_id end,'player_left');
      end if;
      changed:=true;
    end if;
  end if;
  if changed then perform private.recompute_match_transition(m.id); perform private.match_notify(m.id); end if;
  if p_action in ('create','invite','join','ready','leave') then
    result:=jsonb_build_object('matchId',m.id);
    insert into private.command_receipts(user_id,command_name,idempotency_key,request_hash,safe_response,sensitive_response_ciphertext,ciphertext_expires_at)
      values(p_actor,command,p_key,request_digest,result,case when p_action in ('create','invite') then decode(p_cipher,'base64') else null end,
        case when p_action in ('create','invite') then m.lobby_expires_at else null end);
    if p_action in ('create','invite') then result:=result||jsonb_build_object('inviteCiphertext',p_cipher); end if;
    return result;
  end if;
  return private.match_dto(m.id,p_actor);
end $function$;

CREATE OR REPLACE FUNCTION private.practice_command(p_action text, p_guest_hash text, p_user_id uuid, p_ip_hash text, p_session_id uuid, p_selected_line integer, p_key uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_lang text:='python'; s private.practice_sessions; q private.questions; t timestamptz;
  owner_key text; owner_hash text; body_hash text;
begin
  -- A create action may carry the language as 'create:<language>'.
  if p_action like 'create:%' then v_lang:=split_part(p_action,':',2); p_action:='create'; end if;
  if v_lang not in ('python','javascript') then raise exception 'INVALID_REQUEST' using errcode='22023'; end if;
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
    select * into q from private.questions where pool='practice' and language=v_lang and is_active order by random() limit 1;
    if not found then raise exception 'PRACTICE_UNAVAILABLE' using errcode='P0001'; end if;
    t := clock_timestamp();
    insert into private.practice_sessions(guest_subject_hash,user_id,question_id,question_version,title_snapshot,prompt_snapshot,
      code_snapshot,line_count,correct_line,explanation_snapshot,corrected_code_snapshot,language,starts_at,ends_at,expires_at,start_idempotency_key)
      values(p_guest_hash,p_user_id,q.id,q.version,q.title,q.prompt,q.code,q.line_count,q.correct_line,q.explanation,q.corrected_code,q.language,
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
end $function$;

CREATE OR REPLACE FUNCTION private.practice_dto(s private.practice_sessions, t timestamp with time zone)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select jsonb_build_object(
    'sessionId',s.id,'serverNow',t,'startsAt',s.starts_at,'endsAt',s.ends_at,
    'identity',case when s.user_id is null then 'guest' else 'account' end,
    'status',case when s.status='resolved' or t>=s.ends_at then 'resolved' else 'active' end,
    'question',jsonb_build_object('title',s.title_snapshot,'prompt',s.prompt_snapshot,'code',s.code_snapshot,'lineCount',s.line_count,'language',s.language),
    'selectedLine',s.selected_line,
    'solution',case when s.status='resolved' or t>=s.ends_at then
      jsonb_build_object('correctLine',s.correct_line,'explanation',s.explanation_snapshot,'correctedCode',s.corrected_code_snapshot,'isCorrect',s.is_correct)
      else null end
  );
$function$;

CREATE OR REPLACE FUNCTION private.round_dto(p_round uuid, p_actor uuid, p_time timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare r public.match_rounds; q private.round_questions; revealed boolean; result jsonb;
begin
  select * into strict r from public.match_rounds where id=p_round;
  revealed:=r.starts_at is not null and p_time>=r.starts_at and not coalesce(r.end_reason='match_ended' and r.resolved_at<r.starts_at,false);
  result:=jsonb_build_object('id',r.id,'number',r.round_number,'status',r.status,'startsAt',r.starts_at,'endsAt',r.ends_at,
    'winnerId',r.winner_user_id,'points',r.winning_points,'endReason',r.end_reason,
    'selectedLine',(select selected_line from private.answers where round_id=r.id and user_id=p_actor),'question',null,'solution',null);
  if revealed then
    select * into q from private.round_questions where round_id=r.id;
    if found then
      result:=result||jsonb_build_object('question',jsonb_build_object('title',q.title_snapshot,'prompt',q.prompt_snapshot,'code',q.code_snapshot,'lineCount',q.line_count,'language',(select m.language from public.matches m where m.id=r.match_id),'difficulty',case r.round_number when 1 then 'easy' when 2 then 'medium' else 'hard' end));
      if r.status='resolved' then
        result:=result||jsonb_build_object('solution',jsonb_build_object('correctLine',q.correct_line,'explanation',q.explanation_snapshot,'correctedCode',q.corrected_code_snapshot,
          'answers',(select coalesce(jsonb_agg(jsonb_build_object('userId',a.user_id,'selectedLine',a.selected_line,'isCorrect',a.is_correct,'points',a.awarded_points) order by a.user_id),'[]'::jsonb) from private.answers a where a.round_id=r.id)));
      end if;
    end if;
  end if;
  return result;
end $function$;

revoke debug_duel_game_engine,debug_duel_practice_engine from postgres;
