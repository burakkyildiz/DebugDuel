-- Keep the closed round visible for 15 seconds, followed by the existing 3-second countdown.
create or replace function private.resolve_match_round(p_match uuid,p_round uuid,p_winner uuid,p_points integer,p_reason text,p_time timestamptz) returns void
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
    update public.match_rounds set starts_at=p_time+interval '18 seconds',ends_at=p_time+interval '63 seconds' where match_id=p_match and round_number=r.round_number+1;
    update public.matches set status='between_rounds',state_version=state_version+1,updated_at=p_time where id=p_match;
  end if;
end $$;
