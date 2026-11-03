-- Phase 5 milestone: one round, no profile/XP settlement. Three-round format
-- remains the final contract; pending rounds are closed without revealing them.
alter table public.matches add column engine_stage smallint not null default 5 check (engine_stage in (5,6));
create index answers_round_match on private.answers(round_id,match_id);
create index matches_winner_seat on public.matches(id,winner_user_id);
grant debug_duel_game_engine,debug_duel_profile_engine to postgres;
grant create on schema private to debug_duel_game_engine,debug_duel_profile_engine;
grant usage on schema realtime to debug_duel_game_engine;
grant execute on function realtime.send(jsonb,text,text,boolean) to debug_duel_game_engine;

create function private.match_dto(p_match uuid,p_actor uuid) returns jsonb
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
  if r.starts_at is not null and t>=r.starts_at then
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

create function private.match_notify(p_match uuid) returns void
language sql security invoker set search_path='' as $$
  select realtime.send(jsonb_build_object('matchId',m.id,'stateVersion',m.state_version,'event','match_updated','status',m.status),'match_updated','match:'||m.id::text,true)
  from public.matches m where m.id=p_match;
$$;

create function private.finish_preview(p_match uuid,p_winner uuid,p_reason text) returns void
language plpgsql security invoker set search_path='' as $$
declare t timestamptz:=clock_timestamp();
begin
  update public.matches set status='finished',outcome_type=case when p_reason='completed' then case when p_winner is null then 'draw' else 'win' end else 'forfeit' end,
    winner_user_id=p_winner,ended_reason=p_reason,finished_at=t,next_transition_at=null,updated_at=t,state_version=state_version+1 where id=p_match and status not in ('finished','cancelled','expired','aborted');
  update public.match_players set is_active=false,result=case when p_winner is null then 'draw' when user_id=p_winner then 'win' else 'loss' end where match_id=p_match;
  update public.match_rounds set status='resolved',resolved_at=t,end_reason='match_ended' where match_id=p_match and status<>'resolved';
end $$;

create function private.match_advance(p_match uuid) returns void
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

create function private.match_command(p_actor uuid,p_action text,p_match uuid,p_key uuid,p_ready boolean,p_round uuid,p_line integer,p_hash text,p_cipher text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare m public.matches; r public.match_rounds; q private.questions; a private.answers; rec private.command_receipts; inv private.match_invites;
  actor_profile public.profiles; t timestamptz; request_digest text; command text; points integer; elapsed integer; changed boolean:=false; result jsonb;
begin
  if p_actor is null or p_actor is distinct from auth.uid() then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
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
      if rec.sensitive_response_ciphertext is not null and clock_timestamp()>=rec.ciphertext_expires_at then
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
alter function private.match_command(uuid,text,uuid,uuid,boolean,uuid,integer,text,text) owner to debug_duel_game_engine;
-- Verified identity relay: does not widen the Auth adapter's EXECUTE grants.
create function private.match_account(p_action text,p_match uuid,p_key uuid,p_ready boolean,p_round uuid,p_line integer,p_hash text,p_cipher text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid;
begin actor:=(private.ensure_profile()).id; return private.match_command(actor,p_action,p_match,p_key,p_ready,p_round,p_line,p_hash,p_cipher); end $$;
alter function private.match_account(text,uuid,uuid,boolean,uuid,integer,text,text) owner to debug_duel_profile_engine;
create function public.match_command(p_action text,p_match uuid default null,p_key uuid default null,p_ready boolean default null,p_round uuid default null,p_line integer default null,p_hash text default null,p_cipher text default null) returns jsonb
language sql security invoker set search_path='' as $$ select private.match_account(p_action,p_match,p_key,p_ready,p_round,p_line,p_hash,p_cipher); $$;

-- Policies are constrained to the exact match UUID string and inherit matches RLS.
create policy match_broadcast_read on realtime.messages for select to authenticated using (
  extension in ('broadcast','presence') and exists(select 1 from public.matches m where 'match:'||m.id::text=(select realtime.topic()))
);
create policy match_presence_write on realtime.messages for insert to authenticated with check (
  extension='presence' and exists(select 1 from public.matches m where 'match:'||m.id::text=(select realtime.topic()))
);
revoke all on function private.match_dto(uuid,uuid),private.match_notify(uuid),private.finish_preview(uuid,uuid,text),private.match_advance(uuid),
  private.match_command(uuid,text,uuid,uuid,boolean,uuid,integer,text,text),private.match_account(text,uuid,uuid,boolean,uuid,integer,text,text),public.match_command(text,uuid,uuid,boolean,uuid,integer,text,text) from public,anon,authenticated,service_role;
grant execute on function private.match_dto(uuid,uuid),private.match_notify(uuid),private.finish_preview(uuid,uuid,text),private.match_advance(uuid),private.practice_limit(text,text,integer,interval) to debug_duel_game_engine;
grant execute on function private.match_command(uuid,text,uuid,uuid,boolean,uuid,integer,text,text) to debug_duel_profile_engine;
grant execute on function private.match_account(text,uuid,uuid,boolean,uuid,integer,text,text),public.match_command(text,uuid,uuid,boolean,uuid,integer,text,text) to authenticated;
-- Reuse the existing narrow shared rate-counter policy, never the Practice tables.
grant select,insert,update,delete on private.rate_limits to debug_duel_game_engine;
revoke create on schema private from debug_duel_game_engine,debug_duel_profile_engine;
revoke debug_duel_game_engine,debug_duel_profile_engine from postgres;
