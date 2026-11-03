-- Never reveal a round that was cancelled before it began.
create or replace function private.match_dto(p_match uuid,p_actor uuid) returns jsonb
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

