import { supabase } from './supabase';

export type SectionKey = 'services' | 'packages' | 'gallery' | 'videos' | 'branches' | 'brand';

interface SectionRow {
  id: string;
  owner_id: string | null;
  section_key: string;
  payload: unknown;
  is_published: boolean;
}

/** Prefer the signed-in owner's version; otherwise use the published global version. */
export async function loadSiteSection<T>(key: SectionKey): Promise<T | null> {
  const session = await supabase.auth.getSession();
  if (session?.user?.id) {
    const ownerRows = await supabase.db.select<SectionRow>(
      'site_sections',
      `owner_id=eq.${encodeURIComponent(session.user.id)}&section_key=eq.${encodeURIComponent(key)}&select=payload&limit=1`
    );
    if (ownerRows[0]) return ownerRows[0].payload as T;
  }
  const globalRows = await supabase.db.select<SectionRow>(
    'site_sections',
    `owner_id=is.null&section_key=eq.${encodeURIComponent(key)}&is_published=eq.true&select=payload&limit=1`
  );
  return globalRows[0] ? globalRows[0].payload as T : null;
}

/** Persist the editor's complete section state as one atomic JSON payload. */
export async function saveSiteSection(key: SectionKey, payload: unknown): Promise<void> {
  const session = await supabase.auth.getSession();
  if (!session?.user?.id) return; // Public visitors keep their local, read-only fallback.
  const ownerId = session.user.id;
  const rows = await supabase.db.select<SectionRow>(
    'site_sections',
    `owner_id=eq.${encodeURIComponent(ownerId)}&section_key=eq.${encodeURIComponent(key)}&select=id&limit=1`
  );
  const body = { payload, is_published: true, updated_by: ownerId, updated_at: new Date().toISOString() };
  if (rows[0]) {
    await supabase.db.update('site_sections', `id=eq.${encodeURIComponent(rows[0].id)}`, body);
  } else {
    await supabase.db.insert('site_sections', { owner_id: ownerId, section_key: key, ...body });
  }
}
