import crypto from 'node:crypto';
import './migrations.js';
import {
  db,
  nowIso,
  newId,
  serializeSalon,
  serializeService,
  getServicesForSalon,
  safeJson,
} from './db.js';
import { HttpError, ValidationError } from './security.js';
import { SUPER_ADMIN } from './roles.js';

/**
 * Approval workflow helpers.
 *
 * The salon profile and service catalogue are still sourced from SQLite;
 * operational staff rows are sourced from Supabase `public.staff` and passed
 * into snapshot builders by the route layer. Every submission freezes a
 * snapshot in `salon_versions`. The public website
 * always renders the latest **approved** snapshot, so unpublished edits and
 * rejected submissions can never leak to visitors.
 */

export const PUBLIC_SALON_FIELDS = [
  'id',
  'name',
  'slug',
  'tagline',
  'description',
  'logoUrl',
  'coverImage',
  'gallery',
  'phone',
  'email',
  'whatsapp',
  'addressLine',
  'city',
  'state',
  'postalCode',
  'country',
  'mapUrl',
  'instagram',
  'facebook',
  'heroTitle',
  'heroSubtitle',
  'theme',
  'templateId',
  'timings',
  'ownerName',
  'published',
  'publishedAt',
];

/** Builds the canonical snapshot of a salon's current working content. */
export function buildSalonSnapshot(salonRow, staffRows = []) {
  const salon = serializeSalon(salonRow);
  const services = getServicesForSalon(salonRow.id).map(serializeService);
  // Operational staff rows are provided by Supabase by the route layer.
  // This module must never fall back to the retired SQLite staff table.
  const staff = (Array.isArray(staffRows) ? staffRows : []).map((member) => ({
    id: member.id,
    name: member.name,
    roleTitle: member.roleTitle || '',
    bio: member.bio || '',
    photoUrl: member.photoUrl || '',
    specialties: Array.isArray(member.specialties) ? member.specialties : [],
    qualifications: Array.isArray(member.qualifications) ? member.qualifications : [],
    workPhotos: member.workPhotosConsent ? member.workPhotos || [] : [],
    workPhotosConsent: Boolean(member.workPhotosConsent),
    rating: member.rating ?? null,
    reviewCount: member.reviewCount ?? 0,
    experience: member.experience || '',
    active: Boolean(member.active),
    bookingEnabled: member.bookingEnabled !== false,
    sortOrder: member.sortOrder ?? 0,
  }));

  const salonContent = {
    name: salon.name,
    tagline: salon.tagline,
    description: salon.description,
    logoUrl: salon.logoUrl,
    coverImage: salon.coverImage,
    gallery: salon.gallery,
    phone: salon.phone,
    email: salon.email,
    whatsapp: salon.whatsapp,
    addressLine: salon.addressLine,
    city: salon.city,
    state: salon.state,
    postalCode: salon.postalCode,
    country: salon.country,
    mapUrl: salon.mapUrl,
    instagram: salon.instagram,
    facebook: salon.facebook,
    heroTitle: salon.heroTitle,
    heroSubtitle: salon.heroSubtitle,
    theme: salon.theme,
    templateId: salon.templateId,
    timings: salon.timings,
    ownerName: salon.ownerName,
    ownerPhone: salon.ownerPhone,
  };

  return {
    salon: salonContent,
    services: services.map((service) => ({
      id: service.id,
      name: service.name,
      category: service.category,
      categoryLabel: service.categoryLabel,
      subcategory: service.subcategory,
      subcategoryLabel: service.subcategoryLabel,
      description: service.description,
      notes: service.notes || '',
      imageUrl: service.imageUrl || '',
      pricePaise: service.pricePaise,
      durationMinutes: service.durationMinutes,
      active: service.active,
      sortOrder: service.sortOrder,
      advanceMode: service.advanceMode || 'inherit',
      advancePercent: service.advancePercent ?? null,
      advanceFixedPaise: service.advanceFixedPaise ?? null,
    })),
    staff: staff.map((member) => ({
      id: member.id,
      name: member.name,
      roleTitle: member.roleTitle,
      bio: member.bio,
      photoUrl: member.photoUrl,
      specialties: member.specialties,
      qualifications: member.qualifications || [],
      workPhotos: member.workPhotosConsent ? member.workPhotos || [] : [],
      workPhotosConsent: Boolean(member.workPhotosConsent),
      rating: member.rating ?? null,
      reviewCount: member.reviewCount ?? 0,
      experience: member.experience || '',
      active: member.active,
      bookingEnabled: member.bookingEnabled !== false,
      sortOrder: member.sortOrder,
    })),
  };
}

/** Stable hash of the content that affects the public website. */
export function hashSnapshot(snapshot) {
  const canonical = JSON.stringify({
    salon: snapshot.salon,
    services: snapshot.services.map((s) => ({ ...s })),
    staff: snapshot.staff.map((s) => ({ ...s })),
  });
  return crypto.createHash('sha256').update(canonical).digest('hex');
}

export const getPendingVersion = (salonId) =>
  db.prepare("SELECT * FROM salon_versions WHERE salon_id = ? AND status = 'pending'").get(salonId);

export const getApprovedVersion = (salonId) =>
  db
    .prepare("SELECT * FROM salon_versions WHERE salon_id = ? AND status = 'approved' ORDER BY version DESC LIMIT 1")
    .get(salonId);

export const listVersions = (salonId) =>
  db.prepare('SELECT * FROM salon_versions WHERE salon_id = ? ORDER BY version DESC').all(salonId);

export function serializeVersion(row) {
  if (!row) return null;
  return {
    id: row.id,
    salonId: row.salon_id,
    version: row.version,
    status: row.status,
    submittedAt: row.submitted_at,
    reviewedAt: row.reviewed_at,
    reviewNote: row.review_note || '',
    contentHash: row.content_hash,
  };
}

/** Approval readiness checks shared by "submit" and "publish". */
export function reviewReadiness(salonRow, userRow) {
  const problems = [];
  if (!userRow?.email_verified) {
    problems.push({ code: 'EMAIL_UNVERIFIED', message: 'Verify your email address before submitting for approval.' });
  }
  if (salonRow.suspended) {
    problems.push({
      code: 'SUSPENDED',
      message: `This salon is suspended by the platform: ${salonRow.suspended_reason || 'contact support.'}`,
    });
  }
  const missing = [];
  if (!salonRow.name) missing.push('salon name');
  if (!salonRow.address_line) missing.push('street address');
  if (!salonRow.city) missing.push('city');
  if (!salonRow.phone) missing.push('phone number');
  if (getServicesForSalon(salonRow.id, { onlyActive: true }).length === 0) missing.push('at least one active service');
  if (missing.length > 0) {
    problems.push({ code: 'INCOMPLETE', message: `Complete your profile first: add ${missing.join(', ')}.`, missing });
  }
  return problems;
}

/**
 * Public website state derived from the database, never from the caller.
 *
 *   draft / changes_requested / rejected → 'draft'
 *   pending review                       → 'pending_approval'
 *   approved AND published               → 'approved'
 *   approved but not published           → 'approved'
 *
 * Mirrors the CHECK constraint on public.salons in the accompanying Supabase
 * migration so the API and the database agree on what "live" means.
 */
export function publicState(salonRow) {
  const status = salonRow?.status || 'draft';
  const approved = status === 'approved';
  const pending = status === 'pending';
  const hasApprovedSnapshot = salonRow ? !!getApprovedVersion(salonRow.id) : false;
  return {
    reviewStatus: status,
    websiteStatus: approved ? 'approved' : pending ? 'pending_approval' : 'draft',
    // Live = published AND a super admin approved a snapshot AND not suspended.
    isLive: !!salonRow?.website_published && hasApprovedSnapshot && !salonRow?.suspended,
    published: !!salonRow?.website_published,
    canBePublished: approved && !salonRow?.suspended,
    awaitingReview: pending,
  };
}

/** Extra workflow fields attached to owner/admin salon payloads. */
export function workflowInfo(salonRow, userRow, staffRows = []) {
  const pending = getPendingVersion(salonRow.id);
  const approved = getApprovedVersion(salonRow.id);
  const currentHash = hashSnapshot(buildSalonSnapshot(salonRow, staffRows));
  const hasUnpublishedChanges = !!approved && approved.content_hash !== currentHash;
  const problems = reviewReadiness(salonRow, userRow);

  return {
    workflow: {
      status: salonRow.status,
      ...publicState(salonRow),
      suspended: !!salonRow.suspended,
      suspendedReason: salonRow.suspended_reason || '',
      reviewNote: salonRow.review_note || '',
      submittedAt: salonRow.submitted_at,
      approvedAt: salonRow.approved_at,
      reviewedAt: salonRow.reviewed_at,
      emailVerified: !!(userRow?.email_verified ?? true),
      pendingVersion: serializeVersion(pending),
      approvedVersion: serializeVersion(approved),
      hasUnpublishedChanges,
      // The only state-changing action a salon owner owns.
      canSubmit: !pending && !salonRow.suspended && problems.length === 0,
      // Always false for the owner surface. Publishing is done by a super admin
      // through POST /api/admin/salons/:salonId/publish. The field is kept so
      // existing clients read an explicit "false" instead of `undefined`.
      canPublish: false,
      blockers: problems,
    },
  };
}

/**
 * Creates a pending submission from the salon's current working content.
 *
 * This is the ONLY state transition a salon owner may trigger: Draft (or
 * changes requested / rejected) → Pending Approval. It never sets
 * `website_published`, never sets `status = 'approved'` and never writes an
 * approved version. Those require reviewSubmission() by a super admin below.
 */
export function submitForApproval(salonRow, userId, staffRows = []) {
  const existing = getPendingVersion(salonRow.id);
  if (existing) {
    throw new HttpError(409, 'This website is already awaiting review. You will be notified once it is reviewed.');
  }
  if (salonRow.suspended) {
    throw new HttpError(403, `This salon is suspended by the platform: ${salonRow.suspended_reason || 'contact support.'}`);
  }
  // Defence in depth: an approved salon is already publishable. Resubmitting the
  // identical content must not reset its status to pending.
  const snapshot = buildSalonSnapshot(salonRow, staffRows);
  const hash = hashSnapshot(snapshot);
  const approved = getApprovedVersion(salonRow.id);
  if (approved && approved.content_hash === hash && salonRow.status === 'approved') {
    throw new ValidationError('Nothing has changed since your last approved version.');
  }

  const lastVersion = db
    .prepare('SELECT COALESCE(MAX(version), 0) AS v FROM salon_versions WHERE salon_id = ?')
    .get(salonRow.id).v;
  const id = newId();
  const ts = nowIso();

  db.prepare(
    `INSERT INTO salon_versions
       (id, salon_id, version, status, snapshot_json, content_hash, submitted_at, submitted_by, created_at)
     VALUES (?, ?, ?, 'pending', ?, ?, ?, ?, ?)`
  ).run(id, salonRow.id, lastVersion + 1, JSON.stringify(snapshot), hash, ts, userId, ts);

  db.prepare(
    "UPDATE salons SET status = 'pending', submitted_at = ?, review_note = '', reviewed_at = NULL, updated_at = ? WHERE id = ?"
  ).run(ts, ts, salonRow.id);

  return db.prepare('SELECT * FROM salon_versions WHERE id = ?').get(id);
}

function versionContent(versionRow) {
  const snapshot = safeJson(versionRow.snapshot_json, null);
  if (!snapshot) throw new HttpError(500, 'Stored submission could not be read.');
  return snapshot;
}

/**
 * Super-admin decision: approve, reject or request changes on a submission.
 *
 * `reviewer` must be the server-resolved session user. The role check is
 * repeated here (not only in the route guard) so no future caller can approve a
 * salon on behalf of an owner, an operational admin, or an anonymous request.
 * An owner can never review their own salon, even if their role were elevated
 * by mistake: the ownership check below is independent of the role check.
 */
export function reviewSubmission({ versionId, action, note, adminId, reviewer }) {
  if (!reviewer || reviewer.role !== SUPER_ADMIN) {
    throw new HttpError(403, 'Only a platform super admin can review or approve a salon website.');
  }
  if (adminId && adminId !== reviewer.id) {
    throw new HttpError(403, 'The reviewer must be the authenticated super admin.');
  }
  const version = db.prepare('SELECT * FROM salon_versions WHERE id = ?').get(versionId);
  if (!version) throw new HttpError(404, 'Submission not found');
  if (version.status !== 'pending') throw new HttpError(409, 'This submission has already been reviewed.');

  const salon = db.prepare('SELECT * FROM salons WHERE id = ?').get(version.salon_id);
  if (!salon) throw new HttpError(404, 'Salon not found');
  if (salon.owner_id && salon.owner_id === reviewer.id) {
    throw new HttpError(403, 'A salon owner cannot review or approve their own website.');
  }

  const trimmedNote = typeof note === 'string' ? note.trim().slice(0, 1000) : '';
  if ((action === 'reject' || action === 'request_changes') && !trimmedNote) {
    throw new ValidationError(
      action === 'reject' ? 'Please provide a reason for rejecting this website.' : 'Please describe the changes required.'
    );
  }

  const ts = nowIso();

  if (action === 'approve') {
    db.prepare(
      "UPDATE salon_versions SET status = 'superseded' WHERE salon_id = ? AND status = 'approved'"
    ).run(salon.id);
    db.prepare(
      `UPDATE salon_versions SET status = 'approved', reviewed_at = ?, reviewed_by = ?, review_note = ?
       WHERE id = ?`
    ).run(ts, adminId, trimmedNote, version.id);
    // Approval grants *permission* to publish; it never publishes by itself.
    // `website_published` is written only by publishSalon() below, which is
    // reachable exclusively from the super-admin route.
    db.prepare(
      `UPDATE salons SET status = 'approved', approved_at = ?, reviewed_at = ?, review_note = ?,
        submitted_at = COALESCE(submitted_at, ?), updated_at = ? WHERE id = ?`
    ).run(ts, ts, trimmedNote, version.submitted_at, ts, salon.id);
  } else {
    const status = action === 'reject' ? 'rejected' : 'changes_requested';
    db.prepare(
      `UPDATE salon_versions SET status = ?, reviewed_at = ?, reviewed_by = ?, review_note = ? WHERE id = ?`
    ).run(status, ts, adminId, trimmedNote, version.id);
    // A rejected or change-requested website must not stay live.
    db.prepare(
      `UPDATE salons SET status = ?, reviewed_at = ?, review_note = ?, website_published = 0, updated_at = ?
       WHERE id = ?`
    ).run(status, ts, trimmedNote, ts, salon.id);
  }

  return {
    version: db.prepare('SELECT * FROM salon_versions WHERE id = ?').get(version.id),
    salon: db.prepare('SELECT * FROM salons WHERE id = ?').get(salon.id),
  };
}

/**
 * Super-admin-only transition: Approved → Published.
 *
 * This is the single place in the codebase that writes `website_published = 1`.
 * It re-verifies the reviewer role and the approval state so a missing route
 * guard cannot publish an unapproved website.
 *
 * @param {{ salonId: string, reviewer: { id: string, role: string } }} args
 */
export function publishSalon({ salonId, reviewer }) {
  if (!reviewer || reviewer.role !== SUPER_ADMIN) {
    throw new HttpError(403, 'Only a platform super admin can publish a salon website.');
  }
  const salon = db.prepare('SELECT * FROM salons WHERE id = ?').get(salonId);
  if (!salon) throw new HttpError(404, 'Salon not found');
  if (salon.owner_id === reviewer.id) {
    throw new HttpError(403, 'A salon owner cannot publish their own website.');
  }
  if (salon.suspended) {
    throw new ValidationError('Unsuspend this salon before publishing its website.');
  }
  if (salon.status !== 'approved') {
    throw new ValidationError('Approve a submitted version before publishing this website.');
  }
  if (!getApprovedVersion(salon.id)) {
    throw new ValidationError('Approve a submitted version before publishing this website.');
  }
  const ts = nowIso();
  db.prepare(
    'UPDATE salons SET website_published = 1, published_at = COALESCE(published_at, ?), updated_at = ? WHERE id = ?'
  ).run(ts, ts, salon.id);
  return db.prepare('SELECT * FROM salons WHERE id = ?').get(salon.id);
}

/**
 * Super-admin-only transition: Published → offline. The approved snapshot is
 * preserved so re-publishing restores the same content.
 *
 * @param {{ salonId: string, reviewer: { id: string, role: string } }} args
 */
export function unpublishSalon({ salonId, reviewer }) {
  if (!reviewer || reviewer.role !== SUPER_ADMIN) {
    throw new HttpError(403, 'Only a platform super admin can unpublish a salon website.');
  }
  const salon = db.prepare('SELECT * FROM salons WHERE id = ?').get(salonId);
  if (!salon) throw new HttpError(404, 'Salon not found');
  const ts = nowIso();
  db.prepare('UPDATE salons SET website_published = 0, updated_at = ? WHERE id = ?').run(ts, salon.id);
  return db.prepare('SELECT * FROM salons WHERE id = ?').get(salon.id);
}

/**
 * First-run / upgrade backfill: salons that were already live before the
 * approval workflow existed get an approved version of their current content so
 * they keep serving traffic. Runs once per salon (idempotent).
 */
export function backfillApprovedVersions() {
  const rows = db.prepare('SELECT * FROM salons').all();
  let created = 0;
  for (const salon of rows) {
    const existing = db.prepare('SELECT 1 FROM salon_versions WHERE salon_id = ? LIMIT 1').get(salon.id);
    if (existing) continue;
    if (!salon.website_published) continue;
    const snapshot = buildSalonSnapshot(salon);
    const ts = salon.published_at || nowIso();
    db.prepare(
      `INSERT INTO salon_versions
         (id, salon_id, version, status, snapshot_json, content_hash, submitted_at, submitted_by,
          reviewed_at, review_note, created_at)
       VALUES (?, ?, 1, 'approved', ?, ?, ?, NULL, ?, 'Imported from a previously published website.', ?)`
    ).run(newId(), salon.id, JSON.stringify(snapshot), hashSnapshot(snapshot), ts, ts, ts);
    db.prepare("UPDATE salons SET status = 'approved', approved_at = COALESCE(approved_at, ?) WHERE id = ?").run(
      ts,
      salon.id
    );
    created += 1;
  }
  return created;
}

/**
 * True when the salon may be served publicly.
 *
 * Requires ALL of:
 *   1. not suspended,
 *   2. review status 'approved' or 'pending' — a pending *update* is allowed to
 *      keep the previously approved snapshot live, but a rejected or
 *      change-requested salon is taken offline,
 *   3. an approved snapshot written by a super admin.
 *
 * The unreviewed *working copy* is never rendered: `getLiveContent()` serves the
 * approved snapshot only, so owner edits cannot leak while they wait for review.
 */
export function hasLiveApproval(salonRow) {
  if (!salonRow) return false;
  if (salonRow.suspended) return false;
  if (salonRow.status !== 'approved' && salonRow.status !== 'pending') return false;
  return !!getApprovedVersion(salonRow.id);
}

export function getLiveContent(salonRow) {
  const approved = getApprovedVersion(salonRow.id);
  if (!approved) return null;
  const snapshot = versionContent(approved);
  return {
    ...snapshot,
    version: serializeVersion(approved),
  };
}
