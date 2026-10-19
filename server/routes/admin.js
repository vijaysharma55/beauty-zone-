import { Router } from 'express';
import {
  db,
  newId,
  nowIso,
  publicUser,
  serializeSalon,
  serializeService,
  serializeStaff,
  serializeSubscription,
  getServicesForSalon,
  getStaffForSalon,
  getSettings,
  saveSettings,
  audit,
} from '../db.js';
import {
  str,
  int,
  bool,
  EMAIL_RE,
  ValidationError,
  HttpError,
  normalizeSlug,
  hashPassword,
  isSafeImageUrl,
  sanitizeText,
} from '../security.js';
import { requireAuth, requireRole, asyncHandler } from '../middleware.js';
import {
  workflowInfo,
  reviewSubmission,
  serializeVersion,
  getPendingVersion,
  getApprovedVersion,
  hashSnapshot,
  buildSalonSnapshot,
} from '../workflow.js';
import { sendMail, reviewNotificationEmail } from '../mailer.js';

export const adminRouter = Router();

// Hard role gate for the entire admin surface.
adminRouter.use(requireAuth, requireRole('super_admin'));

const PLANS = new Set(['trial', 'starter', 'pro', 'elite']);
const SUB_STATUS = new Set(['trialing', 'active', 'past_due', 'canceled']);

/* ------------------------------------------------------------------ */
/* Overview                                                            */
/* ------------------------------------------------------------------ */

adminRouter.get('/overview', (req, res) => {
  const count = (sql, ...params) => db.prepare(sql).get(...params).n;
  res.json({
    stats: {
      owners: count("SELECT COUNT(*) AS n FROM users WHERE role = 'salon_owner'"),
      admins: count("SELECT COUNT(*) AS n FROM users WHERE role = 'super_admin'"),
      salons: count('SELECT COUNT(*) AS n FROM salons'),
      published: count('SELECT COUNT(*) AS n FROM salons WHERE website_published = 1'),
      services: count('SELECT COUNT(*) AS n FROM services'),
      activeSubscriptions: count("SELECT COUNT(*) AS n FROM subscriptions WHERE status IN ('active','trialing')"),
      pendingApprovals: count("SELECT COUNT(*) AS n FROM salon_versions WHERE status = 'pending'"),
      suspended: count('SELECT COUNT(*) AS n FROM salons WHERE suspended = 1'),
      mrrPaise: db
        .prepare(
          `SELECT COALESCE(SUM(CASE plan WHEN 'starter' THEN 149900 WHEN 'pro' THEN 299900 WHEN 'elite' THEN 599900 ELSE 0 END), 0) AS n
           FROM subscriptions WHERE status = 'active'`
        )
        .get().n,
    },
    recentSalons: db
      .prepare(
        `SELECT s.id, s.name, s.slug, s.website_published, s.created_at, u.email AS owner_email
         FROM salons s JOIN users u ON u.id = s.owner_id ORDER BY s.created_at DESC LIMIT 5`
      )
      .all(),
  });
});

/* ------------------------------------------------------------------ */
/* Users                                                               */
/* ------------------------------------------------------------------ */

adminRouter.get('/users', (req, res) => {
  const q = str(req.query.q, { max: 100, field: 'Search' });
  const role = str(req.query.role, { max: 20, field: 'Role' });
  const clauses = [];
  const params = [];
  if (q) {
    clauses.push('(u.email LIKE ? OR u.name LIKE ?)');
    params.push(`%${q}%`, `%${q}%`);
  }
  if (role && ['super_admin', 'salon_owner'].includes(role)) {
    clauses.push('u.role = ?');
    params.push(role);
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const rows = db
    .prepare(
      `SELECT u.*, s.id AS salon_id, s.name AS salon_name, s.slug AS salon_slug, s.website_published, s.status AS salon_status, s.suspended,
              sub.plan AS plan, sub.status AS sub_status
       FROM users u
       LEFT JOIN salons s ON s.owner_id = u.id
       LEFT JOIN subscriptions sub ON sub.salon_id = s.id
       ${where}
       ORDER BY u.created_at DESC
       LIMIT 500`
    )
    .all(...params);
  res.json({
    users: rows.map((row) => ({
      ...publicUser(row),
      salon: row.salon_id
        ? {
            id: row.salon_id,
            name: row.salon_name,
            slug: row.salon_slug,
            published: !!row.website_published,
            status: row.salon_status,
            suspended: !!row.suspended,
          }
        : null,
      subscription: row.plan ? { plan: row.plan, status: row.sub_status } : null,
    })),
  });
});

adminRouter.post(
  '/users',
  asyncHandler(async (req, res) => {
    const name = str(req.body?.name, { min: 2, max: 120, field: 'Name', required: true });
    const email = str(req.body?.email, { max: 254, field: 'Email', required: true }).toLowerCase();
    if (!EMAIL_RE.test(email)) throw new ValidationError('Please enter a valid email address');
    const role = req.body?.role === 'super_admin' ? 'super_admin' : 'salon_owner';
    const password = req.body?.password;
    if (typeof password !== 'string' || password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      throw new ValidationError('Password must be at least 8 characters and include a letter and a number');
    }
    if (db.prepare('SELECT 1 FROM users WHERE email = ? COLLATE NOCASE').get(email)) {
      throw new HttpError(409, 'A user with this email already exists.');
    }
    const id = newId();
    const ts = nowIso();
    db.prepare(
      `INSERT INTO users (id, email, password_hash, auth_provider, name, role, status, created_at, updated_at)
       VALUES (?, ?, ?, 'password', ?, ?, 'active', ?, ?)`
    ).run(id, email, await hashPassword(password), name, role, ts, ts);
    audit(req, 'admin.user_created', 'user', id, { role });
    res.status(201).json({ user: publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(id)) });
  })
);

adminRouter.patch('/users/:userId', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const updates = {};
  if (req.body?.name !== undefined) {
    updates.name = str(req.body.name, { min: 2, max: 120, field: 'Name', required: true });
  }
  if (req.body?.status !== undefined) {
    const status = String(req.body.status);
    if (!['active', 'disabled'].includes(status)) throw new ValidationError('Invalid status');
    if (user.id === req.user.id && status === 'disabled') {
      throw new ValidationError('You cannot disable your own super admin account.');
    }
    updates.status = status;
  }
  if (req.body?.role !== undefined) {
    const role = String(req.body.role);
    if (!['super_admin', 'salon_owner'].includes(role)) throw new ValidationError('Invalid role');
    if (user.id === req.user.id && role !== 'super_admin') {
      throw new ValidationError('You cannot remove your own super admin role.');
    }
    updates.role = role;
  }
  if (Object.keys(updates).length === 0) return res.json({ user: publicUser(user) });
  updates.updated_at = nowIso();
  const cols = Object.keys(updates);
  db.prepare(`UPDATE users SET ${cols.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`).run(
    ...cols.map((c) => updates[c]),
    user.id
  );
  if (updates.status === 'disabled') {
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(user.id);
  }
  audit(req, 'admin.user_updated', 'user', user.id, { fields: cols });
  res.json({ user: publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(user.id)) });
});

adminRouter.post(
  '/users/:userId/reset-password',
  asyncHandler(async (req, res) => {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const password = req.body?.password;
    if (typeof password !== 'string' || password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      throw new ValidationError('Password must be at least 8 characters and include a letter and a number');
    }
    db.prepare('UPDATE users SET password_hash = ?, failed_logins = 0, locked_until = NULL, updated_at = ? WHERE id = ?').run(
      await hashPassword(password),
      nowIso(),
      user.id
    );
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(user.id);
    audit(req, 'admin.password_reset', 'user', user.id);
    res.json({ ok: true });
  })
);

/* ------------------------------------------------------------------ */
/* Salons                                                              */
/* ------------------------------------------------------------------ */

adminRouter.get('/salons', (req, res) => {
  const rows = db
    .prepare(
      `SELECT s.*, u.name AS owner_name, u.email AS owner_email, u.status AS owner_status,
              sub.plan AS sub_plan, sub.status AS sub_status, sub.current_period_end AS sub_period_end,
              (SELECT COUNT(*) FROM services sv WHERE sv.salon_id = s.id) AS service_count
       FROM salons s
       JOIN users u ON u.id = s.owner_id
       LEFT JOIN subscriptions sub ON sub.salon_id = s.id
       ORDER BY s.created_at DESC`
    )
    .all();
  res.json({
    salons: rows.map((row) => ({
      ...serializeSalon(row, { includeOwner: true }),
      serviceCount: row.service_count,
    })),
  });
});

adminRouter.get('/salons/:salonId', (req, res) => {
  const row = db
    .prepare(
      `SELECT s.*, u.name AS owner_name, u.email AS owner_email, u.status AS owner_status,
              sub.plan AS sub_plan, sub.status AS sub_status, sub.current_period_end AS sub_period_end
       FROM salons s
       JOIN users u ON u.id = s.owner_id
       LEFT JOIN subscriptions sub ON sub.salon_id = s.id
       WHERE s.id = ?`
    )
    .get(req.params.salonId);
  if (!row) return res.status(404).json({ error: 'Salon not found' });
  const owner = db.prepare('SELECT * FROM users WHERE id = ?').get(row.owner_id);
  res.json({
    salon: serializeSalon(row, { includeOwner: true }),
    workflow: workflowInfo(row, owner).workflow,
    services: getServicesForSalon(row.id).map(serializeService),
    staff: getStaffForSalon(row.id).map(serializeStaff),
    subscription: serializeSubscription(
      db.prepare('SELECT * FROM subscriptions WHERE salon_id = ?').get(row.id)
    ),
  });
});

adminRouter.patch('/salons/:salonId', (req, res) => {
  const salon = db.prepare('SELECT * FROM salons WHERE id = ?').get(req.params.salonId);
  if (!salon) return res.status(404).json({ error: 'Salon not found' });
  const updates = {};
  if (req.body?.published !== undefined) {
    const publish = bool(req.body.published);
    if (publish) {
      if (salon.suspended) {
        throw new ValidationError('Unsuspend this salon before publishing its website.');
      }
      const publishable = salon.status === 'approved' || salon.status === 'pending';
      if (!getApprovedVersion(salon.id) || !publishable) {
        throw new ValidationError('Approve a submitted version before publishing this website.');
      }
    }
    updates.website_published = publish ? 1 : 0;
    if (publish) updates.published_at = salon.published_at || nowIso();
  }
  if (req.body?.suspended !== undefined) {
    const suspend = bool(req.body.suspended);
    updates.suspended = suspend ? 1 : 0;
    if (suspend) {
      updates.suspended_at = nowIso();
      updates.suspended_reason =
        str(req.body.suspendReason, { max: 500, field: 'Suspension reason' }) ||
        salon.suspended_reason ||
        'Suspended by platform administration.';
      updates.website_published = 0;
    } else {
      updates.suspended_reason = '';
      updates.suspended_at = null;
    }
  }
  if (req.body?.name !== undefined) {
    updates.name = str(req.body.name, { min: 2, max: 120, field: 'Salon name', required: true });
  }
  if (req.body?.tagline !== undefined) updates.tagline = str(req.body.tagline, { max: 160, field: 'Tagline' });
  if (req.body?.description !== undefined) updates.description = sanitizeText(str(req.body.description, { max: 3000 }), 3000);
  if (req.body?.city !== undefined) updates.city = str(req.body.city, { max: 100, field: 'City' });
  if (req.body?.addressLine !== undefined) updates.address_line = str(req.body.addressLine, { max: 300, field: 'Address' });
  if (req.body?.phone !== undefined) updates.phone = str(req.body.phone, { max: 40, field: 'Phone' });
  if (req.body?.email !== undefined) {
    const email = str(req.body.email, { max: 254, field: 'Email' });
    if (email && !EMAIL_RE.test(email)) throw new ValidationError('Contact email must be a valid email address');
    updates.email = email;
  }
  if (req.body?.slug !== undefined) {
    const slug = normalizeSlug(req.body.slug);
    const existing = db.prepare('SELECT id FROM salons WHERE slug = ? COLLATE NOCASE').get(slug);
    if (existing && existing.id !== salon.id) throw new HttpError(409, 'That slug is already taken.');
    updates.slug = slug;
  }
  if (req.body?.logoUrl !== undefined) {
    const logo = str(req.body.logoUrl, { max: 2_000_000, field: 'Logo' });
    if (logo && !isSafeImageUrl(logo)) throw new ValidationError('Logo must be a valid image URL');
    updates.logo_url = logo;
  }
  if (Object.keys(updates).length === 0) return res.json({ salon: serializeSalon(salon) });
  updates.updated_at = nowIso();
  const cols = Object.keys(updates);
  db.prepare(`UPDATE salons SET ${cols.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`).run(
    ...cols.map((c) => updates[c]),
    salon.id
  );
  audit(req, 'admin.salon_updated', 'salon', salon.id, { fields: cols });
  res.json({ salon: serializeSalon(db.prepare('SELECT * FROM salons WHERE id = ?').get(salon.id)) });
});

/* ------------------------------------------------------------------ */
/* Subscriptions                                                       */
/* ------------------------------------------------------------------ */

adminRouter.get('/subscriptions', (req, res) => {
  const rows = db
    .prepare(
      `SELECT sub.*, s.name AS salon_name, s.slug AS salon_slug, u.email AS owner_email
       FROM subscriptions sub
       JOIN salons s ON s.id = sub.salon_id
       JOIN users u ON u.id = s.owner_id
       ORDER BY sub.updated_at DESC`
    )
    .all();
  res.json({
    subscriptions: rows.map((row) => ({
      ...serializeSubscription(row),
      salonName: row.salon_name,
      salonSlug: row.salon_slug,
      ownerEmail: row.owner_email,
    })),
  });
});

adminRouter.patch('/subscriptions/:subscriptionId', (req, res) => {
  const sub = db.prepare('SELECT * FROM subscriptions WHERE id = ?').get(req.params.subscriptionId);
  if (!sub) return res.status(404).json({ error: 'Subscription not found' });
  const updates = {};
  if (req.body?.plan !== undefined) {
    const plan = String(req.body.plan);
    if (!PLANS.has(plan)) throw new ValidationError('Invalid plan');
    updates.plan = plan;
  }
  if (req.body?.status !== undefined) {
    const status = String(req.body.status);
    if (!SUB_STATUS.has(status)) throw new ValidationError('Invalid subscription status');
    updates.status = status;
  }
  if (req.body?.currentPeriodEnd !== undefined) {
    if (req.body.currentPeriodEnd === null) updates.current_period_end = null;
    else {
      const d = new Date(req.body.currentPeriodEnd);
      if (Number.isNaN(d.getTime())) throw new ValidationError('Invalid billing date');
      updates.current_period_end = d.toISOString();
    }
  }
  if (req.body?.extendDays !== undefined && req.body.extendDays !== null) {
    const days = int(req.body.extendDays, { min: 1, max: 3650, field: 'Days' });
    const base = sub.current_period_end ? new Date(sub.current_period_end) : new Date();
    if (Number.isNaN(base.getTime())) base.setTime(Date.now());
    updates.current_period_end = new Date(base.getTime() + days * 86_400_000).toISOString();
  }
  if (Object.keys(updates).length === 0) return res.json({ subscription: serializeSubscription(sub) });
  updates.updated_at = nowIso();
  const cols = Object.keys(updates);
  db.prepare(`UPDATE subscriptions SET ${cols.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`).run(
    ...cols.map((c) => updates[c]),
    sub.id
  );
  audit(req, 'admin.subscription_updated', 'subscription', sub.id, { fields: cols });
  res.json({
    subscription: serializeSubscription(db.prepare('SELECT * FROM subscriptions WHERE id = ?').get(sub.id)),
  });
});

/* ------------------------------------------------------------------ */
/* Website approvals                                                   */
/* ------------------------------------------------------------------ */

adminRouter.get('/approvals', (req, res) => {
  const status = str(req.query.status, { max: 30, field: 'Status' }) || 'pending';
  const allowed = ['pending', 'approved', 'rejected', 'changes_requested', 'superseded', 'all'];
  if (!allowed.includes(status)) throw new ValidationError('Invalid approval status filter');

  const where = status === 'all' ? '' : 'WHERE v.status = ?';
  const params = status === 'all' ? [] : [status];
  const rows = db
    .prepare(
      `SELECT v.*, s.name AS salon_name, s.slug AS salon_slug, s.city AS salon_city,
              s.website_published, s.suspended, s.status AS salon_status,
              u.name AS owner_name, u.email AS owner_email, u.email_verified
       FROM salon_versions v
       JOIN salons s ON s.id = v.salon_id
       JOIN users u ON u.id = s.owner_id
       ${where}
       ORDER BY v.submitted_at DESC
       LIMIT 200`
    )
    .all(...params);

  const pendingCount = db
    .prepare("SELECT COUNT(*) AS n FROM salon_versions WHERE status = 'pending'")
    .get().n;

  res.json({
    pendingCount,
    approvals: rows.map((row) => ({
      ...serializeVersion(row),
      salon: {
        id: row.salon_id,
        name: row.salon_name,
        slug: row.salon_slug,
        city: row.salon_city,
        published: !!row.website_published,
        suspended: !!row.suspended,
        status: row.salon_status,
      },
      owner: {
        name: row.owner_name,
        email: row.owner_email,
        emailVerified: !!row.email_verified,
      },
    })),
  });
});

adminRouter.get('/approvals/:versionId', (req, res) => {
  const version = db.prepare('SELECT * FROM salon_versions WHERE id = ?').get(req.params.versionId);
  if (!version) return res.status(404).json({ error: 'Submission not found' });
  const salon = db.prepare('SELECT * FROM salons WHERE id = ?').get(version.salon_id);
  const owner = db.prepare('SELECT * FROM users WHERE id = ?').get(salon.owner_id);
  let snapshot = null;
  try {
    snapshot = JSON.parse(version.snapshot_json);
  } catch {
    snapshot = null;
  }
  res.json({
    version: serializeVersion(version),
    snapshot,
    salon: serializeSalon(salon, { includeOwner: true }),
    workflow: workflowInfo(salon, owner).workflow,
    isLiveVersion: getApprovedVersion(salon.id)?.id === version.id,
  });
});

adminRouter.post(
  '/approvals/:versionId/review',
  asyncHandler(async (req, res) => {
    const action = String(req.body?.action || '');
    if (!['approve', 'reject', 'request_changes'].includes(action)) {
      throw new ValidationError('Choose approve, reject or request changes.');
    }
    const note = str(req.body?.note, { max: 1000, field: 'Reviewer note' });

    const result = reviewSubmission({
      versionId: req.params.versionId,
      action,
      note,
      adminId: req.user.id,
    });
    audit(req, `admin.submission_${action}`, 'salon', result.salon.id, {
      version: result.version.version,
      note: note || null,
    });

    const owner = db.prepare('SELECT * FROM users WHERE id = ?').get(result.salon.owner_id);
    if (owner) {
      const base = (process.env.APP_URL || `${req.protocol}://${req.get('host')}`).replace(/\/+$/, '');
      const dashboardUrl = `${base}/dashboard`;
      const mail = reviewNotificationEmail({
        ownerName: owner.name,
        salonName: result.salon.name,
        outcome: action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'changes_requested',
        note,
        dashboardUrl,
      });
      try {
        await sendMail({ to: owner.email, ...mail, tag: 'review-outcome' });
      } catch (err) {
        console.error('[mail] review notification failed', err.message);
      }
    }

    return res.json({
      version: serializeVersion(result.version),
      salon: serializeSalon(result.salon, { includeOwner: true }),
    });
  })
);

adminRouter.get('/salons/:salonId/versions', (req, res) => {
  const salon = db.prepare('SELECT * FROM salons WHERE id = ?').get(req.params.salonId);
  if (!salon) return res.status(404).json({ error: 'Salon not found' });
  const owner = db.prepare('SELECT * FROM users WHERE id = ?').get(salon.owner_id);
  const rows = db
    .prepare('SELECT * FROM salon_versions WHERE salon_id = ? ORDER BY version DESC')
    .all(salon.id);
  const approved = getApprovedVersion(salon.id);
  const currentHash = hashSnapshot(buildSalonSnapshot(salon));
  res.json({
    versions: rows.map(serializeVersion),
    workflow: workflowInfo(salon, owner).workflow,
    hasUnpublishedChanges: !!approved && approved.content_hash !== currentHash,
    pending: serializeVersion(getPendingVersion(salon.id)),
  });
});

/* ------------------------------------------------------------------ */
/* Platform settings                                                   */
/* ------------------------------------------------------------------ */

adminRouter.get('/settings', (req, res) => {
  res.json({ settings: getSettings() });
});

adminRouter.patch('/settings', (req, res) => {
  const body = req.body || {};
  const patch = {};
  if (body.platformName !== undefined) patch.platformName = str(body.platformName, { min: 2, max: 80, field: 'Platform name', required: true });
  if (body.supportEmail !== undefined) {
    const email = str(body.supportEmail, { max: 254, field: 'Support email', required: true }).toLowerCase();
    if (!EMAIL_RE.test(email)) throw new ValidationError('Support email must be a valid email address');
    patch.supportEmail = email;
  }
  if (body.allowRegistrations !== undefined) patch.allowRegistrations = bool(body.allowRegistrations, true);
  if (body.trialDays !== undefined) patch.trialDays = int(body.trialDays, { min: 0, max: 365, field: 'Trial days' });
  if (body.maintenanceMessage !== undefined) patch.maintenanceMessage = sanitizeText(str(body.maintenanceMessage, { max: 500 }), 500);
  if (body.defaultPlan !== undefined) {
    if (!PLANS.has(String(body.defaultPlan))) throw new ValidationError('Invalid default plan');
    patch.defaultPlan = String(body.defaultPlan);
  }
  const settings = saveSettings(patch);
  audit(req, 'admin.settings_updated', 'platform_settings', null, { keys: Object.keys(patch) });
  res.json({ settings });
});

/* ------------------------------------------------------------------ */
/* Audit log                                                           */
/* ------------------------------------------------------------------ */

adminRouter.get('/audit-logs', (req, res) => {
  const rows = db
    .prepare('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 200')
    .all();
  res.json({
    logs: rows.map((row) => ({
      id: row.id,
      actorEmail: row.actor_email,
      action: row.action,
      targetType: row.target_type,
      targetId: row.target_id,
      meta: row.meta ? JSON.parse(row.meta) : null,
      ip: row.ip,
      createdAt: row.created_at,
    })),
  });
});
