begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
create temp table profile_test_results (line text);
grant all on profile_test_results to anon, authenticated;
grant usage on schema extensions to anon, authenticated;

insert into profile_test_results values (plan(25));
insert into profile_test_results values (ok((select relrowsecurity from pg_class where oid = 'public.profiles'::regclass), 'profiles enforce RLS'));
insert into profile_test_results values (ok(not has_table_privilege('anon','public.profiles','insert'), 'anonymous profile inserts forbidden'));
insert into profile_test_results values (ok(not has_table_privilege('authenticated','public.profiles','update'), 'direct statistic and profile edits forbidden'));
insert into profile_test_results values (ok(not pg_has_role('authenticated','debug_duel_profile_engine','member'), 'client cannot assume engine role'));
insert into profile_test_results values (ok(not has_function_privilege('anon','public.ensure_profile()','execute'), 'anonymous cannot create profiles'));
insert into profile_test_results values (ok(has_function_privilege('authenticated','public.update_profile(text,text,text)','execute'), 'authenticated can use narrow profile command'));
insert into profile_test_results values (ok(not (select prosecdef from pg_proc where oid='public.update_profile(text,text,text)'::regprocedure), 'public wrapper uses invoker'));
insert into profile_test_results values (is((select pg_get_userbyid(proowner) from pg_proc where oid='private.update_profile(text,text,text)'::regprocedure), 'debug_duel_profile_engine', 'private writer has dedicated owner'));
insert into profile_test_results values (ok(not has_table_privilege('authenticated','private.profile_write_limits','select'), 'private rate counters are hidden'));

insert into auth.users(id, email, email_confirmed_at) values
 ('f0000000-0000-4000-8000-000000000001','profile-test-a@example.invalid',now()),
 ('f0000000-0000-4000-8000-000000000002','profile-test-b@example.invalid',now()),
 ('f0000000-0000-4000-8000-000000000003','profile-test-c@example.invalid',null);

set local role anon;
insert into profile_test_results values (throws_ok('select public.ensure_profile()', '42501', null, 'anonymous command rejected'));

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"f0000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
insert into profile_test_results values (is((public.ensure_profile()).id, 'f0000000-0000-4000-8000-000000000001'::uuid, 'A creates only own profile'));
insert into profile_test_results values (is((public.ensure_profile()).xp, 0::bigint, 'profile retries do not award XP'));
insert into profile_test_results values (is((select count(*) from public.profiles where id in ('f0000000-0000-4000-8000-000000000001','f0000000-0000-4000-8000-000000000002','f0000000-0000-4000-8000-000000000003')), 1::bigint, 'A sees own incomplete fixture profile'));
insert into profile_test_results values (is((public.update_profile('ProfileTester_A','Player A','violet')).username, 'ProfileTester_A', 'valid onboarding completes'));
insert into profile_test_results values (throws_ok('update public.profiles set xp=999', '42501', null, 'forged XP update rejected'));
insert into profile_test_results values (throws_ok($$select public.update_profile('!!','Player','violet')$$, '22023', 'INVALID_PROFILE', 'database validates username'));

select set_config('request.jwt.claims','{"sub":"f0000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select public.ensure_profile();
insert into profile_test_results values (throws_ok($$select public.update_profile('profiletester_a','Player B','mint')$$, '23505', null, 'username uniqueness is case insensitive'));
insert into profile_test_results values (is((select display_name from public.profiles where id='f0000000-0000-4000-8000-000000000001'), 'Player A', 'B cannot modify A by choosing a matching username'));

set local role anon;
select set_config('request.jwt.claims','{}',true);
insert into profile_test_results values (is((select count(*) from public.profiles where id in ('f0000000-0000-4000-8000-000000000001','f0000000-0000-4000-8000-000000000002','f0000000-0000-4000-8000-000000000003')), 1::bigint, 'anonymous sees only completed fixture profiles'));

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"f0000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
insert into profile_test_results values (throws_ok('select public.ensure_profile()', '42501', 'AUTH_REQUIRED', 'unverified email cannot create profile'));
select set_config('request.jwt.claims','{"sub":"f0000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
do $$ begin for i in 1..9 loop perform public.update_profile('ProfileTester_A','Player A','violet'); end loop; end $$;
insert into profile_test_results values (throws_ok($$select public.update_profile('ProfileTester_A','Player A','violet')$$, 'P0001', 'RATE_LIMITED', 'direct RPC obeys write rate limit'));

reset role;
insert into profile_test_results values (is((select xp from public.profiles where id='f0000000-0000-4000-8000-000000000001'), 0::bigint, 'all commands leave XP unchanged'));
update auth.users set banned_until=now()+interval '1 hour' where id='f0000000-0000-4000-8000-000000000002';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"f0000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
insert into profile_test_results values (throws_ok('select public.ensure_profile()', '42501', 'AUTH_REQUIRED', 'banned user cannot reuse an old JWT'));
insert into profile_test_results values (throws_ok('select private.verified_actor_id()', '42501', null, 'client cannot invoke privileged Auth adapter'));
reset role;
update auth.users set banned_until=null,deleted_at=now() where id='f0000000-0000-4000-8000-000000000002';
set local role authenticated;
insert into profile_test_results values (throws_ok('select public.ensure_profile()', '42501', 'AUTH_REQUIRED', 'deleted user cannot reuse an old JWT'));
reset role;
insert into profile_test_results select * from finish();
select line from profile_test_results;
rollback;
