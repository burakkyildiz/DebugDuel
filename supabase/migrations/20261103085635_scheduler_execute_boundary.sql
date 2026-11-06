grant debug_duel_game_engine to postgres;
-- Supabase's postgres scheduler role is not a superuser and does not inherit
-- the NOLOGIN engine role. Explicitly authorize only these system entry points.
grant execute on function private.advance_due_matches(),private.cleanup_game_data(),private.engine_status() to postgres;
revoke debug_duel_game_engine from postgres;
