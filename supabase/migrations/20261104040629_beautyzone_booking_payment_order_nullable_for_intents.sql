-- A pending booking payment intent is persisted before calling Razorpay.
-- The provider order ID is attached once Razorpay responds.
alter table public.booking_payments
  alter column provider_order_id drop not null;
