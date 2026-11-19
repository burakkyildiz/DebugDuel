-- Adds Java to the language allow-list. Only the allow-list changes: signatures, owners,
-- ACLs and search_path of the engine functions stay as they are, because the functions are
-- re-created from their own current definitions with just the allow-list literal replaced.
grant debug_duel_game_engine, debug_duel_practice_engine to postgres;

alter table public.matches drop constraint matches_language_check;
alter table public.matches add constraint matches_language_check check (language in ('python','javascript','java'));
alter table private.questions drop constraint questions_language_check;
alter table private.questions add constraint questions_language_check check (language in ('python','javascript','java'));

do $$
declare
  c record;
  f regprocedure;
  def text;
  patched text;
begin
  for c in select conname from pg_constraint
           where conrelid = 'private.practice_sessions'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%language%' loop
    execute format('alter table private.practice_sessions drop constraint %I', c.conname);
  end loop;
  alter table private.practice_sessions add constraint practice_sessions_language_check check (language in ('python','javascript','java'));

  foreach f in array array['private.match_command(uuid,text,uuid,uuid,boolean,uuid,integer,text,text)'::regprocedure,
                           'private.practice_command(text,text,uuid,text,uuid,integer,uuid)'::regprocedure] loop
    def := pg_get_functiondef(f);
    patched := replace(def, '(''python'',''javascript'')', '(''python'',''javascript'',''java'')');
    if patched = def then raise exception 'allow-list literal not found in %', f; end if;
    execute patched;
  end loop;
end $$;

revoke debug_duel_game_engine, debug_duel_practice_engine from postgres;
