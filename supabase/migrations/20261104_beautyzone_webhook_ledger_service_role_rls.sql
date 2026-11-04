-- Explicitly document the service-role-only RLS policy for the private webhook event ledger.
drop policy if exists payment_webhook_events_service_role_only on public.payment_webhook_events;
create policy payment_webhook_events_service_role_only
on public.payment_webhook_events
for all
to service_role
using (true)
with check (true);

revoke all on public.payment_webhook_events from public,anon,authenticated;
grant all on public.payment_webhook_events to service_role;
