import React from 'react';
import { Check, CreditCard, Mail, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Badge, Button, Card, CardHeader, PageHeader, formatDate } from '../ui';

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

export const BillingPage: React.FC = () => {
  const { subscription, salon } = useAuth();
  const plan = subscription?.plan || 'trial';
  const features = PLAN_FEATURES[plan] || PLAN_FEATURES.starter;

  const statusTone =
    subscription?.status === 'active' ? 'green' : subscription?.status === 'trialing' ? 'gold' : subscription?.status === 'past_due' ? 'amber' : 'red';

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Billing"
        title="Subscription & plan"
        description="Your plan controls how much you can publish. BeautyZone support handles upgrades and invoices."
      />

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
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  {feature}
                </li>
              ))}
            </ul>

            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-800">Need to upgrade or change plan?</p>
              <p className="mt-1 text-xs text-slate-500">
                Contact BeautyZone support and our team will update your subscription. Plan changes are applied by a
                platform administrator and take effect immediately.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <a href="mailto:support@beautyzone.app?subject=Salon%20plan%20change">
                  <Button variant="secondary" size="sm">
                    <Mail className="h-3.5 w-3.5" /> Email support
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <CreditCard className="h-4 w-4 text-[#D09A40]" /> Billing account
            </div>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Salon</dt>
                <dd className="font-medium text-slate-800">{salon?.name || '—'}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Website</dt>
                <dd className="font-medium text-slate-800">{salon?.published ? 'Live' : 'Draft'}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Billing cycle</dt>
                <dd className="font-medium text-slate-800">Monthly</dd>
              </div>
            </dl>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <ShieldCheck className="h-4 w-4 text-emerald-600" /> Data ownership
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">
              Your salon website, services and staff records are stored against your account only. Platform
              administrators can review and moderate content, but other salon owners can never access your data.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
};
