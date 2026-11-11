import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Cloud, CloudOff, Loader2, LockKeyhole, Sparkles } from 'lucide-react';
import type { z } from 'zod';
import { useAuth } from '../../context/AuthContext';
import { api, ApiError, errorMessage } from '../../lib/api';
import { OnboardingDraftSync } from '../../lib/onboardingDraft.js';
import { acquireOnboardingTab } from '../../lib/onboardingTab.js';
import {
  DAY_LABELS,
  ONBOARDING_STEPS,
  defaultOnboardingDraft,
  onboardingSlugify,
  onboardingStepSchemas,
  onboardingValuesSchema,
} from '../../lib/onboardingSchema.js';
import type { MembershipPlan, Salon, WebsiteTemplate } from '../../types/auth';
import { Alert, Badge, Button, Card, Field, Input, PageHeader, Textarea } from '../ui';
import { DescriptionSuggestions } from './DescriptionSuggestions';
import { OnboardingImageField } from './OnboardingImageField';
import { TaglineSuggestions } from './TaglineSuggestions';

type Values = z.infer<typeof onboardingValuesSchema>;
type Draft = { values: Values; currentStep: number; slugTouched: boolean };
type SavedDraft = { draft: Draft; revision: number; completed: boolean; updatedAt: string };
type SaveStatus = 'loading' | 'load-error' | 'idle' | 'pending' | 'saving' | 'saved' | 'error' | 'conflict' | 'completed';
type SyncState = { status: SaveStatus; message: string; backupAvailable: boolean };
type Availability = { slug: string; status: 'idle' | 'checking' | 'available' | 'taken' | 'error'; reason?: string };

const FALLBACK_TEMPLATES: WebsiteTemplate[] = [
  { id: 'luxe', name: 'Luxe Gold', description: 'Rich navy + gold editorial layout.', premium: false },
  { id: 'minimal', name: 'Minimal Ivory', description: 'Airy, typography-first layout.', premium: false },
  { id: 'noir', name: 'Noir Studio', description: 'Bold dark hero with strong cards.', premium: true },
  { id: 'blush', name: 'Blush Atelier', description: 'Soft rose, romantic feel.', premium: false },
];

const remoteDraft = {
  read: async () => (await api.get<{ draft: SavedDraft | null }>('/salon/onboarding/draft')).draft,
  save: async (draft: Draft, expectedRevision: number) =>
    (await api.put<{ draft: SavedDraft }>('/salon/onboarding/draft', { draft, expectedRevision })).draft,
  resolve: async (draft: Draft, expectedRevision: number) =>
    (await api.post<{ draft: SavedDraft }>('/salon/onboarding/draft/resolve', { draft, expectedRevision })).draft,
};

const stepDescriptions = [
  'Start with the details that make your salon yours.',
  'Help clients find you and get in touch.',
  'Give your future website a recognisable look.',
  'Choose your starting look and set your weekly hours.',
];

export const OnboardingPage: React.FC = () => {
  const { user, setSession } = useAuth();
  const navigate = useNavigate();
  const defaults = useMemo(() => defaultOnboardingDraft({ email: user?.email || '', name: user?.name || '' }) as Draft, [user?.id]);
  const { register, control, getValues, setValue, reset, trigger, watch, formState: { errors } } = useForm<Values>({
    defaultValues: defaults.values,
    resolver: zodResolver(onboardingValuesSchema),
    mode: 'onTouched',
    reValidateMode: 'onChange',
    shouldUnregister: false,
  });
  const values = useWatch({ control }) as Values;
  const [step, setStep] = useState(1);
  const [syncState, setSyncState] = useState<SyncState>({ status: 'loading', message: '', backupAvailable: true });
  const [templates, setTemplates] = useState<WebsiteTemplate[]>([]);
  const [availability, setAvailability] = useState<Availability>({ slug: '', status: 'idle' });
  const [slugRetry, setSlugRetry] = useState(0);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState({ logo: false, cover: false });
  const [restoreError, setRestoreError] = useState('');
  const [toast, setToast] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
  const syncRef = useRef<OnboardingDraftSync | null>(null);
  const applyingRef = useRef(false);
  const stepRef = useRef(1);
  const slugTouchedRef = useRef(false);
  const restoringRef = useRef(false);

  const showToast = (message: string, tone: 'success' | 'error' = 'success') => setToast({ message, tone });
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!user?.id) return;
    let storage: Storage | null = null;
    try { storage = window.localStorage; } catch { /* remote saving still works */ }
    // A local legacy account can be linked to Supabase without changing its
    // SQLite ID. Use the stable auth ID so cold server instances still find
    // the same device backup.
    const backupOwnerId = user.supabaseUserId || user.id;
    const backupPrefix = `beautyzone.onboarding.v1:${backupOwnerId}:`;
    let cancelled = false;
    let releaseTab = () => {};
    let sync: OnboardingDraftSync | null = null;
    const onOnline = () => { if (sync?.ready && !sync.conflict) void sync.flush().catch(() => {}); };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden' && sync?.ready && !sync.conflict) void sync.flush().catch(() => {});
    };
    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onVisibility);
    void (async () => {
      // An opener can clone sessionStorage into a new tab. Acquire the tab's
      // lock before reading/writing its local backup so those tabs never share
      // a key (and release it if this component unmounts while waiting).
      const tab = await acquireOnboardingTab(backupOwnerId);
      if (cancelled) { tab.release(); return; }
      releaseTab = tab.release;
      sync = new OnboardingDraftSync({
        key: `${backupPrefix}${tab.id}`,
        backupPrefix,
        storage,
        remote: remoteDraft,
        onState: (state: SyncState) => setSyncState(state),
        onDraft: (draft: Draft) => {
          applyingRef.current = true;
          stepRef.current = draft.currentStep;
          slugTouchedRef.current = draft.slugTouched;
          reset(draft.values);
          setStep(draft.currentStep);
          applyingRef.current = false;
        },
      });
      syncRef.current = sync;
      void sync.initialize(defaults);
    })();
    return () => {
      cancelled = true;
      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onVisibility);
      sync?.dispose();
      releaseTab();
      if (syncRef.current === sync) syncRef.current = null;
    };
  }, [user?.id, user?.supabaseUserId, defaults, reset]);

  useEffect(() => {
    const subscription = watch(() => {
      const sync = syncRef.current;
      if (!sync?.ready || applyingRef.current) return;
      sync.update({ values: getValues(), currentStep: stepRef.current, slugTouched: slugTouchedRef.current });
    });
    return () => subscription.unsubscribe();
  }, [watch, getValues]);

  useEffect(() => {
    api.get<{ templates: WebsiteTemplate[] }>('/public/templates')
      .then((res) => setTemplates(res.templates))
      .catch(() => setTemplates([]));
  }, []);

  const slug = values?.slug || '';
  useEffect(() => {
    if (['loading', 'load-error', 'completed'].includes(syncState.status)) return;
    if (!onboardingValuesSchema.shape.slug.safeParse(slug).success) {
      setAvailability({ slug, status: 'idle' });
      return;
    }
    let cancelled = false;
    setAvailability({ slug, status: 'checking' });
    const timer = window.setTimeout(async () => {
      try {
        const result = await api.get<{ available: boolean; reason: string | null }>(
          `/salon/onboarding/slug-available?slug=${encodeURIComponent(slug)}`
        );
        if (!cancelled) setAvailability({ slug, status: result.available ? 'available' : 'taken', reason: result.reason || undefined });
      } catch {
        if (!cancelled) setAvailability({ slug, status: 'error', reason: 'We could not check this address. Please retry.' });
      }
    }, 450);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [slug, slugRetry, syncState.status === 'loading', syncState.status === 'load-error', syncState.status === 'completed']);

  const openDashboard = (result: { salon: Salon; subscription: MembershipPlan | null }) => {
    syncRef.current?.clearBackup();
    // The dashboard guard may redirect while the auth state and router update
    // are settling. Preserve the one-time success notice through that redirect.
    try { window.sessionStorage.setItem(`beautyzone.onboarding.complete:${user?.id}`, '1'); } catch { /* route state is the fallback */ }
    navigate('/dashboard', { replace: true, state: { onboardingComplete: true } });
    setSession({ salon: result.salon, subscription: result.subscription, workflow: null });
  };

  const restoreCompleted = async () => {
    const sync = syncRef.current;
    if (!sync?.completed || restoringRef.current) return;
    restoringRef.current = true;
    setRestoreError('');
    try {
      const result = await api.post<{ salon: Salon; subscription: MembershipPlan | null }>(
        '/salon/onboarding/complete', { expectedRevision: sync.completed.revision }
      );
      openDashboard(result);
    } catch (err) {
      setRestoreError(errorMessage(err));
    } finally {
      restoringRef.current = false;
    }
  };
  useEffect(() => {
    if (syncState.status === 'completed') void restoreCompleted();
  }, [syncState.status]);

  useEffect(() => {
    if (syncState.status === 'error' && syncState.message) showToast(syncState.message, 'error');
  }, [syncState.status, syncState.message]);

  const slugAvailable = availability.slug === slug && availability.status === 'available';
  const stepValid = Boolean(values && onboardingStepSchemas[step - 1].safeParse(values).success);
  const imageUploading = uploading.logo || uploading.cover;
  const canContinue = stepValid && (step !== 1 && step !== 4 || slugAvailable) && !busy && !imageUploading && syncState.status !== 'conflict';
  const fieldError = (field: keyof Values) => {
    const error = errors[field];
    return error && typeof error.message === 'string' ? error.message : undefined;
  };

  const goNext = async () => {
    if (busy || imageUploading || syncState.status === 'conflict') return;
    const valid = await trigger(ONBOARDING_STEPS[step - 1].fields as (keyof Values)[]);
    if (!valid || !onboardingStepSchemas[step - 1].safeParse(getValues()).success) {
      showToast('Complete the required fields in this step before continuing.', 'error');
      return;
    }
    if ((step === 1 || step === 4) && !slugAvailable) {
      showToast('Please check your website address before continuing.', 'error');
      return;
    }
    if (step === 4 && !onboardingValuesSchema.safeParse(getValues()).success) {
      showToast('A previous step needs attention. Go back and complete the required fields.', 'error');
      return;
    }
    const sync = syncRef.current;
    if (!sync) return;
    setBusy(true);
    try {
      if (step < 4) {
        await sync.moveTo(step + 1);
        showToast(`${ONBOARDING_STEPS[step - 1].title} saved.`);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        const revision = await sync.flush();
        const result = await api.post<{ salon: Salon; subscription: MembershipPlan | null }>(
          '/salon/onboarding/complete', { expectedRevision: revision }
        );
        openDashboard(result);
      }
    } catch (err) {
      if (err instanceof ApiError && err.code === 'ONBOARDING_SLUG_TAKEN') setSlugRetry((n) => n + 1);
      if (err instanceof ApiError && err.code === 'ONBOARDING_CONFLICT') void sync.checkRemote().catch(() => {});
      showToast(errorMessage(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  const goBack = async () => {
    if (busy || imageUploading || step <= 1) return;
    const sync = syncRef.current;
    if (!sync) return;
    setBusy(true);
    try {
      await sync.moveTo(step - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) { showToast(errorMessage(err), 'error'); }
    finally { setBusy(false); }
  };

  const retrySave = async () => {
    const sync = syncRef.current;
    if (!sync) return;
    try {
      if (!sync.ready) await sync.initialize(defaults);
      else await sync.flush();
    } catch (err) { showToast(errorMessage(err), 'error'); }
  };

  const resolveConflict = async (choice: 'local' | 'remote') => {
    if (!syncRef.current) return;
    setBusy(true);
    try {
      await syncRef.current.resolveConflict(choice);
      showToast(choice === 'local' ? 'This device’s draft was saved.' : 'The saved online draft was restored.');
    } catch (err) { showToast(errorMessage(err), 'error'); }
    finally { setBusy(false); }
  };

  if (syncState.status === 'loading') {
    return <div role="status" className="flex min-h-[45vh] items-center justify-center gap-3 text-sm text-slate-600"><Loader2 className="h-5 w-5 animate-spin text-[#b58432]" />Loading your salon data...</div>;
  }
  if (syncState.status === 'load-error') {
    return <div className="mx-auto max-w-xl space-y-4 py-12"><PageHeader title="We couldn’t load your salon data" description="Your existing draft has not been changed. Check your connection and try again." /><Alert tone="error">{syncState.message}</Alert><Button variant="gold" onClick={() => void retrySave()}>Try again</Button></div>;
  }
  if (syncState.status === 'completed') {
    return <div className="mx-auto max-w-xl space-y-4 py-12" role="status"><PageHeader title="Opening your dashboard" description="Your salon is already set up. We’re restoring your workspace." />{restoreError ? <><Alert tone="error">{restoreError}</Alert><Button variant="gold" onClick={() => void restoreCompleted()}>Retry</Button></> : <p className="flex items-center gap-2 text-sm text-slate-600"><Loader2 className="h-4 w-4 animate-spin" /> Loading your salon data...</p>}</div>;
  }

  const statusLabel = syncState.status === 'saving' ? 'Saving...'
    : syncState.status === 'pending' ? 'Changes waiting to save'
      : syncState.status === 'saved' ? 'All changes saved'
        : syncState.status === 'error' ? (syncState.backupAvailable ? 'Saved on this device only' : 'Save failed')
          : syncState.status === 'conflict' ? 'Sync needs attention' : 'Changes save automatically';
  const nameRegistration = register('name');
  const slugRegistration = register('slug');
  const timingIssues = onboardingStepSchemas[3].safeParse(values);
  const timingMessage = !timingIssues.success ? timingIssues.error.issues.find((issue) => issue.path[0] === 'timings')?.message : '';

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader eyebrow={`Step ${step} of 4`} title="Set up your salon" description="A little at a time. Your progress is saved as you go." />
        <div role="status" aria-live="polite" className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium ${syncState.status === 'error' || syncState.status === 'conflict' ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-slate-200 bg-white text-slate-600'}`}>
          {syncState.status === 'saving' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : syncState.status === 'error' ? <CloudOff className="h-3.5 w-3.5" /> : <Cloud className="h-3.5 w-3.5" />}
          {statusLabel}
        </div>
      </div>

      <ol aria-label="Onboarding progress" className="grid grid-cols-4 gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
        {ONBOARDING_STEPS.map((item, index) => {
          const number = index + 1;
          const current = number === step;
          const done = number < step;
          return <li key={item.title} aria-current={current ? 'step' : undefined} className="min-w-0">
            <div className="flex items-center gap-2">
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${current ? 'bg-slate-900 text-white' : done ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                {done ? <Check className="h-4 w-4" /> : number}
              </span>
              <span className={`hidden truncate text-xs font-semibold sm:block ${current ? 'text-slate-900' : 'text-slate-400'}`}>{item.shortTitle}</span>
            </div>
            <p className={`mt-2 truncate text-[10px] font-medium sm:hidden ${current ? 'text-slate-900' : 'text-slate-400'}`}>{item.shortTitle}</p>
          </li>;
        })}
      </ol>

      {syncState.status === 'error' && <Alert tone="error"><div className="flex flex-wrap items-center justify-between gap-3"><span>{syncState.message} {syncState.backupAvailable ? 'Your latest changes are kept on this device.' : 'Local backup is unavailable; keep this page open until saving succeeds.'}</span><Button type="button" variant="secondary" size="sm" onClick={() => void retrySave()}>Retry saving</Button></div></Alert>}
      {!syncState.backupAvailable && syncState.status !== 'error' && <Alert tone="warning">Device backup is unavailable. Keep this page open until your changes are saved online.</Alert>}
      {syncState.status === 'conflict' && <Alert tone="warning"><div className="space-y-3"><p className="font-semibold">Two different drafts need your attention</p><p>Your device has unsynced changes and the saved draft also changed elsewhere. Choose which copy to keep; the other copy will be replaced.</p><div className="flex flex-wrap gap-2"><Button type="button" size="sm" variant="gold" disabled={busy} onClick={() => void resolveConflict('local')}>Keep this device’s draft</Button><Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => void resolveConflict('remote')}>Use saved online draft</Button></div></div></Alert>}

      <form noValidate onSubmit={(event) => { event.preventDefault(); void goNext(); }} className="space-y-5">
        <fieldset disabled={busy || syncState.status === 'conflict'} className="min-w-0 space-y-5 disabled:opacity-80">
          <Card className="overflow-hidden">
            <div className="border-b border-slate-100 bg-[#fdfbf6] px-5 py-5 sm:px-6">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#98702d]"><Sparkles className="h-4 w-4" /> Your salon · {String(step).padStart(2, '0')}</div>
              <h2 className="mt-2 text-xl font-semibold text-slate-900">{ONBOARDING_STEPS[step - 1].title}</h2>
              <p className="mt-1 text-sm text-slate-500">{stepDescriptions[step - 1]}</p>
            </div>
            <div className="space-y-5 p-5 sm:p-6">
              {step === 1 && <>
                <Field label="Salon name" htmlFor="name" required error={fieldError('name')}>
                  <Input {...nameRegistration} id="name" required maxLength={120} placeholder="e.g. Velvet Rose Atelier" aria-invalid={Boolean(fieldError('name'))} onChange={(event) => {
                    void nameRegistration.onChange(event);
                    if (!slugTouchedRef.current) setValue('slug', onboardingSlugify(event.target.value), { shouldDirty: true, shouldValidate: true });
                  }} />
                </Field>
                <Field label="Website address" htmlFor="slug" required error={fieldError('slug')} hint="Your salon page will be available at /salon/your-address.">
                  <div className="flex items-center rounded-lg border border-slate-300 bg-white px-3 focus-within:border-[#D09A40] focus-within:ring-2 focus-within:ring-[#D09A40]/25">
                    <span className="shrink-0 text-sm text-slate-400">/salon/</span>
                    <input {...slugRegistration} id="slug" required maxLength={60} value={slug} placeholder="velvet-rose" aria-invalid={Boolean(fieldError('slug'))} className="w-full border-0 bg-transparent py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none" onChange={(event) => {
                      slugTouchedRef.current = true;
                      setValue('slug', event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 60), { shouldDirty: true, shouldTouch: true, shouldValidate: true });
                    }} />
                    {availability.slug === slug && availability.status === 'checking' && <Loader2 className="h-4 w-4 animate-spin text-slate-400" aria-label="Checking address" />}
                    {slugAvailable && <Check className="h-4 w-4 text-emerald-600" aria-label="Address available" />}
                  </div>
                  {availability.slug === slug && availability.status === 'available' && <p className="text-xs text-emerald-700">This address is available.</p>}
                  {availability.slug === slug && (availability.status === 'taken' || availability.status === 'error') && <p className="text-xs text-red-600">{availability.reason} {availability.status === 'error' && <button type="button" className="font-semibold underline" onClick={() => setSlugRetry((n) => n + 1)}>Retry</button>}</p>}
                </Field>
                <div className="space-y-2">
                  <Field label="Tagline" htmlFor="tagline" required error={fieldError('tagline')} hint="A short line under your salon name.">
                    <Input {...register('tagline')} id="tagline" required maxLength={160} placeholder="Luxury Salon & Bridal Studio" aria-invalid={Boolean(fieldError('tagline'))} />
                  </Field>
                  <TaglineSuggestions salonName={values.name} value={values.tagline} onSelect={(text) => setValue('tagline', text, { shouldDirty: true, shouldValidate: true })} />
                </div>
                <div className="space-y-2">
                  <Field label="About your salon" htmlFor="description" required error={fieldError('description')}>
                    <Textarea {...register('description')} id="description" required maxLength={3000} placeholder="Describe what makes your salon special, your specialties and experience." aria-invalid={Boolean(fieldError('description'))} />
                  </Field>
                  <DescriptionSuggestions salonName={values.name} tagline={values.tagline} value={values.description} onSelect={(text) => setValue('description', text, { shouldDirty: true, shouldValidate: true })} />
                </div>
              </>}

              {step === 2 && <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Street address" htmlFor="addressLine" className="sm:col-span-2" required error={fieldError('addressLine')}><Input {...register('addressLine')} id="addressLine" required maxLength={300} placeholder="12 Civil Lines, Ashok Nagar" aria-invalid={Boolean(fieldError('addressLine'))} /></Field>
                <Field label="City" htmlFor="city" required error={fieldError('city')}><Input {...register('city')} id="city" required maxLength={100} placeholder="Jaipur" aria-invalid={Boolean(fieldError('city'))} /></Field>
                <Field label="State / region" htmlFor="state" required error={fieldError('state')}><Input {...register('state')} id="state" required maxLength={100} placeholder="Rajasthan" aria-invalid={Boolean(fieldError('state'))} /></Field>
                <Field label="Business phone" htmlFor="phone" required error={fieldError('phone')}><Input {...register('phone')} id="phone" required maxLength={40} placeholder="+91 98000 12345" inputMode="tel" aria-invalid={Boolean(fieldError('phone'))} /></Field>
                <Field label="Business email" htmlFor="email" required error={fieldError('email')}><Input {...register('email')} id="email" required maxLength={254} type="email" placeholder="hello@salon.com" aria-invalid={Boolean(fieldError('email'))} /></Field>
              </div>}

              {step === 3 && <>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Owner / manager name" htmlFor="ownerName" hint="Optional" error={fieldError('ownerName')}><Input {...register('ownerName')} id="ownerName" maxLength={120} placeholder="Aanya Sharma" /></Field>
                  <Field label="Owner contact number" htmlFor="ownerPhone" hint="Optional" error={fieldError('ownerPhone')}><Input {...register('ownerPhone')} id="ownerPhone" maxLength={40} placeholder="+91 98000 12345" inputMode="tel" aria-invalid={Boolean(fieldError('ownerPhone'))} /></Field>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <OnboardingImageField id="logoUrl" label="Salon logo" kind="logo" value={values.logoUrl} ownerEmail={user?.email || ''} ownerSupabaseId={user?.supabaseUserId} registration={register('logoUrl')} error={fieldError('logoUrl')} onUploaded={(url) => setValue('logoUrl', url, { shouldDirty: true, shouldTouch: true, shouldValidate: true })} onUploadingChange={(value) => setUploading((prev) => ({ ...prev, logo: value }))} />
                  <OnboardingImageField id="coverImage" label="Hero image" kind="cover" value={values.coverImage} ownerEmail={user?.email || ''} ownerSupabaseId={user?.supabaseUserId} registration={register('coverImage')} error={fieldError('coverImage')} onUploaded={(url) => setValue('coverImage', url, { shouldDirty: true, shouldTouch: true, shouldValidate: true })} onUploadingChange={(value) => setUploading((prev) => ({ ...prev, cover: value }))} />
                </div>
              </>}

              {step === 4 && <>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Website template <span className="text-red-500">*</span></h3>
                  <p className="mt-1 text-xs text-slate-500">Pick a starting point. You can refine it later.</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {(templates.length ? templates : FALLBACK_TEMPLATES).map((template) => <button key={template.id} type="button" onClick={() => setValue('templateId', template.id, { shouldDirty: true, shouldValidate: true })} aria-pressed={values.templateId === template.id} className={`rounded-xl border p-4 text-left transition-colors ${values.templateId === template.id ? 'border-[#D09A40] bg-[#D09A40]/10' : 'border-slate-200 hover:bg-slate-50'}`}>
                      <div className="flex items-center justify-between gap-2"><span className="text-sm font-semibold text-slate-900">{template.name}</span>{values.templateId === template.id ? <Check className="h-4 w-4 text-[#8a641f]" /> : template.premium ? <Badge tone="gold">Premium</Badge> : null}</div>
                      <p className="mt-1 text-xs text-slate-500">{template.description}</p>
                    </button>)}
                  </div>
                </div>
                <div className="border-t border-slate-100 pt-5">
                  <h3 className="text-sm font-semibold text-slate-900">Opening hours <span className="text-red-500">*</span></h3>
                  <p className="mt-1 text-xs text-slate-500">Set at least one open day. Closing time must be after opening time.</p>
                  <div className="mt-3 space-y-2">
                    {values.timings.map((entry, index) => <div key={entry.day} className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
                      <span className="w-24 text-sm font-medium text-slate-700">{DAY_LABELS[entry.day]}</span>
                      <input type="time" value={entry.open} disabled={entry.closed} onChange={(event) => setValue(`timings.${index}.open`, event.target.value, { shouldDirty: true, shouldValidate: true })} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm disabled:bg-slate-50 disabled:text-slate-400" aria-label={`${DAY_LABELS[entry.day]} opening time`} />
                      <span className="text-slate-400">to</span>
                      <input type="time" value={entry.close} disabled={entry.closed} onChange={(event) => setValue(`timings.${index}.close`, event.target.value, { shouldDirty: true, shouldValidate: true })} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm disabled:bg-slate-50 disabled:text-slate-400" aria-label={`${DAY_LABELS[entry.day]} closing time`} />
                      <label className="ml-auto flex items-center gap-1.5 text-xs text-slate-600"><input type="checkbox" checked={entry.closed} onChange={(event) => setValue(`timings.${index}.closed`, event.target.checked, { shouldDirty: true, shouldValidate: true })} className="h-3.5 w-3.5 rounded border-slate-300" />Closed</label>
                    </div>)}
                  </div>
                  {timingMessage && <p role="alert" className="mt-2 text-xs text-red-600">{timingMessage}</p>}
                </div>
                {!slugAvailable && <Alert tone="warning">Your website address needs to be checked before setup can be completed. {availability.status === 'taken' ? 'Go back to Salon identity to choose another address.' : <button type="button" className="font-semibold underline" onClick={() => setSlugRetry((n) => n + 1)}>Check again</button>}</Alert>}
              </>}
            </div>
          </Card>
        </fieldset>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>{step > 1 && <Button type="button" variant="secondary" onClick={() => void goBack()} disabled={busy || imageUploading || syncState.status === 'conflict'}><ArrowLeft className="h-4 w-4" /> Back</Button>}</div>
          <Button type="submit" variant="gold" size="lg" disabled={!canContinue} loading={busy}>
            {busy ? 'Saving...' : step === 4 ? 'Finish setup' : 'Save & continue'} {!busy && <ArrowRight className="h-4 w-4" />}
          </Button>
        </div>
        <p className="flex items-center justify-end gap-1.5 text-xs text-slate-500"><LockKeyhole className="h-3.5 w-3.5" /> Fields marked * are required. Your website stays private until approved.</p>
      </form>
      {toast && <div role={toast.tone === 'error' ? 'alert' : 'status'} className={`fixed bottom-5 right-5 z-50 flex max-w-sm items-start gap-2 rounded-xl border px-4 py-3 text-sm font-medium shadow-lg ${toast.tone === 'error' ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-white text-emerald-800'}`}><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />{toast.message}</div>}
    </div>
  );
};
