// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { OnboardingPage } from './OnboardingPage';

const fake = vi.hoisted(() => ({
  row: null as any,
  failSave: false,
  calls: [] as any[],
  setSession: vi.fn(),
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'owner-1', email: 'owner@example.com', name: 'Owner' }, setSession: fake.setSession }),
}));
vi.mock('../../lib/supabase', () => ({
  supabase: { auth: { getSession: vi.fn(async () => null) }, db: { upload: vi.fn() } },
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
  localStorage.clear();
  sessionStorage.clear();
  window.scrollTo = vi.fn();
});
afterEach(() => { cleanup(); });

describe('salon onboarding wizard', () => {
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
    await screen.findByText('All changes saved');
    fireEvent.click(next());
    await screen.findByRole('heading', { name: 'Location & contact' });
  });
});
