-- The room language is part of the participant-only match state.
CREATE OR REPLACE FUNCTION private.match_dto(p_match uuid, p_actor uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
    'stage','full_match','language',m.language,'roundCount',3,'nextPhaseAt',phase_at,'nextStartsAt',next_at,'host',m.host_user_id=p_actor,
    'outcome',m.outcome_type,'winnerId',m.winner_user_id,'endedReason',m.ended_reason,
    'players',(select coalesce(jsonb_agg(jsonb_build_object('id',p.user_id,'username',coalesce(p.username_snapshot,pr.username),'slot',p.slot,
      'ready',p.ready_at is not null,'lastSeenAt',p.last_seen_at,'score',p.total_score,'hasSubmitted',exists(select 1 from private.answers a where a.round_id=r.id and a.user_id=p.user_id)) order by p.slot),'[]'::jsonb)
      from public.match_players p join public.profiles pr on pr.id=p.user_id where p.match_id=m.id),
    'round',current_dto-'question'-'solution'-'selectedLine'-'endReason',
    'self',jsonb_build_object('id',p_actor,'selectedLine',current_dto->'selectedLine'),
    'question',current_dto->'question','solution',current_dto->'solution',
    'rounds',(select jsonb_agg(private.round_dto(rr.id,p_actor,t) order by rr.round_number) from public.match_rounds rr where rr.match_id=m.id));
  if m.status='finished' then
    select result || jsonb_build_object('progress', jsonb_build_object(
      'xpEarned', l.amount, 'totalXp', l.total_after,
      'dailyLimit', l.reason='daily_pair_limit'))
      into current_dto
      from private.xp_ledger l
      where l.match_id=m.id and l.user_id=p_actor and l.total_after is not null;
    if found then result:=current_dto; end if;
  end if;
  return result;
end $function$;
