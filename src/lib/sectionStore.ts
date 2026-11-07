import { supabase } from './supabase';
import { withSchemaFallback } from './postgrestFallback.js';

export type SectionKey = 'services' | 'packages' | 'gallery' | 'videos' | 'branches' | 'brand';

interface SectionRow {
  id: string;
  owner_id: string | null;
  section_key: string;
  payload: unknown;
  is_published: boolean;
}

/** Global published query variants, newest schema first. */
const GLOBAL_QUERY_VARIANTS = (key: SectionKey) => [
  `owner_id=is.null&section_key=eq.${encodeURIComponent(key)}&is_published=eq.true&select=payload&limit=1`,
  `owner_id=is.null&section_key=eq.${encodeURIComponent(key)}&select=payload&limit=1`,
];

/** Update/insert bodies: optional metadata columns are dropped when absent. */
const SECTION_BODY_VARIANTS = (payload: unknown, ownerId: string) => [
  { payload, is_published: true, updated_by: ownerId, updated_at: new Date().toISOString() },
  { payload, is_published: true, updated_at: new Date().toISOString() },
  { payload },
];

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
  const result = await withSchemaFallback(
    GLOBAL_QUERY_VARIANTS(key),
    (query) => supabase.db.select<SectionRow>('site_sections', query)
  );
  const rows = result.value || [];
  return rows[0] ? (rows[0].payload as T) : null;
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
  const bodies = SECTION_BODY_VARIANTS(payload, ownerId);

  if (rows[0]) {
    const query = `id=eq.${encodeURIComponent(rows[0].id)}`;
    const result = await withSchemaFallback(bodies, (body) =>
      supabase.db.update('site_sections', query, body)
    );
    if (result.value === null) throw result.error ?? new Error('Could not save site section');
    return;
  }

  const result = await withSchemaFallback(bodies, (body) =>
    supabase.db.insert('site_sections', { owner_id: ownerId, section_key: key, ...body })
  );
  if (result.value === null) throw result.error ?? new Error('Could not create site section');
}
