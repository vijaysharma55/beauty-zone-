import React, { useCallback, useEffect, useState } from 'react';
import { Check, CreditCard, Mail, ShieldCheck, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api, errorMessage } from '../../lib/api';
import { Badge, Button, Card, CardHeader, PageHeader, formatDate, formatCurrency } from '../ui';
import { openRazorpayCheckout } from '../../lib/razorpay';

const PLAN_FEATURES: Record<string, string[]> = {
  trial: ['1 salon website', 'Up to 10 services', 'Gallery & team pages', 'Publish / unpublish'],
  starter: ['1 salon website', 'Up to 25 services', 'Gallery & team pages', 'Publish / unpublish'],
  pro: ['Everything in Starter', 'Unlimited services', 'Custom brand colours', 'Priority support'],
  elite: ['Everything in Pro', 'Multiple staff profiles', 'Advanced gallery captions', 'Dedicated onboarding'],
};
const PLAN_PRICES: Record<string, string> = {
  trial: 'Free trial',
  starter: '₹1,499 / month',
  pro: '₹2,999 / month',
  elite: '₹5,999 / month',
};
const PLAN_PRICE_PAISE: Record<string, number> = { starter: 149900, pro: 299900, elite: 599900 };
type PaymentRecord = {
  id: string; provider: string; provider_reference: string | null; amount_paise: number;
  status: 'pending' | 'verified' | 'failed' | 'refunded'; plan: string; created_at: string;
};

export const BillingPage: React.FC = () => {
  const { subscription, salon } = useAuth();
  const plan = subscription?.plan || 'trial';
  const features = PLAN_FEATURES[plan] || PLAN_FEATURES.starter;
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [targetPlan, setTargetPlan] = useState<'starter' | 'pro' | 'elite'>(plan === 'pro' || plan === 'elite' ? plan : 'starter');
  const [requesting, setRequesting] = useState(false);
  const [gatewayEnabled, setGatewayEnabled] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadPayments = useCallback(async () => {
    try {
      const result = await api.get<{ payments: PaymentRecord[] }>('/salon/subscription/payments');
      setPayments(result.payments || []);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPaymentsLoading(false);
    }
  }, []);

  useEffect(() => { void loadPayments(); }, [loadPayments]);

  useEffect(() => {
    api.get<{ enabled: boolean }>('/salon/subscription/payment-config')
      .then(result => setGatewayEnabled(Boolean(result.enabled)))
      .catch(() => setGatewayEnabled(false));
  }, []);

  const startCheckout = async () => {
    setError('');
    setNotice('');
    setRequesting(true);
    let paymentRecordId = '';
    try {
      const order = await api.post<{
        keyId: string; orderId: string; amount: number; currency: string;
        paymentRecordId: string; description: string;
      }>('/salon/subscription/checkout', { plan: targetPlan });
      paymentRecordId = order.paymentRecordId;
      const response = await openRazorpayCheckout(order);
      const result = await api.post<{ success: boolean; status: string; paymentId: string }>(
        '/salon/subscription/verify',
        {
          paymentRecordId: order.paymentRecordId,
          razorpayOrderId: response.razorpay_order_id,
          razorpayPaymentId: response.razorpay_payment_id,
          razorpaySignature: response.razorpay_signature,
        }
      );
      setNotice(result.status === 'verified'
        ? 'Payment captured successfully. Your subscription is activated.'
        : 'Payment received. Subscription status is being confirmed by the Razorpay webhook.');
      setPaymentsLoading(true);
      await loadPayments();
    } catch (err) {
      const message = errorMessage(err);
      if (paymentRecordId && message.includes('Payment window closed before payment was completed')) {
        try {
          const result = await api.post<{ cancelled: boolean }>(
            '/salon/subscription/checkout/' + encodeURIComponent(paymentRecordId) + '/cancel'
          );
          setNotice(result.cancelled
            ? 'Checkout closed. No payment attempt was made, so you can choose another plan.'
            : 'Checkout is still being reconciled. Refresh payment history before starting another plan.');
        } catch (cancelError) {
          setError(errorMessage(cancelError));
        }
      } else {
        setError(message);
      }
    } finally {
      setRequesting(false);
    }
  };

  const statusTone = subscription?.status === 'active' ? 'green' : subscription?.status === 'trialing' ? 'gold' : subscription?.status === 'past_due' ? 'amber' : 'red';

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Billing"
        title="Subscription & plan"
        description="View your current plan and pay securely through Razorpay."
      />

      {error && <div role="alert" className="flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"><AlertCircle className="h-4 w-4 shrink-0" />{error}</div>}
      {notice && <div role="status" className="flex gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"><Check className="h-4 w-4 shrink-0" />{notice}</div>}

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader title="Current plan" description="Managed by the BeautyZone platform team." />
          <div className="p-5">
            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-xl bg-[#0F172A] px-4 py-3 text-white">
                <p className="text-[10px] uppercase tracking-[0.2em] text-[#D09A40]">Plan</p>
                <p className="font-serif text-2xl font-bold capitalize">{plan}</p>
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={statusTone as 'green' | 'gold' | 'amber' | 'red'}>{subscription?.status || 'trialing'}</Badge>
                  <span className="text-sm font-semibold text-slate-900">{PLAN_PRICES[plan]}</span>
                </div>
                <p className="text-sm text-slate-500">
                  {subscription?.status === 'trialing' ? 'Trial ends' : 'Renews on'}{' '}
                  <strong className="text-slate-700">{formatDate(subscription?.currentPeriodEnd)}</strong>
                </p>
              </div>
            </div>

            <ul className="mt-6 grid gap-2 sm:grid-cols-2">
              {features.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm text-slate-600">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />{feature}
                </li>
              ))}
            </ul>

            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-800">Secure online subscription payment</p>
              <p className="mt-1 text-xs text-slate-500">
                Payments are verified by Razorpay on the server. Your plan changes only after the payment is confirmed.
              </p>
              <div className="mt-3">
                <a href="mailto:support@beautyzone.app?subject=Salon%20plan%20change">
                  <Button variant="secondary" size="sm"><Mail className="h-3.5 w-3.5" /> Email support</Button>
                </a>
              </div>
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900"><CreditCard className="h-4 w-4 text-[#D09A40]" /> Billing account</div>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-3"><dt className="text-slate-500">Salon</dt><dd className="font-medium text-slate-800">{salon?.name || '—'}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-slate-500">Website</dt><dd className="font-medium text-slate-800">{salon?.published ? 'Live' : 'Draft'}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-slate-500">Billing cycle</dt><dd className="font-medium text-slate-800">Monthly</dd></div>
            </dl>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900"><ShieldCheck className="h-4 w-4 text-emerald-600" /> Data ownership</div>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">Your salon website, services and staff records are stored against your account only. Platform administrators can review and moderate content, but other salon owners cannot access your data.</p>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader title="Upgrade your plan" description="Choose a subscription and pay securely with Razorpay Checkout." />
        <div className="grid gap-4 p-5 md:grid-cols-[1fr_auto] md:items-end">
          <label className="text-sm font-medium text-slate-700">
            Requested plan
            <select value={targetPlan} onChange={e=>setTargetPlan(e.target.value as 'starter'|'pro'|'elite')} className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5">
              <option value="starter">Starter — ₹1,499 / month</option>
              <option value="pro">Pro — ₹2,999 / month</option>
              <option value="elite">Elite — ₹5,999 / month</option>
            </select>
          </label>
          <Button type="button" variant="gold" loading={requesting} disabled={!gatewayEnabled||requesting} onClick={startCheckout}>
            <CreditCard className="h-4 w-4" /> Pay {formatCurrency(PLAN_PRICE_PAISE[targetPlan])}
          </Button>
          {!gatewayEnabled && (
            <p className="text-xs text-amber-700 md:col-span-2">
              Online payments are not enabled yet. BeautyZone needs to configure Razorpay API keys and webhook secret.
            </p>
          )}
          <p className="text-xs text-slate-500 md:col-span-2">
            Razorpay handles the payment. BeautyZone activates your plan only after server-side payment confirmation.
          </p>
        </div>
      </Card>


      <Card>
        <CardHeader title="Payment history" description="Razorpay checkout and webhook payment status." />
        {paymentsLoading ? <p className="p-5 text-sm text-slate-500">Loading payment history…</p> : payments.length===0 ? (
          <p className="p-5 text-sm text-slate-500">No payment references submitted yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-5 py-3">Date</th><th className="px-5 py-3">Plan</th><th className="px-5 py-3">Payment ID</th><th className="px-5 py-3">Amount</th><th className="px-5 py-3">Status</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map(p=><tr key={p.id}>
                  <td className="px-5 py-3 text-xs text-slate-500">{formatDate(p.created_at)}</td>
                  <td className="px-5 py-3 capitalize">{p.plan}</td>
                  <td className="px-5 py-3 font-mono text-xs">{p.provider_reference||'—'}</td>
                  <td className="px-5 py-3">{formatCurrency(Number(p.amount_paise))}</td>
                  <td className="px-5 py-3"><Badge tone={p.status==='verified'?'green':p.status==='pending'?'amber':'red'}>{p.status}</Badge></td>
                </tr>)}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
