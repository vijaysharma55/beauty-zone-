-- Profiles are keyed by auth.users.id; enforce a case-insensitive unique
-- email for email-auth identities while allowing phone-only identities to use
-- an empty email value.
create unique index if not exists profiles_email_unique
  on public.profiles (lower(btrim(email)))
  where nullif(btrim(email), '') is not null;
