-- The anonymous salon SELECT policy evaluates this predicate, which always
-- returns false for anon because auth.uid() is null. It never exposes an owner id.
grant execute on function private.owns_salon(uuid) to anon;
