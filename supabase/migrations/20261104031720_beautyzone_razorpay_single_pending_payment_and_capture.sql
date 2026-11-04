-- Prevent multiple open orders for one subscription / booking.
create unique index if not exists subscription_payments_one_pending_razorpay_salon_uidx
  on public.subscription_payments(salon_id)
  where provider='razorpay' and status='pending';

create unique index if not exists booking_payments_one_pending_booking_uidx
  on public.booking_payments(booking_id)
  where status='pending';

-- Apply an advance payment additively and cap it at the booking total.
create or replace function private.process_razorpay_event(p_event_id text,p_event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_type text := coalesce(p_event->>'event','');
  v_payment jsonb := p_event #> '{payload,payment,entity}';
  v_order_id text := v_payment->>'order_id';
  v_payment_id text := v_payment->>'id';
  v_amount bigint := nullif(v_payment->>'amount','')::bigint;
  v_currency text := coalesce(v_payment->>'currency','INR');
  v_row public.subscription_payments%rowtype;
  v_booking_payment public.booking_payments%rowtype;
  v_event_status text := 'ignored';
begin
  if coalesce(auth.role(),'') <> 'service_role' then
    raise exception using errcode='42501',message='Only the trusted webhook service may process payment events';
  end if;
  if coalesce(trim(p_event_id),'')='' or length(p_event_id)>200 then
    raise exception using errcode='22023',message='Missing Razorpay event ID';
  end if;
  insert into public.payment_webhook_events(provider,event_id,event_type,payload,status)
  values('razorpay',p_event_id,v_type,p_event,'received')
  on conflict(event_id) do nothing;
  perform 1 from public.payment_webhook_events where event_id=p_event_id for update;
  if exists(select 1 from public.payment_webhook_events where event_id=p_event_id and status in ('processed','ignored')) then
    return jsonb_build_object('ok',true,'duplicate',true,'eventId',p_event_id);
  end if;
  if v_type not in ('payment.captured','payment.failed') or v_order_id is null or v_payment_id is null then
    update public.payment_webhook_events set status='ignored',processed_at=now(),processing_error=null where event_id=p_event_id;
    return jsonb_build_object('ok',true,'ignored',true,'eventType',v_type);
  end if;
  if v_currency<>'INR' or v_amount is null or v_amount<=0 then
    raise exception using errcode='22023',message='Razorpay payment currency or amount is invalid';
  end if;

  select * into v_row from public.subscription_payments
  where provider='razorpay' and provider_order_id=v_order_id for update;
  if found then
    if v_row.amount_paise<>v_amount or v_row.currency<>v_currency then
      raise exception using errcode='23514',message='Razorpay subscription payment amount does not match the stored order';
    end if;
    if v_type='payment.captured' then
      if v_row.status<>'verified' then
        update public.subscription_payments
        set status='verified',provider_payment_id=v_payment_id,provider_reference=v_payment_id,
            verified_at=coalesce(verified_at,now()),
            metadata=metadata || jsonb_build_object('razorpayPaymentId',v_payment_id,'razorpayEventId',p_event_id),
            updated_at=now()
        where id=v_row.id;
        insert into public.subscriptions(salon_id,plan,status,current_period_end)
        values(v_row.salon_id,v_row.plan,'active',coalesce(v_row.period_end,now()+interval '30 days'))
        on conflict(salon_id) do update
          set plan=excluded.plan,status='active',current_period_end=excluded.current_period_end,updated_at=now();
      end if;
    elsif v_row.status not in ('verified','refunded') then
      update public.subscription_payments
      set status='failed',provider_payment_id=v_payment_id,provider_reference=v_payment_id,updated_at=now()
      where id=v_row.id;
    end if;
    v_event_status:='processed';
  else
    select * into v_booking_payment from public.booking_payments
    where provider='razorpay' and provider_order_id=v_order_id for update;
    if not found then raise exception using errcode='P0002',message='Razorpay order is not linked to a BeautyZone payment'; end if;
    if v_booking_payment.amount_paise<>v_amount or v_booking_payment.currency<>v_currency then
      raise exception using errcode='23514',message='Razorpay booking payment amount does not match the stored order';
    end if;
    if v_type='payment.captured' then
      if v_booking_payment.status<>'captured' then
        update public.booking_payments
        set status='captured',provider_payment_id=v_payment_id,provider_signature_verified=true,
            captured_at=now(),metadata=metadata || jsonb_build_object('razorpayEventId',p_event_id),updated_at=now()
        where id=v_booking_payment.id;
        update public.bookings
        set advance_paid=least(estimated_total,advance_paid+v_amount),advance_ref=v_payment_id,updated_at=now()
        where id=v_booking_payment.booking_id;
      end if;
    elsif v_booking_payment.status<>'captured' then
      update public.booking_payments set status='failed',provider_payment_id=v_payment_id,updated_at=now()
      where id=v_booking_payment.id;
    end if;
    v_event_status:='processed';
  end if;
  update public.payment_webhook_events set status=v_event_status,processed_at=now(),processing_error=null where event_id=p_event_id;
  return jsonb_build_object('ok',true,'duplicate',false,'eventType',v_type,'paymentId',v_payment_id);
end;
$$;
revoke all on function private.process_razorpay_event(text,jsonb) from public,anon,authenticated;
grant execute on function private.process_razorpay_event(text,jsonb) to service_role;
