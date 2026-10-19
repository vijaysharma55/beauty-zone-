import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Globe, Loader2, Sparkles, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api, errorMessage } from '../../lib/api';
import { Alert, Button, Card, Field, Input, PageHeader, Textarea } from '../ui';

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
}

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
  const [form, setForm] = useState<FormState>({ ...initialForm, email: user?.email || '' });
  const [slugTouched, setSlugTouched] = useState(false);
  const [availability, setAvailability] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

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
