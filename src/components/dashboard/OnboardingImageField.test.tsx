// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { UseFormRegisterReturn } from 'react-hook-form';
import { OnboardingImageField, uploadOnboardingImage } from './OnboardingImageField';

const mocks = vi.hoisted(() => ({ getSession: vi.fn(), storageUpload: vi.fn(), apiUpload: vi.fn() }));
vi.mock('../../lib/supabase', () => ({ supabase: { auth: { getSession: mocks.getSession }, db: { upload: mocks.storageUpload } } }));
vi.mock('../../lib/api', () => ({ api: { upload: mocks.apiUpload } }));
vi.mock('../../lib/imageUtils', () => ({ optimizeImageFile: vi.fn(async () => 'data:image/jpeg;base64,YWJj') }));

beforeEach(() => { vi.resetAllMocks(); });
afterEach(() => { cleanup(); });

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

/** Delay an upload response so unmounts and draft replacements can overtake it. */
function deferredUpload() {
  let resolve!: (value: { url: string }) => void;
  const promise = new Promise<{ url: string }>((done) => { resolve = done; });
  return { promise, resolve };
}

const registration: UseFormRegisterReturn = {
  name: 'logoUrl', onChange: async () => {}, onBlur: async () => {}, ref: () => {},
};
const imageFile = () => new File(['image'], 'logo.jpg', { type: 'image/jpeg' });

it('invalidates an in-flight upload and clears parent state when the field is removed', async () => {
  const pending = deferredUpload();
  mocks.getSession.mockResolvedValue(null);
  mocks.apiUpload.mockReturnValue(pending.promise);
  const onUploaded = vi.fn();
  const onUploadingChange = vi.fn();
  const view = render(<OnboardingImageField id="logoUrl" label="Salon logo" kind="logo" value=""
    ownerEmail="owner@example.com" registration={registration} isDraftCurrent={() => true}
    onUploaded={onUploaded} onUploadingChange={onUploadingChange} />);
  fireEvent.change(screen.getByLabelText('Choose salon logo file'), { target: { files: [imageFile()] } });
  await waitFor(() => expect(mocks.apiUpload).toHaveBeenCalledOnce());
  expect(onUploadingChange).toHaveBeenCalledWith(true);
  view.unmount();
  expect(onUploadingChange).toHaveBeenLastCalledWith(false);
  await act(async () => { pending.resolve({ url: '/api/uploads/late.jpg' }); await pending.promise; });
  expect(onUploaded).not.toHaveBeenCalled();
  expect(onUploadingChange.mock.calls).toEqual([[true], [false]]);
});

it('rejects a replaced draft’s upload immediately, but accepts uploads after ordinary rerenders', async () => {
  const oldUpload = deferredUpload();
  const newUpload = deferredUpload();
  mocks.getSession.mockResolvedValue(null);
  mocks.apiUpload.mockReturnValueOnce(oldUpload.promise).mockReturnValueOnce(newUpload.promise);
  const onUploaded = vi.fn();
  const onUploadingChange = vi.fn();
  let generation = 1;
  const field = (version: number) => <OnboardingImageField key={version} id="logoUrl" label="Salon logo" kind="logo" value=""
    ownerEmail="owner@example.com" registration={registration} isDraftCurrent={() => generation === version}
    onUploaded={onUploaded} onUploadingChange={onUploadingChange} />;
  const view = render(field(1));
  fireEvent.change(screen.getByLabelText('Choose salon logo file'), { target: { files: [imageFile()] } });
  await waitFor(() => expect(mocks.apiUpload).toHaveBeenCalledTimes(1));
  // The parent updates its generation before React has committed the remount.
  generation = 2;
  await act(async () => { oldUpload.resolve({ url: '/api/uploads/stale.jpg' }); await oldUpload.promise; });
  expect(onUploaded).not.toHaveBeenCalled();
  view.rerender(field(2));
  expect(onUploadingChange).toHaveBeenLastCalledWith(false);
  fireEvent.change(screen.getByLabelText('Choose salon logo file'), { target: { files: [imageFile()] } });
  await waitFor(() => expect(mocks.apiUpload).toHaveBeenCalledTimes(2));
  view.rerender(field(2)); // Fresh prop callbacks on a normal parent rerender must not cancel this upload.
  await act(async () => { newUpload.resolve({ url: '/api/uploads/current.jpg' }); await newUpload.promise; });
  expect(onUploaded).toHaveBeenCalledOnce();
  expect(onUploaded).toHaveBeenCalledWith('/api/uploads/current.jpg');
  expect(onUploadingChange).toHaveBeenLastCalledWith(false);
});
