-- Append-only evidence and versioned content. No new client permissions.
revoke delete on private.questions, private.round_questions, private.answers, private.match_settlements, private.xp_ledger from debug_duel_game_engine;
revoke update on private.questions, private.round_questions, private.answers, private.match_settlements, private.xp_ledger from debug_duel_game_engine;
grant update(is_active) on private.questions to debug_duel_game_engine;

alter table public.match_rounds drop constraint match_rounds_check;
alter table public.match_rounds add constraint round_duration_complete check (
  (starts_at is null and ends_at is null) or
  (starts_at is not null and ends_at is not null and ends_at = starts_at + interval '45 seconds')
);
alter table public.matches add constraint match_ended_reason check (
  ended_reason is null
  or (status='finished' and ((outcome_type in ('win','draw') and ended_reason='completed') or (outcome_type='forfeit' and ended_reason in ('player_left','connection_lost'))))
  or (status='cancelled' and ended_reason='host_left')
  or (status='expired' and ended_reason='lobby_expired')
  or (status='aborted' and ended_reason in ('both_disconnected','infrastructure_interruption'))
);
alter table public.matches add constraint match_winner_seat foreign key (id,winner_user_id)
  references public.match_players(match_id,user_id) on delete restrict deferrable initially deferred;

create function private.check_match_seats() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if old.started_at is not null and row(new.host_user_id,new.guest_user_id,new.started_at) is distinct from row(old.host_user_id,old.guest_user_id,old.started_at) then
    raise exception 'STARTED_MATCH_IMMUTABLE' using errcode='23514';
  end if;
  if exists (select 1 from public.match_players p where p.match_id=new.id
    and ((p.slot=1 and p.user_id<>new.host_user_id) or (p.slot=2 and p.user_id is distinct from new.guest_user_id))) then
    raise exception 'INVALID_PLAYER_SEAT' using errcode='23514';
  end if;
  return new;
end $$;
create trigger match_seats before update on public.matches for each row execute function private.check_match_seats();

create or replace function private.check_question_snapshot() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare q private.questions; expected_pool text; expected_difficulty text;
begin
  if tg_op = 'UPDATE' then
    if row(new.question_id,new.question_version,new.title_snapshot,new.prompt_snapshot,new.code_snapshot,new.line_count,new.correct_line,new.explanation_snapshot,new.corrected_code_snapshot)
      is distinct from row(old.question_id,old.question_version,old.title_snapshot,old.prompt_snapshot,old.code_snapshot,old.line_count,old.correct_line,old.explanation_snapshot,old.corrected_code_snapshot) then
      raise exception 'SNAPSHOT_IMMUTABLE' using errcode='23514';
    end if;
    if tg_table_name='round_questions' then
      if new.round_id <> old.round_id then raise exception 'SNAPSHOT_IMMUTABLE' using errcode='23514'; end if;
    else
      if row(new.id,new.guest_subject_hash,new.user_id,new.starts_at,new.ends_at,new.expires_at)
        is distinct from row(old.id,old.guest_subject_hash,old.user_id,old.starts_at,old.ends_at,old.expires_at) then
        raise exception 'PRACTICE_IDENTITY_IMMUTABLE' using errcode='23514';
      end if;
    end if;
    return new;
  end if;
  select * into strict q from private.questions where id=new.question_id;
  expected_pool := case when tg_table_name='round_questions' then 'duel' else 'practice' end;
  if q.pool <> expected_pool or not q.is_active or
    row(new.question_version,new.title_snapshot,new.prompt_snapshot,new.code_snapshot,new.line_count,new.correct_line,new.explanation_snapshot,new.corrected_code_snapshot)
    is distinct from row(q.version,q.title,q.prompt,q.code,q.line_count,q.correct_line,q.explanation,q.corrected_code) then
    raise exception 'INVALID_QUESTION_SNAPSHOT' using errcode='23514';
  end if;
  if tg_table_name='round_questions' then
    select case r.round_number when 1 then 'easy' when 2 then 'medium' else 'hard' end
      into expected_difficulty from public.match_rounds r where r.id=new.round_id;
    if q.difficulty <> expected_difficulty or exists (
      select 1 from private.round_questions rq join public.match_rounds r on r.id=rq.round_id
      where rq.question_id=q.id and r.match_id=(select rr.match_id from public.match_rounds rr where rr.id=new.round_id)
    ) then raise exception 'INVALID_ROUND_QUESTION' using errcode='23514'; end if;
  end if;
  return new;
end $$;

create or replace function private.check_answer_bounds() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare q private.round_questions; r public.match_rounds;
begin
  select * into strict q from private.round_questions where round_id=new.round_id;
  select * into strict r from public.match_rounds where id=new.round_id;
  if new.selected_line not between 1 and q.line_count then
    raise exception 'INVALID_LINE' using errcode='23514';
  end if;
  if r.starts_at is null or new.accepted_at < r.starts_at or new.accepted_at >= r.ends_at
    or new.elapsed_ms <> floor(extract(epoch from (new.accepted_at-r.starts_at))*1000)::integer
    or new.is_correct <> (new.selected_line=q.correct_line)
    or new.awarded_points <> (case when new.is_correct then 100 + floor(50.0 * (45000-new.elapsed_ms)/45000)::integer else 0 end) then
    raise exception 'INVALID_ANSWER_EVIDENCE' using errcode='23514';
  end if;
  return new;
end $$;

alter table private.practice_sessions add constraint practice_answer_truth check (
  selected_line is null or (is_correct = (selected_line=correct_line) and resolved_at >= starts_at and resolved_at < ends_at)
);
alter table private.practice_sessions add constraint practice_timeout check (
  status='active' or selected_line is not null or resolved_at >= ends_at
);
revoke all on function private.check_match_seats() from public, anon, authenticated;
grant execute on function private.check_match_seats() to debug_duel_game_engine;
