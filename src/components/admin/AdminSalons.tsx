import React, { useCallback, useEffect, useState } from 'react';
import {
  Building2,
  ExternalLink,
  Globe,
  Search,
  Eye,
  EyeOff,
  Pencil,
  Save,
  Scissors,
  ShieldAlert,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import { api, errorMessage } from '../../lib/api';
import { StatusBadge } from '../dashboard/WorkflowStatus';
import type { Salon, SalonService, SalonStaff } from '../../types/auth';
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Modal,
  PageHeader,
  Spinner,
  Textarea,
  formatCurrency,
  formatDate,
} from '../ui';

interface AdminSalonDetail {
  salon: Salon;
  services: SalonService[];
  staff: SalonStaff[];
}

interface EditDraft {
  name: string;
  slug: string;
  tagline: string;
  description: string;
  city: string;
  state: string;
  addressLine: string;
  phone: string;
  email: string;
}

const toDraft = (salon: Salon): EditDraft => ({
  name: salon.name,
  slug: salon.slug,
  tagline: salon.tagline || '',
  description: salon.description || '',
  city: salon.city || '',
  state: salon.state || '',
  addressLine: salon.addressLine || '',
  phone: salon.phone || '',
  email: salon.email || '',
});

export const AdminSalons: React.FC = () => {
  const [salons, setSalons] = useState<Salon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const [detail, setDetail] = useState<AdminSalonDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<EditDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');
  const [suspendBusy, setSuspendBusy] = useState(false);

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

  const openDetail = async (salon: Salon) => {
    setDetail(null);
    setDetailError('');
    setEditing(false);
    setDetailLoading(true);
    setSuspendReason('');
    try {
      const res = await api.get<AdminSalonDetail>(`/admin/salons/${salon.id}`);
      setDetail({ salon: res.salon, services: res.services, staff: res.staff });
      setDraft(toDraft(res.salon));
    } catch (err) {
      setDetailError(errorMessage(err));
      // Fall back to the row data already loaded so the owner can still act.
      setDetail({ salon, services: [], staff: [] });
      setDraft(toDraft(salon));
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setDetail(null);
    setDraft(null);
    setEditing(false);
    setDetailError('');
  };

  const applySalonUpdate = (updated: Salon) => {
    setSalons((prev) => prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s)));
    setDetail((current) =>
      current && current.salon.id === updated.id ? { ...current, salon: { ...current.salon, ...updated } } : current
    );
  };

  const togglePublished = async (salon: Salon) => {
    setBusyId(salon.id);
    setError('');
    setDetailError('');
    try {
      const res = await api.patch<{ salon: Salon }>(`/admin/salons/${salon.id}`, { published: !salon.published });
      applySalonUpdate(res.salon);
      flash(res.salon.published ? 'Website published.' : 'Website unpublished.');
    } catch (err) {
      const message = errorMessage(err);
      setError(message);
      setDetailError(message);
    } finally {
      setBusyId(null);
    }
  };

  const toggleSuspension = async () => {
    if (!detail) return;
    const suspending = !detail.salon.suspended;
    if (suspending && !suspendReason.trim()) {
      setDetailError('Please give a reason for suspending this salon — the owner will see it.');
      return;
    }
    setSuspendBusy(true);
    setDetailError('');
    try {
      const res = await api.patch<{ salon: Salon }>(`/admin/salons/${detail.salon.id}`, {
        suspended: suspending,
        suspendReason: suspendReason.trim(),
      });
      applySalonUpdate(res.salon);
      setSuspendReason('');
      flash(suspending ? 'Salon suspended and website taken offline.' : 'Salon reinstated.');
    } catch (err) {
      setDetailError(errorMessage(err));
    } finally {
      setSuspendBusy(false);
    }
  };

  const saveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detail || !draft) return;
    setSaving(true);
    setDetailError('');
    try {
      const res = await api.patch<{ salon: Salon }>(`/admin/salons/${detail.salon.id}`, draft);
      applySalonUpdate(res.salon);
      setDraft(toDraft(res.salon));
      setEditing(false);
      flash('Website details updated.');
    } catch (err) {
      setDetailError(errorMessage(err));
    } finally {
      setSaving(false);
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
        description="Review every salon, inspect its services and team, edit website details and force-unpublish anything that breaks policy."
      />

      {error && !detail && <Alert tone="error">{error}</Alert>}
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
                      <div className="flex flex-col items-start gap-1">
                        <StatusBadge status={salon.status} suspended={salon.suspended} />
                        {salon.published ? <Badge tone="green">Live</Badge> : <Badge tone="slate">Not live</Badge>}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-500">{formatDate(salon.createdAt)}</td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openDetail(salon)} title="Inspect salon">
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

      <Modal
        open={!!detail || detailLoading}
        onClose={closeDetail}
        title={detail?.salon.name || 'Salon details'}
        maxWidth="max-w-3xl"
        footer={
          detail ? (
            <>
              {editing ? (
                <>
                  <Button variant="ghost" onClick={() => setEditing(false)}>
                    <X className="h-4 w-4" /> Cancel
                  </Button>
                  <Button variant="gold" onClick={saveDetails} loading={saving}>
                    <Save className="h-4 w-4" /> Save details
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="secondary" onClick={() => setEditing(true)}>
                    <Pencil className="h-4 w-4" /> Edit website details
                  </Button>
                  <Button
                    variant={detail.salon.published ? 'danger' : 'primary'}
                    loading={busyId === detail.salon.id}
                    onClick={() => togglePublished(detail.salon)}
                  >
                    {detail.salon.published ? 'Force unpublish' : 'Publish salon'}
                  </Button>
                </>
              )}
            </>
          ) : null
        }
      >
        {detailLoading ? (
          <div className="flex items-center justify-center py-10">
            <Spinner className="h-6 w-6 text-[#D09A40]" />
          </div>
        ) : detail ? (
          <div className="space-y-4 text-sm">
            {detailError && <Alert tone="error">{detailError}</Alert>}

            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={detail.salon.status} suspended={detail.salon.suspended} />
              <Badge tone={detail.salon.published ? 'green' : 'slate'}>
                {detail.salon.published ? 'Published' : 'Not live'}
              </Badge>
              <Badge tone="slate">/salon/{detail.salon.slug}</Badge>
              {detail.salon.subscription && (
                <Badge tone="gold" className="capitalize">
                  {detail.salon.subscription.plan} · {detail.salon.subscription.status}
                </Badge>
              )}
              {detail.salon.published && (
                <a
                  href={`/salon/${detail.salon.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#8a641f] hover:underline"
                >
                  <ExternalLink className="h-3 w-3" /> Open live site
                </a>
              )}
            </div>

            {editing && draft ? (
              <form onSubmit={saveDetails} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Salon name" htmlFor="admin-salon-name" required>
                    <Input
                      id="admin-salon-name"
                      value={draft.name}
                      onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                      required
                    />
                  </Field>
                  <Field label="Website address" htmlFor="admin-salon-slug" required hint="Changing this breaks old links.">
                    <div className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 focus-within:border-[#D09A40] focus-within:ring-2 focus-within:ring-[#D09A40]/25">
                      <span className="shrink-0 text-sm text-slate-400">/salon/</span>
                      <input
                        id="admin-salon-slug"
                        value={draft.slug}
                        onChange={(e) => setDraft({ ...draft, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                        className="w-full border-0 bg-transparent py-2.5 text-sm focus:outline-none"
                        required
                      />
                    </div>
                  </Field>
                  <Field label="Tagline" htmlFor="admin-salon-tagline" className="sm:col-span-2">
                    <Input
                      id="admin-salon-tagline"
                      value={draft.tagline}
                      onChange={(e) => setDraft({ ...draft, tagline: e.target.value })}
                    />
                  </Field>
                  <Field label="Description" htmlFor="admin-salon-description" className="sm:col-span-2">
                    <Textarea
                      id="admin-salon-description"
                      value={draft.description}
                      onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                    />
                  </Field>
                  <Field label="City" htmlFor="admin-salon-city">
                    <Input
                      id="admin-salon-city"
                      value={draft.city}
                      onChange={(e) => setDraft({ ...draft, city: e.target.value })}
                    />
                  </Field>
                  <Field label="State / region" htmlFor="admin-salon-state">
                    <Input
                      id="admin-salon-state"
                      value={draft.state}
                      onChange={(e) => setDraft({ ...draft, state: e.target.value })}
                    />
                  </Field>
                  <Field label="Address" htmlFor="admin-salon-address" className="sm:col-span-2">
                    <Input
                      id="admin-salon-address"
                      value={draft.addressLine}
                      onChange={(e) => setDraft({ ...draft, addressLine: e.target.value })}
                    />
                  </Field>
                  <Field label="Phone" htmlFor="admin-salon-phone">
                    <Input
                      id="admin-salon-phone"
                      value={draft.phone}
                      onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
                    />
                  </Field>
                  <Field label="Contact email" htmlFor="admin-salon-email">
                    <Input
                      id="admin-salon-email"
                      type="email"
                      value={draft.email}
                      onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                    />
                  </Field>
                </div>
              </form>
            ) : (
              <>
                {detail.salon.tagline && <p className="text-slate-600">{detail.salon.tagline}</p>}
                {detail.salon.description && <p className="text-slate-600">{detail.salon.description}</p>}
                <dl className="grid gap-2 sm:grid-cols-2">
                  <Detail label="Owner" value={`${detail.salon.owner?.name} · ${detail.salon.owner?.email}`} />
                  <Detail label="Phone" value={detail.salon.phone || '—'} />
                  <Detail label="Email" value={detail.salon.email || '—'} />
                  <Detail
                    label="Address"
                    value={
                      [detail.salon.addressLine, detail.salon.city, detail.salon.state].filter(Boolean).join(', ') || '—'
                    }
                  />
                  <Detail label="Services" value={`${detail.services.filter((s) => s.active).length} active / ${detail.services.length} total`} />
                  <Detail label="Team" value={`${detail.staff.filter((s) => s.active).length} active / ${detail.staff.length} total`} />
                  <Detail label="Published at" value={formatDate(detail.salon.publishedAt)} />
                  <Detail label="Last updated" value={formatDate(detail.salon.updatedAt)} />
                </dl>
              </>
            )}

            <div
              className={`rounded-xl border p-4 ${
                detail.salon.suspended ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-slate-50/60'
              }`}
            >
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
                {detail.salon.suspended ? (
                  <ShieldAlert className="h-3.5 w-3.5 text-red-600" />
                ) : (
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                )}
                {detail.salon.suspended ? 'Salon suspended' : 'Suspension'}
              </p>
              <p className="mt-1 text-xs text-slate-600">
                {detail.salon.suspended
                  ? `Website is offline. Reason: ${detail.salon.suspendedReason || '—'} (since ${formatDate(
                      detail.salon.suspendedAt
                    )}).`
                  : 'Suspending takes the website offline immediately and blocks submissions and publishing until reinstated.'}
              </p>
              {!detail.salon.suspended && (
                <div className="mt-2.5">
                  <Input
                    value={suspendReason}
                    onChange={(e) => setSuspendReason(e.target.value)}
                    placeholder="Reason shown to the salon owner"
                    aria-label="Suspension reason"
                    maxLength={500}
                  />
                </div>
              )}
              <div className="mt-2.5">
                <Button
                  variant={detail.salon.suspended ? 'secondary' : 'danger'}
                  size="sm"
                  loading={suspendBusy}
                  onClick={toggleSuspension}
                >
                  {detail.salon.suspended ? 'Reinstate salon' : 'Suspend salon'}
                </Button>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200">
              <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <Scissors className="h-3.5 w-3.5 text-[#D09A40]" /> Services & prices
              </div>
              {detail.services.length === 0 ? (
                <p className="px-4 py-3 text-xs text-slate-500">No services created yet.</p>
              ) : (
                <ul className="max-h-48 divide-y divide-slate-100 overflow-y-auto">
                  {detail.services.map((service) => (
                    <li key={service.id} className="flex items-center justify-between gap-3 px-4 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-slate-800">{service.name}</p>
                        <p className="text-[11px] capitalize text-slate-500">
                          {service.category} · {service.durationMinutes} min
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {!service.active && <Badge tone="amber">Hidden</Badge>}
                        <span className="text-xs font-semibold text-slate-800">{formatCurrency(service.pricePaise)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-xl border border-slate-200">
              <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <Users className="h-3.5 w-3.5 text-[#D09A40]" /> Team
              </div>
              {detail.staff.length === 0 ? (
                <p className="px-4 py-3 text-xs text-slate-500">No team members added yet.</p>
              ) : (
                <ul className="flex flex-wrap gap-2 p-4">
                  {detail.staff.map((member) => (
                    <li key={member.id}>
                      <Badge tone={member.active ? 'slate' : 'amber'}>
                        {member.name}
                        {member.roleTitle ? ` — ${member.roleTitle}` : ''}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : null}
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
