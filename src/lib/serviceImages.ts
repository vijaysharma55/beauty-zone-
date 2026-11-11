/**
 * Supabase Storage helpers for catalogue media.
 *
 * Uploads go to the public `beautyzone-assets` bucket under the signed-in
 * user's folder (`<uid>/services/…`), which is exactly what the bucket's RLS
 * policies allow. The returned URL is the public object URL, so it renders on
 * the dashboard, the preview and the live salon website alike.
 *
 * The caller always keeps a local data-URL fallback (`optimizeImageFile`) so a
 * catalogue edit still saves when Storage is unreachable.
 */
import { supabase } from './supabase';
import { optimizeImageFile } from './imageUtils';

export const SERVICE_IMAGE_BUCKET = 'beautyzone-assets';

/** Storage object keys: no spaces, no path traversal, stable and predictable. */
export function buildServiceImagePath(userId: string, fileName: string, now = Date.now()): string {
  const safeUser = String(userId || 'anonymous')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 40) || 'anonymous';
  const base = String(fileName || 'service')
    .toLowerCase()
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'service';
  const suffix = Math.random().toString(36).slice(2, 10);
  return `${safeUser}/services/${base}-${now}-${suffix}.jpg`;
}

export interface UploadServiceImageResult {
  /** URL to persist on the service row. */
  url: string;
  /** 'storage' when Supabase Storage accepted the file, 'inline' for the data-URL fallback. */
  source: 'storage' | 'inline';
  /** Present when Storage failed but the inline preview still works. */
  warning?: string;
}

/**
 * Compress → upload to Supabase Storage → fall back to the inline data URL.
 * Never throws for a readable image: the owner always gets *a* URL back.
 */
export async function uploadServiceImage(file: File): Promise<UploadServiceImageResult> {
  const dataUrl = await optimizeImageFile(file);
  let warning: string | undefined;
  try {
    const session = await supabase.auth.getSession();
    if (!session?.user?.id) throw new Error('Sign in again to store images in Supabase Storage.');
    const blob = await (await fetch(dataUrl)).blob();
    const optimized = new File([blob], 'service.jpg', {
      type: blob.type && blob.type.startsWith('image/') ? blob.type : 'image/jpeg',
    });
    const path = buildServiceImagePath(session.user.id, file.name || 'service');
    const url = await supabase.db.upload(path, optimized);
    if (url) return { url, source: 'storage' };
    throw new Error('Storage did not return a URL.');
  } catch (error) {
    warning =
      error instanceof Error
        ? `${error.message} The optimised image is embedded in this service instead.`
        : 'Image storage is unavailable. The optimised image is embedded in this service instead.';
  }
  return { url: dataUrl, source: 'inline', warning };
}
