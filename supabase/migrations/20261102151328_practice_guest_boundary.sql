-- Service callers can invoke only the guest adapter, never supply an account ID
-- to the internal command. The private schema remains unexposed to PostgREST.
grant debug_duel_practice_engine to postgres;
grant create on schema private to debug_duel_practice_engine;
create function private.practice_guest(p_action text,p_guest_hash text,p_ip_hash text,p_session_id uuid,p_selected_line integer,p_key uuid) returns jsonb
language sql security definer set search_path = '' as $$
  select private.practice_command(p_action,p_guest_hash,null,p_ip_hash,p_session_id,p_selected_line,p_key);
$$;
alter function private.practice_guest(text,text,text,uuid,integer,uuid) owner to debug_duel_practice_engine;
create or replace function public.practice_guest(p_action text,p_guest_hash text,p_ip_hash text,p_session_id uuid default null,p_selected_line integer default null,p_key uuid default null) returns jsonb
language sql security invoker set search_path = '' as $$
  select private.practice_guest(p_action,p_guest_hash,p_ip_hash,p_session_id,p_selected_line,p_key);
$$;
revoke all on function private.practice_guest(text,text,text,uuid,integer,uuid) from public,anon,authenticated;
grant execute on function private.practice_guest(text,text,text,uuid,integer,uuid) to service_role;
revoke execute on function private.practice_command(text,text,uuid,text,uuid,integer,uuid) from service_role;
grant execute on function private.practice_command(text,text,uuid,text,uuid,integer,uuid) to debug_duel_practice_engine;
revoke create on schema private from debug_duel_practice_engine;
revoke debug_duel_practice_engine from postgres;
