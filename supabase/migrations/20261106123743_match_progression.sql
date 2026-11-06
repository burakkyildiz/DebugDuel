-- Only matches that finish after this migration enter progression.
create role debug_duel_settlement_engine nologin noinherit;
grant debug_duel_settlement_engine to postgres;
grant usage on schema public, private to debug_duel_settlement_engine;
grant create on schema private to debug_duel_settlement_engine;

alter table private.xp_ledger add column total_after bigint
  check (total_after >= amount);

grant select on public.matches, public.match_players, public.match_rounds,
  private.answers, private.match_settlements, public.profiles to debug_duel_settlement_engine;
grant insert on private.match_settlements, private.xp_ledger to debug_duel_settlement_engine;
grant update (xp_earned) on public.match_players to debug_duel_settlement_engine;
grant update (xp, wins, losses, draws, matches_played, correct_answers, updated_at)
  on public.profiles to debug_duel_settlement_engine;

create policy settlement_matches_read on public.matches for select to debug_duel_settlement_engine using (true);
create policy settlement_players_read on public.match_players for select to debug_duel_settlement_engine using (true);
create policy settlement_players_update on public.match_players for update to debug_duel_settlement_engine using (true);
create policy settlement_rounds_read on public.match_rounds for select to debug_duel_settlement_engine using (true);
create policy settlement_answers_read on private.answers for select to debug_duel_settlement_engine using (true);
create policy settlement_records_read on private.match_settlements for select to debug_duel_settlement_engine using (true);
create policy settlement_records_insert on private.match_settlements for insert to debug_duel_settlement_engine with check (true);
create policy settlement_ledger_insert on private.xp_ledger for insert to debug_duel_settlement_engine with check (true);
create policy settlement_profiles_read on public.profiles for select to debug_duel_settlement_engine using (true);
create policy settlement_profiles_update on public.profiles for update to debug_duel_settlement_engine using (true);

revoke insert on private.match_settlements, private.xp_ledger from debug_duel_game_engine;

create function private.settle_finished_duel() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  day_utc date := (new.finished_at at time zone 'UTC')::date;
  eligible boolean;
  player record;
  result text;
  attempted boolean;
  earned integer;
  reason text;
  new_total bigint;
begin
  -- Lock both profiles in UUID order. This serializes the daily pair quota
  -- and the profile totals, including concurrent updates for different pairs.
  perform id from public.profiles
    where id in (new.host_user_id, new.guest_user_id)
    order by id for no key update;

  select count(*) < 5 into eligible
  from private.match_settlements s
  join public.matches m on m.id = s.match_id
  where s.reward_day = day_utc
    and ((m.host_user_id = new.host_user_id and m.guest_user_id = new.guest_user_id)
      or (m.host_user_id = new.guest_user_id and m.guest_user_id = new.host_user_id));

  insert into private.match_settlements(match_id, settled_at, outcome_type, reward_eligible, reward_day)
  values (new.id, new.finished_at, new.outcome_type, eligible, day_utc)
  on conflict (match_id) do nothing;
  if not found then return new; end if;

  for player in
    select user_id, rounds_won, correct_answers
    from public.match_players where match_id = new.id order by user_id
  loop
    result := case when new.winner_user_id is null then 'draw'
      when new.winner_user_id = player.user_id then 'win' else 'loss' end;

    select exists (
      select 1 from private.answers a
      join public.match_rounds r on r.id = a.round_id and r.match_id = a.match_id
      where a.match_id = new.id and a.user_id = player.user_id
        and (new.outcome_type <> 'forfeit' or r.status = 'resolved')
    ) into attempted;

    earned := 0;
    if not eligible then
      reason := 'daily_pair_limit';
    elsif new.outcome_type = 'forfeit' and result = 'loss' then
      reason := 'forfeit';
    elsif not attempted then
      reason := 'no_attempt';
    elsif new.outcome_type = 'forfeit' then
      earned := 30 + 10 * player.rounds_won;
      reason := 'forfeit';
    else
      earned := 20 + 10 * player.rounds_won
        + case result when 'win' then 30 when 'draw' then 15 else 0 end;
      reason := result;
    end if;

    update public.profiles
    set xp = xp + earned,
      wins = wins + (result = 'win')::integer,
      losses = losses + (result = 'loss')::integer,
      draws = draws + (result = 'draw')::integer,
      matches_played = matches_played + 1,
      correct_answers = correct_answers + player.correct_answers,
      updated_at = greatest(updated_at, new.finished_at)
    where id = player.user_id
    returning xp into strict new_total;

    update public.match_players set xp_earned = earned
    where match_id = new.id and user_id = player.user_id;

    insert into private.xp_ledger(match_id, user_id, amount, reason, created_at, total_after)
    values (new.id, player.user_id, earned, reason, new.finished_at, new_total);
  end loop;
  return new;
end $$;

revoke all on function private.settle_finished_duel() from public, anon, authenticated, service_role;
create trigger settle_finished_duel after update of status on public.matches
for each row when (old.status in ('countdown', 'playing', 'between_rounds')
  and new.status = 'finished' and new.engine_stage = 6)
execute function private.settle_finished_duel();
alter function private.settle_finished_duel() owner to debug_duel_settlement_engine;
revoke create on schema private from debug_duel_settlement_engine;
revoke debug_duel_settlement_engine from postgres;

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
end $$;

create function public.match_history(p_before timestamptz default null, p_before_id uuid default null, p_limit integer default 26)
returns table (
  match_id uuid, created_at timestamptz, status text, outcome text, rival text,
  own_result text, own_score integer, rival_score integer, xp_earned integer
)
language sql stable security invoker set search_path = '' as $$
  select m.id, m.created_at, m.status, m.outcome_type, rival.username_snapshot,
    own.result, own.total_score, rival.total_score, own.xp_earned
  from public.matches m
  join public.match_players own on own.match_id = m.id and own.user_id = (select auth.uid())
  left join public.match_players rival on rival.match_id = m.id and rival.slot <> own.slot
  where ((select auth.uid()) = m.host_user_id or (select auth.uid()) = m.guest_user_id)
    and m.status in ('finished', 'aborted', 'expired', 'cancelled')
    and ((p_before is null and p_before_id is null) or (m.created_at, m.id) < (p_before, p_before_id))
  order by m.created_at desc, m.id desc
  limit least(greatest(p_limit, 1), 51)
$$;

revoke all on function public.match_history(timestamptz,uuid,integer) from public, anon, authenticated, service_role;
grant execute on function public.match_history(timestamptz,uuid,integer) to authenticated;
