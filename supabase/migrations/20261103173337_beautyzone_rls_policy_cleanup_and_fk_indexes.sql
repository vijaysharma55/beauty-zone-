-- Consolidate overlapping SELECT/INSERT RLS policies and index missing foreign keys.
drop policy if exists loyalty_accounts_customer_select on public.loyalty_accounts;
drop policy if exists loyalty_accounts_owner_select on public.loyalty_accounts;
create policy loyalty_accounts_scoped_select on public.loyalty_accounts
for select to authenticated using (
  customer_id=(select auth.uid())
  or owner_id=(select auth.uid())
  or (select private.is_super_admin())
);

drop policy if exists loyalty_transactions_customer_select on public.loyalty_transactions;
drop policy if exists loyalty_transactions_owner_select on public.loyalty_transactions;
create policy loyalty_transactions_scoped_select on public.loyalty_transactions
for select to authenticated using (
  (select private.is_super_admin())
  or exists(select 1 from public.loyalty_accounts la
    where la.id=loyalty_transactions.account_id
      and (la.customer_id=(select auth.uid()) or la.owner_id=(select auth.uid())))
);

drop policy if exists loyalty_vouchers_customer_select on public.loyalty_vouchers;
drop policy if exists loyalty_vouchers_owner_manage on public.loyalty_vouchers;
create policy loyalty_vouchers_scoped_select on public.loyalty_vouchers
for select to authenticated using (
  (select private.is_super_admin())
  or exists(select 1 from public.loyalty_accounts la
    where la.id=loyalty_vouchers.account_id
      and (la.customer_id=(select auth.uid()) or la.owner_id=(select auth.uid())))
);
create policy loyalty_vouchers_owner_insert on public.loyalty_vouchers
for insert to authenticated with check (
  (select private.is_super_admin())
  or exists(select 1 from public.loyalty_accounts la
    where la.id=loyalty_vouchers.account_id and la.owner_id=(select auth.uid()))
);
create policy loyalty_vouchers_owner_update on public.loyalty_vouchers
for update to authenticated
using (
  (select private.is_super_admin())
  or exists(select 1 from public.loyalty_accounts la
    where la.id=loyalty_vouchers.account_id and la.owner_id=(select auth.uid()))
)
with check (
  (select private.is_super_admin())
  or exists(select 1 from public.loyalty_accounts la
    where la.id=loyalty_vouchers.account_id and la.owner_id=(select auth.uid()))
);
create policy loyalty_vouchers_owner_delete on public.loyalty_vouchers
for delete to authenticated using (
  (select private.is_super_admin())
  or exists(select 1 from public.loyalty_accounts la
    where la.id=loyalty_vouchers.account_id and la.owner_id=(select auth.uid()))
);

drop policy if exists salon_versions_owner_admin_select on public.salon_versions;
drop policy if exists salon_versions_public_read on public.salon_versions;
create policy salon_versions_scoped_select on public.salon_versions
for select to anon,authenticated using (
  (status='approved' and exists(select 1 from public.salons s where s.id=salon_versions.salon_id
    and s.website_published and s.status in ('approved','pending') and not s.suspended))
  or exists(select 1 from public.salons s where s.id=salon_versions.salon_id
    and s.owner_id=(select auth.uid()))
  or (select private.is_super_admin())
);

drop policy if exists subscription_payments_owner_select on public.subscription_payments;
drop policy if exists subscription_payments_admin_select on public.subscription_payments;
create policy subscription_payments_scoped_select on public.subscription_payments
for select to authenticated using (
  (select private.is_super_admin())
  or exists(select 1 from public.salons s where s.id=subscription_payments.salon_id
    and s.owner_id=(select auth.uid()))
);

drop policy if exists subscriptions_admin_insert on public.subscriptions;
drop policy if exists subscriptions_owner_trial_insert on public.subscriptions;
create policy subscriptions_scoped_insert on public.subscriptions
for insert to authenticated with check (
  (select private.is_super_admin())
  or (
    status='trialing'
    and plan in ('trial','starter')
    and exists(select 1 from public.salons s where s.id=subscriptions.salon_id
      and s.owner_id=(select auth.uid()))
  )
);

create index if not exists salon_versions_submitted_by_idx on public.salon_versions(submitted_by);
create index if not exists subscription_payments_subscription_id_idx on public.subscription_payments(subscription_id);
create index if not exists subscription_payments_verified_by_idx on public.subscription_payments(verified_by);
drop index if exists public.subscriptions_one_per_salon_uidx;
