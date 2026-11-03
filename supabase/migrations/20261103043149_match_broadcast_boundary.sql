-- Supabase owns realtime.messages. A closed, fixed-payload emitter is the only
-- privileged bridge: no caller-supplied payload/topic and no client EXECUTE.
alter function private.match_notify(uuid) security definer;
revoke all on function private.match_notify(uuid) from public,anon,authenticated,service_role;
grant execute on function private.match_notify(uuid) to debug_duel_game_engine;
