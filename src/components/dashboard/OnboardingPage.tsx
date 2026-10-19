import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Globe, Loader2, Sparkles, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api, errorMessage } from '../../lib/api';
import type { OpeningHours, TemplateId, WebsiteTemplate } from '../../types/auth';
import { Alert, Badge, Button, Card, Field, Input, PageHeader, Textarea } from '../ui';
import { ImageUploader } from './ImageUploader';

interface FormState {
  name: string;
  slug: string;
  tagline: string;
  city: string;
  state: string;
  addressLine: string;
  phone: string;
  email: string;
  description: string;
  heroTitle: string;
  heroSubtitle: string;
  ownerName: string;
  ownerPhone: string;
  logoUrl: string;
  coverImage: string;
  templateId: TemplateId;
}

const DEFAULT_TIMINGS: OpeningHours[] = [
  { day: 'mon', open: '10:00', close: '20:00', closed: false },
  { day: 'tue', open: '10:00', close: '20:00', closed: false },
  { day: 'wed', open: '10:00', close: '20:00', closed: false },
  { day: 'thu', open: '10:00', close: '20:00', closed: false },
  { day: 'fri', open: '10:00', close: '21:00', closed: false },
  { day: 'sat', open: '09:00', close: '21:00', closed: false },
  { day: 'sun', open: '11:00', close: '18:00', closed: true },
];

const DAY_LABELS: Record<OpeningHours['day'], string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
};

const initialForm: FormState = {
  name: '',
  slug: '',
  tagline: '',
  city: '',
  state: '',
  addressLine: '',
  phone: '',
  email: '',
  description: '',
  heroTitle: '',
  heroSubtitle: '',
  ownerName: '',
  ownerPhone: '',
  logoUrl: '',
  coverImage: '',
  templateId: 'luxe',
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

export const OnboardingPage: React.FC = () => {
  const { user, refresh } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>({
    ...initialForm,
    email: user?.email || '',
    ownerName: user?.name || '',
  });
  const [timings, setTimings] = useState<OpeningHours[]>(DEFAULT_TIMINGS);
  const [templates, setTemplates] = useState<WebsiteTemplate[]>([]);
  const [slugTouched, setSlugTouched] = useState(false);
  const [availability, setAvailability] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  useEffect(() => {
    api
      .get<{ templates: WebsiteTemplate[] }>('/public/templates')
      .then((res) => setTemplates(res.templates))
      .catch(() => setTemplates([]));
  }, []);

  const effectiveSlug = useMemo(() => (slugTouched ? form.slug : slugify(form.name)), [form.slug, form.name, slugTouched]);

  useEffect(() => {
    if (!effectiveSlug || effectiveSlug.length < 3) {
      setAvailability(effectiveSlug ? 'invalid' : 'idle');
      return;
    }
    setAvailability('checking');
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const res = await api.get<{ available: boolean; reason: string | null }>(
          `/public/slug-available?slug=${encodeURIComponent(effectiveSlug)}`
        );
        if (cancelled) return;
        setAvailability(res.available ? 'available' : res.reason?.includes('hyphen') || res.reason?.includes('letters') ? 'invalid' : 'taken');
      } catch {
        if (!cancelled) setAvailability('idle');
      }
    }, 450);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [effectiveSlug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) {
      setError('Please enter your salon name.');
      return;
    }
    if (availability === 'taken') {
      setError('That website address is already taken. Please choose another one.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/salon/onboarding', {
        ...form,
        slug: effectiveSlug || slugify(form.name),
        heroTitle: form.heroTitle || form.name,
        timings,
      });
      await refresh();
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        eyebrow="Step 1 of 1"
        title="Set up your salon"
        description="Tell us the essentials. You can refine everything later from your dashboard."
      />

      {error && <Alert tone="error">{error}</Alert>}

      <form onSubmit={handleSubmit} className="space-y-5">
        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Sparkles className="h-4 w-4 text-[#D09A40]" /> Salon identity
          </div>
          <Field label="Salon name" htmlFor="name" required>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="e.g. Velvet Rose Atelier"
              required
            />
          </Field>

          <Field
            label="Live website address"
            htmlFor="slug"
            hint="Your public page will be available at /salon/your-address"
            required
          >
            <div className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 focus-within:border-[#D09A40] focus-within:ring-2 focus-within:ring-[#D09A40]/25">
              <span className="shrink-0 text-sm text-slate-400">/salon/</span>
              <input
                id="slug"
                value={effectiveSlug}
                onChange={(e) => {
                  setSlugTouched(true);
                  set('slug', slugify(e.target.value));
                }}
                placeholder="velvet-rose"
                className="w-full border-0 bg-transparent py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
                required
              />
              <span className="shrink-0">
                {availability === 'checking' && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
                {availability === 'available' && <Check className="h-4 w-4 text-emerald-600" />}
                {(availability === 'taken' || availability === 'invalid') && <X className="h-4 w-4 text-red-500" />}
              </span>
            </div>
            {availability === 'taken' && <p className="text-xs text-red-600">This address is already in use.</p>}
            {availability === 'invalid' && (
              <p className="text-xs text-red-600">Use at least 3 letters, numbers or hyphens.</p>
            )}
          </Field>

          <Field label="Tagline" htmlFor="tagline" hint="A short line under your salon name.">
            <Input
              id="tagline"
              value={form.tagline}
              onChange={(e) => set('tagline', e.target.value)}
              placeholder="Luxury Salon & Bridal Studio"
            />
          </Field>

          <Field label="About your salon" htmlFor="description">
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="Describe what makes your salon special, your specialities and experience."
            />
          </Field>
        </Card>

        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Globe className="h-4 w-4 text-[#D09A40]" /> Location & contact
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Address" htmlFor="addressLine" className="sm:col-span-2">
              <Input
                id="addressLine"
                value={form.addressLine}
                onChange={(e) => set('addressLine', e.target.value)}
                placeholder="12 Civil Lines, Ashok Nagar"
              />
            </Field>
            <Field label="City" htmlFor="city">
              <Input id="city" value={form.city} onChange={(e) => set('city', e.target.value)} placeholder="Jaipur" />
            </Field>
            <Field label="State / region" htmlFor="state">
              <Input
                id="state"
                value={form.state}
                onChange={(e) => set('state', e.target.value)}
                placeholder="Rajasthan"
              />
            </Field>
            <Field label="Phone" htmlFor="phone">
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
                placeholder="+91 98000 12345"
                inputMode="tel"
              />
            </Field>
            <Field label="Business email" htmlFor="email">
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                placeholder="hello@salon.com"
              />
            </Field>
          </div>
        </Card>

        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Sparkles className="h-4 w-4 text-[#D09A40]" /> Owner & branding
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Owner / manager name" htmlFor="ownerName">
              <Input
                id="ownerName"
                value={form.ownerName}
                onChange={(e) => set('ownerName', e.target.value)}
                placeholder="Aanya Sharma"
              />
            </Field>
            <Field label="Owner contact number" htmlFor="ownerPhone">
              <Input
                id="ownerPhone"
                value={form.ownerPhone}
                onChange={(e) => set('ownerPhone', e.target.value)}
                placeholder="+91 98000 12345"
                inputMode="tel"
              />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <ImageUploader
              label="Salon logo"
              kind="logo"
              value={form.logoUrl}
              onChange={(url) => set('logoUrl', url)}
              hint="Square logo works best. You can change this later."
              previewClassName="h-20 w-20 rounded-full"
            />
            <ImageUploader
              label="Hero image"
              kind="cover"
              value={form.coverImage}
              onChange={(url) => set('coverImage', url)}
              hint="Wide banner image for the top of your website."
              previewClassName="h-20 w-36 rounded-lg"
            />
          </div>
        </Card>

        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Globe className="h-4 w-4 text-[#D09A40]" /> Website template
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {(templates.length
              ? templates
              : ([
                  { id: 'luxe', name: 'Luxe Gold', description: 'Rich navy + gold editorial layout.', premium: false },
                  { id: 'minimal', name: 'Minimal Ivory', description: 'Airy, typography-first layout.', premium: false },
                  { id: 'noir', name: 'Noir Studio', description: 'Bold dark hero with strong cards.', premium: true },
                  { id: 'blush', name: 'Blush Atelier', description: 'Soft rose, romantic feel.', premium: false },
                ] as WebsiteTemplate[])
            ).map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => set('templateId', template.id)}
                aria-pressed={form.templateId === template.id}
                className={[
                  'rounded-xl border p-3.5 text-left transition-colors',
                  form.templateId === template.id
                    ? 'border-[#D09A40] bg-[#D09A40]/10'
                    : 'border-slate-200 hover:bg-slate-50',
                ].join(' ')}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-slate-900">{template.name}</span>
                  {form.templateId === template.id ? (
                    <Check className="h-4 w-4 text-[#8a641f]" />
                  ) : template.premium ? (
                    <Badge tone="gold">Premium</Badge>
                  ) : null}
                </div>
                <p className="mt-1 text-xs text-slate-500">{template.description}</p>
              </button>
            ))}
          </div>
        </Card>

        <Card className="p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Globe className="h-4 w-4 text-[#D09A40]" /> Opening hours
          </div>
          <div className="space-y-2">
            {timings.map((entry, index) => (
              <div key={entry.day} className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
                <span className="w-24 text-sm font-medium text-slate-700">{DAY_LABELS[entry.day]}</span>
                <input
                  type="time"
                  value={entry.open}
                  disabled={entry.closed}
                  onChange={(e) =>
                    setTimings((prev) => prev.map((t, i) => (i === index ? { ...t, open: e.target.value } : t)))
                  }
                  className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm disabled:bg-slate-50 disabled:text-slate-400"
                  aria-label={`${entry.day} opening time`}
                />
                <span className="text-slate-400">to</span>
                <input
                  type="time"
                  value={entry.close}
                  disabled={entry.closed}
                  onChange={(e) =>
                    setTimings((prev) => prev.map((t, i) => (i === index ? { ...t, close: e.target.value } : t)))
                  }
                  className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm disabled:bg-slate-50 disabled:text-slate-400"
                  aria-label={`${entry.day} closing time`}
                />
                <label className="ml-auto flex items-center gap-1.5 text-xs text-slate-600">
                  <input
                    type="checkbox"
                    checked={entry.closed}
                    onChange={(e) =>
                      setTimings((prev) =>
                        prev.map((t, i) => (i === index ? { ...t, closed: e.target.checked } : t))
                      )
                    }
                    className="h-3.5 w-3.5 rounded border-slate-300"
                  />
                  Closed
                </label>
              </div>
            ))}
          </div>
        </Card>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            You can add services, team members, photos and colours right after this step.
          </p>
          <Button type="submit" variant="gold" size="lg" loading={loading}>
            Create my salon workspace
          </Button>
        </div>
      </form>
    </div>
  );
};
