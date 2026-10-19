import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  Circle,
  Copy,
  ExternalLink,
  Eye,
  Globe,
  Rocket,
  Scissors,
  Users,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api, errorMessage } from '../../lib/api';
import type { SalonService, SalonStaff } from '../../types/auth';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardHeader,
  PageHeader,
  StatCard,
  formatDate,
  formatCurrency,
} from '../ui';

export const OverviewPage: React.FC = () => {
  const { salon, subscription, user, refresh } = useAuth();
  const [services, setServices] = useState<SalonService[]>([]);
  const [staff, setStaff] = useState<SalonStaff[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [serviceRes, staffRes] = await Promise.all([
          api.get<{ services: SalonService[] }>('/salon/services'),
          api.get<{ staff: SalonStaff[] }>('/salon/staff'),
        ]);
        if (cancelled) return;
        setServices(serviceRes.services);
        setStaff(staffRes.staff);
      } catch (err) {
        if (!cancelled) setMessage({ tone: 'error', text: errorMessage(err) });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!salon) return null;

  const liveUrl = `${window.location.origin}/salon/${salon.slug}`;
  const activeServices = services.filter((s) => s.active);
  const activeStaff = staff.filter((s) => s.active);

  const togglePublish = async () => {
    setBusy(true);
    setMessage(null);
    try {
      if (salon.published) {
        await api.post('/salon/unpublish');
        setMessage({ tone: 'success', text: 'Your website is now unpublished. Visitors will no longer see it.' });
      } else {
        await api.post('/salon/publish');
        setMessage({ tone: 'success', text: 'Your website is live! Share the link with your clients.' });
      }
      await refresh();
    } catch (err) {
      setMessage({ tone: 'error', text: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(liveUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setMessage({ tone: 'error', text: 'Could not copy automatically — please copy the URL manually.' });
    }
  };

  const checklist = [
    { label: 'Salon profile details added', done: Boolean(salon.name && salon.city && salon.addressLine && salon.phone) },
    { label: 'Services and prices published', done: activeServices.length > 0 },
    { label: 'Team members added', done: activeStaff.length > 0 },
    { label: 'Logo or cover photo uploaded', done: Boolean(salon.logoUrl || salon.coverImage) },
    { label: 'Website published live', done: salon.published },
  ];
  const completed = checklist.filter((c) => c.done).length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`Welcome, ${user?.name?.split(' ')[0] || 'there'}`}
        title="Salon overview"
        description="Everything about your salon website, at a glance."
        actions={
          <>
            <Link to="/dashboard/preview">
              <Button variant="secondary">
                <Eye className="h-4 w-4" /> Preview
              </Button>
            </Link>
            <Button variant="gold" onClick={togglePublish} loading={busy}>
              {salon.published ? (
                <>
                  <Globe className="h-4 w-4" /> Unpublish website
                </>
              ) : (
                <>
                  <Rocket className="h-4 w-4" /> Publish website
                </>
              )}
            </Button>
          </>
        }
      />

      {message && <Alert tone={message.tone}>{message.text}</Alert>}

      {/* Status banner */}
      <Card className="overflow-hidden">
        <div className="grid gap-0 md:grid-cols-[1.4fr_1fr]">
          <div className="p-5">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-slate-900">{salon.name}</h2>
              {salon.published ? <Badge tone="green">Website live</Badge> : <Badge tone="amber">Draft — not public</Badge>}
              {subscription && <Badge tone="gold">{subscription.plan} plan</Badge>}
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {salon.tagline || 'Add a tagline to make your website feel more premium.'}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <code className="rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-700">/salon/{salon.slug}</code>
              <Button variant="secondary" size="sm" onClick={copyLink}>
                <Copy className="h-3.5 w-3.5" /> {copied ? 'Copied!' : 'Copy live link'}
              </Button>
              {salon.published && (
                <a href={`/salon/${salon.slug}`} target="_blank" rel="noreferrer">
                  <Button variant="ghost" size="sm">
                    <ExternalLink className="h-3.5 w-3.5" /> Open site
                  </Button>
                </a>
              )}
            </div>
          </div>
          <div className="border-t border-slate-100 bg-slate-50/70 p-5 md:border-l md:border-t-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Setup progress</p>
            <div className="mt-2 flex items-end gap-2">
              <span className="text-3xl font-bold text-slate-900">{completed}</span>
              <span className="pb-1 text-sm text-slate-500">/ {checklist.length} steps</span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-[#D09A40] transition-all"
                style={{ width: `${(completed / checklist.length) * 100}%` }}
              />
            </div>
            <ul className="mt-3 space-y-1.5">
              {checklist.map((item) => (
                <li key={item.label} className="flex items-center gap-2 text-xs text-slate-600">
                  {item.done ? (
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                  ) : (
                    <Circle className="h-3.5 w-3.5 shrink-0 text-slate-300" />
                  )}
                  {item.label}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Active services"
          value={loading ? '—' : activeServices.length}
          hint={`${services.length} total in catalogue`}
          icon={<Scissors className="h-5 w-5" />}
        />
        <StatCard
          label="Team members"
          value={loading ? '—' : activeStaff.length}
          hint={`${staff.length} total on roster`}
          icon={<Users className="h-5 w-5" />}
        />
        <StatCard
          label="Starting price"
          value={
            activeServices.length
              ? formatCurrency(Math.min(...activeServices.map((s) => s.pricePaise)))
              : '—'
          }
          hint="Lowest active service price"
          icon={<Scissors className="h-5 w-5" />}
        />
        <StatCard
          label="Plan renews"
          value={formatDate(subscription?.currentPeriodEnd)}
          hint={subscription ? `${subscription.plan} · ${subscription.status}` : 'No subscription'}
          icon={<Globe className="h-5 w-5" />}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Quick actions" description="Jump straight into the most common tasks." />
          <div className="grid gap-2 p-4 sm:grid-cols-2">
            <QuickLink to="/dashboard/website" icon={<Globe className="h-4 w-4" />} title="Edit website" subtitle="Brand, contact, gallery" />
            <QuickLink to="/dashboard/services" icon={<Scissors className="h-4 w-4" />} title="Services & prices" subtitle="Add or update menu" />
            <QuickLink to="/dashboard/staff" icon={<Users className="h-4 w-4" />} title="Manage team" subtitle="Artists and specialists" />
            <QuickLink to="/dashboard/billing" icon={<Rocket className="h-4 w-4" />} title="Subscription" subtitle="Plan and billing cycle" />
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Recent services"
            description="The first few items shown on your public website."
            action={
              <Link to="/dashboard/services" className="text-xs font-semibold text-[#8a641f] hover:underline">
                Manage all
              </Link>
            }
          />
          <div className="divide-y divide-slate-100">
            {loading ? (
              <p className="px-5 py-6 text-sm text-slate-500">Loading services…</p>
            ) : activeServices.length === 0 ? (
              <div className="px-5 py-6 text-sm text-slate-500">
                No active services yet.{' '}
                <Link to="/dashboard/services" className="font-semibold text-[#8a641f] hover:underline">
                  Add your first service
                </Link>
                .
              </div>
            ) : (
              activeServices.slice(0, 4).map((service) => (
                <div key={service.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">{service.name}</p>
                    <p className="text-xs capitalize text-slate-500">
                      {service.category} · {service.durationMinutes} min
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-slate-900">
                    {formatCurrency(service.pricePaise)}
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {!salon.published && (
        <Alert tone="info">
          <span className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Your website is currently a private draft. Only you can see it (via Preview). Publish it to make
              <strong> /salon/{salon.slug}</strong> accessible to the public.
            </span>
          </span>
        </Alert>
      )}
    </div>
  );
};

const QuickLink: React.FC<{ to: string; icon: React.ReactNode; title: string; subtitle: string }> = ({
  to,
  icon,
  title,
  subtitle,
}) => (
  <Link
    to={to}
    className="group rounded-xl border border-slate-200 p-3.5 transition-colors hover:border-[#D09A40]/60 hover:bg-[#D09A40]/5"
  >
    <div className="flex items-center gap-2 text-slate-800">
      <span className="rounded-lg bg-slate-100 p-1.5 text-slate-600 group-hover:bg-white">{icon}</span>
      <span className="text-sm font-semibold">{title}</span>
    </div>
    <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
  </Link>
);
