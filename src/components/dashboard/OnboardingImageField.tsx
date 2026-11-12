import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, ImagePlus, Loader2, Upload } from 'lucide-react';
import type { UseFormRegisterReturn } from 'react-hook-form';
import { api } from '../../lib/api';
import { optimizeImageFile } from '../../lib/imageUtils';
import { isOnboardingImageUrl } from '../../lib/onboardingSchema.js';
import { supabase } from '../../lib/supabase';
import { Button, Field, Input } from '../ui';

/** Uploads before the salon exists; never fall back to ephemeral API files for a Supabase owner. */
export async function uploadOnboardingImage(file: File, kind: 'logo' | 'cover', ownerEmail: string, ownerSupabaseId?: string | null): Promise<string> {
  const dataUrl = await optimizeImageFile(file, { maxDimension: 1600, quality: 0.82 });
  // fetch(data:...) is blocked by the app's connect-src CSP in a real
  // browser. Decode the locally generated image without a network request.
  const match = /^data:(image\/(?:png|jpeg|webp|gif));base64,([a-z0-9+/=]+)$/i.exec(dataUrl);
  if (!match) throw new Error('Please choose a readable PNG, JPG, WEBP or GIF image.');
  let blob: Blob;
  try {
    const decoded = atob(match[2]);
    const bytes = new Uint8Array(decoded.length);
    for (let i = 0; i < decoded.length; i += 1) bytes[i] = decoded.charCodeAt(i);
    blob = new Blob([bytes], { type: match[1].toLowerCase() });
  } catch { throw new Error('That file is not a readable image.'); }
  if (blob.size > 5 * 1024 * 1024) throw new Error('The optimized image must be 5 MB or smaller.');
  const extensions: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' };
  const extension = extensions[blob.type];
  if (!extension) throw new Error('Please choose a PNG, JPG, WEBP or GIF image.');
  const optimized = new File([blob], `${kind}.${extension}`, { type: blob.type });
  const session = await supabase.auth.getSession();
  if (ownerSupabaseId && !session) throw new Error('Please sign in again before uploading to your online storage.');
  if (session) {
    if (session.user.email?.toLowerCase() !== ownerEmail.toLowerCase()
        || (ownerSupabaseId && session.user.id !== ownerSupabaseId)) {
      throw new Error('Your sign-in changed. Please sign in again before uploading.');
    }
    const random = globalThis.crypto.randomUUID();
    return supabase.db.upload(`${session.user.id}/onboarding/${kind}-${random}.${extension}`, optimized);
  }
  const result = await api.upload(optimized, kind);
  return result.url;
}

/** Upload a branding image only while its field and draft generation are current. */
export const OnboardingImageField: React.FC<{
  id: string;
  label: string;
  kind: 'logo' | 'cover';
  value: string;
  ownerEmail: string;
  ownerSupabaseId?: string | null;
  registration: UseFormRegisterReturn;
  error?: string;
  onUploaded: (url: string) => void;
  onUploadingChange: (uploading: boolean) => void;
  isDraftCurrent: () => boolean;
}> = ({ id, label, kind, value, ownerEmail, ownerSupabaseId, registration, error, onUploaded, onUploadingChange, isDraftCurrent }) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const uploadId = useRef(0);
  const uploadingChangeRef = useRef(onUploadingChange);
  uploadingChangeRef.current = onUploadingChange;
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  useEffect(() => () => {
    // A conflict can remove this field while its upload is still in flight.
    uploadId.current += 1;
    uploadingChangeRef.current(false);
  }, []);

  /** Ignore late results from an unmounted field, replaced draft, or newer upload. */
  const upload = async (file?: File) => {
    if (!file || !isDraftCurrent()) return;
    const id = ++uploadId.current;
    const isCurrent = () => uploadId.current === id && isDraftCurrent();
    setUploadError('');
    setUploading(true);
    onUploadingChange(true);
    try {
      const url = await uploadOnboardingImage(file, kind, ownerEmail, ownerSupabaseId);
      if (isCurrent()) onUploaded(url);
    } catch (err) {
      if (isCurrent()) setUploadError(err instanceof Error ? err.message : 'Could not upload that image. Please try again.');
    } finally {
      if (isCurrent()) {
        setUploading(false);
        onUploadingChange(false);
        if (fileRef.current) fileRef.current.value = '';
      }
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
      <div className="mb-4 flex items-center gap-3">
        <div className={`flex shrink-0 items-center justify-center overflow-hidden border border-slate-200 bg-white ${kind === 'logo' ? 'h-16 w-16 rounded-full' : 'h-16 w-24 rounded-lg'}`}>
          {isOnboardingImageUrl(value) ? (
            <img src={value} alt={`${label} preview`} className="h-full w-full object-cover" />
          ) : <ImagePlus className="h-6 w-6 text-slate-300" aria-hidden="true" />}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900">{label}</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            {kind === 'logo' ? 'A square image works best.' : 'A wide image works best for your website.'}
          </p>
        </div>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        aria-label={`Choose ${label.toLowerCase()} file`}
        onChange={(event) => { void upload(event.target.files?.[0]); }}
      />
      <Button type="button" variant="secondary" size="sm" loading={uploading} onClick={() => fileRef.current?.click()}>
        {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
        {uploading ? 'Uploading…' : 'Upload image'}
      </Button>
      <div className="mt-3">
        <Field label={`${label} URL`} htmlFor={id} required error={error} hint="Or paste an http(s) image URL.">
          <Input
            {...registration}
            id={id}
            value={value}
            type="text"
            inputMode="url"
            maxLength={2048}
            required
            placeholder="https://example.com/image.jpg"
            aria-invalid={Boolean(error)}
          />
        </Field>
      </div>
      {uploadError && <p role="alert" className="mt-2 flex gap-1 text-xs font-medium text-red-600"><AlertCircle className="h-4 w-4 shrink-0" />{uploadError}</p>}
    </div>
  );
};
