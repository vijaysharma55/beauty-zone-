import React, { useCallback, useEffect, useState } from 'react';
import { Building2, ExternalLink, Globe, Search, Eye, EyeOff } from 'lucide-react';
import { api, errorMessage } from '../../lib/api';
import type { Salon } from '../../types/auth';
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  Modal,
  PageHeader,
  formatDate,
} from '../ui';

export const AdminSalons: React.FC = () => {
  const [salons, setSalons] = useState<Salon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Salon | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ salons: Salon[] }>('/admin/salons');
      setSalons(res.salons);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const flash = (text: string) => {
    setNotice(text);
    setTimeout(() => setNotice(''), 4000);
  };

  const togglePublished = async (salon: Salon) => {
    setBusyId(salon.id);
    setError('');
    try {
      const res = await api.patch<{ salon: Salon }>(`/admin/salons/${salon.id}`, { published: !salon.published });
      setSalons((prev) => prev.map((s) => (s.id === salon.id ? { ...s, ...res.salon } : s)));
      setDetail((current) => (current && current.id === salon.id ? { ...current, ...res.salon } : current));
      flash(res.salon.published ? 'Website published.' : 'Website unpublished.');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const filtered = salons.filter((s) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      s.name.toLowerCase().includes(q) ||
      s.slug.toLowerCase().includes(q) ||
      (s.owner?.email || '').toLowerCase().includes(q) ||
      (s.city || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Moderation"
        title="Salons & published websites"
        description="Review every salon, inspect its public data and force-unpublish anything that breaks policy."
      />

      {error && <Alert tone="error">{error}</Alert>}
      {notice && <Alert tone="success">{notice}</Alert>}

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Building2 className="h-4 w-4 text-[#D09A40]" /> {salons.length} salon{salons.length === 1 ? '' : 's'} ·{' '}
            {salons.filter((s) => s.published).length} live
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search salons or owners…"
              className="w-64 pl-9"
              aria-label="Search salons"
            />
          </div>
        </div>

        {loading ? (
          <p className="px-5 py-10 text-center text-sm text-slate-500">Loading salons…</p>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Building2 className="h-6 w-6" />}
            title={salons.length === 0 ? 'No salons yet' : 'No salons match'}
            description={salons.length === 0 ? 'Salon owners appear here after they complete onboarding.' : 'Try another search.'}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Salon</th>
                  <th className="px-5 py-3 font-medium">Owner</th>
                  <th className="px-5 py-3 font-medium">Plan</th>
                  <th className="px-5 py-3 font-medium">Services</th>
                  <th className="px-5 py-3 font-medium">Website</th>
                  <th className="px-5 py-3 font-medium">Created</th>
                  <th className="px-5 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((salon) => (
                  <tr key={salon.id} className="hover:bg-slate-50/60">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        {salon.logoUrl ? (
                          <img src={salon.logoUrl} alt="" className="h-9 w-9 rounded-full object-cover" />
                        ) : (
                          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                            <Building2 className="h-4 w-4" />
                          </span>
                        )}
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-900">{salon.name}</p>
                          <p className="truncate text-xs text-slate-500">
                            /salon/{salon.slug}
                            {salon.city ? ` · ${salon.city}` : ''}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-xs font-medium text-slate-800">{salon.owner?.name}</p>
                      <p className="text-xs text-slate-500">{salon.owner?.email}</p>
                      {salon.owner?.status !== 'active' && <Badge tone="red">Owner disabled</Badge>}
                    </td>
                    <td className="px-5 py-3">
                      {salon.subscription ? (
                        <div className="space-y-1">
                          <Badge tone="gold" className="capitalize">
                            {salon.subscription.plan}
                          </Badge>
                          <p className="text-[11px] capitalize text-slate-500">{salon.subscription.status}</p>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">None</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-600">{salon.serviceCount ?? 0}</td>
                    <td className="px-5 py-3">
                      {salon.published ? <Badge tone="green">Live</Badge> : <Badge tone="amber">Draft</Badge>}
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-500">{formatDate(salon.createdAt)}</td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setDetail(salon)} title="Inspect salon">
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        {salon.published && (
                          <a href={`/salon/${salon.slug}`} target="_blank" rel="noreferrer">
                            <Button variant="ghost" size="sm" title="Open public website">
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Button>
                          </a>
                        )}
                        <Button
                          variant={salon.published ? 'secondary' : 'primary'}
                          size="sm"
                          loading={busyId === salon.id}
                          onClick={() => togglePublished(salon)}
                        >
                          {salon.published ? (
                            <>
                              <EyeOff className="h-3.5 w-3.5" /> Unpublish
                            </>
                          ) : (
                            <>
                              <Globe className="h-3.5 w-3.5" /> Publish
                            </>
                          )}
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

      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail?.name || 'Salon details'} maxWidth="max-w-2xl">
        {detail && (
          <div className="space-y-4 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={detail.published ? 'green' : 'amber'}>{detail.published ? 'Published' : 'Draft'}</Badge>
              <Badge tone="slate">/salon/{detail.slug}</Badge>
              {detail.subscription && (
                <Badge tone="gold" className="capitalize">
                  {detail.subscription.plan} · {detail.subscription.status}
                </Badge>
              )}
            </div>
            {detail.tagline && <p className="text-slate-600">{detail.tagline}</p>}
            {detail.description && <p className="text-slate-600">{detail.description}</p>}
            <dl className="grid gap-2 sm:grid-cols-2">
              <Detail label="Owner" value={`${detail.owner?.name} · ${detail.owner?.email}`} />
              <Detail label="Phone" value={detail.phone || '—'} />
              <Detail label="Email" value={detail.email || '—'} />
              <Detail
                label="Address"
                value={[detail.addressLine, detail.city, detail.state].filter(Boolean).join(', ') || '—'}
              />
              <Detail label="Services" value={String(detail.serviceCount ?? 0)} />
              <Detail label="Published at" value={formatDate(detail.publishedAt)} />
            </dl>
            <div className="flex flex-wrap gap-2 pt-2">
              {detail.published && (
                <a href={`/salon/${detail.slug}`} target="_blank" rel="noreferrer">
                  <Button variant="secondary" size="sm">
                    <ExternalLink className="h-3.5 w-3.5" /> Open website
                  </Button>
                </a>
              )}
              <Button
                variant={detail.published ? 'danger' : 'primary'}
                size="sm"
                loading={busyId === detail.id}
                onClick={() => togglePublished(detail)}
              >
                {detail.published ? 'Force unpublish' : 'Publish salon'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

const Detail: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-lg bg-slate-50 px-3 py-2">
    <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
    <dd className="mt-0.5 text-sm text-slate-800">{value}</dd>
  </div>
);
