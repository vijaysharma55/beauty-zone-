import crypto from 'node:crypto';
import './migrations.js';
import {
  db,
  nowIso,
  newId,
  serializeSalon,
  serializeService,
  serializeStaff,
  getServicesForSalon,
  getStaffForSalon,
  safeJson,
} from './db.js';
import { HttpError, ValidationError } from './security.js';

/**
 * Approval workflow helpers.
 *
 * The `salons` / `services` / `staff` tables hold the salon's *working copy*.
 * Every submission freezes a snapshot in `salon_versions`. The public website
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
export function buildSalonSnapshot(salonRow) {
  const salon = serializeSalon(salonRow);
  const services = getServicesForSalon(salonRow.id).map(serializeService);
  const staff = getStaffForSalon(salonRow.id).map(serializeStaff);

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
      description: service.description,
      pricePaise: service.pricePaise,
      durationMinutes: service.durationMinutes,
      active: service.active,
      sortOrder: service.sortOrder,
    })),
    staff: staff.map((member) => ({
      id: member.id,
      name: member.name,
      roleTitle: member.roleTitle,
      bio: member.bio,
      photoUrl: member.photoUrl,
      specialties: member.specialties,
      active: member.active,
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

/** Extra workflow fields attached to owner/admin salon payloads. */
export function workflowInfo(salonRow, userRow) {
  const pending = getPendingVersion(salonRow.id);
  const approved = getApprovedVersion(salonRow.id);
  const currentHash = hashSnapshot(buildSalonSnapshot(salonRow));
  const hasUnpublishedChanges = !!approved && approved.content_hash !== currentHash;
  const problems = reviewReadiness(salonRow, userRow);
  /**
   * A salon may be (re)published when it has an approved version and has not
   * been sent back for changes. While a newer version is pending review, the
   * previously approved version stays live, so `pending` is still publishable.
   */
  const publishableStatus = salonRow.status === 'approved' || salonRow.status === 'pending';
  const canPublish =
    publishableStatus &&
    !!approved &&
    !salonRow.suspended &&
    !!userRow?.email_verified &&
    salonRow.onboarding_completed;

  return {
    workflow: {
      status: salonRow.status,
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
      canSubmit: !pending && !salonRow.suspended && problems.length === 0,
      canPublish,
      blockers: problems,
    },
  };
}

/** Creates a pending submission from the salon's current working content. */
export function submitForApproval(salonRow, userId) {
  const existing = getPendingVersion(salonRow.id);
  if (existing) {
    throw new HttpError(409, 'This website is already awaiting review. You will be notified once it is reviewed.');
  }
  const snapshot = buildSalonSnapshot(salonRow);
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

/** Admin decision: approve, reject or request changes on the pending submission. */
export function reviewSubmission({ versionId, action, note, adminId }) {
  const version = db.prepare('SELECT * FROM salon_versions WHERE id = ?').get(versionId);
  if (!version) throw new HttpError(404, 'Submission not found');
  if (version.status !== 'pending') throw new HttpError(409, 'This submission has already been reviewed.');

  const salon = db.prepare('SELECT * FROM salons WHERE id = ?').get(version.salon_id);
  if (!salon) throw new HttpError(404, 'Salon not found');

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

/** Approved snapshot used to render the public website. */
/** True when the salon has an approved snapshot that may be served publicly. */
export function hasLiveApproval(salonRow) {
  if (!salonRow) return false;
  if (salonRow.suspended) return false;
  if (salonRow.status === 'rejected' || salonRow.status === 'changes_requested') return false;
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
