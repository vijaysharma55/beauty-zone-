import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { detectSalonDomain } from '../../lib/salon-context/detectSalonDomain';
import { buildTemplatePrefill, rankCategories, rankTemplates } from '../../lib/salon-context/rankServices';
import type { RankedTemplate } from '../../lib/salon-context/rankServices';
import {
  ChevronDown,
  ChevronRight,
  Clock3,
  ImageOff,
  LayoutGrid,
  ListFilter,
  Pencil,
  Plus,
  RefreshCw,
  Scissors,
  StickyNote,
  Sparkles,
  Tag,
  Trash2,
} from 'lucide-react';
import { api, errorMessage } from '../../lib/api';
import type {
  SalonService,
  ServiceCategoryGroup,
  ServiceCategoryOption,
  ServiceSubcategoryGroup,
} from '../../types/auth';
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
  Textarea,
  Toggle,
  cn,
  formatCurrency,
} from '../ui';
import { ServiceCategoryPicker } from './ServiceCategoryPicker';
import { ServiceImageField } from './ServiceImageField';
import {
  MAX_SERVICE_NOTES_LENGTH,
  groupServicesByCategory,
  normalizeServiceCategory,
  normalizeServiceSubcategory,
  serviceCategoryLabel,
  serviceCategoryOptions,
} from '../../lib/serviceCategories.js';

const CATALOGUE_PATH = '/salon/services';

interface Draft {
  name: string;
  category: string;
  subcategory: string;
  description: string;
  notes: string;
  price: string;
  durationMinutes: string;
  imageUrl: string;
  active: boolean;
}

const emptyDraft: Draft = {
  name: '',
  category: '',
  subcategory: '',
  description: '',
  notes: '',
  price: '',
  durationMinutes: '60',
  imageUrl: '',
  active: true,
};

type RateDraft = { id: string; value: string } | null;
type NotesDraft = { id: string; value: string } | null;

/** ₹ input → paise, rejecting anything that is not a non-negative amount. */
function parseRupeesToPaise(value: string): number | null {
  const text = String(value ?? '').replace(/[₹,\s]/g, '');
  if (!text) return null;
  const amount = Number(text);
  if (!Number.isFinite(amount) || amount < 0) return null;
  return Math.round(amount * 100);
}

export const ServicesPage: React.FC = () => {
  const { salon } = useAuth();
  const [services, setServices] = useState<SalonService[]>([]);
  const [sessionCategories, setSessionCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SalonService | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<SalonService | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [view, setView] = useState<'grid' | 'table'>('grid');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [rateDraft, setRateDraft] = useState<RateDraft>(null);
  const [notesDraft, setNotesDraft] = useState<NotesDraft>(null);
  const [busyServiceId, setBusyServiceId] = useState<string | null>(null);
  const [imageTarget, setImageTarget] = useState<SalonService | null>(null);
  const [templateQuery, setTemplateQuery] = useState('');
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [priceIsSuggested, setPriceIsSuggested] = useState(false);

  const flash = useCallback((text: string) => {
    setNotice(text);
    window.setTimeout(() => setNotice(''), 4000);
  }, []);

  const applyPayload = useCallback(
    (payload: { services?: SalonService[]; service?: SalonService }) => {
      if (Array.isArray(payload.services)) setServices(payload.services);
      else if (payload.service) {
        setServices((prev) => {
          const exists = prev.some((item) => item.id === payload.service!.id);
          return exists
            ? prev.map((item) => (item.id === payload.service!.id ? payload.service! : item))
            : [...prev, payload.service!];
        });
      }
    },
    []
  );

  const load = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (silent) setRefreshing(true);
      try {
        const res = await api.get<{ services: SalonService[] }>(CATALOGUE_PATH);
        setServices(res.services || []);
        setError('');
      } catch (err) {
        setError(errorMessage(err));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    void load();
  }, [load]);

  // Profile and service history are local inputs: no extra request is made
  // while the owner types or opens the service modal.
  const salonContext = useMemo(() => {
    const existingServices = services.map((service) => ({
      name: service.name,
      category: service.category,
      subcategory: service.subcategory,
      description: service.description,
      durationMinutes: service.durationMinutes,
      pricePaise: service.pricePaise,
    }));
    const profile = {
      name: salon?.name || '',
      tagline: salon?.tagline || '',
      about: salon?.description || '',
      existingServices,
    };
    return { ...profile, detection: detectSalonDomain(profile) };
  }, [salon?.name, salon?.tagline, salon?.description, services]);

  const rankedCategories = useMemo(() => rankCategories(salonContext), [salonContext]);
  const recommendedCategoryValues = useMemo(
    () => rankedCategories.filter((category) => category.recommended).map((category) => category.category),
    [rankedCategories]
  );
  const categoryOrder = useMemo(
    () => rankedCategories.map((category) => category.category),
    [rankedCategories]
  );

  /**
   * Picker vocabulary: presets + used categories + all catalog categories.
   * This keeps specialist categories (e.g. Barber / Mehendi) selectable even
   * before the salon has saved its first service in that category.
   */
  const options = useMemo(
    () => serviceCategoryOptions(
      services,
      [...sessionCategories, ...rankedCategories.map((category) => category.category)]
    ) as ServiceCategoryOption[],
    [services, sessionCategories, rankedCategories]
  );

  const rankedTemplates = useMemo(
    () => rankTemplates(salonContext, {
      query: templateQuery,
      limit: templateQuery.trim() ? undefined : 8,
    }),
    [salonContext, templateQuery]
  );

  const groups = useMemo<ServiceCategoryGroup[]>(() => {
    const q = query.trim().toLowerCase();
    const filtered = services.filter((service) => {
      if (statusFilter === 'active' && !service.active) return false;
      if (statusFilter === 'inactive' && service.active) return false;
      if (categoryFilter !== 'all' && normalizeServiceCategory(service.category) !== categoryFilter) return false;
      if (!q) return true;
      const haystack = [
        service.name,
        service.categoryLabel || service.category,
        service.subcategory,
        service.description,
        service.notes,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
    return groupServicesByCategory(filtered) as ServiceCategoryGroup[];
  }, [services, query, statusFilter, categoryFilter]);

  const stats = useMemo(() => {
    const total = services.length;
    const active = services.filter((service) => service.active).length;
    const withImages = services.filter((service) => Boolean(service.imageUrl)).length;
    return { total, active, inactive: total - active, withImages };
  }, [services]);

  /** Keep owner-created categories selectable for the rest of the session. */
  const rememberCategory = (category: string) => {
    const value = normalizeServiceCategory(category);
    if (!value) return;
    setSessionCategories((prev) => (prev.includes(value) ? prev : [...prev, value]));
  };

  const openCreate = (preset?: { category?: string; subcategory?: string }) => {
    setEditing(null);
    setTemplateQuery('');
    setShowAllCategories(false);
    setPriceIsSuggested(false);
    setDraft({
      ...emptyDraft,
      category: preset?.category ? normalizeServiceCategory(preset.category) : '',
      subcategory: preset?.subcategory ? normalizeServiceSubcategory(preset.subcategory) : '',
    });
    if (preset?.category) rememberCategory(preset.category);
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (service: SalonService) => {
    setEditing(service);
    setTemplateQuery('');
    setPriceIsSuggested(false);
    setDraft({
      name: service.name,
      category: normalizeServiceCategory(service.category),
      subcategory: service.subcategory || '',
      description: service.description || '',
      notes: service.notes || '',
      price: String(Math.round(service.pricePaise / 100)),
      durationMinutes: String(service.durationMinutes),
      imageUrl: service.imageUrl || '',
      active: service.active,
    });
    setFormError('');
    setModalOpen(true);
  };

  const applyTemplate = (template: RankedTemplate) => {
    const values = buildTemplatePrefill(template, salonContext);
    rememberCategory(values.category);
    setDraft((current) => ({
      ...current,
      name: values.name,
      category: values.category,
      subcategory: values.subcategory,
      description: values.description,
      durationMinutes: String(values.durationMinutes),
      price: values.price > 0 ? String(values.price) : '',
    }));
    setPriceIsSuggested(true);
    setFormError('');
    setTemplateQuery('');
  };

  const patchService = async (id: string, payload: Record<string, unknown>) => {
    const res = await api.patch<{ service: SalonService }>(`${CATALOGUE_PATH}/${id}`, payload);
    applyPayload(res);
    return res.service;
  };

  const save = async (event?: React.FormEvent) => {
    event?.preventDefault();
    setFormError('');
    const pricePaise = parseRupeesToPaise(draft.price);
    const duration = Number(draft.durationMinutes);
    if (!draft.name.trim()) return setFormError('Please enter a service name.');
    if (!draft.category) return setFormError('Choose a main category or add a new one.');
    if (pricePaise === null) return setFormError('Enter a valid rate in ₹ (0 or more).');
    if (!Number.isInteger(duration) || duration < 5 || duration > 1440) {
      return setFormError('Duration must be between 5 and 1440 minutes.');
    }

    const category = normalizeServiceCategory(draft.category);
    const subcategory = normalizeServiceSubcategory(draft.subcategory);
    const payload = {
      name: draft.name.trim(),
      category,
      subcategory,
      description: draft.description.trim(),
      notes: draft.notes.trim(),
      pricePaise,
      durationMinutes: duration,
      imageUrl: draft.imageUrl,
      active: draft.active,
    };

    setSaving(true);
    try {
      if (editing) {
        await patchService(editing.id, payload);
        flash(`${payload.name} updated.`);
      } else {
        const res = await api.post<{ service: SalonService }>(CATALOGUE_PATH, payload);
        applyPayload(res);
        flash(`${payload.name} added to ${serviceCategoryLabel(category)}.`);
      }
      rememberCategory(category);
      setModalOpen(false);
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (service: SalonService) => {
    setError('');
    setBusyServiceId(service.id);
    try {
      await patchService(service.id, { active: !service.active });
      flash(`${service.name} is now ${service.active ? 'hidden from' : 'visible on'} the website.`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusyServiceId(null);
    }
  };

  const saveRate = async (service: SalonService) => {
    if (!rateDraft) return;
    const pricePaise = parseRupeesToPaise(rateDraft.value);
    if (pricePaise === null) {
      setError('Enter a valid rate in ₹ (0 or more).');
      return;
    }
    setError('');
    setBusyServiceId(service.id);
    try {
      await patchService(service.id, { pricePaise });
      setRateDraft(null);
      flash(`${service.name} rate updated to ${formatCurrency(pricePaise)}.`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusyServiceId(null);
    }
  };

  const saveNotes = async (service: SalonService) => {
    if (!notesDraft) return;
    setError('');
    setBusyServiceId(service.id);
    try {
      await patchService(service.id, { notes: notesDraft.value });
      setNotesDraft(null);
      flash(`Notes saved for ${service.name}.`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusyServiceId(null);
    }
  };

  const changeImage = async (service: SalonService, url: string) => {
    setError('');
    setImageTarget(null);
    setBusyServiceId(service.id);
    try {
      await patchService(service.id, { imageUrl: url });
      flash(url ? `Image updated for ${service.name}.` : `Image removed from ${service.name}.`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusyServiceId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setError('');
    try {
      await api.del<{ ok: boolean }>(`${CATALOGUE_PATH}/${deleteTarget.id}`);
      setServices((prev) => prev.filter((service) => service.id !== deleteTarget.id));
      flash(`${deleteTarget.name} removed from the catalogue.`);
      setDeleteTarget(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  const toggleGroup = (category: string) =>
    setCollapsed((prev) => ({ ...prev, [category]: !prev[category] }));

  const emptyCatalogue = !loading && services.length === 0;
  const nothingMatches = !loading && services.length > 0 && groups.length === 0;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Catalogue"
        title="Services & prices"
        description="Group every treatment under a main category and subcategory, add a photo, set the rate in ₹ and keep private notes for your team. Active services appear on your public website."
        actions={
          <>
            <Button variant="secondary" onClick={() => void load({ silent: true })} loading={refreshing}>
              {!refreshing && <RefreshCw className="h-4 w-4" />} Refresh
            </Button>
            <Button variant="gold" onClick={() => openCreate()}>
              <Plus className="h-4 w-4" /> Add service
            </Button>
          </>
        }
      />

      {error && <Alert tone="error">{error}</Alert>}
      {notice && <Alert tone="success">{notice}</Alert>}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Services</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{stats.total}</p>
          <p className="text-xs text-slate-500">
            {groups.length} {groups.length === 1 ? 'category' : 'categories'} in view
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Visible online</p>
          <p className="mt-1 text-2xl font-bold text-emerald-700">{stats.active}</p>
          <p className="text-xs text-slate-500">{stats.inactive} hidden</p>
        </Card>
        <Card className="p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">With images</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{stats.withImages}</p>
          <p className="text-xs text-slate-500">{stats.total - stats.withImages} missing a photo</p>
        </Card>
        <Card className="p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Catalogue value</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {formatCurrency(services.reduce((sum, service) => sum + (service.active ? service.pricePaise : 0), 0))}
          </p>
          <p className="text-xs text-slate-500">Sum of visible rates</p>
        </Card>
      </div>

      <Card className="flex flex-wrap items-center gap-3 p-3">
        <div className="relative min-w-[200px] flex-1">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search services, subcategories, notes…"
            aria-label="Search services"
            className="!py-2"
          />
        </div>
        <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
          <ListFilter className="h-4 w-4 text-slate-400" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            aria-label="Filter by category"
            className="rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs font-medium text-slate-700"
          >
            <option value="all">All categories</option>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
          <Tag className="h-4 w-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
            aria-label="Filter by status"
            className="rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs font-medium text-slate-700"
          >
            <option value="all">All statuses</option>
            <option value="active">Active only</option>
            <option value="inactive">Hidden only</option>
          </select>
        </label>
        <div className="flex overflow-hidden rounded-lg border border-slate-300">
          <button
            type="button"
            onClick={() => setView('grid')}
            aria-pressed={view === 'grid'}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 text-xs font-semibold',
              view === 'grid' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
            )}
          >
            <LayoutGrid className="h-3.5 w-3.5" /> Cards
          </button>
          <button
            type="button"
            onClick={() => setView('table')}
            aria-pressed={view === 'table'}
            className={cn(
              'flex items-center gap-1.5 border-l border-slate-300 px-3 py-2 text-xs font-semibold',
              view === 'table' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
            )}
          >
            <Scissors className="h-3.5 w-3.5" /> Table
          </button>
        </div>
      </Card>

      {loading ? (
        <Card className="p-12 text-center">
          <p className="text-sm text-slate-500">Loading your catalogue…</p>
        </Card>
      ) : emptyCatalogue ? (
        <EmptyState
          icon={<Scissors className="h-6 w-6" />}
          title="No services yet"
          description="Start with a main category such as Hair, Nails or Makeup — or create your own — then add the treatments you offer, their rates and notes."
          action={
            <Button variant="gold" onClick={() => openCreate({ category: 'hair' })}>
              <Plus className="h-4 w-4" /> Add your first service
            </Button>
          }
        />
      ) : nothingMatches ? (
        <EmptyState
          icon={<Scissors className="h-6 w-6" />}
          title="Nothing matches those filters"
          description="Try a different search term, category or status."
          action={
            <Button
              variant="secondary"
              onClick={() => {
                setQuery('');
                setCategoryFilter('all');
                setStatusFilter('all');
              }}
            >
              Clear filters
            </Button>
          }
        />
      ) : (
        <div className="space-y-5">
          {groups.map((group) => {
            const isCollapsed = Boolean(collapsed[group.category]);
            const presetOption = options.find((option) => option.value === group.category);
            const isCustom = presetOption ? presetOption.custom : true;
            return (
              <Card key={group.category} className="overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-4 py-3">
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.category)}
                    aria-expanded={!isCollapsed}
                    className="flex min-w-0 items-center gap-2 text-left"
                  >
                    {isCollapsed ? (
                      <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
                    )}
                    <span className="truncate font-serif text-lg font-bold text-slate-900">{group.label}</span>
                    <Badge tone={isCustom ? 'gold' : 'slate'}>
                      {isCustom ? 'Custom' : 'Preset'}
                    </Badge>
                    <span className="text-xs text-slate-500">
                      {group.active}/{group.total} visible
                    </span>
                  </button>
                  <Button size="sm" variant="secondary" onClick={() => openCreate({ category: group.category })}>
                    <Plus className="h-3.5 w-3.5" /> Add to {group.label}
                  </Button>
                </div>

                {!isCollapsed && (
                  <div className="space-y-4 p-4">
                    {group.subcategories.map((bucket) => (
                      <SubcategorySection
                        key={`${group.category}:${bucket.subcategory}`}
                        bucket={bucket}
                        view={view}
                        busyServiceId={busyServiceId}
                        rateDraft={rateDraft}
                        notesDraft={notesDraft}
                        onStartRate={(service) =>
                          setRateDraft({ id: service.id, value: String(Math.round(service.pricePaise / 100)) })
                        }
                        onRateChange={(value) => setRateDraft((prev) => (prev ? { ...prev, value } : prev))}
                        onCancelRate={() => setRateDraft(null)}
                        onSaveRate={saveRate}
                        onStartNotes={(service) => setNotesDraft({ id: service.id, value: service.notes || '' })}
                        onNotesChange={(value) => setNotesDraft((prev) => (prev ? { ...prev, value } : prev))}
                        onCancelNotes={() => setNotesDraft(null)}
                        onSaveNotes={saveNotes}
                        onEdit={openEdit}
                        onToggleActive={toggleActive}
                        onDelete={setDeleteTarget}
                        onManageImage={setImageTarget}
                        onAddService={() => openCreate({ category: group.category, subcategory: bucket.subcategory })}
                      />
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `Edit ${editing.name}` : 'Add a service'}
        maxWidth="max-w-2xl"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="gold" onClick={() => void save()} loading={saving}>
              {editing ? 'Save changes' : 'Add service'}
            </Button>
          </>
        }
      >
        <form onSubmit={save} className="space-y-4">
          {formError && <Alert tone="error">{formError}</Alert>}

          {!editing && (
            <section className="space-y-3 rounded-2xl border border-[#D09A40]/25 bg-gradient-to-br from-[#D09A40]/[0.07] to-white p-3 sm:p-4" aria-label="Smart service suggestions">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <Sparkles className="h-4 w-4 text-[#B58432]" />
                    Suggested for {salon?.name || 'your salon'}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Suggestions based on your salon profile · <a href="/dashboard/website" className="font-semibold text-[#8a641f] underline underline-offset-2">Edit profile</a>
                  </p>
                </div>
                <button type="button" onClick={() => setShowAllCategories(true)} className="text-xs font-semibold text-slate-600 underline underline-offset-2 hover:text-slate-900">
                  Not relevant? Show all
                </button>
              </div>
              <Input
                value={templateQuery}
                onChange={(event) => setTemplateQuery(event.target.value)}
                placeholder="Search all services and categories…"
                aria-label="Search service templates across all categories"
              />
              {loading ? (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" aria-label="Loading service suggestions">
                  {Array.from({ length: 6 }, (_, index) => (
                    <div key={index} className="animate-pulse rounded-xl border border-slate-200 bg-white p-3">
                      <div className="h-4 w-2/3 rounded bg-slate-100" />
                      <div className="mt-2 h-3 w-full rounded bg-slate-100" />
                      <div className="mt-2 h-3 w-1/2 rounded bg-slate-100" />
                    </div>
                  ))}
                </div>
              ) : rankedTemplates.length > 0 ? (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {rankedTemplates.slice(0, templateQuery.trim() ? 12 : 8).map((template) => (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => applyTemplate(template)}
                      className="group rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:border-[#D09A40] hover:bg-[#fffdf8] focus:outline-none focus:ring-2 focus:ring-[#D09A40]/40"
                    >
                      <span className="flex items-start justify-between gap-2">
                        <span className="text-sm font-semibold text-slate-900 group-hover:text-[#76551f]">{template.name}</span>
                        <span className="shrink-0 rounded-full bg-[#D09A40]/10 px-2 py-0.5 text-[10px] font-semibold text-[#8a641f]">{template.defaultDurationMin} min</span>
                      </span>
                      <span className="mt-1 block text-xs leading-relaxed text-slate-500">{template.description}</span>
                      <span className="mt-2 block text-[11px] font-medium text-slate-600">
                        {template.suggestedPriceRange ? `Suggested ₹${template.suggestedPriceRange[0].toLocaleString('en-IN')}–₹${template.suggestedPriceRange[1].toLocaleString('en-IN')}` : 'Price can be added'}
                        <span className="ml-2 text-[#98702d]">· {template.categoryLabel} / {template.subcategory}</span>
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="rounded-lg border border-dashed border-slate-200 bg-white p-3 text-xs text-slate-500">
                  No matching templates. Try another search or show all categories to add a custom service.
                </p>
              )}
              {salonContext.detection.primaryDomain === 'unisex_general' && (
                <p className="text-[11px] text-slate-500">We couldn’t confidently identify one specialty, so these suggestions use a balanced service mix.</p>
              )}
            </section>
          )}

          <Field label="Service name" htmlFor="service-name" required>
            <Input
              id="service-name"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="Royal HD Bridal Makeover"
              maxLength={120}
              required
            />
          </Field>

          <ServiceCategoryPicker
            category={draft.category}
            subcategory={draft.subcategory}
            options={options}
            recommendedCategoryValues={editing ? [] : recommendedCategoryValues}
            categoryOrder={editing ? [] : categoryOrder}
            showAllCategories={editing ? true : showAllCategories}
            onToggleAllCategories={setShowAllCategories}
            onChange={({ category, subcategory }) => {
              rememberCategory(category);
              setDraft((prev) => ({ ...prev, category, subcategory }));
            }}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Rate / Price (₹)" htmlFor="service-price" required hint={priceIsSuggested ? "Suggested price based on your salon catalogue or typical market range · editable." : "Full price in rupees."}>
              <Input
                id="service-price"
                type="number"
                min={0}
                step="1"
                inputMode="numeric"
                value={draft.price}
                onChange={(e) => { setPriceIsSuggested(false); setDraft({ ...draft, price: e.target.value }); }}
                placeholder="4999"
                required
              />
            </Field>
            <Field label="Duration (minutes)" htmlFor="service-duration" required hint="5–1440 minutes.">
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

          <ServiceImageField
            value={draft.imageUrl}
            onChange={(imageUrl) => setDraft({ ...draft, imageUrl })}
            hint="Uploaded to Supabase Storage. Shows on the website card and booking flow."
            onWarning={(message) => setFormError(message)}
          />

          <Field
            label="Important notes / custom instructions"
            htmlFor="service-notes"
            hint="Duration specifics, prerequisites, patch tests or prep instructions. Shown as a note under the service."
          >
            <Textarea
              id="service-notes"
              value={draft.notes}
              maxLength={MAX_SERVICE_NOTES_LENGTH}
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              placeholder="Arrive 10 minutes early. Patch test required 24 hours before colour. Price includes blow-dry."
            />
          </Field>

          <Field label="Description" htmlFor="service-description" hint="What's included, products used, finish.">
            <Textarea
              id="service-description"
              value={draft.description}
              maxLength={2000}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              placeholder="A 90-minute gel extension set with a hand-filed finish…"
            />
          </Field>

          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
            <Toggle
              checked={draft.active}
              onChange={(active) => setDraft({ ...draft, active })}
              label={draft.active ? 'Active — visible on the public website' : 'Inactive — hidden from the public website'}
              description="Hidden services stay in your catalogue, rates and reports."
            />
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete service?"
        maxWidth="max-w-md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
              Keep service
            </Button>
            <Button variant="danger" onClick={() => void confirmDelete()} loading={deleting}>
              Delete permanently
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          <strong className="text-slate-900">{deleteTarget?.name}</strong> will be removed from your website and
          catalogue. This cannot be undone. To hide it temporarily instead, switch it to Inactive.
        </p>
      </Modal>

      <Modal
        open={Boolean(imageTarget)}
        onClose={() => setImageTarget(null)}
        title={imageTarget ? `Photo for ${imageTarget.name}` : 'Service photo'}
        maxWidth="max-w-lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setImageTarget(null)}>
              Close
            </Button>
            {imageTarget?.imageUrl && (
              <Button
                variant="danger"
                onClick={() => imageTarget && void changeImage(imageTarget, '')}
                loading={imageTarget ? busyServiceId === imageTarget.id : false}
              >
                <Trash2 className="h-4 w-4" /> Remove photo
              </Button>
            )}
          </>
        }
      >
        {imageTarget && (
          <div className="space-y-3">
            <ServiceImageField
              value={imageTarget.imageUrl || ''}
              onChange={(url) => void changeImage(imageTarget, url)}
              label="Service image"
              hint="Square photos look best. Uploads are stored in Supabase Storage."
              onWarning={(message) => setError(message)}
            />
            {busyServiceId === imageTarget.id && <p className="text-xs text-slate-500">Saving…</p>}
            <p className="text-xs text-slate-500">
              This photo appears on the website card and in the booking flow for{" "}
              <strong className="text-slate-700">{imageTarget.name}</strong>.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Subcategory bucket                                                  */
/* ------------------------------------------------------------------ */

const SubcategorySection: React.FC<{
  bucket: ServiceSubcategoryGroup;
  view: 'grid' | 'table';
  busyServiceId: string | null;
  rateDraft: RateDraft;
  notesDraft: NotesDraft;
  onStartRate: (service: SalonService) => void;
  onRateChange: (value: string) => void;
  onCancelRate: () => void;
  onSaveRate: (service: SalonService) => void;
  onStartNotes: (service: SalonService) => void;
  onNotesChange: (value: string) => void;
  onCancelNotes: () => void;
  onSaveNotes: (service: SalonService) => void;
  onEdit: (service: SalonService) => void;
  onToggleActive: (service: SalonService) => void;
  onDelete: (service: SalonService) => void;
  onManageImage: (service: SalonService) => void;
  onAddService: () => void;
}> = ({
  bucket,
  view,
  busyServiceId,
  rateDraft,
  notesDraft,
  onStartRate,
  onRateChange,
  onCancelRate,
  onSaveRate,
  onStartNotes,
  onNotesChange,
  onCancelNotes,
  onSaveNotes,
  onEdit,
  onToggleActive,
  onDelete,
  onManageImage,
  onAddService,
}) => (
  <div>
    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
      <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
        <span className="h-1.5 w-1.5 rounded-full bg-[#D09A40]" />
        {bucket.label}
        <span className="font-medium normal-case tracking-normal text-slate-400">({bucket.total})</span>
      </h3>
      <button
        type="button"
        onClick={onAddService}
        className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#8a641f] hover:underline"
      >
        <Plus className="h-3 w-3" /> Add here
      </button>
    </div>

    {view === 'table' ? (
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2 font-semibold">Service</th>
              <th className="px-3 py-2 font-semibold">Rate</th>
              <th className="px-3 py-2 font-semibold">Duration</th>
              <th className="px-3 py-2 font-semibold">Image</th>
              <th className="px-3 py-2 font-semibold">Status</th>
              <th className="px-3 py-2 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {bucket.services.map((service) => (
              <tr key={service.id} className="align-top hover:bg-slate-50/60">
                <td className="px-3 py-2.5">
                  <p className="font-medium text-slate-900">{service.name}</p>
                  {service.notes && (
                    <p className="mt-0.5 flex items-start gap-1 text-[11px] text-slate-500">
                      <StickyNote className="mt-0.5 h-3 w-3 shrink-0" />
                      <span className="line-clamp-2">{service.notes}</span>
                    </p>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  {rateDraft?.id === service.id ? (
                    <div className="flex items-center gap-1">
                      <Input
                        value={rateDraft.value}
                        onChange={(e) => onRateChange(e.target.value)}
                        type="number"
                        min={0}
                        className="!w-24 !py-1 text-xs"
                        aria-label={`Rate for ${service.name}`}
                        autoFocus
                      />
                      <Button size="sm" variant="gold" onClick={() => onSaveRate(service)} loading={busyServiceId === service.id}>
                        Save
                      </Button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onStartRate(service)}
                      className="font-mono text-sm font-semibold text-slate-900 underline decoration-dotted hover:text-[#8a641f]"
                      title="Click to edit the rate"
                    >
                      {formatCurrency(service.pricePaise)}
                    </button>
                  )}
                </td>
                <td className="px-3 py-2.5 text-xs text-slate-600">{service.durationMinutes} min</td>
                <td className="px-3 py-2.5">
                  <button
                    type="button"
                    onClick={() => onManageImage(service)}
                    className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#8a641f] hover:underline"
                  >
                    {service.imageUrl ? (
                      <>
                        <img src={service.imageUrl} alt="" className="h-7 w-7 rounded object-cover" />
                        Change
                      </>
                    ) : (
                      <>
                        <ImageOff className="h-3.5 w-3.5" /> Upload
                      </>
                    )}
                  </button>
                </td>
                <td className="px-3 py-2.5">
                  <Toggle
                    checked={service.active}
                    onChange={() => onToggleActive(service)}
                    label={`${service.name} visible on website`}
                    hideLabel
                  />
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex justify-end gap-1">
                    <Button size="sm" variant="ghost" onClick={() => onEdit(service)} aria-label={`Edit notes for ${service.name}`}>
                      <StickyNote className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => onEdit(service)}>
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-600 hover:bg-red-50"
                      onClick={() => onDelete(service)}
                      aria-label={`Delete ${service.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ) : (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {bucket.services.map((service) => (
          <Card key={service.id} className="flex flex-col overflow-hidden">
            <div className="relative h-36 w-full bg-slate-100">
              {service.imageUrl ? (
                <img src={service.imageUrl} alt={service.name} className="h-full w-full object-cover" loading="lazy" />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-slate-400">
                  <ImageOff className="h-6 w-6" />
                  <span className="text-[11px] font-medium">No image yet</span>
                </div>
              )}
              <div className="absolute left-2 top-2 flex flex-wrap gap-1">
                <Badge tone={service.active ? 'green' : 'slate'}>{service.active ? 'Active' : 'Inactive'}</Badge>
              </div>
            </div>

            <div className="flex flex-1 flex-col gap-2 p-4">
              <div>
                <h4 className="font-semibold leading-snug text-slate-900">{service.name}</h4>
                {service.subcategory && (
                  <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                    {service.subcategory}
                  </p>
                )}
              </div>

              {service.description && <p className="line-clamp-2 text-xs text-slate-600">{service.description}</p>}

              {notesDraft?.id === service.id ? (
                <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
                  <Textarea
                    value={notesDraft.value}
                    onChange={(e) => onNotesChange(e.target.value)}
                    maxLength={MAX_SERVICE_NOTES_LENGTH}
                    placeholder="Duration, prerequisites, prep instructions…"
                    className="!min-h-[64px] text-xs"
                    aria-label={`Notes for ${service.name}`}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button size="sm" variant="gold" onClick={() => onSaveNotes(service)} loading={busyServiceId === service.id}>
                      Save notes
                    </Button>
                    <Button size="sm" variant="ghost" onClick={onCancelNotes}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : service.notes ? (
                <p className="flex items-start gap-1.5 rounded-lg bg-amber-50 px-2 py-1.5 text-[11px] leading-relaxed text-amber-900">
                  <StickyNote className="mt-0.5 h-3 w-3 shrink-0" />
                  <span className="line-clamp-3">{service.notes}</span>
                </p>
              ) : null}

              <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-2.5">
                {rateDraft?.id === service.id ? (
                  <div className="flex items-center gap-1">
                    <Input
                      value={rateDraft.value}
                      onChange={(e) => onRateChange(e.target.value)}
                      type="number"
                      min={0}
                      className="!w-24 !py-1 text-xs"
                      aria-label={`Rate for ${service.name}`}
                      autoFocus
                    />
                    <Button size="sm" variant="gold" onClick={() => onSaveRate(service)} loading={busyServiceId === service.id}>
                      Save
                    </Button>
                    <Button size="sm" variant="ghost" onClick={onCancelRate} aria-label="Cancel rate edit">
                      ✕
                    </Button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => onStartRate(service)}
                    className="font-mono text-base font-bold text-slate-900 underline decoration-dotted hover:text-[#8a641f]"
                    title="Click to edit the rate"
                  >
                    {formatCurrency(service.pricePaise)}
                  </button>
                )}
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500">
                  <Clock3 className="h-3 w-3" /> {service.durationMinutes} min
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/70 px-4 py-2.5">
              <Toggle
                checked={service.active}
                onChange={() => onToggleActive(service)}
                label={`${service.name} visible on website`}
                hideLabel
              />
              <div className="flex items-center gap-1">
                <Button size="sm" variant="ghost" onClick={() => onManageImage(service)}>
                  <ImageOff className="h-3.5 w-3.5" /> {service.imageUrl ? 'Photo' : 'Add photo'}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => onStartNotes(service)} aria-label={`Edit notes for ${service.name}`}>
                  <StickyNote className="h-3.5 w-3.5" />
                </Button>
                <Button size="sm" variant="secondary" onClick={() => onEdit(service)}>
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-red-600 hover:bg-red-50"
                  onClick={() => onDelete(service)}
                  aria-label={`Delete ${service.name}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    )}
  </div>
);
