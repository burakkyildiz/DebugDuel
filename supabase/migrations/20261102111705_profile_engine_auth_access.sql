-- Hosted Supabase's managed auth schema does not let postgres grant USAGE directly.
-- Inherit the existing authenticated role's auth schema access in this direction only.
-- Clients never become members of the engine role, and SET ROLE is not allowed here.
grant authenticated to debug_duel_profile_engine with inherit true, set false;
