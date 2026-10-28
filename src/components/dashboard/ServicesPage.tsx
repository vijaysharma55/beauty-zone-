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
import { ImageUploader } from './ImageUploader';

const CATEGORIES = ['bridal', 'hair', 'skin', 'nails', 'spa', 'academy', 'makeup', 'other'];

interface Draft {
  name: string;
  category: string;
  description: string;
  price: string;
  durationMinutes: string;
  imageUrl: string;
  active: boolean;
}

const emptyDraft: Draft = {
  name: '',
  category: 'hair',
  description: '',
  price: '',
  durationMinutes: '60',
  imageUrl: '',
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
      imageUrl: service.imageUrl || '',
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
        imageUrl: draft.imageUrl,
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

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search services…"
          className="max-w-xs"
        />
        <p className="text-xs text-slate-500">
          Showing <strong className="text-slate-900">{filtered.length}</strong> of {services.length} services
        </p>
      </div>

      {loading ? (
        <Card className="p-12 text-center">
          <p className="text-sm text-slate-500">Loading services…</p>
        </Card>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Scissors className="h-6 w-6" />}
          title="No services found"
          description={query ? 'Try a different search term.' : 'Add your first salon treatment to get started.'}
          action={
            <Button variant="gold" onClick={openCreate}>
              <Plus className="h-4 w-4" /> Add service
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((service) => (
            <Card key={service.id} className="flex flex-col justify-between p-5">
              <div className="space-y-3">
                {service.imageUrl && (
                  <div className="relative h-36 w-full overflow-hidden rounded-xl bg-slate-100">
                    <img src={service.imageUrl} alt={service.name} className="h-full w-full object-cover" />
                  </div>
                )}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
                      {service.category}
                    </span>
                    <h3 className="font-serif text-lg font-bold text-slate-900">{service.name}</h3>
                  </div>
                  <Badge tone={service.active ? 'green' : 'slate'}>
                    {service.active ? 'Active' : 'Hidden'}
                  </Badge>
                </div>
                {service.description && (
                  <p className="text-xs text-slate-600 line-clamp-2">{service.description}</p>
                )}
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700 pt-2 border-t border-slate-100">
                  <span className="font-mono text-sm text-slate-900">{formatCurrency(service.price)}</span>
                  <span>{service.durationMinutes} mins</span>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                <Toggle
                  checked={service.active}
                  onChange={() => toggleActive(service)}
                  label="Visible"
                />
                <div className="flex gap-1.5">
                  <Button variant="secondary" size="sm" onClick={() => openEdit(service)}>
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={() => setDeleteTarget(service)}
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Remove
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit service' : 'Add new service'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="gold" onClick={(e: any) => save(e)} loading={saving}>
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
              placeholder="Royal HD Bridal Makeover"
              required
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Category" htmlFor="service-category" required>
              <Select
                id="service-category"
                value={draft.category}
                onChange={(e) => setDraft({ ...draft, category: e.target.value })}
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
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
          </div>
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
          <ImageUploader
            label="Service Image"
            kind="service"
            value={draft.imageUrl}
            onChange={(url) => setDraft({ ...draft, imageUrl: url })}
            hint="Upload a photo for this service using FileReader preview."
            previewClassName="h-24 w-32 rounded-xl"
          />
          <div className="flex items-end pb-1">
            <Toggle
              checked={draft.active}
              onChange={(v) => setDraft({ ...draft, active: v })}
              label="Visible on website"
              description="Hidden services remain in your catalogue."
            />
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
