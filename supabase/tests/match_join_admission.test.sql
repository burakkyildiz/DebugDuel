begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
create temp table join_review_results(line text);
grant all on join_review_results to authenticated;
grant usage on schema extensions to authenticated;
insert into join_review_results values(no_plan());
-- Avoid a minute boundary splitting the burst; all fixtures roll back.
select pg_sleep(case when extract(second from clock_timestamp())>58 then 2 else 0 end);
insert into auth.users(id,email,email_confirmed_at) values
  ('f9000000-0000-4000-8000-000000000001','join-review-a@example.invalid',now()),
  ('f9000000-0000-4000-8000-000000000002','join-review-b@example.invalid',now());
insert into public.profiles(id,username,onboarding_completed_at) values
  ('f9000000-0000-4000-8000-000000000001','JoinReview_A',now()),
  ('f9000000-0000-4000-8000-000000000002','JoinReview_B',now());

-- Catch each statement's error as PostgREST would, without rolling back earlier calls.
create function pg_temp.invalid_join() returns text language plpgsql security invoker as $$
begin
  return public.match_command(p_action=>'join',p_key=>gen_random_uuid(),p_hash=>repeat('9',64))->>'commandError';
exception when others then return sqlerrm;
end $$;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"f9000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
insert into join_review_results values(is((select count(*) from generate_series(1,10) where pg_temp.invalid_join()='ROOM_UNAVAILABLE'),10::bigint,'first ten invalid invitations are rejected normally'));
insert into join_review_results values(is(pg_temp.invalid_join(),'RATE_LIMITED','eleventh direct RPC attempt is rate limited'));
insert into join_review_results values(is(pg_temp.invalid_join(),'RATE_LIMITED','a retry remains rate limited'));
reset role;
insert into join_review_results values(is((select max(request_count) from private.rate_limits where
  subject_hash=encode(sha256(convert_to('match:f9000000-0000-4000-8000-000000000001','UTF8')),'hex') and action='match_join'),10,'failed invitations commit their account counter'));
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"f9000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
insert into join_review_results values(is(pg_temp.invalid_join(),'ROOM_UNAVAILABLE','another account keeps its independent allowance'));
reset role;
insert into join_review_results values(is((select max(request_count) from private.rate_limits where
  subject_hash=encode(sha256(convert_to('match:f9000000-0000-4000-8000-000000000002','UTF8')),'hex') and action='match_join'),1,'second account counter is independent'));
insert into join_review_results values(is((select count(*) from public.matches where host_user_id in
  ('f9000000-0000-4000-8000-000000000001','f9000000-0000-4000-8000-000000000002') or guest_user_id in
  ('f9000000-0000-4000-8000-000000000001','f9000000-0000-4000-8000-000000000002')),0::bigint,'rejected joins create no matches'));
insert into join_review_results values(is((select count(*) from public.match_players where user_id in
  ('f9000000-0000-4000-8000-000000000001','f9000000-0000-4000-8000-000000000002')),0::bigint,'rejected joins create no memberships'));
insert into join_review_results values(is((select count(*) from private.command_receipts where user_id in
  ('f9000000-0000-4000-8000-000000000001','f9000000-0000-4000-8000-000000000002')),0::bigint,'rejected joins create no successful receipts'));
select line from join_review_results;
select * from finish();
rollback;
