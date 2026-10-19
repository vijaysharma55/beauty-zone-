import React, { useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, Scissors, Trash2 } from 'lucide-react';
import { api, errorMessage } from '../../lib/api';
import type { SalonService } from '../../types/auth';
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
  Select,
  Textarea,
  Toggle,
  formatCurrency,
} from '../ui';

const CATEGORIES = ['bridal', 'hair', 'skin', 'nails', 'spa', 'academy', 'makeup', 'other'];

interface Draft {
  name: string;
  category: string;
  description: string;
  price: string;
  durationMinutes: string;
  active: boolean;
}

const emptyDraft: Draft = {
  name: '',
  category: 'hair',
  description: '',
  price: '',
  durationMinutes: '60',
  active: true,
};

export const ServicesPage: React.FC = () => {
  const [services, setServices] = useState<SalonService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SalonService | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SalonService | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [query, setQuery] = useState('');

  const load = async () => {
    try {
      const res = await api.get<{ services: SalonService[] }>('/salon/services');
      setServices(res.services);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return services;
    return services.filter(
      (s) => s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q)
    );
  }, [services, query]);

  const openCreate = () => {
    setEditing(null);
    setDraft(emptyDraft);
    setError('');
    setModalOpen(true);
  };

  const openEdit = (service: SalonService) => {
    setEditing(service);
    setDraft({
      name: service.name,
      category: service.category,
      description: service.description,
      price: (service.pricePaise / 100).toString(),
      durationMinutes: String(service.durationMinutes),
      active: service.active,
    });
    setError('');
    setModalOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const priceNumber = Number(draft.price);
    const duration = Number(draft.durationMinutes);
    if (!draft.name.trim()) return setError('Please enter a service name.');
    if (!Number.isFinite(priceNumber) || priceNumber < 0) return setError('Please enter a valid price.');
    if (!Number.isInteger(duration) || duration < 5 || duration > 1440) {
      return setError('Duration must be between 5 and 1440 minutes.');
    }
    setSaving(true);
    try {
      const payload = {
        name: draft.name.trim(),
        category: draft.category,
        description: draft.description.trim(),
        pricePaise: Math.round(priceNumber * 100),
        durationMinutes: duration,
        active: draft.active,
      };
      if (editing) {
        const res = await api.patch<{ service: SalonService }>(`/salon/services/${editing.id}`, payload);
        setServices((prev) => prev.map((s) => (s.id === editing.id ? res.service : s)));
        setNotice('Service updated.');
      } else {
        const res = await api.post<{ service: SalonService }>('/salon/services', payload);
        setServices((prev) => [...prev, res.service]);
        setNotice('Service added.');
      }
      setModalOpen(false);
      setTimeout(() => setNotice(''), 3500);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (service: SalonService) => {
    setError('');
    try {
      const res = await api.patch<{ service: SalonService }>(`/salon/services/${service.id}`, {
        active: !service.active,
      });
      setServices((prev) => prev.map((s) => (s.id === service.id ? res.service : s)));
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setError('');
    try {
      await api.del(`/salon/services/${deleteTarget.id}`);
      setServices((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      setDeleteTarget(null);
      setNotice('Service removed.');
      setTimeout(() => setNotice(''), 3500);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Catalogue"
        title="Services & prices"
        description="Everything here appears on your public website. Inactive services stay hidden."
        actions={
          <Button variant="gold" onClick={openCreate}>
            <Plus className="h-4 w-4" /> Add service
          </Button>
        }
      />

      {error && !modalOpen && <Alert tone="error">{error}</Alert>}
      {notice && <Alert tone="success">{notice}</Alert>}

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Scissors className="h-4 w-4 text-[#D09A40]" />
            {services.length} service{services.length === 1 ? '' : 's'} ·{' '}
            {services.filter((s) => s.active).length} active
          </div>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search services…"
            className="max-w-xs"
            aria-label="Search services"
          />
        </div>

        {loading ? (
          <p className="px-5 py-10 text-center text-sm text-slate-500">Loading services…</p>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Scissors className="h-6 w-6" />}
            title={services.length === 0 ? 'No services yet' : 'No matches'}
            description={
              services.length === 0
                ? 'Add your first service with a price and duration — it will appear on your website immediately.'
                : 'Try a different search term.'
            }
            action={
              services.length === 0 ? (
                <Button variant="gold" onClick={openCreate}>
                  <Plus className="h-4 w-4" /> Add your first service
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((service) => (
              <div key={service.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-slate-900">{service.name}</p>
                    <Badge tone="slate">{service.category}</Badge>
                    {!service.active && <Badge tone="amber">Hidden</Badge>}
                  </div>
                  {service.description && (
                    <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{service.description}</p>
                  )}
                  <p className="mt-1 text-xs text-slate-500">{service.durationMinutes} minutes</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-slate-900">{formatCurrency(service.pricePaise)}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Toggle
                    checked={service.active}
                    onChange={() => toggleActive(service)}
                    label={`${service.active ? 'Hide' : 'Show'} ${service.name} on the website`}
                    hideLabel
                  />
                  <Button variant="ghost" size="sm" onClick={() => openEdit(service)} aria-label={`Edit ${service.name}`}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={() => setDeleteTarget(service)}
                    aria-label={`Delete ${service.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit service' : 'Add service'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="gold" onClick={save} loading={saving}>
              {editing ? 'Save changes' : 'Add service'}
            </Button>
          </>
        }
      >
        <form onSubmit={save} className="space-y-4">
          {error && <Alert tone="error">{error}</Alert>}
          <Field label="Service name" htmlFor="service-name" required>
            <Input
              id="service-name"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="HD Airbrush Bridal Makeover"
              required
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Category" htmlFor="service-category">
              <Select
                id="service-category"
                value={draft.category}
                onChange={(e) => setDraft({ ...draft, category: e.target.value })}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c.charAt(0).toUpperCase() + c.slice(1)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Duration (minutes)" htmlFor="service-duration" required>
              <Input
                id="service-duration"
                type="number"
                min={5}
                max={1440}
                value={draft.durationMinutes}
                onChange={(e) => setDraft({ ...draft, durationMinutes: e.target.value })}
                required
              />
            </Field>
            <Field label="Price (₹)" htmlFor="service-price" required hint="Enter the full price in rupees.">
              <Input
                id="service-price"
                type="number"
                min={0}
                step="1"
                value={draft.price}
                onChange={(e) => setDraft({ ...draft, price: e.target.value })}
                placeholder="4999"
                required
              />
            </Field>
            <div className="flex items-end pb-1">
              <Toggle
                checked={draft.active}
                onChange={(v) => setDraft({ ...draft, active: v })}
                label="Visible on website"
                description="Hidden services remain in your catalogue."
              />
            </div>
          </div>
          <Field label="Description" htmlFor="service-description">
            <Textarea
              id="service-description"
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              placeholder="What's included, products used, finish…"
            />
          </Field>
        </form>
      </Modal>

      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete service?"
        maxWidth="max-w-md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
              Keep service
            </Button>
            <Button variant="danger" onClick={confirmDelete} loading={deleting}>
              Delete permanently
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          <strong className="text-slate-900">{deleteTarget?.name}</strong> will be removed from your website and
          catalogue. This cannot be undone. To temporarily hide it instead, use the visibility toggle.
        </p>
        {error && (
          <div className="mt-3">
            <Alert tone="error">{error}</Alert>
          </div>
        )}
      </Modal>
    </div>
  );
};
