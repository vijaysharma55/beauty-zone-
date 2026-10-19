import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Check,
  ExternalLink,
  ImagePlus,
  Loader2,
  Palette,
  Rocket,
  Save,
  Store,
  Trash2,
  MapPin,
  Globe,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api, errorMessage } from '../../lib/api';
import type { GalleryImage, OpeningHours, Salon, TemplateId, WebsiteTemplate } from '../../types/auth';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardHeader,
  Field,
  Input,
  PageHeader,
  Textarea,
} from '../ui';
import { ImageUploader } from './ImageUploader';
import { StatusBadge, WorkflowActions } from './WorkflowStatus';

interface FormState {
  name: string;
  slug: string;
  tagline: string;
  description: string;
  logoUrl: string;
  coverImage: string;
  heroTitle: string;
  heroSubtitle: string;
  phone: string;
  whatsapp: string;
  email: string;
  addressLine: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  mapUrl: string;
  instagram: string;
  facebook: string;
  ownerName: string;
  ownerPhone: string;
  templateId: TemplateId;
}

const DAY_LABELS: Record<OpeningHours['day'], string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
};

const DEFAULT_FORM_TIMINGS: OpeningHours[] = [
  { day: 'mon', open: '10:00', close: '20:00', closed: false },
  { day: 'tue', open: '10:00', close: '20:00', closed: false },
  { day: 'wed', open: '10:00', close: '20:00', closed: false },
  { day: 'thu', open: '10:00', close: '20:00', closed: false },
  { day: 'fri', open: '10:00', close: '21:00', closed: false },
  { day: 'sat', open: '09:00', close: '21:00', closed: false },
  { day: 'sun', open: '11:00', close: '18:00', closed: false },
];

const TEMPLATE_FALLBACK: WebsiteTemplate[] = [
  { id: 'luxe', name: 'Luxe Gold', description: 'Rich navy + gold editorial layout with image-led hero.', premium: false },
  { id: 'minimal', name: 'Minimal Ivory', description: 'Airy, typography-first layout for modern studios.', premium: false },
  { id: 'noir', name: 'Noir Studio', description: 'High-contrast dark hero with bold service cards.', premium: true },
  { id: 'blush', name: 'Blush Atelier', description: 'Soft rose palette with a gentle, romantic feel.', premium: false },
];

const toForm = (salon: Salon): FormState => ({
  name: salon.name,
  slug: salon.slug,
  tagline: salon.tagline,
  description: salon.description,
  logoUrl: salon.logoUrl,
  coverImage: salon.coverImage,
  heroTitle: salon.heroTitle,
  heroSubtitle: salon.heroSubtitle,
  phone: salon.phone,
  whatsapp: salon.whatsapp,
  email: salon.email,
  addressLine: salon.addressLine,
  city: salon.city,
  state: salon.state,
  postalCode: salon.postalCode,
  country: salon.country,
  mapUrl: salon.mapUrl,
  instagram: salon.instagram,
  facebook: salon.facebook,
  ownerName: salon.ownerName || '',
  ownerPhone: salon.ownerPhone || '',
  templateId: salon.templateId || 'luxe',
});

export const WebsiteEditor: React.FC = () => {
  const { salon, refresh, workflow } = useAuth();
  const [form, setForm] = useState<FormState | null>(salon ? toForm(salon) : null);
  const [gallery, setGallery] = useState<GalleryImage[]>(salon?.gallery || []);
  const [timings, setTimings] = useState<OpeningHours[]>(salon?.timings || []);
  const [templates, setTemplates] = useState<WebsiteTemplate[]>(TEMPLATE_FALLBACK);
  const [theme, setTheme] = useState({
    accent: salon?.theme?.accent || '#D09A40',
    primary: salon?.theme?.primary || '#0F172A',
    background: salon?.theme?.background || '#FAF5E5',
    surface: salon?.theme?.surface || '#FFFFFF',
  });
  const [slugState, setSlugState] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api
      .get<{ templates: WebsiteTemplate[] }>('/public/templates')
      .then((res) => setTemplates(res.templates))
      .catch(() => setTemplates(TEMPLATE_FALLBACK));
  }, []);

  useEffect(() => {
    if (!salon) return;
    setForm(toForm(salon));
    setGallery(salon.gallery || []);
    setTimings(salon.timings || []);
    setTheme({
      accent: salon.theme?.accent || '#D09A40',
      primary: salon.theme?.primary || '#0F172A',
      background: salon.theme?.background || '#FAF5E5',
      surface: salon.theme?.surface || '#FFFFFF',
    });
  }, [salon]);

  if (!salon || !form) return null;

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));

  const updateTiming = (index: number, patch: Partial<OpeningHours>) =>
    setTimings((prev) => prev.map((entry, i) => (i === index ? { ...entry, ...patch } : entry)));

  const checkSlug = async (slug: string) => {
    if (!slug || slug.length < 3) {
      setSlugState('invalid');
      return;
    }
    if (slug === salon.slug) {
      setSlugState('idle');
      return;
    }
    setSlugState('checking');
    try {
      const res = await api.get<{ available: boolean; reason: string | null }>(
        `/public/slug-available?slug=${encodeURIComponent(slug)}`
      );
      setSlugState(res.available ? 'available' : 'taken');
    } catch {
      setSlugState('idle');
    }
  };

  const save = async () => {
    setError('');
    setNotice('');
    if (slugState === 'taken') {
      setError('That website address is taken. Choose a different one before saving.');
      return;
    }
    setSaving(true);
    try {
      await api.patch('/salon', {
        ...form,
        gallery,
        theme,
        timings,
      });
      await refresh();
      setNotice('Changes saved successfully.');
      setTimeout(() => setNotice(''), 4000);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const addGalleryFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadingGallery(true);
    setError('');
    try {
      const uploaded: GalleryImage[] = [...gallery];
      for (const file of Array.from(files).slice(0, 10)) {
        const res = await api.upload(file, 'gallery');
        uploaded.push({ url: res.url, caption: '' });
      }
      setGallery(uploaded);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setUploadingGallery(false);
      if (galleryInputRef.current) galleryInputRef.current.value = '';
    }
  };

  const liveUrl = `${window.location.origin}/salon/${form.slug}`;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Website builder"
        title="My website"
        description="Update your brand, contact details, gallery and colours. Changes go live instantly once published."
        actions={
          <>
            <Link to="/dashboard/preview">
              <Button variant="secondary">
                <ExternalLink className="h-4 w-4" /> Preview
              </Button>
            </Link>
            <Button variant="gold" onClick={save} loading={saving}>
              <Save className="h-4 w-4" /> Save changes
            </Button>
          </>
        }
      />

      {error && <Alert tone="error">{error}</Alert>}
      {notice && <Alert tone="success">{notice}</Alert>}

      {/* Approval status */}
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold text-slate-900">Approval & publishing</h2>
              <StatusBadge status={workflow?.status || salon.status} suspended={workflow?.suspended || salon.suspended} />
            </div>
            <p className="mt-1 max-w-xl text-sm text-slate-500">
              Save your work as a draft any time. Only an approved version can be published, and the live site always
              shows the last approved content.
            </p>
            <code className="mt-2 inline-block rounded-lg bg-slate-100 px-2.5 py-1 text-xs text-slate-700">
              {liveUrl}
            </code>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {salon.published && (
              <a href={`/salon/${salon.slug}`} target="_blank" rel="noreferrer">
                <Button variant="secondary">
                  <ExternalLink className="h-4 w-4" /> Open live site
                </Button>
              </a>
            )}
            <WorkflowActions salon={salon} />
            <Button variant="gold" onClick={save} loading={saving}>
              <Save className="h-4 w-4" /> Save draft
            </Button>
          </div>
        </div>
      </Card>

      {/* Brand identity */}
      <Card>
        <CardHeader title="Brand identity" description="Logo, cover photo and the story clients see first." />
        <div className="space-y-4 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Salon name" htmlFor="salon-name" required>
              <Input id="salon-name" value={form.name} onChange={(e) => set('name', e.target.value)} />
            </Field>
            <Field label="Tagline" htmlFor="salon-tagline">
              <Input id="salon-tagline" value={form.tagline} onChange={(e) => set('tagline', e.target.value)} />
            </Field>
          </div>
          <Field label="About your salon" htmlFor="salon-description">
            <Textarea
              id="salon-description"
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              rows={4}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <ImageUploader
              label="Logo"
              kind="logo"
              value={form.logoUrl}
              onChange={(url) => set('logoUrl', url)}
              hint="Square image works best (PNG/JPG/WEBP, max 5 MB)."
              previewClassName="h-24 w-24 rounded-full"
            />
            <ImageUploader
              label="Cover photo"
              kind="cover"
              value={form.coverImage}
              onChange={(url) => set('coverImage', url)}
              hint="Wide hero image (JPG/WEBP). Shown behind your headline."
              previewClassName="h-24 w-40 rounded-lg"
            />
          </div>
        </div>
      </Card>

      {/* Hero copy */}
      <Card>
        <CardHeader title="Hero headline" description="The first message visitors read on your website." />
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Headline" htmlFor="hero-title">
            <Input
              id="hero-title"
              value={form.heroTitle}
              onChange={(e) => set('heroTitle', e.target.value)}
              placeholder={form.name}
            />
          </Field>
          <Field label="Sub-headline" htmlFor="hero-subtitle">
            <Input
              id="hero-subtitle"
              value={form.heroSubtitle}
              onChange={(e) => set('heroSubtitle', e.target.value)}
              placeholder="Award-winning bridal makeovers in the heart of the city."
            />
          </Field>
        </div>
      </Card>

      {/* Template */}
      <Card>
        <CardHeader
          title="Website template"
          description="Pick a starting layout. Your brand colours and content are applied on top of it."
        />
        <div className="grid gap-3 p-5 sm:grid-cols-2">
          {templates.map((template) => {
            const selected = form.templateId === template.id;
            return (
              <button
                key={template.id}
                type="button"
                onClick={() => set('templateId', template.id)}
                aria-pressed={selected}
                className={[
                  'rounded-xl border p-4 text-left transition-colors',
                  selected
                    ? 'border-[#D09A40] bg-[#D09A40]/10 ring-1 ring-[#D09A40]/40'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50',
                ].join(' ')}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-slate-900">{template.name}</span>
                  {selected ? (
                    <Check className="h-4 w-4 text-[#8a641f]" />
                  ) : template.premium ? (
                    <Badge tone="gold">Premium</Badge>
                  ) : null}
                </div>
                <p className="mt-1 text-xs text-slate-500">{template.description}</p>
                <TemplatePreview id={template.id} theme={theme} />
              </button>
            );
          })}
        </div>
      </Card>

      {/* Owner & timings */}
      <Card>
        <CardHeader
          title="Owner details & opening hours"
          description="Shown on your website so clients know who to ask for and when you are open."
        />
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Owner / manager name" htmlFor="owner-name">
            <Input id="owner-name" value={form.ownerName} onChange={(e) => set('ownerName', e.target.value)} />
          </Field>
          <Field label="Owner contact number" htmlFor="owner-phone">
            <Input
              id="owner-phone"
              value={form.ownerPhone}
              onChange={(e) => set('ownerPhone', e.target.value)}
              inputMode="tel"
            />
          </Field>
        </div>
        <div className="border-t border-slate-100 px-5 py-4">
          <p className="text-sm font-medium text-slate-700">Opening hours</p>
          <p className="mb-3 text-xs text-slate-500">Times use 24-hour format. Mark a day closed if you do not open.</p>
          <div className="space-y-2">
            {timings.length === 0 && (
              <p className="text-xs text-slate-500">No hours set yet — add your weekly schedule.</p>
            )}
            {timings.map((entry, index) => (
              <div key={entry.day} className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
                <span className="w-24 text-sm font-medium text-slate-700">{DAY_LABELS[entry.day] || entry.day}</span>
                <input
                  type="time"
                  value={entry.open}
                  disabled={entry.closed}
                  onChange={(e) => updateTiming(index, { open: e.target.value })}
                  className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm disabled:bg-slate-50 disabled:text-slate-400"
                  aria-label={`${entry.day} opening time`}
                />
                <span className="text-slate-400">to</span>
                <input
                  type="time"
                  value={entry.close}
                  disabled={entry.closed}
                  onChange={(e) => updateTiming(index, { close: e.target.value })}
                  className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm disabled:bg-slate-50 disabled:text-slate-400"
                  aria-label={`${entry.day} closing time`}
                />
                <label className="ml-auto flex items-center gap-1.5 text-xs text-slate-600">
                  <input
                    type="checkbox"
                    checked={entry.closed}
                    onChange={(e) => updateTiming(index, { closed: e.target.checked })}
                    className="h-3.5 w-3.5 rounded border-slate-300"
                  />
                  Closed
                </label>
              </div>
            ))}
          </div>
          {timings.length < 7 && (
            <Button
              variant="secondary"
              size="sm"
              className="mt-3"
              onClick={() =>
                setTimings(
                  DEFAULT_FORM_TIMINGS.filter((day) => !timings.some((entry) => entry.day === day.day))
                )
              }
            >
              Add missing days
            </Button>
          )}
        </div>
      </Card>

      {/* Contact */}
      <Card>
        <CardHeader title="Contact & location" description="How clients reach you and find your studio." />
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Phone" htmlFor="phone">
            <Input id="phone" value={form.phone} onChange={(e) => set('phone', e.target.value)} inputMode="tel" />
          </Field>
          <Field label="WhatsApp number" htmlFor="whatsapp" hint="Digits with country code, e.g. 919800012345.">
            <Input id="whatsapp" value={form.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} inputMode="tel" />
          </Field>
          <Field label="Business email" htmlFor="email">
            <Input id="email" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
          </Field>
          <Field label="Google Maps link" htmlFor="mapUrl">
            <Input id="mapUrl" value={form.mapUrl} onChange={(e) => set('mapUrl', e.target.value)} placeholder="https://maps.google.com/…" />
          </Field>
          <Field label="Address" htmlFor="address" className="sm:col-span-2">
            <Input id="address" value={form.addressLine} onChange={(e) => set('addressLine', e.target.value)} />
          </Field>
          <Field label="City" htmlFor="city">
            <Input id="city" value={form.city} onChange={(e) => set('city', e.target.value)} />
          </Field>
          <Field label="State / region" htmlFor="state">
            <Input id="state" value={form.state} onChange={(e) => set('state', e.target.value)} />
          </Field>
          <Field label="Postal code" htmlFor="postal">
            <Input id="postal" value={form.postalCode} onChange={(e) => set('postalCode', e.target.value)} />
          </Field>
          <Field label="Country" htmlFor="country">
            <Input id="country" value={form.country} onChange={(e) => set('country', e.target.value)} />
          </Field>
          <Field label="Instagram" htmlFor="instagram" hint="Handle or full URL.">
            <Input id="instagram" value={form.instagram} onChange={(e) => set('instagram', e.target.value)} />
          </Field>
          <Field label="Facebook" htmlFor="facebook" hint="Page name or full URL.">
            <Input id="facebook" value={form.facebook} onChange={(e) => set('facebook', e.target.value)} />
          </Field>
        </div>
      </Card>

      {/* Gallery */}
      <Card>
        <CardHeader
          title="Gallery"
          description="Showcase your best work. Up to 60 photos."
          action={
            <Button
              variant="secondary"
              size="sm"
              loading={uploadingGallery}
              onClick={() => galleryInputRef.current?.click()}
            >
              <ImagePlus className="h-3.5 w-3.5" /> Add photos
            </Button>
          }
        />
        <div className="p-5">
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            multiple
            className="hidden"
            onChange={(e) => addGalleryFiles(e.target.files)}
          />
          {gallery.length === 0 ? (
            <div
              className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 py-10 text-center hover:border-[#D09A40]/60 hover:bg-[#D09A40]/5"
              onClick={() => galleryInputRef.current?.click()}
            >
              {uploadingGallery ? (
                <Loader2 className="mb-2 h-6 w-6 animate-spin text-[#D09A40]" />
              ) : (
                <ImagePlus className="mb-2 h-6 w-6 text-slate-400" />
              )}
              <p className="text-sm font-medium text-slate-700">Upload your first photos</p>
              <p className="text-xs text-slate-500">PNG, JPG, WEBP or GIF · up to 5 MB each</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {gallery.map((image, index) => (
                <div key={`${image.url}-${index}`} className="group relative overflow-hidden rounded-xl border border-slate-200">
                  <img src={image.url} alt={image.caption || `Gallery ${index + 1}`} className="aspect-square w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setGallery(gallery.filter((_, i) => i !== index))}
                    className="absolute right-1.5 top-1.5 rounded-lg bg-white/90 p-1.5 text-red-600 opacity-0 shadow transition-opacity group-hover:opacity-100"
                    aria-label="Remove photo"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                  <input
                    value={image.caption || ''}
                    onChange={(e) =>
                      setGallery(gallery.map((g, i) => (i === index ? { ...g, caption: e.target.value } : g)))
                    }
                    placeholder="Caption"
                    className="w-full border-t border-slate-100 px-2 py-1.5 text-xs focus:outline-none"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Theme */}
      <Card>
        <CardHeader
          title="Brand colours"
          description="These colours are applied across your public website."
          action={
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTheme({ accent: '#D09A40', primary: '#0F172A', background: '#FAF5E5', surface: '#FFFFFF' })}
            >
              Reset
            </Button>
          }
        />
        <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
          {(
            [
              ['accent', 'Accent / gold'],
              ['primary', 'Headings & dark'],
              ['background', 'Page background'],
              ['surface', 'Cards & sections'],
            ] as const
          ).map(([key, label]) => (
            <Field key={key} label={label} htmlFor={`theme-${key}`}>
              <div className="flex items-center gap-2">
                <input
                  id={`theme-${key}`}
                  type="color"
                  value={theme[key]}
                  onChange={(e) => setTheme({ ...theme, [key]: e.target.value })}
                  className="h-10 w-12 cursor-pointer rounded border border-slate-300 bg-white p-1"
                />
                <Input
                  value={theme[key]}
                  onChange={(e) => setTheme({ ...theme, [key]: e.target.value })}
                  className="font-mono text-xs uppercase"
                  aria-label={`${label} hex value`}
                />
              </div>
            </Field>
          ))}
        </div>
        <div className="flex items-center gap-2 border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
          <Palette className="h-3.5 w-3.5 text-[#D09A40]" /> Tip: keep dark text on light backgrounds for readability.
        </div>
      </Card>

      {/* Website address */}
      <Card>
        <CardHeader title="Website address" description="Your unique, shareable live website URL." />
        <div className="space-y-3 p-5">
          <Field label="Slug" htmlFor="slug" hint="Lowercase letters, numbers and hyphens. Changing this breaks old links.">
            <div className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 focus-within:border-[#D09A40] focus-within:ring-2 focus-within:ring-[#D09A40]/25">
              <span className="shrink-0 text-sm text-slate-400">/salon/</span>
              <input
                id="slug"
                value={form.slug}
                onChange={(e) => set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                onBlur={(e) => checkSlug(e.target.value)}
                className="w-full border-0 bg-transparent py-2.5 text-sm focus:outline-none"
              />
              <span className="shrink-0">
                {slugState === 'checking' && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
                {slugState === 'available' && <Check className="h-4 w-4 text-emerald-600" />}
                {slugState === 'taken' && <span className="text-xs font-medium text-red-600">Taken</span>}
              </span>
            </div>
          </Field>
          <div className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 px-3 py-2.5 text-xs text-slate-600">
            <Globe className="h-3.5 w-3.5 text-[#D09A40]" />
            <span className="truncate">{liveUrl}</span>
            {salon.published && (
              <a href={`/salon/${salon.slug}`} target="_blank" rel="noreferrer" className="ml-auto font-semibold text-[#8a641f] hover:underline">
                Open
              </a>
            )}
          </div>
        </div>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        <p className="flex items-center gap-2 text-xs text-slate-500">
          <Store className="h-4 w-4 text-[#D09A40]" /> Your salon data is private to your account.
        </p>
        <div className="flex gap-2">
          <Link to="/dashboard/services">
            <Button variant="ghost">
              <MapPin className="h-4 w-4" /> Next: services
            </Button>
          </Link>
          <Button variant="gold" onClick={save} loading={saving}>
            <Save className="h-4 w-4" /> Save changes
          </Button>
        </div>
      </div>
    </div>
  );
};

/** Small abstract preview so owners can compare templates at a glance. */
const TemplatePreview: React.FC<{ id: TemplateId; theme: { accent: string; primary: string; background: string; surface: string } }> = ({
  id,
  theme,
}) => {
  const palettes: Record<TemplateId, { bg: string; bar: string; block: string }> = {
    luxe: { bg: theme.primary, bar: theme.accent, block: 'rgba(255,255,255,0.18)' },
    minimal: { bg: theme.surface, bar: theme.primary, block: 'rgba(15,23,42,0.08)' },
    noir: { bg: '#0b0b0f', bar: theme.accent, block: 'rgba(255,255,255,0.14)' },
    blush: { bg: '#FBEDEC', bar: '#C97C7C', block: 'rgba(201,124,124,0.2)' },
  };
  const palette = palettes[id] || palettes.luxe;
  return (
    <div className="mt-3 overflow-hidden rounded-lg border border-black/5" aria-hidden="true">
      <div className="h-14 p-2" style={{ backgroundColor: palette.bg }}>
        <div className="h-1.5 w-10 rounded-full" style={{ backgroundColor: palette.bar }} />
        <div className="mt-2 h-2 w-24 rounded-full" style={{ backgroundColor: palette.bar, opacity: 0.85 }} />
        <div className="mt-1.5 h-1.5 w-16 rounded-full" style={{ backgroundColor: palette.bar, opacity: 0.4 }} />
      </div>
      <div className="grid grid-cols-3 gap-1 p-2" style={{ backgroundColor: theme.background }}>
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-6 rounded" style={{ backgroundColor: palette.block }} />
        ))}
      </div>
    </div>
  );
};
