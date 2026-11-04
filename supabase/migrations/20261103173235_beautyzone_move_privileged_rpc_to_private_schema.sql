-- Move privileged routines out of the exposed public Data API schema.
-- Public functions remain SECURITY INVOKER wrappers with the same RPC signatures.
alter function public.create_public_booking(jsonb) set schema private;
alter function public.complete_salon_booking(uuid) set schema private;
alter function public.ensure_customer_loyalty_account(text) set schema private;
alter function public.redeem_customer_loyalty_reward(text) set schema private;
alter function public.verify_customer_loyalty_voucher(text) set schema private;
alter function public.is_salon_slug_available(text) set schema private;

revoke all on function private.create_public_booking(jsonb) from public,anon,authenticated;
revoke all on function private.complete_salon_booking(uuid) from public,anon,authenticated;
revoke all on function private.ensure_customer_loyalty_account(text) from public,anon,authenticated;
revoke all on function private.redeem_customer_loyalty_reward(text) from public,anon,authenticated;
revoke all on function private.verify_customer_loyalty_voucher(text) from public,anon,authenticated;
revoke all on function private.is_salon_slug_available(text) from public,anon,authenticated;

grant usage on schema private to anon,authenticated;
grant execute on function private.create_public_booking(jsonb) to anon,authenticated;
grant execute on function private.complete_salon_booking(uuid) to authenticated;
grant execute on function private.ensure_customer_loyalty_account(text) to authenticated;
grant execute on function private.redeem_customer_loyalty_reward(text) to authenticated;
grant execute on function private.verify_customer_loyalty_voucher(text) to authenticated;
grant execute on function private.is_salon_slug_available(text) to anon,authenticated;

create or replace function public.create_public_booking(p_booking jsonb)
returns jsonb language sql security invoker set search_path='' as $$
  select private.create_public_booking(p_booking);
$$;
create or replace function public.complete_salon_booking(p_booking_id uuid)
returns jsonb language sql security invoker set search_path='' as $$
  select private.complete_salon_booking(p_booking_id);
$$;
create or replace function public.ensure_customer_loyalty_account(p_name text default '')
returns jsonb language sql security invoker set search_path='' as $$
  select private.ensure_customer_loyalty_account(p_name);
$$;
create or replace function public.redeem_customer_loyalty_reward(p_offer_id text)
returns jsonb language sql security invoker set search_path='' as $$
  select private.redeem_customer_loyalty_reward(p_offer_id);
$$;
create or replace function public.verify_customer_loyalty_voucher(p_code text)
returns jsonb language sql security invoker set search_path='' as $$
  select private.verify_customer_loyalty_voucher(p_code);
$$;
create or replace function public.is_salon_slug_available(p_slug text)
returns boolean language sql stable security invoker set search_path='' as $$
  select private.is_salon_slug_available(p_slug);
$$;

revoke all on function public.create_public_booking(jsonb) from public;
revoke all on function public.complete_salon_booking(uuid) from public;
revoke all on function public.ensure_customer_loyalty_account(text) from public;
revoke all on function public.redeem_customer_loyalty_reward(text) from public;
revoke all on function public.verify_customer_loyalty_voucher(text) from public;
revoke all on function public.is_salon_slug_available(text) from public;
grant execute on function public.create_public_booking(jsonb) to anon,authenticated;
grant execute on function public.complete_salon_booking(uuid) to authenticated;
grant execute on function public.ensure_customer_loyalty_account(text) to authenticated;
grant execute on function public.redeem_customer_loyalty_reward(text) to authenticated;
grant execute on function public.verify_customer_loyalty_voucher(text) to authenticated;
grant execute on function public.is_salon_slug_available(text) to anon,authenticated;
