import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, CreditCard, ExternalLink, Globe, IndianRupee, Users } from 'lucide-react';
import { api, errorMessage } from '../../lib/api';
import { Alert, Badge, Card, CardHeader, PageHeader, StatCard, formatCurrency, formatDate } from '../ui';

interface OverviewResponse {
  stats: {
    owners: number;
    admins: number;
    salons: number;
    published: number;
    services: number;
    activeSubscriptions: number;
    mrrPaise: number;
  };
  recentSalons: Array<{
    id: string;
    name: string;
    slug: string;
    website_published: number;
    created_at: string;
    owner_email: string;
  }>;
}

export const AdminOverview: React.FC = () => {
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setData(await api.get<OverviewResponse>('/admin/overview'));
      } catch (err) {
        setError(errorMessage(err));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Platform"
        title="Super admin overview"
        description="A live snapshot of every salon owner, website and subscription on BeautyZone."
      />

      {error && <Alert tone="error">{error}</Alert>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Salon owners"
          value={loading ? '—' : data?.stats.owners ?? 0}
          hint={`${data?.stats.admins ?? 0} platform admin(s)`}
          icon={<Users className="h-5 w-5" />}
        />
        <StatCard
          label="Salons"
          value={loading ? '—' : data?.stats.salons ?? 0}
          hint={`${data?.stats.published ?? 0} published websites`}
          icon={<Building2 className="h-5 w-5" />}
        />
        <StatCard
          label="Active subscriptions"
          value={loading ? '—' : data?.stats.activeSubscriptions ?? 0}
          hint="Trialing or active"
          icon={<CreditCard className="h-5 w-5" />}
        />
        <StatCard
          label="Monthly recurring revenue"
          value={loading ? '—' : formatCurrency(data?.stats.mrrPaise ?? 0)}
          hint="Active plans only"
          icon={<IndianRupee className="h-5 w-5" />}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader
            title="Newest salons"
            description="Latest owners who completed onboarding."
            action={
              <Link to="/admin/salons" className="text-xs font-semibold text-[#8a641f] hover:underline">
                View all
              </Link>
            }
          />
          <div className="divide-y divide-slate-100">
            {loading ? (
              <p className="px-5 py-6 text-sm text-slate-500">Loading…</p>
            ) : data?.recentSalons.length === 0 ? (
              <p className="px-5 py-6 text-sm text-slate-500">No salons yet.</p>
            ) : (
              data?.recentSalons.map((salon) => (
                <div key={salon.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800">{salon.name}</p>
                    <p className="truncate text-xs text-slate-500">
                      {salon.owner_email} · created {formatDate(salon.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {salon.website_published ? <Badge tone="green">Live</Badge> : <Badge tone="amber">Draft</Badge>}
                    {salon.website_published ? (
                      <a
                        href={`/salon/${salon.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#8a641f] hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" /> Visit
                      </a>
                    ) : (
                      <span className="text-xs text-slate-400">/salon/{salon.slug}</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Globe className="h-4 w-4 text-[#D09A40]" /> Platform health
            </div>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">Total services</dt>
                <dd className="font-semibold text-slate-900">{data?.stats.services ?? '—'}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">Publish rate</dt>
                <dd className="font-semibold text-slate-900">
                  {data && data.stats.salons > 0
                    ? `${Math.round((data.stats.published / data.stats.salons) * 100)}%`
                    : '—'}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">Admin accounts</dt>
                <dd className="font-semibold text-slate-900">{data?.stats.admins ?? '—'}</dd>
              </div>
            </dl>
          </Card>

          <Card className="p-5">
            <p className="text-sm font-semibold text-slate-900">Admin responsibilities</p>
            <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-slate-600">
              <li>• Provision and disable salon owner accounts.</li>
              <li>• Moderate salons and force-unpublish websites.</li>
              <li>• Manage plans, billing periods and platform settings.</li>
              <li>• Review the audit trail of sensitive actions.</li>
            </ul>
            <Link
              to="/admin/users"
              className="mt-3 inline-block text-xs font-semibold text-[#8a641f] hover:underline"
            >
              Manage users →
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
};
