// @vitest-environment jsdom
import { beforeEach, expect, it, vi } from 'vitest';
import { uploadOnboardingImage } from './OnboardingImageField';

const mocks = vi.hoisted(() => ({ getSession: vi.fn(), storageUpload: vi.fn(), apiUpload: vi.fn() }));
vi.mock('../../lib/supabase', () => ({ supabase: { auth: { getSession: mocks.getSession }, db: { upload: mocks.storageUpload } } }));
vi.mock('../../lib/api', () => ({ api: { upload: mocks.apiUpload } }));
vi.mock('../../lib/imageUtils', () => ({ optimizeImageFile: vi.fn(async () => 'data:image/jpeg;base64,YWJj') }));

beforeEach(() => { vi.resetAllMocks(); });

it('uploads Supabase-owner images under the authenticated user folder', async () => {
  mocks.getSession.mockResolvedValue({ user: { id: 'owner-uuid', email: 'owner@example.com' } });
  mocks.storageUpload.mockResolvedValue('https://storage.example.com/owner-uuid/logo.jpg');
  const url = await uploadOnboardingImage(new File(['image'], 'logo.png', { type: 'image/png' }), 'logo', 'owner@example.com');
  expect(url).toBe('https://storage.example.com/owner-uuid/logo.jpg');
  expect(mocks.storageUpload.mock.calls[0][0]).toMatch(/^owner-uuid\/onboarding\/logo-.+\.jpg$/);
  expect(mocks.apiUpload).not.toHaveBeenCalled();
});

it('does not silently fall back to an ephemeral upload if Supabase storage fails', async () => {
  mocks.getSession.mockResolvedValue({ user: { id: 'owner-uuid', email: 'owner@example.com' } });
  mocks.storageUpload.mockRejectedValue(new Error('Storage unavailable'));
  await expect(uploadOnboardingImage(new File(['image'], 'hero.jpg', { type: 'image/jpeg' }), 'cover', 'owner@example.com')).rejects.toThrow('Storage unavailable');
  expect(mocks.apiUpload).not.toHaveBeenCalled();
});

it('uses the existing local upload endpoint for legacy local accounts', async () => {
  mocks.getSession.mockResolvedValue(null);
  mocks.apiUpload.mockResolvedValue({ url: '/api/uploads/image.jpg' });
  const url = await uploadOnboardingImage(new File(['image'], 'hero.jpg', { type: 'image/jpeg' }), 'cover', 'owner@example.com');
  expect(url).toBe('/api/uploads/image.jpg');
  expect(mocks.apiUpload.mock.calls[0][1]).toBe('cover');
});

it('never uses local files when a linked Supabase session is missing or belongs to another user', async () => {
  const file = new File(['image'], 'hero.jpg', { type: 'image/jpeg' });
  mocks.getSession.mockResolvedValue(null);
  await expect(uploadOnboardingImage(file, 'cover', 'owner@example.com', 'owner-uuid')).rejects.toThrow('sign in again');
  mocks.getSession.mockResolvedValue({ user: { id: 'other-uuid', email: 'owner@example.com' } });
  await expect(uploadOnboardingImage(file, 'cover', 'owner@example.com', 'owner-uuid')).rejects.toThrow('sign-in changed');
  expect(mocks.apiUpload).not.toHaveBeenCalled();
  expect(mocks.storageUpload).not.toHaveBeenCalled();
});
