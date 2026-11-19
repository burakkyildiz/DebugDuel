begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select pg_advisory_xact_lock(hashtextextended('debug-duel:engine-tick',0));
create temp table lang_results(line text);
create temp table lang_data(name text primary key,value jsonb);
grant all on lang_results,lang_data to anon,authenticated;
grant usage on schema extensions to anon,authenticated;
insert into lang_results values(no_plan());
update private.engine_health set last_successful_tick_at=clock_timestamp(),last_gap_at=null where id;
insert into auth.users(id,email,email_confirmed_at) select ('f9000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'dd-lang-'||n||'@example.test',clock_timestamp() from generate_series(1,6) n;
insert into public.profiles(id,username,display_name,onboarding_completed_at) select ('f9000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'LangTester_'||n,'Language test',clock_timestamp() from generate_series(1,6) n;
create function pg_temp.lang_actor(n integer) returns uuid language sql immutable as $$select ('f9000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid$$;
create function pg_temp.lang_cmd(n integer,action text,mid uuid default null,ready boolean default null,hash text default null) returns jsonb language plpgsql security invoker as $$
declare result jsonb;
begin
 perform set_config('request.jwt.claims',jsonb_build_object('sub',pg_temp.lang_actor(n),'role','authenticated')::text,true);
 set local role authenticated;
 result:=public.match_command(action,mid,gen_random_uuid(),ready,null,null,hash,case when action like 'create%' then encode(convert_to('opaque-test-cipher','UTF8'),'base64') else null end);
 reset role;
 return result;
exception when others then reset role; raise;
end $$;
create function pg_temp.lang_room(host integer,guest integer,action text) returns uuid language plpgsql security invoker as $$
declare mid uuid; h text:=encode(sha256(convert_to(gen_random_uuid()::text,'UTF8')),'hex');
begin
 update private.engine_health set last_successful_tick_at=clock_timestamp(),last_gap_at=null where id;
 delete from private.rate_limits where subject_hash in (encode(sha256(convert_to('match:'||pg_temp.lang_actor(host)::text,'UTF8')),'hex'),encode(sha256(convert_to('match:'||pg_temp.lang_actor(guest)::text,'UTF8')),'hex'));
 mid:=(pg_temp.lang_cmd(host,action,hash=>h)->>'matchId')::uuid;
 perform pg_temp.lang_cmd(guest,'join',hash=>h);
 perform pg_temp.lang_cmd(host,'ready',mid,ready=>true);
 perform pg_temp.lang_cmd(guest,'ready',mid,ready=>true);
 return mid;
end $$;

-- Duel rooms: the host's language controls every selected question.
insert into lang_data values('js',to_jsonb(pg_temp.lang_room(1,2,'create:javascript')));
insert into lang_results values(is((select language from public.matches where id=(select (value#>>'{}')::uuid from lang_data where name='js')),'javascript','create:javascript stores the room language'));
insert into lang_results values(is((select count(*) from private.round_questions rq join public.match_rounds r on r.id=rq.round_id join private.questions q on q.id=rq.question_id where r.match_id=(select (value#>>'{}')::uuid from lang_data where name='js') and q.language='javascript' and q.pool='duel'),3::bigint,'all three duel rounds use JavaScript questions'));
insert into lang_results values(is((select count(distinct q.difficulty) from private.round_questions rq join public.match_rounds r on r.id=rq.round_id join private.questions q on q.id=rq.question_id where r.match_id=(select (value#>>'{}')::uuid from lang_data where name='js')),3::bigint,'JavaScript rounds still progress easy, medium, hard'));
update public.match_rounds r set starts_at=x.t-interval '1 second',ends_at=x.t+interval '44 seconds' from (select clock_timestamp() t) x where r.match_id=(select (value#>>'{}')::uuid from lang_data where name='js') and r.round_number=1;
update public.matches set status='playing' where id=(select (value#>>'{}')::uuid from lang_data where name='js');
insert into lang_results values(is(pg_temp.lang_cmd(1,'get',(select (value#>>'{}')::uuid from lang_data where name='js'))#>>'{question,language}','javascript','duel DTO reports the question language'));

insert into lang_data values('py',to_jsonb(pg_temp.lang_room(3,4,'create')));
insert into lang_results values(is((select language from public.matches where id=(select (value#>>'{}')::uuid from lang_data where name='py')),'python','plain create keeps Python'));
insert into lang_results values(is((select count(*) from private.round_questions rq join public.match_rounds r on r.id=rq.round_id join private.questions q on q.id=rq.question_id where r.match_id=(select (value#>>'{}')::uuid from lang_data where name='py') and q.language='python'),3::bigint,'plain create selects Python questions'));

insert into lang_data values('java',to_jsonb(pg_temp.lang_room(5,6,'create:java')));
insert into lang_results values(is((select language from public.matches where id=(select (value#>>'{}')::uuid from lang_data where name='java')),'java','create:java stores the room language'));
insert into lang_results values(is((select count(*) from private.round_questions rq join public.match_rounds r on r.id=rq.round_id join private.questions q on q.id=rq.question_id where r.match_id=(select (value#>>'{}')::uuid from lang_data where name='java') and q.language='java' and q.pool='duel'),3::bigint,'all three duel rounds use Java questions'));
update public.match_rounds r set starts_at=x.t-interval '1 second',ends_at=x.t+interval '44 seconds' from (select clock_timestamp() t) x where r.match_id=(select (value#>>'{}')::uuid from lang_data where name='java') and r.round_number=1;
update public.matches set status='playing' where id=(select (value#>>'{}')::uuid from lang_data where name='java');
insert into lang_results values(is(pg_temp.lang_cmd(5,'get',(select (value#>>'{}')::uuid from lang_data where name='java'))#>>'{question,language}','java','Java duel DTO reports the question language'));

-- Unsupported or misplaced language qualifiers are rejected.
insert into lang_results values(throws_ok('select pg_temp.lang_cmd(1,''create:Java'')','22023',null,'language names are case-sensitive'));
insert into lang_results values(throws_ok('select pg_temp.lang_cmd(1,''create:ruby'')','22023',null,'unsupported duel language is rejected'));
insert into lang_results values(throws_ok('select pg_temp.lang_cmd(1,''ready:javascript'',null,true)','22023',null,'qualifier is only valid on create'));

-- Practice sessions follow the requested language and default to Python.
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"f9000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
insert into lang_data values('practice-js',public.practice_account('create:javascript',null,null,'a9000000-0000-4000-8000-000000000001'::uuid));
insert into lang_data values('practice-java',public.practice_account('create:java',null,null,'a9000000-0000-4000-8000-000000000003'::uuid));
insert into lang_results values(is((select value#>>'{question,language}' from lang_data where name='practice-java'),'java','Practice DTO reports Java'));
insert into lang_data values('practice-py',public.practice_account('create',null,null,'a9000000-0000-4000-8000-000000000002'::uuid));
insert into lang_results values(is((select value#>>'{question,language}' from lang_data where name='practice-js'),'javascript','Practice DTO reports JavaScript'));
insert into lang_results values(is((select value#>>'{question,language}' from lang_data where name='practice-py'),'python','Practice defaults to Python'));
insert into lang_results values(throws_ok('select public.practice_account(''create:ruby'',null,null,gen_random_uuid())','22023',null,'unsupported Practice language is rejected'));
insert into lang_results values(throws_ok('select public.practice_account(''get:javascript'',gen_random_uuid(),null,null)','22023',null,'qualifier is only valid for create in Practice'));
reset role;
insert into lang_results values(is((select q.language from private.practice_sessions s join private.questions q on q.id=s.question_id where s.id=(select (value->>'sessionId')::uuid from lang_data where name='practice-js')),'javascript','Practice snapshot comes from a JavaScript question'));
insert into lang_results values(is((select s.language from private.practice_sessions s where s.id=(select (value->>'sessionId')::uuid from lang_data where name='practice-js')),'javascript','Practice session stores its language'));

-- Boundaries are unchanged.
insert into lang_results values(ok(not has_function_privilege('anon','private.match_command(uuid,text,uuid,uuid,boolean,uuid,integer,text,text)','execute'),'anon still cannot supply an internal actor'));
insert into lang_results values(ok((select pg_get_userbyid(proowner)='debug_duel_game_engine' and prosecdef from pg_proc where oid='private.match_command(uuid,text,uuid,uuid,boolean,uuid,integer,text,text)'::regprocedure),'match engine owner is unchanged'));
insert into lang_results values(ok((select pg_get_userbyid(proowner)='debug_duel_practice_engine' and prosecdef from pg_proc where oid='private.practice_command(text,text,uuid,text,uuid,integer,uuid)'::regprocedure),'practice engine owner is unchanged'));

insert into lang_results select * from finish();
select line from lang_results;
rollback;
