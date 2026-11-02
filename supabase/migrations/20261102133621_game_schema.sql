-- Phase 3: storage and least-privilege boundaries, no client gameplay commands yet.
create role debug_duel_game_engine nologin noinherit;
grant debug_duel_game_engine to postgres;
grant usage on schema public, private, auth to debug_duel_game_engine;
grant create on schema private to debug_duel_game_engine;

create function private.code_line_count(source text) returns integer
language sql immutable strict security invoker set search_path = '' as $$
  select cardinality(string_to_array(source, E'\n'));
$$;
revoke all on function private.code_line_count(text) from public, anon, authenticated;
grant execute on function private.code_line_count(text) to debug_duel_game_engine;

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  host_user_id uuid not null references public.profiles(id) on delete restrict,
  guest_user_id uuid references public.profiles(id) on delete restrict,
  mode text not null default 'bug_hunt' check (mode = 'bug_hunt'),
  language text not null default 'python' check (language = 'python'),
  status text not null default 'waiting' check (status in ('waiting','countdown','playing','between_rounds','finished','cancelled','expired','aborted')),
  round_count smallint not null default 3 check (round_count = 3),
  round_duration_ms integer not null default 45000 check (round_duration_ms = 45000),
  current_round_number smallint not null default 0 check (current_round_number between 0 and 3),
  state_version bigint not null default 0 check (state_version >= 0),
  outcome_type text check (outcome_type in ('win','draw','forfeit')),
  winner_user_id uuid references public.profiles(id) on delete restrict,
  ended_reason text check (ended_reason in ('completed','player_left','connection_lost','host_left','lobby_expired','both_disconnected','infrastructure_interruption')),
  lobby_expires_at timestamptz not null default (clock_timestamp() + interval '15 minutes'),
  next_transition_at timestamptz,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  check (guest_user_id is null or host_user_id <> guest_user_id),
  check (winner_user_id is null or winner_user_id = host_user_id or (guest_user_id is not null and winner_user_id = guest_user_id)),
  check ((status = 'finished' and outcome_type is not null and guest_user_id is not null
      and ((outcome_type = 'draw' and winner_user_id is null) or (outcome_type in ('win','forfeit') and winner_user_id is not null)))
    or (status <> 'finished' and outcome_type is null and winner_user_id is null)),
  check ((status in ('finished','cancelled','expired','aborted')) = (finished_at is not null)),
  check ((status in ('finished','cancelled','expired','aborted')) = (ended_reason is not null)),
  check (status not in ('finished','cancelled','expired','aborted') or next_transition_at is null),
  check (status not in ('countdown','playing','between_rounds','finished') or (guest_user_id is not null and started_at is not null and current_round_number >= 1)),
  check (finished_at is null or finished_at >= created_at)
);
create index matches_host_history on public.matches(host_user_id, created_at desc);
create index matches_guest_history on public.matches(guest_user_id, created_at desc);
create index matches_due on public.matches(next_transition_at) where status in ('waiting','countdown','playing','between_rounds');
create index matches_winner on public.matches(winner_user_id) where winner_user_id is not null;

create table public.match_players (
  match_id uuid not null references public.matches(id) on delete restrict,
  user_id uuid not null references public.profiles(id) on delete restrict,
  slot smallint not null check (slot in (1,2)),
  ready_at timestamptz,
  joined_at timestamptz not null default clock_timestamp(),
  last_seen_at timestamptz not null default clock_timestamp(),
  is_active boolean not null default true,
  total_score integer not null default 0 check (total_score between 0 and 450),
  rounds_won integer not null default 0 check (rounds_won between 0 and 3),
  correct_answers integer not null default 0 check (correct_answers between 0 and 3),
  result text check (result in ('win','loss','draw','aborted')),
  xp_earned integer not null default 0 check (xp_earned between 0 and 80),
  username_snapshot text,
  primary key (match_id,user_id),
  unique (match_id,slot),
  check (correct_answers = rounds_won),
  check (total_score between 100 * rounds_won and 150 * rounds_won)
);
create unique index match_players_one_active on public.match_players(user_id) where is_active;
create index match_players_history on public.match_players(user_id,joined_at desc);

create table public.match_rounds (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete restrict,
  round_number smallint not null check (round_number between 1 and 3),
  status text not null default 'pending' check (status in ('pending','active','resolved')),
  starts_at timestamptz,
  ends_at timestamptz,
  resolved_at timestamptz,
  winner_user_id uuid,
  end_reason text check (end_reason in ('correct_answer','both_incorrect','timeout','match_ended')),
  winning_points integer not null default 0 check (winning_points between 0 and 150),
  unique (match_id,round_number),
  unique (id,match_id),
  foreign key (match_id,winner_user_id) references public.match_players(match_id,user_id) on delete restrict,
  check ((starts_at is null and ends_at is null) or (starts_at is not null and ends_at = starts_at + interval '45 seconds')),
  check (status <> 'active' or starts_at is not null),
  check ((status = 'resolved') = (resolved_at is not null)),
  check ((status = 'resolved') = (end_reason is not null)),
  check ((end_reason = 'correct_answer' and winner_user_id is not null and winning_points between 100 and 150)
    or (end_reason is distinct from 'correct_answer' and winner_user_id is null and winning_points = 0)),
  check (resolved_at is null or starts_at is not null or end_reason = 'match_ended')
);
create index match_rounds_winner on public.match_rounds(match_id,winner_user_id);

create table private.questions (
  id uuid primary key default gen_random_uuid(),
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  version integer not null check (version > 0),
  pool text not null check (pool in ('duel','practice')),
  language text not null default 'python' check (language = 'python'),
  difficulty text not null check (difficulty in ('easy','medium','hard')),
  title text not null check (length(trim(title)) > 0),
  prompt text not null check (length(trim(prompt)) > 0),
  code text not null check (length(code) > 0 and position(E'\r' in code) = 0 and right(code,1) <> E'\n'),
  line_count integer not null check (line_count > 0),
  correct_line integer not null check (correct_line between 1 and line_count),
  explanation text not null check (length(trim(explanation)) > 0),
  corrected_code text not null check (length(corrected_code) > 0 and position(E'\r' in corrected_code) = 0 and right(corrected_code,1) <> E'\n'),
  tags text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default clock_timestamp(),
  unique (slug,version),
  check (line_count = private.code_line_count(code)),
  check (line_count = private.code_line_count(corrected_code))
);
create index questions_selection on private.questions(pool,language,difficulty) where is_active;

create table private.round_questions (
  round_id uuid primary key references public.match_rounds(id) on delete restrict,
  question_id uuid not null references private.questions(id) on delete restrict,
  question_version integer not null check (question_version > 0),
  title_snapshot text not null,
  prompt_snapshot text not null,
  code_snapshot text not null,
  line_count integer not null,
  correct_line integer not null check (correct_line between 1 and line_count),
  explanation_snapshot text not null,
  corrected_code_snapshot text not null,
  check (line_count = private.code_line_count(code_snapshot))
);
create index round_questions_question on private.round_questions(question_id);

create table private.answers (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null,
  match_id uuid not null,
  user_id uuid not null,
  selected_line integer not null check (selected_line >= 1),
  accepted_at timestamptz not null default clock_timestamp(),
  elapsed_ms integer not null check (elapsed_ms between 0 and 44999),
  is_correct boolean not null,
  awarded_points integer not null check (awarded_points between 0 and 150),
  idempotency_key uuid not null,
  request_hash text not null check (request_hash ~ '^[0-9a-f]{64}$'),
  unique (round_id,user_id),
  unique (user_id,idempotency_key),
  foreign key (round_id,match_id) references public.match_rounds(id,match_id) on delete restrict,
  foreign key (match_id,user_id) references public.match_players(match_id,user_id) on delete restrict,
  check ((is_correct and awarded_points between 100 and 150) or (not is_correct and awarded_points = 0))
);
create unique index answers_one_winner on private.answers(round_id) where is_correct;
create index answers_player on private.answers(match_id,user_id);

create table private.match_settlements (
  match_id uuid primary key references public.matches(id) on delete restrict,
  settled_at timestamptz not null default clock_timestamp(),
  outcome_type text not null check (outcome_type in ('win','draw','forfeit')),
  reward_eligible boolean not null,
  reward_day date not null
);
create index settlements_reward_day on private.match_settlements(reward_day);
create table private.xp_ledger (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references private.match_settlements(match_id) on delete restrict,
  user_id uuid not null,
  amount integer not null check (amount between 0 and 80),
  reason text not null check (reason in ('win','loss','draw','forfeit','no_attempt','daily_pair_limit')),
  created_at timestamptz not null default clock_timestamp(),
  unique(match_id,user_id),
  foreign key(match_id,user_id) references public.match_players(match_id,user_id) on delete restrict
);
create index xp_ledger_history on private.xp_ledger(user_id,created_at desc);
create table private.match_invites (
  match_id uuid primary key references public.matches(id) on delete restrict,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz not null,
  consumed_by uuid references public.profiles(id) on delete restrict,
  consumed_at timestamptz,
  rotated_at timestamptz,
  check ((consumed_by is null) = (consumed_at is null))
);
create index match_invites_consumer on private.match_invites(consumed_by);
create table private.command_receipts (
  user_id uuid not null references public.profiles(id) on delete restrict,
  command_name text not null check (command_name in ('create_match','join_match','rotate_invite','set_ready','leave_match')),
  idempotency_key uuid not null,
  request_hash text not null check (request_hash ~ '^[0-9a-f]{64}$'),
  safe_response jsonb not null check (jsonb_typeof(safe_response) = 'object'),
  sensitive_response_ciphertext bytea,
  ciphertext_expires_at timestamptz,
  created_at timestamptz not null default clock_timestamp(),
  primary key(user_id,command_name,idempotency_key),
  check ((sensitive_response_ciphertext is null) = (ciphertext_expires_at is null)),
  check (ciphertext_expires_at is null or (ciphertext_expires_at > created_at and ciphertext_expires_at <= created_at + interval '15 minutes'))
);
create index command_receipts_cleanup on private.command_receipts(created_at);
create table private.rate_limits (
  subject_hash text not null check (subject_hash ~ '^[0-9a-f]{64}$'),
  action text not null check (length(action) between 1 and 64),
  window_start timestamptz not null,
  request_count integer not null default 1 check (request_count > 0),
  primary key(subject_hash,action,window_start)
);
create index rate_limits_cleanup on private.rate_limits(window_start);
create table private.engine_health (
  id boolean primary key default true check (id),
  last_successful_tick_at timestamptz,
  last_gap_at timestamptz
);
-- A NULL tick is intentionally unhealthy until the real scheduler starts.
insert into private.engine_health(id) values (true);

create table private.practice_sessions (
  id uuid primary key default gen_random_uuid(),
  guest_subject_hash text check (guest_subject_hash ~ '^[0-9a-f]{64}$'),
  user_id uuid references public.profiles(id) on delete restrict,
  question_id uuid not null references private.questions(id) on delete restrict,
  question_version integer not null,
  title_snapshot text not null,
  prompt_snapshot text not null,
  code_snapshot text not null,
  line_count integer not null,
  correct_line integer not null check (correct_line between 1 and line_count),
  explanation_snapshot text not null,
  corrected_code_snapshot text not null,
  status text not null default 'active' check (status in ('active','resolved','expired')),
  starts_at timestamptz not null default clock_timestamp(),
  ends_at timestamptz not null,
  selected_line integer check (selected_line between 1 and line_count),
  is_correct boolean,
  resolved_at timestamptz,
  expires_at timestamptz not null,
  answer_idempotency_key uuid,
  answer_request_hash text check (answer_request_hash ~ '^[0-9a-f]{64}$'),
  check ((guest_subject_hash is null) <> (user_id is null)),
  check (ends_at = starts_at + interval '45 seconds'),
  check (expires_at >= ends_at and expires_at <= starts_at + interval '24 hours'),
  check (line_count = private.code_line_count(code_snapshot)),
  check ((status = 'active' and resolved_at is null and selected_line is null) or (status <> 'active' and resolved_at is not null)),
  check ((selected_line is null and is_correct is null and answer_idempotency_key is null and answer_request_hash is null)
    or (selected_line is not null and is_correct is not null and answer_idempotency_key is not null and answer_request_hash is not null))
);
create index practice_sessions_user on private.practice_sessions(user_id);
create index practice_sessions_guest on private.practice_sessions(guest_subject_hash);
create index practice_sessions_question on private.practice_sessions(question_id);
create index practice_sessions_cleanup on private.practice_sessions(expires_at);

-- RLS graph is one-way: child -> matches, matches -> JWT, never back to child.
alter table public.matches enable row level security;
alter table public.match_players enable row level security;
alter table public.match_rounds enable row level security;
revoke all on public.matches, public.match_players, public.match_rounds from public, anon, authenticated;
grant select on public.matches, public.match_players, public.match_rounds to authenticated;
create policy matches_participants on public.matches for select to authenticated
  using ((select auth.uid()) = host_user_id or (select auth.uid()) = guest_user_id);
create policy players_participants on public.match_players for select to authenticated
  using (exists (select 1 from public.matches m where m.id = match_id));
create policy rounds_participants on public.match_rounds for select to authenticated
  using (exists (select 1 from public.matches m where m.id = match_id));

-- Engine is neither a login nor a member of any client or bypass-RLS role.
-- Its policies grant only explicit storage privileges; no executable client RPC.
do $$ declare tbl text; begin
  foreach tbl in array array['matches','match_players','match_rounds'] loop
    execute format('grant select, insert, update, delete on public.%I to debug_duel_game_engine',tbl);
    execute format('create policy game_engine on public.%I for all to debug_duel_game_engine using (true) with check (true)',tbl);
  end loop;
  foreach tbl in array array['questions','round_questions','answers','match_settlements','xp_ledger','match_invites','command_receipts','rate_limits','engine_health','practice_sessions'] loop
    execute format('alter table private.%I enable row level security',tbl);
    execute format('revoke all on private.%I from public, anon, authenticated, service_role',tbl);
    execute format('grant select, insert, update, delete on private.%I to debug_duel_game_engine',tbl);
    execute format('create policy game_engine on private.%I for all to debug_duel_game_engine using (true) with check (true)',tbl);
  end loop;
end $$;
-- Future settlement functions get column-level profile writes in their own phase.
grant select on public.profiles to debug_duel_game_engine;
create policy profiles_game_read on public.profiles for select to debug_duel_game_engine using (true);

-- Trigger helpers are invokers, not additional privileged entry points.
create function private.check_player_seat() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if not exists (select 1 from public.matches m where m.id = new.match_id
    and ((new.slot=1 and new.user_id=m.host_user_id) or (new.slot=2 and new.user_id=m.guest_user_id))) then
    raise exception 'INVALID_PLAYER_SEAT' using errcode='23514';
  end if;
  return new;
end $$;
create trigger check_player_seat before insert or update on public.match_players
for each row execute function private.check_player_seat();

create function private.protect_question_version() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if (to_jsonb(new) - 'is_active') is distinct from (to_jsonb(old) - 'is_active') then
    raise exception 'QUESTION_VERSION_IMMUTABLE' using errcode='23514';
  end if;
  return new;
end $$;
create trigger question_version_immutable before update on private.questions
for each row execute function private.protect_question_version();

create function private.check_question_snapshot() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare q private.questions; expected_pool text; expected_difficulty text;
begin
  if tg_op = 'UPDATE' then
    if row(new.question_id,new.question_version,new.title_snapshot,new.prompt_snapshot,new.code_snapshot,new.line_count,new.correct_line,new.explanation_snapshot,new.corrected_code_snapshot)
      is distinct from row(old.question_id,old.question_version,old.title_snapshot,old.prompt_snapshot,old.code_snapshot,old.line_count,old.correct_line,old.explanation_snapshot,old.corrected_code_snapshot) then
      raise exception 'SNAPSHOT_IMMUTABLE' using errcode='23514';
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
create trigger round_snapshot before insert or update on private.round_questions
for each row execute function private.check_question_snapshot();
create trigger practice_snapshot before insert or update on private.practice_sessions
for each row execute function private.check_question_snapshot();

create function private.check_answer_bounds() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if not exists (select 1 from private.round_questions q where q.round_id=new.round_id and new.selected_line between 1 and q.line_count) then
    raise exception 'INVALID_LINE' using errcode='23514';
  end if;
  return new;
end $$;
create trigger answer_bounds before insert or update on private.answers
for each row execute function private.check_answer_bounds();

revoke all on function private.check_player_seat(), private.protect_question_version(), private.check_question_snapshot(), private.check_answer_bounds() from public, anon, authenticated;
grant execute on function private.check_player_seat(), private.protect_question_version(), private.check_question_snapshot(), private.check_answer_bounds() to debug_duel_game_engine;
revoke create on schema private from debug_duel_game_engine;
revoke debug_duel_game_engine from postgres;
