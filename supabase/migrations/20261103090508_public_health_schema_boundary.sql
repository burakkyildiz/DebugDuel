-- USAGE permits the public INVOKER health wrapper to resolve its one granted
-- private function. It grants no table access and exposes no private API schema.
-- Every other private function keeps its explicit EXECUTE revocation.
grant usage on schema private to anon;
