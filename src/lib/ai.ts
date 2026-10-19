import { api } from './api';
import { generateTaglineIdeas } from '../data/packagesData';

export interface AiResult<T> {
  value: T;
  source: 'ai' | 'fallback' | 'ai+fallback';
  warnings: string[];
}

/**
 * Client-side AI helpers.
 *
 * These call the server's /api/ai/* endpoints, which already degrade to
 * deterministic templates when no model is configured. If the network call
 * itself fails, we fall back to the local template generator so the studio UI
 * keeps working — a dead provider or an offline tab never blocks the owner.
 */

const localTaglines = (name: string): [string, string, string] => generateTaglineIdeas(name);

/** Suggests three marketing taglines for a package/service name. */
export async function suggestTaglines(name: string, count = 3): Promise<AiResult<string[]>> {
  const clean = (name || '').trim();
  if (!clean) return { value: [], source: 'fallback', warnings: [] };
  try {
    const res = await api.post<{ taglines: string[]; source: AiResult<string[]>['source']; warnings: string[] }>(
      '/ai/taglines',
      { name: clean, count }
    );
    const taglines = Array.isArray(res.taglines) ? res.taglines : [];
    if (taglines.length === 0) throw new Error('empty tagline response');
    return { value: taglines, source: res.source || 'ai', warnings: res.warnings || [] };
  } catch (err) {
    console.warn('[ai] tagline suggestion falling back to local templates:', err);
    return { value: localTaglines(clean), source: 'fallback', warnings: ['AI service unavailable'] };
  }
}

/** Suggests a short marketing description for a service. */
export async function suggestDescription(input: {
  name: string;
  category?: string;
  durationMinutes?: number;
}): Promise<AiResult<string>> {
  const name = (input?.name || '').trim();
  if (!name) return { value: '', source: 'fallback', warnings: [] };
  try {
    const res = await api.post<{ description: string; source: AiResult<string>['source']; warnings: string[] }>(
      '/ai/description',
      input
    );
    if (!res.description) throw new Error('empty description response');
    return { value: res.description, source: res.source || 'ai', warnings: res.warnings || [] };
  } catch (err) {
    console.warn('[ai] description suggestion falling back to local template:', err);
    const minutes = input.durationMinutes || 60;
    const category = input.category || 'beauty';
    return {
      value: `A ${minutes}-minute ${category} treatment — ${name} — delivered by certified specialists using premium, skin-safe products.`,
      source: 'fallback',
      warnings: ['AI service unavailable'],
    };
  }
}

/** Whether a live model is wired up on this deployment. */
export async function aiStatus(): Promise<{ configured: boolean; fallbackEnabled: boolean; note?: string }> {
  try {
    return await api.get<{ configured: boolean; fallbackEnabled: boolean; note?: string }>('/ai/status');
  } catch {
    return { configured: false, fallbackEnabled: true };
  }
}
