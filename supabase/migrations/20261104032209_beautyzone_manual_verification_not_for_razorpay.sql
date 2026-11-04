-- Razorpay settlements must only be applied by the signed webhook/service-role processor.
create or replace function public.verify_subscription_payment(p_payment_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_payment public.subscription_payments%rowtype;
  v_subscription public.subscriptions%rowtype;
  v_now timestamptz := now();
begin
  if not (select private.is_super_admin()) then
    raise exception using errcode='42501',message='Only a super admin can verify subscription payments';
  end if;
  select * into v_payment from public.subscription_payments where id=p_payment_id for update;
  if not found then raise exception using errcode='P0002',message='Payment record not found'; end if;
  if v_payment.provider='razorpay' then
    raise exception using errcode='42501',message='Razorpay payments can only be activated by a verified gateway event';
  end if;
  if v_payment.status='verified' then
    select * into v_subscription from public.subscriptions where salon_id=v_payment.salon_id;
    return jsonb_build_object('payment',to_jsonb(v_payment),'subscription',to_jsonb(v_subscription),'alreadyVerified',true);
  end if;
  if v_payment.status<>'pending' then
    raise exception using errcode='23514',message='Only pending offline payment references can be verified';
  end if;
  if v_payment.provider not in ('upi','manual') or v_payment.amount_paise<=0 or nullif(trim(v_payment.provider_reference),'') is null then
    raise exception using errcode='23514',message='A valid offline payment reference and positive amount are required';
  end if;
  update public.subscription_payments
  set status='verified',verified_by=(select auth.uid()),verified_at=v_now,updated_at=v_now
  where id=p_payment_id returning * into v_payment;
  insert into public.subscriptions(salon_id,plan,status,current_period_end)
  values(v_payment.salon_id,v_payment.plan,'active',coalesce(v_payment.period_end,v_now+interval '30 days'))
  on conflict(salon_id) do update
    set plan=excluded.plan,status='active',current_period_end=excluded.current_period_end,updated_at=v_now
  returning * into v_subscription;
  return jsonb_build_object('payment',to_jsonb(v_payment),'subscription',to_jsonb(v_subscription),'alreadyVerified',false);
end;
$$;
revoke all on function public.verify_subscription_payment(uuid) from public,anon;
grant execute on function public.verify_subscription_payment(uuid) to authenticated;
