// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { defaultOnboardingDraft } from '../../lib/onboardingSchema.js';
import { OnboardingPage } from './OnboardingPage';

const fake = vi.hoisted(() => ({
  row: null as any,
  failSave: false,
  calls: [] as any[],
  setSession: vi.fn(),
  upload: vi.fn(),
  suggestTaglines: vi.fn(),
  suggestDescriptions: vi.fn(),
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'owner-1', email: 'owner@example.com', name: 'Owner' }, setSession: fake.setSession }),
}));
vi.mock('../../lib/supabase', () => ({
  supabase: { auth: { getSession: vi.fn(async () => null) }, db: { upload: vi.fn() } },
}));
vi.mock('../../lib/imageUtils', () => ({ optimizeImageFile: vi.fn(async () => 'data:image/jpeg;base64,YWJj') }));
vi.mock('../../lib/ai', () => ({
  suggestSalonTaglines: fake.suggestTaglines,
  suggestSalonDescriptions: fake.suggestDescriptions,
}));
vi.mock('../../lib/api', async () => {
  const { checkDraftTransition } = await import('../../lib/onboardingSchema.js');
  class ApiError extends Error {
    status: number;
    code?: string;
    constructor(status: number, message: string, code?: string) { super(message); this.status = status; this.code = code; }
  }
  return {
    ApiError,
    errorMessage: (error: unknown) => error instanceof Error ? error.message : 'Something went wrong.',
    api: {
      upload: fake.upload,
      get: async (path: string) => {
        if (path === '/salon/onboarding/draft') return { draft: fake.row ? structuredClone(fake.row) : null };
        if (path === '/public/templates') return { templates: [] };
        if (path.startsWith('/salon/onboarding/slug-available')) return { available: true, reason: null };
        throw new Error(`Unexpected GET ${path}`);
      },
      put: async (path: string, body: any) => {
        if (fake.failSave) throw new ApiError(503, 'Offline');
        if (path !== '/salon/onboarding/draft') throw new Error(`Unexpected PUT ${path}`);
        if ((fake.row?.revision || 0) !== body.expectedRevision) throw new ApiError(409, 'Conflict', 'ONBOARDING_CONFLICT');
        const problem = checkDraftTransition(fake.row?.draft || null, body.draft);
        if (problem) throw new ApiError(400, problem, 'ONBOARDING_STEP_ORDER');
        fake.row = { draft: structuredClone(body.draft), revision: body.expectedRevision + 1, completed: false, updatedAt: new Date().toISOString() };
        fake.calls.push(structuredClone(fake.row));
        return { draft: structuredClone(fake.row) };
      },
      post: async (path: string, body: any) => {
        if (path === '/salon/onboarding/complete') {
          if (!fake.row || body.expectedRevision !== fake.row.revision) throw new ApiError(409, 'Conflict', 'ONBOARDING_CONFLICT');
          fake.row.completed = true;
          return { salon: { id: 'salon-1', name: fake.row.draft.values.name, slug: fake.row.draft.values.slug, onboardingCompleted: true }, subscription: null };
        }
        if (path === '/salon/onboarding/draft/resolve') {
          fake.row = { draft: structuredClone(body.draft), revision: body.expectedRevision + 1, completed: false, updatedAt: new Date().toISOString() };
          return { draft: structuredClone(fake.row) };
        }
        throw new Error(`Unexpected POST ${path}`);
      },
    },
  };
});

/** Mount the wizard with a dashboard destination for navigation assertions. */
function mount() {
  return render(<MemoryRouter initialEntries={['/dashboard/onboarding']}><Routes>
    <Route path="/dashboard/onboarding" element={<OnboardingPage />} />
    <Route path="/dashboard" element={<div>Dashboard reached</div>} />
  </Routes></MemoryRouter>);
}
const byLabel = (label: string) => screen.getByLabelText(label, { exact: false });
const change = (label: string, value: string) => fireEvent.change(byLabel(label), { target: { value } });
const next = () => screen.getByRole('button', { name: 'Save & continue' }) as HTMLButtonElement;

beforeEach(() => {
  fake.row = null;
  fake.calls = [];
  fake.failSave = false;
  fake.setSession.mockReset();
  fake.upload.mockReset();
  fake.suggestTaglines.mockReset().mockResolvedValue({ value: ['Radiance for Every Day', 'Beauty, Thoughtfully Yours', 'Your Moment to Shine'], source: 'ai', warnings: [] });
  fake.suggestDescriptions.mockReset().mockResolvedValue({ value: [], source: 'fallback', warnings: [] });
  localStorage.clear();
  sessionStorage.clear();
  window.scrollTo = vi.fn();
});
afterEach(() => { cleanup(); });

describe('salon onboarding wizard', () => {
  it('prefills the owner profile name and email into the onboarding form', async () => {
    mount();
    await screen.findByRole('heading', { name: 'Salon identity' });
    change('Salon name', 'Rose Studio');
    change('Tagline', 'Glow every day');
    change('About your salon', 'A welcoming salon for everyone.');
    await waitFor(() => expect(next().disabled).toBe(false), { timeout: 3000 });
    fireEvent.click(next());
    await screen.findByRole('heading', { name: 'Location & contact' });
    expect((byLabel('Business email') as HTMLInputElement).value).toBe('owner@example.com');
    change('Street address', '1 Main Road');
    change('City', 'Jaipur');
    change('State / region', 'Rajasthan');
    change('Business phone', '+91 98765 43210');
    await waitFor(() => expect(next().disabled).toBe(false));
    fireEvent.click(next());
    await screen.findByRole('heading', { name: 'Owner & branding' });
    expect((byLabel('Owner / manager name') as HTMLInputElement).value).toBe('Owner');
  });

  it('routes a remotely completed onboarding directly to the dashboard without rendering the form', async () => {
    const draft = defaultOnboardingDraft({ name: 'Owner', email: 'owner@example.com' });
    draft.currentStep = 4;
    draft.values = {
      ...draft.values, name: 'Rose Studio', slug: 'rose-studio', tagline: 'Glow every day',
      description: 'A welcoming salon for everyone.', addressLine: '1 Main Road', city: 'Jaipur',
      state: 'Rajasthan', phone: '+91 98765 43210', email: 'hello@example.com',
      logoUrl: 'https://example.com/logo.png', coverImage: 'https://example.com/cover.png',
    };
    fake.row = { draft, revision: 8, completed: true, updatedAt: new Date().toISOString() };
    mount();
    await screen.findByText('Dashboard reached');
    expect(screen.queryByRole('heading', { name: 'Salon identity' })).toBeNull();
    expect(fake.setSession).toHaveBeenCalledOnce();
  });

  it('validates every step, resumes a typed device backup, and completes into the dashboard', async () => {
    let view = mount();
    await screen.findByRole('heading', { name: 'Salon identity' });
    expect(next().disabled).toBe(true);
    const progress = screen.getByRole('list', { name: 'Onboarding progress' });
    expect(within(progress).queryAllByRole('button')).toHaveLength(0);
    expect(screen.queryByLabelText('Street address', { exact: false })).toBeNull();

    change('Salon name', 'Rose Studio');
    change('Tagline', 'A little more glow');
    change('About your salon', 'A welcoming salon for everyone.');
    await waitFor(() => expect(next().disabled).toBe(false), { timeout: 3000 });
    expect((byLabel('Website address') as HTMLInputElement).value).toBe('rose-studio');
    fireEvent.click(next());
    await screen.findByRole('heading', { name: 'Location & contact' });
    expect(fake.calls.map((call) => call.draft.currentStep)).toEqual([1, 2]);
    expect(next().disabled).toBe(true);
    change('Street address', '1 Main Road');
    change('City', 'Jaipur');
    // Reload before the debounce: the local copy must include the latest edit.
    view.unmount();
    view = mount();
    await screen.findByRole('heading', { name: 'Location & contact' });
    expect((byLabel('Street address') as HTMLInputElement).value).toBe('1 Main Road');
    expect((byLabel('City') as HTMLInputElement).value).toBe('Jaipur');
    change('State / region', 'Rajasthan');
    change('Business phone', 'bad-phone');
    change('Business email', 'bad-email');
    expect(next().disabled).toBe(true);
    change('Business phone', '+91 98765 43210');
    change('Business email', 'hello@example.com');
    await waitFor(() => expect(next().disabled).toBe(false));
    fireEvent.click(next());
    await screen.findByRole('heading', { name: 'Owner & branding' });
    expect(next().disabled).toBe(true);
    change('Salon logo URL', 'javascript:alert(1)');
    change('Hero image URL', 'https://example.com/hero.jpg');
    expect(next().disabled).toBe(true);
    change('Salon logo URL', 'https://example.com/logo.png');
    await waitFor(() => expect(next().disabled).toBe(false));
    fireEvent.click(next());
    await screen.findByRole('heading', { name: 'Template & hours' });
    const finish = screen.getByRole('button', { name: 'Finish setup' }) as HTMLButtonElement;
    await waitFor(() => expect(finish.disabled).toBe(false), { timeout: 3000 });
    change('Monday closing time', '09:00');
    expect(finish.disabled).toBe(true);
    expect(screen.getByText(/closing must be after opening/i)).toBeTruthy();
    change('Monday closing time', '20:00');
    await waitFor(() => expect(finish.disabled).toBe(false));
    fireEvent.click(finish);
    await screen.findByText('Dashboard reached');
    expect(fake.row.completed).toBe(true);
    expect(fake.row.draft.values.city).toBe('Jaipur');
    expect(fake.row.draft.values.logoUrl).toBe('https://example.com/logo.png');
    expect(fake.setSession).toHaveBeenCalledOnce();
    expect(localStorage.length).toBe(0);
    view.unmount();
  });

  it('requests tagline ideas using the live salon name and applies a selected option', async () => {
    mount();
    await screen.findByRole('heading', { name: 'Salon identity' });
    change('Salon name', 'Bright Jaipur');

    fireEvent.click(screen.getByRole('button', { name: 'Suggest taglines' }));
    const option = await screen.findByRole('button', { name: 'Radiance for Every Day' });
    expect(fake.suggestTaglines).toHaveBeenCalledWith('Bright Jaipur', 0, []);
    fireEvent.click(option);
    expect((document.getElementById('tagline') as HTMLInputElement).value).toBe('Radiance for Every Day');
  });

  it('backs up every edit immediately and shows the automatic-save status after remote sync', async () => {
    mount();
    await screen.findByRole('heading', { name: 'Salon identity' });

    change('Salon name', 'Draft Salon');
    await waitFor(() => {
      const keys = Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index) || '');
      const draftKey = keys.find((key) => key.startsWith('beautyzone.onboarding.v1:owner-1:'));
      expect(draftKey).toBeTruthy();
      const backup = JSON.parse(localStorage.getItem(draftKey!)!);
      expect(backup.draft.values.name).toBe('Draft Salon');
      expect(backup.dirty).toBe(true);
    });

    await screen.findByText('Draft saved automatically', {}, { timeout: 4000 });
    expect(fake.row?.draft.values.name).toBe('Draft Salon');
  });

  it('keeps the user on the current step when saving fails and retries safely', async () => {
    mount();
    await screen.findByRole('heading', { name: 'Salon identity' });
    change('Salon name', 'Offline Salon');
    change('Tagline', 'Glow together');
    change('About your salon', 'A lovely neighbourhood salon.');
    await waitFor(() => expect(next().disabled).toBe(false), { timeout: 3000 });
    fake.failSave = true;
    fireEvent.click(next());
    await screen.findByText(/Saved on this device only/);
    expect(screen.getByRole('heading', { name: 'Salon identity' })).toBeTruthy();
    expect(screen.queryByLabelText('Street address', { exact: false })).toBeNull();
    expect(localStorage.length).toBeGreaterThan(0);
    fake.failSave = false;
    fireEvent.click(screen.getByRole('button', { name: 'Retry saving' }));
    await screen.findByText('Draft saved automatically');
    fireEvent.click(next());
    await screen.findByRole('heading', { name: 'Location & contact' });
  });

  it('keeps a removed upload from changing a conflict-restored earlier step', async () => {
    const draft = defaultOnboardingDraft({ name: 'Owner', email: 'owner@example.com' });
    draft.currentStep = 3;
    draft.values = { ...draft.values, name: 'Conflict Salon', slug: 'conflict-salon', tagline: 'Glow',
      description: 'A lovely salon', addressLine: '1 Main Road', city: 'Jaipur', state: 'Rajasthan',
      phone: '+91 98765 43210', email: 'hello@example.com', logoUrl: 'https://example.com/original.jpg',
      coverImage: 'https://example.com/hero.jpg' };
    fake.row = { draft: structuredClone(draft), revision: 1, completed: false, updatedAt: new Date().toISOString() };
    let finishUpload!: (value: { url: string }) => void;
    const upload = new Promise<{ url: string }>((resolve) => { finishUpload = resolve; });
    fake.upload.mockReturnValue(upload);
    mount();
    await screen.findByRole('heading', { name: 'Owner & branding' });
    fireEvent.change(screen.getByLabelText('Choose salon logo file'), {
      target: { files: [new File(['image'], 'logo.jpg', { type: 'image/jpeg' })] },
    });
    await waitFor(() => expect(fake.upload).toHaveBeenCalledOnce());
    change('Owner / manager name', 'Unsynced owner');
    const online = structuredClone(draft);
    online.currentStep = 2;
    online.values.logoUrl = '';
    online.values.coverImage = '';
    fake.row = { draft: online, revision: 2, completed: false, updatedAt: new Date().toISOString() };
    await screen.findByText('Two different drafts need your attention', {}, { timeout: 4000 });
    fireEvent.click(screen.getByRole('button', { name: 'Use saved online draft' }));
    await screen.findByRole('heading', { name: 'Location & contact' });
    await act(async () => { finishUpload({ url: '/api/uploads/too-late.jpg' }); await upload; });
    const backup = JSON.parse(localStorage.getItem(localStorage.key(0)!)!);
    expect(backup.draft.values.logoUrl).toBe('');
    expect(backup.draft.currentStep).toBe(2);
    await waitFor(() => expect(next().disabled).toBe(false));
    fireEvent.click(next());
    await screen.findByRole('heading', { name: 'Owner & branding' });
    expect(fake.row.draft.values.logoUrl).toBe('');
    expect((byLabel('Salon logo URL') as HTMLInputElement).value).toBe('');
  });


  it('ignores an old upload after a same-step draft replacement and accepts a new one', async () => {
    const draft = defaultOnboardingDraft({ name: 'Owner', email: 'owner@example.com' });
    draft.currentStep = 3;
    draft.values = { ...draft.values, name: 'Conflict Salon', slug: 'conflict-salon', tagline: 'Glow',
      description: 'A lovely salon', addressLine: '1 Main Road', city: 'Jaipur', state: 'Rajasthan',
      phone: '+91 98765 43210', email: 'hello@example.com', logoUrl: 'https://example.com/original.jpg',
      coverImage: 'https://example.com/hero.jpg' };
    fake.row = { draft: structuredClone(draft), revision: 1, completed: false, updatedAt: new Date().toISOString() };
    let finishOldUpload!: (value: { url: string }) => void;
    const oldUpload = new Promise<{ url: string }>((resolve) => { finishOldUpload = resolve; });
    fake.upload.mockReturnValueOnce(oldUpload).mockResolvedValueOnce({ url: '/api/uploads/new.jpg' });
    mount();
    await screen.findByRole('heading', { name: 'Owner & branding' });
    fireEvent.change(screen.getByLabelText('Choose salon logo file'), {
      target: { files: [new File(['old'], 'old.jpg', { type: 'image/jpeg' })] },
    });
    await waitFor(() => expect(fake.upload).toHaveBeenCalledTimes(1));
    change('Owner / manager name', 'Unsynced owner');
    const online = structuredClone(draft);
    online.values.logoUrl = 'https://example.com/restored.jpg';
    fake.row = { draft: online, revision: 2, completed: false, updatedAt: new Date().toISOString() };
    await screen.findByText('Two different drafts need your attention', {}, { timeout: 4000 });
    fireEvent.click(screen.getByRole('button', { name: 'Use saved online draft' }));
    await waitFor(() => expect((byLabel('Salon logo URL') as HTMLInputElement).value).toBe('https://example.com/restored.jpg'));
    await act(async () => { finishOldUpload({ url: '/api/uploads/stale.jpg' }); await oldUpload; });
    expect((byLabel('Salon logo URL') as HTMLInputElement).value).toBe('https://example.com/restored.jpg');
    fireEvent.change(screen.getByLabelText('Choose salon logo file'), {
      target: { files: [new File(['new'], 'new.jpg', { type: 'image/jpeg' })] },
    });
    await waitFor(() => expect((byLabel('Salon logo URL') as HTMLInputElement).value).toBe('/api/uploads/new.jpg'));
    expect(fake.upload).toHaveBeenCalledTimes(2);
  });

});
