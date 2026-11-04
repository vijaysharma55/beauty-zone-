import React, { useCallback, useEffect, useState } from 'react';
import { CalendarPlus, CreditCard, Pencil } from 'lucide-react';
import { api, errorMessage } from '../../lib/api';
import type { SubscriptionWithSalon } from '../../types/auth';
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Modal,
  PageHeader,
  Select,
  formatCurrency,
  formatDate,
} from '../ui';

const PLANS = ['trial', 'starter', 'pro', 'elite'] as const;
const STATUSES = ['trialing', 'active', 'past_due', 'canceled'] as const;

type AdminPayment = {
  id: string; salon_id: string; subscription_id: string | null; provider: string;
  provider_reference: string | null; provider_order_id?: string | null; amount_paise: number; status: 'pending'|'verified'|'failed'|'refunded';
  plan: string; created_at: string; salons?: { name?: string; slug?: string };
};

const PLAN_PRICE_PAISE: Record<string, number> = {
  trial: 0,
  starter: 149900,
  pro: 299900,
  elite: 599900,
};

const toneForStatus = (status: string) =>
  status === 'active' ? 'green' : status === 'trialing' ? 'gold' : status === 'past_due' ? 'amber' : 'red';

export const AdminSubscriptions: React.FC = () => {
  const [subscriptions, setSubscriptions] = useState<SubscriptionWithSalon[]>([]);
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editing, setEditing] = useState<SubscriptionWithSalon | null>(null);
  const [draft, setDraft] = useState({ plan: 'starter', status: 'active', currentPeriodEnd: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [res, paymentRes] = await Promise.all([
        api.get<{ subscriptions: SubscriptionWithSalon[] }>('/admin/subscriptions'),
        api.get<{ payments: AdminPayment[] }>('/admin/subscription-payments'),
      ]);
      setSubscriptions(res.subscriptions);
      setPayments(paymentRes.payments || []);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
      setPaymentsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const flash = (text: string) => {
    setNotice(text);
    setTimeout(() => setNotice(''), 4000);
  };

  const openEdit = (sub: SubscriptionWithSalon) => {
    setEditing(sub);
    setDraft({
      plan: sub.plan,
      status: sub.status,
      currentPeriodEnd: sub.currentPeriodEnd ? sub.currentPeriodEnd.slice(0, 10) : '',
    });
    setError('');
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    setError('');
    try {
      const res = await api.patch<{ subscription: SubscriptionWithSalon }>(`/admin/subscriptions/${editing.id}`, {
        plan: draft.plan,
        status: draft.status,
        currentPeriodEnd: draft.currentPeriodEnd ? new Date(draft.currentPeriodEnd).toISOString() : null,
      });
      setSubscriptions((prev) =>
        prev.map((s) => (s.id === editing.id ? { ...s, ...res.subscription, salonName: s.salonName, salonSlug: s.salonSlug, ownerEmail: s.ownerEmail } : s))
      );
      setEditing(null);
      flash('Subscription updated.');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const extend = async (sub: SubscriptionWithSalon) => {
    setBusyId(sub.id);
    setError('');
    try {
      const res = await api.patch<{ subscription: SubscriptionWithSalon }>(`/admin/subscriptions/${sub.id}`, {
        extendDays: 30,
      });
      setSubscriptions((prev) =>
        prev.map((s) => (s.id === sub.id ? { ...s, ...res.subscription, salonName: s.salonName, salonSlug: s.salonSlug, ownerEmail: s.ownerEmail } : s))
      );
      flash('Billing period extended by 30 days.');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const verifyPayment = async (payment: AdminPayment) => {
    setBusyId('payment:' + payment.id);
    setError('');
    try {
      await api.post('/admin/subscription-payments/' + payment.id + '/verify');
      setPayments(prev => prev.map(p => p.id === payment.id ? {...p,status:'verified'} : p));
      await load();
      flash('Payment verified and subscription activated.');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const activeCount = subscriptions.filter((s) => s.status === 'active').length;
  const mrr = subscriptions
    .filter((s) => s.status === 'active')
    .reduce((sum, s) => sum + (PLAN_PRICE_PAISE[s.plan] || 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Revenue"
        title="Subscriptions"
        description="Change plans, manage billing status and extend periods for any salon."
      />

      {error && !editing && <Alert tone="error">{error}</Alert>}
      {notice && <Alert tone="success">{notice}</Alert>}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Active subscriptions</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{activeCount}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Monthly recurring revenue</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{formatCurrency(mrr)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Trial accounts</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {subscriptions.filter((s) => s.status === 'trialing').length}
          </p>
        </Card>
      </div>

      <Card>
        <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3 text-sm text-slate-500">
          <CreditCard className="h-4 w-4 text-[#D09A40]" /> {subscriptions.length} subscription
          {subscriptions.length === 1 ? '' : 's'}
        </div>

        {loading ? (
          <p className="px-5 py-10 text-center text-sm text-slate-500">Loading subscriptions…</p>
        ) : subscriptions.length === 0 ? (
          <EmptyState icon={<CreditCard className="h-6 w-6" />} title="No subscriptions yet" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Salon</th>
                  <th className="px-5 py-3 font-medium">Owner</th>
                  <th className="px-5 py-3 font-medium">Plan</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Period end</th>
                  <th className="px-5 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subscriptions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50/60">
                    <td className="px-5 py-3">
                      <p className="font-medium text-slate-900">{sub.salonName}</p>
                      <p className="text-xs text-slate-500">/salon/{sub.salonSlug}</p>
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-600">{sub.ownerEmail}</td>
                    <td className="px-5 py-3">
                      <Badge tone="gold" className="capitalize">
                        {sub.plan}
                      </Badge>
                      <p className="mt-1 text-[11px] text-slate-500">{formatCurrency(PLAN_PRICE_PAISE[sub.plan] || 0)}/mo</p>
                    </td>
                    <td className="px-5 py-3">
                      <Badge tone={toneForStatus(sub.status) as 'green' | 'gold' | 'amber' | 'red'} className="capitalize">
                        {sub.status.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-600">{formatDate(sub.currentPeriodEnd)}</td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(sub)}>
                          <Pencil className="h-3.5 w-3.5" /> Edit
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          loading={busyId === sub.id}
                          onClick={() => extend(sub)}
                        >
                          <CalendarPlus className="h-3.5 w-3.5" /> +30 days
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3 text-sm text-slate-600">
          <CreditCard className="h-4 w-4 text-[#D09A40]" /> Payment references awaiting verification
        </div>
        {paymentsLoading ? (
          <p className="px-5 py-8 text-sm text-slate-500">Loading payment references…</p>
        ) : payments.length === 0 ? (
          <EmptyState icon={<CreditCard className="h-6 w-6" />} title="No payment references submitted" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Salon</th>
                  <th className="px-5 py-3 font-medium">Plan</th>
                  <th className="px-5 py-3 font-medium">Method / reference</th>
                  <th className="px-5 py-3 font-medium">Amount</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map(payment => (
                  <tr key={payment.id}>
                    <td className="px-5 py-3">
                      <p className="font-medium text-slate-900">{payment.salons?.name || payment.salon_id}</p>
                      <p className="text-xs text-slate-500">{formatDate(payment.created_at)}</p>
                    </td>
                    <td className="px-5 py-3 capitalize">{payment.plan}</td>
                    <td className="px-5 py-3">
                      <p className="uppercase text-xs text-slate-500">{payment.provider}</p>
                      <p className="font-mono text-xs text-slate-800">{payment.provider_reference || payment.provider_order_id || 'No reference'}</p>
                    </td>
                    <td className="px-5 py-3">{formatCurrency(Number(payment.amount_paise || 0))}</td>
                    <td className="px-5 py-3">
                      <Badge tone={payment.status === 'verified' ? 'green' : payment.status === 'pending' ? 'amber' : 'red'}>{payment.status}</Badge>
                    </td>
                    <td className="px-5 py-3 text-right">
                      {payment.status === 'pending' && payment.provider !== 'razorpay' ? (
                        <Button variant="gold" size="sm" loading={busyId === 'payment:' + payment.id} onClick={() => verifyPayment(payment)}>
                          Verify & activate
                        </Button>
                      ) : payment.status === 'pending' && payment.provider === 'razorpay' ? (
                        <span className="text-xs text-amber-700">Waiting for signed webhook</span>
                      ) : <span className="text-xs text-slate-400">No action</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
          Verify the UPI / bank transaction in your payment account before selecting “Verify & activate”. This is a manual reconciliation step, not an automatic gateway confirmation.
        </p>
      </Card>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={`Edit subscription — ${editing?.salonName || ''}`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button variant="gold" onClick={save} loading={saving}>
              Save changes
            </Button>
          </>
        }
      >
        <form onSubmit={save} className="space-y-4">
          {error && <Alert tone="error">{error}</Alert>}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Plan" htmlFor="sub-plan">
              <Select id="sub-plan" value={draft.plan} onChange={(e) => setDraft({ ...draft, plan: e.target.value })}>
                {PLANS.map((p) => (
                  <option key={p} value={p} className="capitalize">
                    {p}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Status" htmlFor="sub-status">
              <Select
                id="sub-status"
                value={draft.status}
                onChange={(e) => setDraft({ ...draft, status: e.target.value })}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s.replace('_', ' ')}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Current period end" htmlFor="sub-period" className="sm:col-span-2">
              <input
                id="sub-period"
                type="date"
                value={draft.currentPeriodEnd}
                onChange={(e) => setDraft({ ...draft, currentPeriodEnd: e.target.value })}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-[#D09A40] focus:outline-none focus:ring-2 focus:ring-[#D09A40]/25"
              />
            </Field>
          </div>
          <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
            Plan changes apply immediately. Billing status and periods are visible to the salon owner in their
            dashboard.
          </p>
        </form>
      </Modal>
    </div>
  );
};
