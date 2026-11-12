import {
  audit, db, findSalonByOwner, findSalonBySlug, getSettings, newId, nowIso,
} from './db.js';
import { HttpError, normalizeSlug, sanitizeText } from './security.js';
import { getSalonForOwner, mapSalon, rest } from './supabase-store.js';
import { onboardingValuesSchema } from '../src/lib/onboardingSchema.js';
import { completeSupabaseOnboarding, readOnboardingDraft } from './onboarding.js';

/**
 * Bridge a completed onboarding or a verified legacy salon into SQLite.
 * Only the legacy path bypasses the new wizard schema; its existing profile
 * data is preserved, but approval and publication are never recreated without
 * their reviewed versions. Other operational data is not migrated.
 */
export function createOnboardingMirror(req, values, { remoteSalon = null, remoteSubscription = null, localRevision = null, legacy = false } = {}) {
  const existing = findSalonByOwner(req.user.id);
  if (existing) return existing;
  if (legacy && !remoteSalon) throw new HttpError(503, 'Your salon could not be restored. Please try again.');
  const mapped = remoteSalon ? mapSalon(remoteSalon) : null;
  const source = mapped ? { ...values, ...mapped } : values;
  const parsed = legacy ? null : onboardingValuesSchema.safeParse(source);
  if (parsed && !parsed.success) throw new HttpError(400, 'The saved salon details are incomplete.', 'ONBOARDING_INCOMPLETE');
  const v = legacy ? source : parsed.data;
  /** Coerce absent legacy text columns without inventing mandatory details. */
  const text = (value) => typeof value === 'string' ? value.trim() : '';
  const name = text(v.name);
  // A previous flow accepted reserved handles; restoring must not rename them.
  const slug = legacy ? text(v.slug) : normalizeSlug(v.slug);
  if (!slug) throw new HttpError(503, 'Your salon address could not be restored. Please contact support.');
  if (findSalonBySlug(slug)) throw new HttpError(409, 'That live website address is already taken. Please choose another one.', 'ONBOARDING_SLUG_TAKEN');
  const id = remoteSalon?.id || newId();
  const ts = nowIso();
  const settings = getSettings();
  const trialDays = Number(settings.trialDays) || 14;

  const fields = {
    id, owner_id: req.user.id, name, slug,
    tagline: text(v.tagline), description: sanitizeText(text(v.description), legacy ? 4000 : 3000),
    logo_url: text(v.logoUrl), cover_image: text(v.coverImage),
    gallery_json: JSON.stringify(mapped?.gallery || []),
    phone: text(v.phone), email: text(v.email), whatsapp: text(mapped?.whatsapp),
    address_line: text(v.addressLine), city: text(v.city), state: text(v.state),
    postal_code: text(mapped?.postalCode), country: text(mapped?.country) || 'India',
    map_url: text(mapped?.mapUrl), instagram: text(mapped?.instagram), facebook: text(mapped?.facebook),
    hero_title: text(mapped?.heroTitle) || name, hero_subtitle: text(mapped?.heroSubtitle),
    theme_json: JSON.stringify(mapped?.theme || {}), template_id: text(v.templateId) || 'luxe',
    timings_json: JSON.stringify(Array.isArray(v.timings) ? v.timings : []),
    owner_name: text(v.ownerName) || req.user.name || '', owner_phone: text(v.ownerPhone) || text(v.phone),
    status: 'draft', onboarding_completed: 1,
    suspended: mapped?.suspended ? 1 : 0,
    suspended_reason: text(mapped?.suspendedReason), suspended_at: mapped?.suspendedAt || null,
    created_at: remoteSalon?.created_at || ts, updated_at: ts,
  };

  db.exec('BEGIN IMMEDIATE');
  try {
    const columns = Object.keys(fields);
    db.prepare(`INSERT INTO salons (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`)
      .run(...columns.map((column) => fields[column]));
    // A missing remote subscription must not silently grant a new trial.
    if (!remoteSalon || remoteSubscription) {
      db.prepare(`INSERT INTO subscriptions (id, salon_id, plan, status, current_period_end, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
        remoteSubscription?.id || newId(), id, remoteSubscription?.plan || settings.defaultPlan || 'starter',
        remoteSubscription?.status || 'trialing',
        remoteSubscription ? (remoteSubscription.current_period_end ?? null) : new Date(Date.now() + trialDays * 86_400_000).toISOString(),
        remoteSubscription?.created_at || ts, ts
      );
    }
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
  audit(req, legacy ? 'salon.onboarding_restored' : 'salon.onboarding_completed', 'salon', id);
  return findSalonByOwner(req.user.id);
}

/** Restore a completed draft first, or an owner-scoped salon from the old flow. */
export async function restoreOnboardingMirror(req, context) {
  if (!context || req.user.role !== 'salon_owner') return null;
  const existing = findSalonByOwner(req.user.id);
  if (existing) return existing;
  const stored = await readOnboardingDraft(req, context);
  if (stored?.completed) {
    const result = await completeSupabaseOnboarding(context, stored.revision);
    if (!result?.salon?.id) throw new HttpError(503, 'Your salon could not be restored. Please try again.');
    return createOnboardingMirror(req, stored.draft.values, {
      remoteSalon: result.salon, remoteSubscription: result.subscription,
    });
  }

  // The old Supabase onboarding RPC created a salon without a draft. Read only
  // the verified owner's row under their bearer/RLS, never an arbitrary salon.
  const salon = await getSalonForOwner(context);
  if (!salon) return null;
  if (!salon.id || salon.owner_id !== context.id) throw new HttpError(503, 'Your salon could not be restored. Please try again.');
  const subscriptions = await rest(context, 'subscriptions',
    `salon_id=eq.${encodeURIComponent(salon.id)}&select=*&limit=1`);
  const subscription = subscriptions?.[0] || null;
  if (subscription && subscription.salon_id !== salon.id) throw new HttpError(503, 'Your subscription could not be restored. Please try again.');
  return createOnboardingMirror(req, {}, { remoteSalon: salon, remoteSubscription: subscription, legacy: true });
}
