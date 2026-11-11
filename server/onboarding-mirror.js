import {
  audit, db, findSalonByOwner, findSalonBySlug, getSettings, newId, nowIso,
} from './db.js';
import { HttpError, normalizeSlug, sanitizeText } from './security.js';
import { mapSalon } from './supabase-store.js';
import { onboardingValuesSchema } from '../src/lib/onboardingSchema.js';
import { completeSupabaseOnboarding, readOnboardingDraft } from './onboarding.js';

/**
 * Bridge only the completed onboarding record into the existing SQLite owner
 * APIs. Other operational data is not migrated by this bridge. Never copy
 * approval/publishing flags without their reviewed versions.
 */
export function createOnboardingMirror(req, values, { remoteSalon = null, remoteSubscription = null, localRevision = null } = {}) {
  const existing = findSalonByOwner(req.user.id);
  if (existing) return existing;
  const source = remoteSalon ? { ...values, ...mapSalon(remoteSalon) } : values;
  const parsed = onboardingValuesSchema.safeParse(source);
  if (!parsed.success) throw new HttpError(400, 'The saved salon details are incomplete.', 'ONBOARDING_INCOMPLETE');
  const v = parsed.data;
  const name = v.name.trim();
  const slug = normalizeSlug(v.slug);
  if (findSalonBySlug(slug)) throw new HttpError(409, 'That live website address is already taken. Please choose another one.', 'ONBOARDING_SLUG_TAKEN');
  const id = remoteSalon?.id || newId();
  const ts = nowIso();
  const settings = getSettings();
  const trialDays = Number(settings.trialDays) || 14;

  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare(`INSERT INTO salons (
      id, owner_id, name, slug, tagline, description, logo_url, cover_image,
      phone, email, address_line, city, state, hero_title, template_id,
      timings_json, owner_name, owner_phone, status, onboarding_completed, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', 1, ?, ?)`).run(
      id, req.user.id, name, slug, v.tagline.trim(), sanitizeText(v.description.trim(), 3000),
      v.logoUrl.trim(), v.coverImage.trim(), v.phone.trim(), v.email.trim(),
      v.addressLine.trim(), v.city.trim(), v.state.trim(), name, v.templateId,
      JSON.stringify(v.timings), v.ownerName.trim() || req.user.name || '', v.ownerPhone.trim() || v.phone.trim(),
      remoteSalon?.created_at || ts, ts
    );
    db.prepare(`INSERT INTO subscriptions (id, salon_id, plan, status, current_period_end, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
      remoteSubscription?.id || newId(), id, remoteSubscription?.plan || settings.defaultPlan || 'starter',
      remoteSubscription?.status || 'trialing',
      remoteSubscription?.current_period_end || new Date(Date.now() + trialDays * 86_400_000).toISOString(),
      remoteSubscription?.created_at || ts, ts
    );
    if (localRevision !== null) {
      const update = db.prepare('UPDATE onboarding_drafts SET completed = 1, revision = revision + 1, updated_at = ? WHERE owner_id = ? AND revision = ? AND completed = 0')
        .run(ts, req.user.id, localRevision);
      if (!update.changes) throw new HttpError(409, 'Your saved draft changed in another session.', 'ONBOARDING_CONFLICT');
    }
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
  audit(req, 'salon.onboarding_completed', 'salon', id);
  return findSalonByOwner(req.user.id);
}

/** Rehydrate a completed onboarding on a fresh legacy API instance, if needed. */
export async function restoreOnboardingMirror(req, context) {
  if (!context || req.user.role !== 'salon_owner') return null;
  const existing = findSalonByOwner(req.user.id);
  if (existing) return existing;
  const stored = await readOnboardingDraft(req, context);
  if (!stored?.completed) return null;
  const result = await completeSupabaseOnboarding(context, stored.revision);
  if (!result?.salon?.id) throw new HttpError(503, 'Your salon could not be restored. Please try again.');
  return createOnboardingMirror(req, stored.draft.values, {
    remoteSalon: result.salon, remoteSubscription: result.subscription,
  });
}
