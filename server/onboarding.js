import { db, findSalonBySlug, nowIso } from './db.js';
import { HttpError, normalizeSlug } from './security.js';
import { rest, rpc } from './supabase-store.js';
import { checkDraftTransition, onboardingDraftSchema, safeOnboardingStep } from '../src/lib/onboardingSchema.js';

/** Never silently fall back to local SQLite when a Supabase bearer cannot be verified. */
export function onboardingSupabaseContext(req) {
  const token = /^Bearer\s+(.+)$/i.exec(req.get('authorization') || '')?.[1]?.trim();
  if ((token || req.user?.supabase_uid) && (!token || !req.supabaseIdentity)) {
    // A warm SQLite cookie can outlive the Supabase browser session. Never
    // open a separate local draft for a linked identity in that situation.
    throw new HttpError(503, 'Could not verify your online session. Please sign in again and retry.', 'ONBOARDING_CONNECTION');
  }
  return token && req.supabaseIdentity
    ? { token, id: req.supabaseIdentity.identityId }
    : null;
}

function storageData(draft) {
  return { values: draft.values, slugTouched: draft.slugTouched };
}

function deserialize(row) {
  if (!row) return null;
  let data;
  try { data = typeof row.data_json === 'string' ? JSON.parse(row.data_json) : row.data; }
  catch { throw new HttpError(500, 'Saved onboarding data could not be read.'); }
  const parsed = onboardingDraftSchema.safeParse({ ...data, currentStep: Number(row.current_step) });
  if (!parsed.success) throw new HttpError(500, 'Saved onboarding data could not be read.');
  return {
    draft: parsed.data,
    revision: Number(row.revision),
    completed: Boolean(row.completed),
    updatedAt: row.updated_at,
  };
}

function translateSupabaseError(error) {
  if (error?.code === '40001' || /ONBOARDING_CONFLICT/i.test(error?.message || '')) {
    return new HttpError(409, 'Your saved draft changed in another session.', 'ONBOARDING_CONFLICT');
  }
  if (/ONBOARDING_COMPLETED/i.test(error?.message || '')) {
    return new HttpError(409, 'This onboarding has already been completed.', 'ONBOARDING_COMPLETED');
  }
  if (['PGRST202', 'PGRST204', 'PGRST205', '42P01', '42703'].includes(error?.code)) {
    return new HttpError(503, 'Onboarding storage is not ready. Please contact support.', 'ONBOARDING_STORAGE_UNAVAILABLE');
  }
  return error;
}

export async function readOnboardingDraft(req, context = onboardingSupabaseContext(req)) {
  if (!context) {
    return deserialize(db.prepare('SELECT * FROM onboarding_drafts WHERE owner_id = ?').get(req.user.id));
  }
  try {
    const rows = await rest(context, 'onboarding_profiles',
      `user_id=eq.${encodeURIComponent(context.id)}&select=data,current_step,revision,completed,updated_at&limit=1`);
    return deserialize(rows?.[0]);
  } catch (error) { throw translateSupabaseError(error); }
}

/** Check both the legacy local catalogue and all Supabase salons, including unpublished drafts. */
export async function onboardingSlugAvailability(req, rawSlug, context = onboardingSupabaseContext(req)) {
  const raw = String(rawSlug || '').trim();
  let slug;
  try { slug = normalizeSlug(raw); }
  catch (error) { return { available: false, reason: error.message }; }
  if (slug !== raw || raw.includes('--')) return { available: false, reason: 'Use lowercase letters, numbers and single hyphens.' };
  if (findSalonBySlug(slug)) return { available: false, reason: 'This address is already in use.' };
  if (context) {
    try {
      const result = await rpc(context, 'onboarding_slug_available', { p_slug: slug });
      if (!result?.available) return { available: false, reason: result?.reason || 'This address is already in use.' };
    } catch (error) { throw translateSupabaseError(error); }
  }
  return { available: true, reason: null };
}

export async function saveOnboardingDraft(req, input, context = onboardingSupabaseContext(req)) {
  const parsed = onboardingDraftSchema.safeParse(input?.draft);
  const expectedRevision = input?.expectedRevision;
  if (!parsed.success || !Number.isSafeInteger(expectedRevision) || expectedRevision < 0) {
    throw new HttpError(400, 'The onboarding draft is invalid.', 'ONBOARDING_INVALID_DRAFT');
  }
  const draft = parsed.data;
  const previous = await readOnboardingDraft(req, context);
  if (previous?.completed) throw new HttpError(409, 'This onboarding has already been completed.', 'ONBOARDING_COMPLETED');
  if ((previous?.revision || 0) !== expectedRevision) {
    throw new HttpError(409, 'Your saved draft changed in another session.', 'ONBOARDING_CONFLICT');
  }
  const transitionError = checkDraftTransition(previous?.draft || null, draft);
  if (transitionError) throw new HttpError(400, transitionError, 'ONBOARDING_STEP_ORDER');
  if (previous?.draft.currentStep === 1 && draft.currentStep === 2) {
    const availability = await onboardingSlugAvailability(req, draft.values.slug, context);
    if (!availability.available) throw new HttpError(409, availability.reason, 'ONBOARDING_SLUG_TAKEN');
  }

  if (context) {
    try {
      const row = await rpc(context, 'save_onboarding_draft', {
        p_data: storageData(draft), p_current_step: draft.currentStep, p_expected_revision: expectedRevision,
      });
      return deserialize(row);
    } catch (error) { throw translateSupabaseError(error); }
  }

  const result = db.prepare(`
    INSERT INTO onboarding_drafts (owner_id, data_json, current_step, revision, completed, updated_at)
    VALUES (?, ?, ?, 1, 0, ?)
    ON CONFLICT(owner_id) DO UPDATE SET
      data_json = excluded.data_json, current_step = excluded.current_step,
      revision = onboarding_drafts.revision + 1, updated_at = excluded.updated_at
    WHERE onboarding_drafts.revision = ? AND onboarding_drafts.completed = 0
    RETURNING *
  `).get(req.user.id, JSON.stringify(storageData(draft)), draft.currentStep, nowIso(), expectedRevision);
  if (!result) throw new HttpError(409, 'Your saved draft changed in another session.', 'ONBOARDING_CONFLICT');
  return deserialize(result);
}

/** Explicit conflict resolution, only after the owner chooses a version. */
export async function resolveOnboardingDraft(req, input, context = onboardingSupabaseContext(req)) {
  const parsed = onboardingDraftSchema.safeParse(input?.draft);
  const expectedRevision = input?.expectedRevision;
  if (!parsed.success || !Number.isSafeInteger(expectedRevision) || expectedRevision < 0) {
    throw new HttpError(400, 'The onboarding draft is invalid.', 'ONBOARDING_INVALID_DRAFT');
  }
  const draft = parsed.data;
  if (safeOnboardingStep(draft) !== draft.currentStep) {
    throw new HttpError(400, 'Complete the preceding steps before restoring this draft.', 'ONBOARDING_STEP_ORDER');
  }
  const current = await readOnboardingDraft(req, context);
  if (current?.completed) throw new HttpError(409, 'This onboarding has already been completed.', 'ONBOARDING_COMPLETED');
  if (!current || current.revision !== expectedRevision) {
    throw new HttpError(409, 'Your saved draft changed in another session.', 'ONBOARDING_CONFLICT');
  }
  if (draft.currentStep > current.draft.currentStep) {
    throw new HttpError(400, 'Restore at the saved step and continue in order.', 'ONBOARDING_STEP_ORDER');
  }
  if (context) {
    try {
      const row = await rpc(context, 'resolve_onboarding_draft', {
        p_data: storageData(draft), p_current_step: draft.currentStep, p_expected_revision: expectedRevision,
      });
      return deserialize(row);
    } catch (error) { throw translateSupabaseError(error); }
  }
  const row = db.prepare(`
    INSERT INTO onboarding_drafts (owner_id, data_json, current_step, revision, completed, updated_at)
    VALUES (?, ?, ?, 1, 0, ?)
    ON CONFLICT(owner_id) DO UPDATE SET data_json = excluded.data_json, current_step = excluded.current_step,
      revision = onboarding_drafts.revision + 1, updated_at = excluded.updated_at
    WHERE onboarding_drafts.revision = ? AND onboarding_drafts.completed = 0
    RETURNING *
  `).get(req.user.id, JSON.stringify(storageData(draft)), draft.currentStep, nowIso(), expectedRevision);
  if (!row) throw new HttpError(409, 'Your saved draft changed in another session.', 'ONBOARDING_CONFLICT');
  return deserialize(row);
}

/** Complete and return the durable Supabase row. The RPC is idempotent. */
export async function completeSupabaseOnboarding(context, expectedRevision) {
  try { return await rpc(context, 'complete_salon_onboarding', { p_expected_revision: expectedRevision }); }
  catch (error) { throw translateSupabaseError(error); }
}
