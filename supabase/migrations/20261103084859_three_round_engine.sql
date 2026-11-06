-- Phase 6: DB-authoritative three-round engine. No XP/profile settlement yet.
create extension if not exists pg_cron;
grant debug_duel_game_engine,debug_duel_profile_engine to postgres;
grant create on schema private to debug_duel_game_engine,debug_duel_profile_engine;
alter table public.matches alter column engine_stage set default 6;
alter table private.command_receipts add column sensitive_response_expired boolean not null default false;
alter table private.engine_health add column last_error_at timestamptz;
alter table private.engine_health add column failed_matches integer not null default 0;
-- Existing stage-5 rooms retain their one-round contract; new rooms use stage 6.
create or replace function private.match_command_stage5(p_actor uuid,p_action text,p_match uuid,p_key uuid,p_ready boolean,p_round uuid,p_line integer,p_hash text,p_cipher text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare m public.matches; r public.match_rounds; q private.questions; a private.answers; rec private.command_receipts; inv private.match_invites;
  actor_profile public.profiles; t timestamptz; request_digest text; command text; points integer; elapsed integer; changed boolean:=false; result jsonb;
begin
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
  request_digest:=encode(sha256(convert_to(jsonb_build_object('action',p_action,'match',p_match,'ready',p_ready,'token',case when p_action='join' then p_hash else null end)::text,'UTF8')),'hex');
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
    if exists(select 1 from public.match_players where user_id=p_actor and is_active) then raise exception 'ALREADY_IN_ACTIVE_MATCH' using errcode='P0001'; end if;
    insert into public.matches(host_user_id,next_transition_at) values(p_actor,clock_timestamp()+interval '15 minutes') returning * into m;
    insert into public.match_players(match_id,user_id,slot,username_snapshot) values(m.id,p_actor,1,actor_profile.username);
    insert into public.match_rounds(match_id,round_number) select m.id,n from generate_series(1,3) n;
    insert into private.match_invites(match_id,token_hash,expires_at) values(m.id,p_hash,m.lobby_expires_at);
    changed:=true;
  else
    if p_action='join' then
      select match_id into p_match from private.match_invites where token_hash=p_hash;
    end if;
    select * into m from public.matches where id=p_match for update;
    if not found then raise exception 'ROOM_UNAVAILABLE' using errcode='P0001'; end if;
    if p_action<>'join' and p_actor not in (m.host_user_id,coalesce(m.guest_user_id,m.host_user_id)) then raise exception 'ROOM_UNAVAILABLE' using errcode='P0001'; end if;
    perform private.match_advance(m.id);
    select * into m from public.matches where id=m.id;
    if p_action='join' then
      select * into inv from private.match_invites where match_id=m.id and token_hash=p_hash;
      if not found or clock_timestamp()>=inv.expires_at or m.status<>'waiting' or p_actor=m.host_user_id then raise exception 'ROOM_UNAVAILABLE' using errcode='P0001'; end if;
      if m.guest_user_id=p_actor then return jsonb_build_object('matchId',m.id); end if;
      if m.guest_user_id is not null or inv.consumed_at is not null then raise exception 'ROOM_FULL' using errcode='P0001'; end if;
      if exists(select 1 from public.match_players where user_id=p_actor and is_active) then raise exception 'ALREADY_IN_ACTIVE_MATCH' using errcode='P0001'; end if;
      update public.matches set guest_user_id=p_actor,state_version=state_version+1,updated_at=clock_timestamp() where id=m.id;
      insert into public.match_players(match_id,user_id,slot,username_snapshot) values(m.id,p_actor,2,actor_profile.username);
      update private.match_invites set consumed_by=p_actor,consumed_at=clock_timestamp() where match_id=m.id;
      update public.match_players set ready_at=null where match_id=m.id;
      changed:=true;
    elsif p_action='invite' then
      if p_actor<>m.host_user_id or m.status<>'waiting' or m.guest_user_id is not null then raise exception 'ROOM_UNAVAILABLE' using errcode='P0001'; end if;
      update private.match_invites set token_hash=p_hash,expires_at=m.lobby_expires_at,consumed_by=null,consumed_at=null,rotated_at=clock_timestamp() where match_id=m.id;
      update public.matches set state_version=state_version+1,updated_at=clock_timestamp() where id=m.id;
      changed:=true;
    elsif p_action in ('heartbeat','sync') then
      if p_action='heartbeat' and m.status in ('waiting','countdown','playing') then update public.match_players set last_seen_at=clock_timestamp() where match_id=m.id and user_id=p_actor; end if;
      changed:=true;
    elsif p_action='ready' then
      if m.status<>'waiting' then raise exception 'ROUND_CLOSED' using errcode='P0001'; end if;
      update public.match_players set ready_at=case when p_ready then clock_timestamp() else null end,last_seen_at=clock_timestamp() where match_id=m.id and user_id=p_actor;
      update public.match_players set ready_at=null where match_id=m.id and last_seen_at<clock_timestamp()-interval '15 seconds';
      if (select count(*)=2 and bool_and(ready_at is not null and last_seen_at>=clock_timestamp()-interval '15 seconds') from public.match_players where match_id=m.id) then
        select * into r from public.match_rounds where match_id=m.id and round_number=1 for update;
        select * into q from private.questions where slug='sum-readings' and version=1 and pool='duel' and is_active for share;
        if not found then raise exception 'ENGINE_UNAVAILABLE' using errcode='P0001'; end if;
        insert into private.round_questions select r.id,q.id,q.version,q.title,q.prompt,q.code,q.line_count,q.correct_line,q.explanation,q.corrected_code;
        t:=clock_timestamp();
        update public.match_rounds set starts_at=t+interval '3 seconds',ends_at=t+interval '48 seconds' where id=r.id;
        update public.matches set status='countdown',started_at=t+interval '3 seconds',current_round_number=1,next_transition_at=t+interval '3 seconds' where id=m.id;
      end if;
      update public.matches set state_version=state_version+1,updated_at=clock_timestamp() where id=m.id;
      changed:=true;
    elsif p_action='answer' then
      select * into r from public.match_rounds where match_id=m.id and id=p_round and round_number=1 for update;
      if not found then raise exception 'ROOM_UNAVAILABLE' using errcode='P0001'; end if;
      select * into a from private.answers where user_id=p_actor and idempotency_key=p_key;
      if found then
        if a.round_id<>p_round or a.selected_line is distinct from p_line then raise exception 'IDEMPOTENCY_CONFLICT' using errcode='P0001'; end if;
        return private.match_dto(m.id,p_actor);
      end if;
      t:=clock_timestamp();
      if m.status not in ('countdown','playing') or r.status='resolved' or t>=r.ends_at then raise exception 'ROUND_CLOSED' using errcode='P0001'; end if;
      if r.starts_at is null or t<r.starts_at then raise exception 'ROUND_NOT_STARTED' using errcode='P0001'; end if;
      if exists(select 1 from private.answers where round_id=r.id and user_id=p_actor) then raise exception 'ALREADY_SUBMITTED' using errcode='P0001'; end if;
      select questions.* into q from private.questions questions join private.round_questions rq on rq.question_id=questions.id where rq.round_id=r.id;
      if p_line is null or p_line not between 1 and q.line_count then raise exception 'INVALID_LINE' using errcode='22023'; end if;
      elapsed:=floor(extract(epoch from(t-r.starts_at))*1000)::integer;
      points:=case when p_line=q.correct_line then 100+floor(50.0*(45000-elapsed)/45000)::integer else 0 end;
      insert into private.answers(round_id,match_id,user_id,selected_line,accepted_at,elapsed_ms,is_correct,awarded_points,idempotency_key,request_hash)
        values(r.id,m.id,p_actor,p_line,t,elapsed,p_line=q.correct_line,points,p_key,encode(sha256(convert_to(jsonb_build_object('roundId',r.id,'selectedLine',p_line)::text,'UTF8')),'hex'));
      if points>0 then
        update public.match_players set total_score=points,rounds_won=1,correct_answers=1 where match_id=m.id and user_id=p_actor;
        update public.match_rounds set status='resolved',winner_user_id=p_actor,winning_points=points,resolved_at=t,end_reason='correct_answer' where id=r.id;
        perform private.finish_preview(m.id,p_actor,'completed');
      elsif (select count(*)=2 from private.answers where round_id=r.id) then
        update public.match_rounds set status='resolved',resolved_at=t,end_reason='both_incorrect' where id=r.id;
        perform private.finish_preview(m.id,null,'completed');
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
      elsif m.status in ('countdown','playing') then perform private.finish_preview(m.id,case when p_actor=m.host_user_id then m.guest_user_id else m.host_user_id end,'player_left');
      end if;
      changed:=true;
    end if;
  end if;
  if changed then perform private.match_notify(m.id); end if;
  if p_action in ('create','invite','join','ready','leave') then
    result:=jsonb_build_object('matchId',m.id);
    insert into private.command_receipts(user_id,command_name,idempotency_key,request_hash,safe_response,sensitive_response_ciphertext,ciphertext_expires_at)
      values(p_actor,command,p_key,request_digest,result,case when p_action in ('create','invite') then decode(p_cipher,'base64') else null end,
        case when p_action in ('create','invite') then m.lobby_expires_at else null end);
    if p_action in ('create','invite') then result:=result||jsonb_build_object('inviteCiphertext',p_cipher); end if;
    return result;
  end if;
  return private.match_dto(m.id,p_actor);
end $$;
-- Never reveal a round that was cancelled before it began.
create or replace function private.match_dto_stage5(p_match uuid,p_actor uuid) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare m public.matches; r public.match_rounds; q private.round_questions; t timestamptz:=clock_timestamp(); result jsonb; own private.answers;
begin
  select * into m from public.matches where id=p_match and p_actor in (host_user_id,guest_user_id);
  if not found then raise exception 'ROOM_UNAVAILABLE' using errcode='P0001'; end if;
  select * into r from public.match_rounds where match_id=m.id and round_number=1;
  select * into own from private.answers where round_id=r.id and user_id=p_actor;
  result:=jsonb_build_object('matchId',m.id,'stateVersion',m.state_version,'status',m.status,'serverNow',t,'lobbyExpiresAt',m.lobby_expires_at,
    'stage','single_round_preview','host',m.host_user_id=p_actor,'outcome',m.outcome_type,'winnerId',m.winner_user_id,'endedReason',m.ended_reason,
    'players',(select coalesce(jsonb_agg(jsonb_build_object('id',p.user_id,'username',coalesce(p.username_snapshot,pr.username),'slot',p.slot,
      'ready',p.ready_at is not null,'lastSeenAt',p.last_seen_at,'score',p.total_score,'hasSubmitted',exists(select 1 from private.answers a where a.round_id=r.id and a.user_id=p.user_id)) order by p.slot),'[]'::jsonb)
      from public.match_players p join public.profiles pr on pr.id=p.user_id where p.match_id=m.id),
    'round',jsonb_build_object('id',r.id,'number',1,'status',r.status,'startsAt',r.starts_at,'endsAt',r.ends_at,'winnerId',r.winner_user_id,'points',r.winning_points),
    'self',jsonb_build_object('id',p_actor,'selectedLine',own.selected_line),'question',null,'solution',null);
  -- Code cannot leave DB before the common start, even if status changed early.
  if r.starts_at is not null and t>=r.starts_at and not coalesce(r.end_reason='match_ended' and r.resolved_at<r.starts_at,false) then
    select * into q from private.round_questions where round_id=r.id;
    if found then
      result:=result||jsonb_build_object('question',jsonb_build_object('title',q.title_snapshot,'prompt',q.prompt_snapshot,'code',q.code_snapshot,'lineCount',q.line_count,'language','python'));
      if r.status='resolved' then
        result:=result||jsonb_build_object('solution',jsonb_build_object('correctLine',q.correct_line,'explanation',q.explanation_snapshot,
          'answers',(select coalesce(jsonb_agg(jsonb_build_object('userId',a.user_id,'selectedLine',a.selected_line,'isCorrect',a.is_correct,'points',a.awarded_points) order by a.user_id),'[]'::jsonb) from private.answers a where a.round_id=r.id)));
      end if;
    end if;
  end if;
  return result;
end $$;

create function private.match_advance_stage5(p_match uuid) returns void
language plpgsql security invoker set search_path='' as $$
declare m public.matches; r public.match_rounds; t timestamptz:=clock_timestamp();
begin
  select * into strict m from public.matches where id=p_match for update;
  if m.status='waiting' and t>=m.lobby_expires_at then
    update public.matches set status='expired',finished_at=t,ended_reason='lobby_expired',next_transition_at=null,state_version=state_version+1,updated_at=t where id=m.id;
    update public.match_players set is_active=false where match_id=m.id;
  elsif m.status in ('countdown','playing') then
    select * into strict r from public.match_rounds where match_id=m.id and round_number=1 for update;
    t:=clock_timestamp();
    if t>=r.ends_at then
      update public.match_rounds set status='resolved',resolved_at=t,end_reason='timeout' where id=r.id and status<>'resolved';
      perform private.finish_preview(m.id,null,'completed');
    elsif m.status='countdown' and t>=r.starts_at then
      update public.matches set status='playing',next_transition_at=r.ends_at,state_version=state_version+1,updated_at=t where id=m.id;
      update public.match_rounds set status='active' where id=r.id;
    end if;
  end if;
end $$;

create function private.finish_match(p_match uuid,p_winner uuid,p_reason text) returns void
language plpgsql security invoker set search_path='' as $$
declare t timestamptz:=clock_timestamp(); terminal text;
begin
  terminal:=case when p_reason in ('both_disconnected','infrastructure_interruption') then 'aborted' else 'finished' end;
  update public.matches set status=terminal,
    outcome_type=case when terminal='aborted' then null when p_reason<>'completed' then 'forfeit' when p_winner is null then 'draw' else 'win' end,
    winner_user_id=case when terminal='aborted' then null else p_winner end,
    ended_reason=p_reason,finished_at=t,next_transition_at=null,updated_at=t,state_version=state_version+1
    where id=p_match and status in ('countdown','playing','between_rounds');
  if not found then return; end if;
  update public.match_players set is_active=false,ready_at=null,
    result=case when terminal='aborted' then 'aborted' when p_winner is null then 'draw' when user_id=p_winner then 'win' else 'loss' end where match_id=p_match;
  update public.match_rounds set status='resolved',resolved_at=t,end_reason='match_ended'
    where match_id=p_match and status<>'resolved';
end $$;

create function private.recompute_match_transition(p_match uuid) returns void
language plpgsql security invoker set search_path='' as $$
declare m public.matches; r public.match_rounds; due timestamptz; live_due timestamptz; t timestamptz:=clock_timestamp();
begin
  select * into strict m from public.matches where id=p_match;
  if m.status='waiting' then
    select least(m.lobby_expires_at,min(last_seen_at+interval '15 seconds')) into due from public.match_players where match_id=m.id and ready_at is not null;
  elsif m.status in ('countdown','playing','between_rounds') then
    if m.status='between_rounds' then
      select starts_at-interval '3 seconds' into due from public.match_rounds where match_id=m.id and round_number=m.current_round_number+1;
    else
      select * into strict r from public.match_rounds where match_id=m.id and round_number=m.current_round_number;
      due:=case when m.status='countdown' then r.starts_at else r.ends_at end;
    end if;
    select min(greatest(last_seen_at+interval '30 seconds',t+interval '1 second')) into live_due from public.match_players where match_id=m.id;
    due:=least(due,live_due);
  end if;
  update public.matches set next_transition_at=due where id=m.id;
end $$;

create function private.resolve_match_round(p_match uuid,p_round uuid,p_winner uuid,p_points integer,p_reason text,p_time timestamptz) returns void
language plpgsql security invoker set search_path='' as $$
declare r public.match_rounds; winner uuid;
begin
  select * into strict r from public.match_rounds where id=p_round and match_id=p_match for update;
  if r.status='resolved' then return; end if;
  update public.match_rounds set status='resolved',winner_user_id=p_winner,winning_points=p_points,resolved_at=p_time,end_reason=p_reason where id=r.id;
  if p_winner is not null then
    update public.match_players set total_score=total_score+p_points,rounds_won=rounds_won+1,correct_answers=correct_answers+1 where match_id=p_match and user_id=p_winner;
  end if;
  if r.round_number=3 then
    select user_id into winner from public.match_players where match_id=p_match and total_score>(select min(total_score) from public.match_players where match_id=p_match);
    perform private.finish_match(p_match,winner,'completed');
  else
    update public.match_rounds set starts_at=p_time+interval '8 seconds',ends_at=p_time+interval '53 seconds' where match_id=p_match and round_number=r.round_number+1;
    update public.matches set status='between_rounds',state_version=state_version+1,updated_at=p_time where id=p_match;
  end if;
end $$;

create or replace function private.match_advance(p_match uuid) returns void
language plpgsql security invoker set search_path='' as $$
declare m public.matches; r public.match_rounds; h private.engine_health; t timestamptz; a public.match_players; b public.match_players;
begin
  select * into strict m from public.matches where id=p_match for update;
  if m.engine_stage=5 then perform private.match_advance_stage5(m.id); return; end if;
  t:=clock_timestamp();
  if m.status='waiting' then
    if t>=m.lobby_expires_at then
      update public.matches set status='expired',finished_at=t,ended_reason='lobby_expired',next_transition_at=null,state_version=state_version+1,updated_at=t where id=m.id;
      update public.match_players set is_active=false,ready_at=null where match_id=m.id;
    else
      update public.match_players set ready_at=null where match_id=m.id and ready_at is not null and last_seen_at<=t-interval '15 seconds';
      if found then update public.matches set state_version=state_version+1,updated_at=t where id=m.id; end if;
    end if;
  elsif m.status in ('countdown','playing','between_rounds') then
    select * into strict h from private.engine_health where id;
    if h.last_successful_tick_at is null or t-h.last_successful_tick_at>interval '10 seconds'
      or (h.last_gap_at is not null and m.started_at-interval '3 seconds'<=h.last_gap_at) then
      perform private.finish_match(m.id,null,'infrastructure_interruption'); return;
    end if;
    if m.status='between_rounds' then
      select * into strict r from public.match_rounds where match_id=m.id and round_number=m.current_round_number+1 for update;
      if t>=r.starts_at-interval '3 seconds' then
        update public.matches set status='countdown',current_round_number=r.round_number,state_version=state_version+1,updated_at=t where id=m.id returning * into m;
      end if;
    end if;
    if m.status in ('countdown','playing') then
      select * into strict r from public.match_rounds where match_id=m.id and round_number=m.current_round_number for update;
      t:=clock_timestamp();
      if t>=r.ends_at then
        perform private.resolve_match_round(m.id,r.id,null,0,'timeout',t);
      elsif m.status='countdown' and t>=r.starts_at then
        update public.match_rounds set status='active' where id=r.id;
        update public.matches set status='playing',state_version=state_version+1,updated_at=t where id=m.id;
      end if;
    end if;
    -- A third-round normal ending has priority over disconnect adjudication.
    select * into strict m from public.matches where id=m.id;
    if m.status in ('countdown','playing','between_rounds') then
      select * into strict a from public.match_players where match_id=m.id and slot=1;
      select * into strict b from public.match_players where match_id=m.id and slot=2;
      t:=clock_timestamp();
      if a.last_seen_at<=t-interval '30 seconds' and b.last_seen_at<=t-interval '30 seconds' then
        perform private.finish_match(m.id,null,'both_disconnected');
      elsif a.last_seen_at<=t-interval '30 seconds' and b.last_seen_at>=t-interval '15 seconds' then
        perform private.finish_match(m.id,b.user_id,'connection_lost');
      elsif b.last_seen_at<=t-interval '30 seconds' and a.last_seen_at>=t-interval '15 seconds' then
        perform private.finish_match(m.id,a.user_id,'connection_lost');
      end if;
    end if;
  end if;
  perform private.recompute_match_transition(m.id);
end $$;

create function private.round_dto(p_round uuid,p_actor uuid,p_time timestamptz) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
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
      result:=result||jsonb_build_object('question',jsonb_build_object('title',q.title_snapshot,'prompt',q.prompt_snapshot,'code',q.code_snapshot,'lineCount',q.line_count,'language','python','difficulty',case r.round_number when 1 then 'easy' when 2 then 'medium' else 'hard' end));
      if r.status='resolved' then
        result:=result||jsonb_build_object('solution',jsonb_build_object('correctLine',q.correct_line,'explanation',q.explanation_snapshot,'correctedCode',q.corrected_code_snapshot,
          'answers',(select coalesce(jsonb_agg(jsonb_build_object('userId',a.user_id,'selectedLine',a.selected_line,'isCorrect',a.is_correct,'points',a.awarded_points) order by a.user_id),'[]'::jsonb) from private.answers a where a.round_id=r.id)));
      end if;
    end if;
  end if;
  return result;
end $$;

create or replace function private.match_dto(p_match uuid,p_actor uuid) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare m public.matches; r public.match_rounds; t timestamptz:=clock_timestamp(); result jsonb; current_dto jsonb; next_at timestamptz; phase_at timestamptz;
begin
  select * into m from public.matches where id=p_match and p_actor in(host_user_id,guest_user_id);
  if not found then raise exception 'ROOM_UNAVAILABLE' using errcode='P0001'; end if;
  if m.engine_stage=5 then return private.match_dto_stage5(p_match,p_actor); end if;
  select * into strict r from public.match_rounds where match_id=m.id and round_number=greatest(m.current_round_number,1);
  current_dto:=private.round_dto(r.id,p_actor,t);
  if m.status='between_rounds' then
    select starts_at into next_at from public.match_rounds where match_id=m.id and round_number=r.round_number+1;
    phase_at:=next_at-interval '3 seconds';
  elsif m.status='countdown' then phase_at:=r.starts_at;
  elsif m.status='playing' then phase_at:=r.ends_at;
  end if;
  result:=jsonb_build_object('matchId',m.id,'stateVersion',m.state_version,'status',m.status,'serverNow',t,'lobbyExpiresAt',m.lobby_expires_at,
    'stage','full_match','roundCount',3,'nextPhaseAt',phase_at,'nextStartsAt',next_at,'host',m.host_user_id=p_actor,
    'outcome',m.outcome_type,'winnerId',m.winner_user_id,'endedReason',m.ended_reason,
    'players',(select coalesce(jsonb_agg(jsonb_build_object('id',p.user_id,'username',coalesce(p.username_snapshot,pr.username),'slot',p.slot,
      'ready',p.ready_at is not null,'lastSeenAt',p.last_seen_at,'score',p.total_score,'hasSubmitted',exists(select 1 from private.answers a where a.round_id=r.id and a.user_id=p.user_id)) order by p.slot),'[]'::jsonb)
      from public.match_players p join public.profiles pr on pr.id=p.user_id where p.match_id=m.id),
    'round',current_dto-'question'-'solution'-'selectedLine'-'endReason',
    'self',jsonb_build_object('id',p_actor,'selectedLine',current_dto->'selectedLine'),
    'question',current_dto->'question','solution',current_dto->'solution',
    'rounds',(select jsonb_agg(private.round_dto(rr.id,p_actor,t) order by rr.round_number) from public.match_rounds rr where rr.match_id=m.id));
  return result;
end $$;
create or replace function private.match_command(p_actor uuid,p_action text,p_match uuid,p_key uuid,p_ready boolean,p_round uuid,p_line integer,p_hash text,p_cipher text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare m public.matches; r public.match_rounds; q private.round_questions; chosen private.questions; a private.answers; rec private.command_receipts; inv private.match_invites;
  actor_profile public.profiles; t timestamptz; request_digest text; command text; points integer; elapsed integer; changed boolean:=false; result jsonb;
begin
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
  request_digest:=encode(sha256(convert_to(jsonb_build_object('action',p_action,'match',p_match,'ready',p_ready,'token',case when p_action='join' then p_hash else null end)::text,'UTF8')),'hex');
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
    insert into public.matches(host_user_id,next_transition_at) values(p_actor,clock_timestamp()+interval '15 minutes') returning * into m;
    insert into public.match_players(match_id,user_id,slot,username_snapshot) values(m.id,p_actor,1,actor_profile.username);
    insert into public.match_rounds(match_id,round_number) select m.id,n from generate_series(1,3) n;
    insert into private.match_invites(match_id,token_hash,expires_at) values(m.id,p_hash,m.lobby_expires_at);
    changed:=true;
  else
    if p_action='join' then
      select match_id into p_match from private.match_invites where token_hash=p_hash;
    end if;
    select * into m from public.matches where id=p_match for update;
    if not found then raise exception 'ROOM_UNAVAILABLE' using errcode='P0001'; end if;
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
      update public.match_players set ready_at=null where match_id=m.id;
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
          select candidate.* into chosen from private.questions candidate where candidate.pool='duel' and candidate.language='python' and candidate.is_active
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
end $$;
-- Recompile the existing verified identity relay against the updated command.
create or replace function private.match_account(p_action text,p_match uuid,p_key uuid,p_ready boolean,p_round uuid,p_line integer,p_hash text,p_cipher text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid;
begin actor:=(private.ensure_profile()).id; return private.match_command(actor,p_action,p_match,p_key,p_ready,p_round,p_line,p_hash,p_cipher); end $$;

create function private.advance_due_matches() returns void
language plpgsql security definer set search_path='' as $$
declare t timestamptz:=clock_timestamp(); previous_tick timestamptz; m record; before_version bigint; count_processed integer:=0;
begin
  if not pg_try_advisory_xact_lock(hashtextextended('debug-duel:engine-tick',0)) then return; end if;
  select last_successful_tick_at into previous_tick from private.engine_health where id;
  if previous_tick is null or t-previous_tick>interval '10 seconds' then
    update private.engine_health set last_gap_at=t where id;
  end if;
  -- MVCC publishes this tick and its transitions together on commit.
  update private.engine_health set last_successful_tick_at=t where id;
  for m in select id,state_version from public.matches
    where status in ('waiting','countdown','playing','between_rounds') and (next_transition_at<=t
      or (engine_stage=6 and status<>'waiting' and (previous_tick is null or t-previous_tick>interval '10 seconds')))
    order by next_transition_at,id limit 100 for update skip locked loop
    exit when clock_timestamp()-t>interval '250 milliseconds';
    count_processed:=count_processed+1;
    begin
      perform private.match_advance(m.id);
      if (select state_version<>m.state_version from public.matches where id=m.id) then perform private.match_notify(m.id); end if;
    exception when others then
      update private.engine_health set last_error_at=clock_timestamp(),failed_matches=least(failed_matches+1,2147483647) where id;
      raise warning 'DEBUG_DUEL_MATCH_ADVANCE_FAILED match=% state=%',m.id,sqlstate;
      begin
        perform private.finish_match(m.id,null,'infrastructure_interruption');
        perform private.match_notify(m.id);
      exception when others then
        -- Keep a malformed room from monopolizing every tick.
        update public.matches set next_transition_at=clock_timestamp()+interval '5 seconds'
          where id=m.id and status in ('waiting','countdown','playing','between_rounds');
      end;
    end;
  end loop;
end $$;

create function private.cleanup_game_data() returns void
language plpgsql security definer set search_path='' as $$
declare t timestamptz:=clock_timestamp();
begin
  update private.command_receipts set sensitive_response_ciphertext=null,ciphertext_expires_at=null,sensitive_response_expired=true
    where ciphertext_expires_at<=t;
  delete from private.practice_sessions where expires_at<=t;
  delete from private.rate_limits where window_start<t-interval '24 hours';
end $$;

create function private.engine_status() returns jsonb
language sql stable security definer set search_path='' as $$
  select jsonb_build_object('ready',coalesce(last_successful_tick_at>=clock_timestamp()-interval '5 seconds',false),
    'lastSuccessfulTickAt',last_successful_tick_at) from private.engine_health where id;
$$;
create function public.engine_status() returns jsonb
language sql stable security invoker set search_path='' as $$select private.engine_status();$$;

alter function private.match_command_stage5(uuid,text,uuid,uuid,boolean,uuid,integer,text,text) owner to debug_duel_game_engine;
alter function private.advance_due_matches() owner to debug_duel_game_engine;
alter function private.cleanup_game_data() owner to debug_duel_game_engine;
alter function private.engine_status() owner to debug_duel_game_engine;
revoke all on function private.match_command_stage5(uuid,text,uuid,uuid,boolean,uuid,integer,text,text),private.match_dto_stage5(uuid,uuid),private.match_advance_stage5(uuid),
  private.finish_match(uuid,uuid,text),private.recompute_match_transition(uuid),private.resolve_match_round(uuid,uuid,uuid,integer,text,timestamptz),
  private.round_dto(uuid,uuid,timestamptz),private.advance_due_matches(),private.cleanup_game_data(),private.engine_status(),public.engine_status()
  from public,anon,authenticated,service_role;
grant execute on function private.match_dto_stage5(uuid,uuid),private.match_advance_stage5(uuid),private.finish_match(uuid,uuid,text),private.recompute_match_transition(uuid),
  private.resolve_match_round(uuid,uuid,uuid,integer,text,timestamptz),private.round_dto(uuid,uuid,timestamptz) to debug_duel_game_engine;
grant execute on function private.engine_status(),public.engine_status() to anon,authenticated;
-- No scheduler EXECUTE for client roles, even with a real account JWT.
revoke create on schema private from debug_duel_game_engine,debug_duel_profile_engine;
revoke debug_duel_game_engine,debug_duel_profile_engine from postgres;

select cron.schedule('debug-duel-advance-matches','1 second','select private.advance_due_matches();');
select cron.schedule('debug-duel-maintenance','0 0 * * *',$job$
  select private.cleanup_game_data();
  delete from cron.job_run_details where end_time<clock_timestamp()-interval '7 days'
    and jobid in(select jobid from cron.job where jobname in ('debug-duel-advance-matches','debug-duel-maintenance'));
$job$);
