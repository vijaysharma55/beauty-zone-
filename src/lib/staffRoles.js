/**
 * Canonical staff-onboarding vocabulary shared by the browser and the API.
 *
 * Plain, dependency-free JS (like `roles.js`) so the Express API validates
 * exactly the values the dashboard renders. Never trust a role string from a
 * request body: normalize against these constants first.
 *
 * Covers:
 *  - Primary role (professional title) options
 *  - App access role (system permission level) options
 *  - Availability status options
 *  - Weekly schedule day ids + default week
 *  - Skill suggestions for the tag selector
 *  - Indian mobile-number and commission helpers
 *
 * @typedef {{ value: string, label: string }} StaffOption
 * @typedef {{ value: string, label: string, summary: string, permissions: string[] }} StaffAccessOption
 * @typedef {{ value: string, label: string, tone: 'green' | 'amber' | 'slate', hint: string }} StaffAvailabilityOption
 * @typedef {{ day: string, startTime: string, endTime: string, closed: boolean }} StaffScheduleDay
 * @typedef {{ schedule: StaffScheduleDay[], errors: string[] }} StaffScheduleResult
 */

/* ------------------------------------------------------------------ */
/* Primary role (professional title)                                   */
/* ------------------------------------------------------------------ */

/** @type {ReadonlyArray<StaffOption>} */
export const STAFF_PRIMARY_ROLES = Object.freeze([
  { value: 'senior_stylist', label: 'Senior Stylist' },
  { value: 'junior_stylist', label: 'Junior Stylist' },
  { value: 'hair_dresser', label: 'Hair Dresser' },
  { value: 'makeup_artist', label: 'Makeup Artist' },
  { value: 'nail_artist', label: 'Nail Artist' },
  { value: 'spa_therapist', label: 'Spa Therapist' },
  { value: 'salon_manager', label: 'Salon Manager' },
  { value: 'receptionist', label: 'Receptionist' },
]);

export const STAFF_PRIMARY_ROLE_VALUES = Object.freeze(STAFF_PRIMARY_ROLES.map((role) => role.value));

/** @param {unknown} value @returns {boolean} */
export const isStaffPrimaryRole = (value) =>
  typeof value === 'string' && STAFF_PRIMARY_ROLE_VALUES.includes(value);

/** Human label for a stored primary-role slug (empty string when unknown). */
export function getPrimaryRoleLabel(value) {
  const match = STAFF_PRIMARY_ROLES.find((role) => role.value === value);
  return match ? match.label : '';
}

/* ------------------------------------------------------------------ */
/* App access role (system permission level)                           */
/* ------------------------------------------------------------------ */

/**
 * @type {ReadonlyArray<StaffAccessOption>}
 *
 * `permissions` is descriptive copy for the dashboard; the API never grants
 * capabilities from these labels (staff accounts are not platform logins yet).
 */
export const STAFF_APP_ACCESS_ROLES = Object.freeze([
  {
    value: 'manager',
    label: 'Manager (Full Access)',
    summary: 'Full access to bookings, staff, catalogue, payments and reports.',
    permissions: ['Bookings', 'Staff & roster', 'Services & pricing', 'Payments', 'Reports'],
  },
  {
    value: 'service_provider',
    label: 'Service Provider (Assigned)',
    summary: 'Sees only the appointments assigned to their own service mapping.',
    permissions: ['Assigned bookings', 'Own schedule', 'Assigned services'],
  },
  {
    value: 'receptionist',
    label: 'Receptionist (Frontdesk)',
    summary: 'Front-desk access to the calendar, check-ins and client contact details.',
    permissions: ['Calendar', 'Check-in & billing', 'Client contact details'],
  },
]);

export const STAFF_APP_ACCESS_ROLE_VALUES = Object.freeze(
  STAFF_APP_ACCESS_ROLES.map((role) => role.value)
);

export const DEFAULT_STAFF_APP_ACCESS_ROLE = 'service_provider';

/** @param {unknown} value @returns {boolean} */
export const isStaffAppAccessRole = (value) =>
  typeof value === 'string' && STAFF_APP_ACCESS_ROLE_VALUES.includes(value);

/** Human label for a stored app-access slug. */
export function getAppAccessRoleLabel(value) {
  const match = STAFF_APP_ACCESS_ROLES.find((role) => role.value === value);
  return match ? match.label : '';
}

/** App-access role implied by a primary role, unless the owner overrides it. */
export function suggestedAppAccessRole(primaryRole) {
  if (primaryRole === 'salon_manager') return 'manager';
  if (primaryRole === 'receptionist') return 'receptionist';
  return DEFAULT_STAFF_APP_ACCESS_ROLE;
}

/* ------------------------------------------------------------------ */
/* Availability status                                                 */
/* ------------------------------------------------------------------ */

/** @type {ReadonlyArray<StaffAvailabilityOption>} */
export const STAFF_AVAILABILITY_OPTIONS = Object.freeze([
  { value: 'available', label: 'Available', tone: 'green', hint: 'Can be booked online.' },
  { value: 'busy', label: 'Busy', tone: 'amber', hint: 'Fully booked for now — not offered for online booking.' },
  { value: 'on_leave', label: 'On Leave', tone: 'slate', hint: 'Away on leave — not offered for online booking.' },
  { value: 'off_duty', label: 'Off Duty', tone: 'slate', hint: 'Off shift today — not offered for online booking.' },
]);

export const STAFF_AVAILABILITY_STATUSES = Object.freeze(STAFF_AVAILABILITY_OPTIONS.map((opt) => opt.value));

/** @param {unknown} value @returns {boolean} */
export const isStaffAvailabilityStatus = (value) =>
  typeof value === 'string' && STAFF_AVAILABILITY_STATUSES.includes(value);

/* ------------------------------------------------------------------ */
/* Weekly schedule                                                     */
/* ------------------------------------------------------------------ */

/** @type {ReadonlyArray<{ id: string, label: string, short: string }>} */
export const WEEKDAYS = Object.freeze([
  { id: 'mon', label: 'Monday', short: 'Mon' },
  { id: 'tue', label: 'Tuesday', short: 'Tue' },
  { id: 'wed', label: 'Wednesday', short: 'Wed' },
  { id: 'thu', label: 'Thursday', short: 'Thu' },
  { id: 'fri', label: 'Friday', short: 'Fri' },
  { id: 'sat', label: 'Saturday', short: 'Sat' },
  { id: 'sun', label: 'Sunday', short: 'Sun' },
]);

export const WEEKDAY_IDS = Object.freeze(WEEKDAYS.map((day) => day.id));

export const TIME_24H_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Default week applied when a staff member is created without a schedule:
 * Monday–Saturday 10:00–20:00, Sunday closed (per the onboarding spec).
 *
 * @type {ReadonlyArray<StaffScheduleDay>}
 */
export const DEFAULT_STAFF_WEEKLY_SCHEDULE = Object.freeze(
  WEEKDAYS.map((day) =>
    Object.freeze(
      day.id === 'sun'
        ? { day: day.id, startTime: '', endTime: '', closed: true }
        : { day: day.id, startTime: '10:00', endTime: '20:00', closed: false }
    )
  )
);

/** Deep copy so callers can mutate their own draft state safely. */
export function defaultWeeklySchedule() {
  return DEFAULT_STAFF_WEEKLY_SCHEDULE.map((entry) => ({ ...entry }));
}

/** @param {unknown} value @returns {StaffScheduleDay[]} */
export function cloneWeeklySchedule(value) {
  if (!Array.isArray(value)) return defaultWeeklySchedule();
  return value.map((entry) => ({
    day: String(entry?.day || ''),
    startTime: String(entry?.startTime || ''),
    endTime: String(entry?.endTime || ''),
    closed: Boolean(entry?.closed),
  }));
}

const dayLabel = (id) => WEEKDAYS.find((day) => day.id === id)?.label || id;

/**
 * Normalize + validate a weekly schedule coming from the API/UI.
 *
 * - Missing days inherit the platform default so every staff member always has
 *   a complete seven-day roster.
 * - Closed days are stored with empty times (`[--:--]` in the UI).
 * - Open days must have valid 24h `HH:MM` times with start strictly before end.
 *
 * @param {unknown} input
 * @param {{ fallback?: ReadonlyArray<StaffScheduleDay> }} [options]
 * @returns {StaffScheduleResult}
 */
export function normalizeWeeklySchedule(input, { fallback = DEFAULT_STAFF_WEEKLY_SCHEDULE } = {}) {
  /** @type {string[]} */
  const errors = [];
  if (input === undefined || input === null) {
    return { schedule: fallback.map((entry) => ({ ...entry })), errors };
  }
  if (!Array.isArray(input)) {
    return { schedule: fallback.map((entry) => ({ ...entry })), errors: ['Weekly schedule must be a list of day entries'] };
  }
  if (input.length > WEEKDAY_IDS.length) {
    errors.push('Weekly schedule can contain at most seven day entries');
  }

  /** @type {Map<string, any>} */
  const provided = new Map();
  for (const entry of input) {
    if (!entry || typeof entry !== 'object') {
      errors.push('Each weekly schedule entry must be an object with a day');
      continue;
    }
    const day = String(entry.day || '').trim().toLowerCase();
    if (!WEEKDAY_IDS.includes(day)) {
      errors.push(`Unknown schedule day "${entry.day ?? ''}"`);
      continue;
    }
    if (provided.has(day)) {
      errors.push(`Duplicate schedule entry for ${dayLabel(day)}`);
      continue;
    }
    provided.set(day, entry);
  }

  const schedule = WEEKDAYS.map(({ id }) => {
    const fallbackEntry =
      fallback.find((entry) => entry.day === id) || { day: id, startTime: '10:00', endTime: '20:00', closed: false };
    const entry = provided.get(id);
    if (!entry) return { ...fallbackEntry, day: id };

    const closed = entry.closed === true || entry.closed === 'true' || entry.closed === 1 || entry.closed === '1';
    if (closed) return { day: id, startTime: '', endTime: '', closed: true };

    const rawStart = entry.startTime ?? entry.start ?? entry.open;
    const rawEnd = entry.endTime ?? entry.end ?? entry.close;
    const startTime = rawStart === undefined || rawStart === null || rawStart === '' ? fallbackEntry.startTime : String(rawStart).trim();
    const endTime = rawEnd === undefined || rawEnd === null || rawEnd === '' ? fallbackEntry.endTime : String(rawEnd).trim();

    if (!TIME_24H_RE.test(startTime) || !TIME_24H_RE.test(endTime)) {
      errors.push(`${dayLabel(id)} needs valid start and end times in 24-hour HH:MM format`);
      return { day: id, startTime: fallbackEntry.startTime, endTime: fallbackEntry.endTime, closed: false };
    }
    if (startTime >= endTime) {
      errors.push(`${dayLabel(id)} start time must be before its end time`);
      return { day: id, startTime, endTime, closed: false };
    }
    return { day: id, startTime, endTime, closed: false };
  });

  return { schedule, errors };
}

/** Parse a stored schedule JSON string/array defensively. */
export function parseWeeklySchedule(value, { fallback = DEFAULT_STAFF_WEEKLY_SCHEDULE } = {}) {
  let parsed = value;
  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value || '[]');
    } catch {
      parsed = [];
    }
  }
  const { schedule } = normalizeWeeklySchedule(Array.isArray(parsed) && parsed.length > 0 ? parsed : undefined, {
    fallback,
  });
  return schedule;
}

/** The schedule window for one weekday id, or null when closed/missing. */
export function scheduleWindowForDay(schedule, dayId) {
  if (!Array.isArray(schedule)) return null;
  const entry = schedule.find((item) => item?.day === dayId);
  if (!entry || entry.closed) return null;
  if (!TIME_24H_RE.test(String(entry.startTime)) || !TIME_24H_RE.test(String(entry.endTime))) return null;
  return { startTime: entry.startTime, endTime: entry.endTime };
}

/** Compact human summary, e.g. "Mon–Sat 10:00 – 20:00 · Sun closed". */
export function describeWeeklySchedule(schedule) {
  const normalized = parseWeeklySchedule(schedule);
  /** @type {Array<{ days: string[], label: string, signature: string }>} */
  const runs = [];
  for (const entry of normalized) {
    const signature = entry.closed ? 'closed' : `${entry.startTime}-${entry.endTime}`;
    const label = entry.closed ? 'closed' : `${entry.startTime} – ${entry.endTime}`;
    const last = runs[runs.length - 1];
    if (last && last.signature === signature) last.days.push(entry.day);
    else runs.push({ days: [entry.day], label, signature });
  }
  if (runs.length === 0) return 'No schedule set';
  if (runs.length === 1) {
    return runs[0].signature === 'closed' ? 'Closed all week' : `Every day ${runs[0].label}`;
  }
  return runs
    .map((run) => {
      const first = WEEKDAYS.find((day) => day.id === run.days[0])?.short || run.days[0];
      const lastDay = WEEKDAYS.find((day) => day.id === run.days[run.days.length - 1])?.short || '';
      const span =
        run.days.length >= 3 ? `${first}–${lastDay}` : run.days.map((id) => WEEKDAYS.find((d) => d.id === id)?.short || id).join(', ');
      return `${span} ${run.label}`;
    })
    .join(' · ');
}

/* ------------------------------------------------------------------ */
/* Skills / specialisations                                            */
/* ------------------------------------------------------------------ */

/** Suggested skills for the pill/tag selector (owners can add custom ones). */
export const STAFF_SKILL_SUGGESTIONS = Object.freeze([
  'Hair Coloring',
  'Balayage',
  'Bridal Makeup',
  'Facial Treatments',
  'Nail Art',
  'Hair Extensions',
  'Threading & Waxing',
  'Deep Tissue Massage',
  'Beard Sculpting',
  'Keratin Treatment',
]);

export const MAX_STAFF_SKILLS = 25;
export const MAX_STAFF_SKILL_LENGTH = 80;

/**
 * De-duplicate skills case-insensitively, trim, drop empties and cap length.
 * @param {unknown} value
 * @returns {string[]}
 */
export function normalizeSkillList(value) {
  if (!Array.isArray(value)) return [];
  /** @type {string[]} */
  const out = [];
  const seen = new Set();
  for (const raw of value) {
    if (typeof raw !== 'string') continue;
    const skill = raw.trim().slice(0, MAX_STAFF_SKILL_LENGTH);
    if (!skill) continue;
    const key = skill.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(skill);
    if (out.length >= MAX_STAFF_SKILLS) break;
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Mobile number (+91) & commission helpers                            */
/* ------------------------------------------------------------------ */

/**
 * Normalize an Indian mobile number to `+91XXXXXXXXXX`.
 * Accepts "+91 98765 43210", "098765-43210", "9876543210", "+91-9876543210".
 *
 * @param {unknown} value
 * @returns {{ ok: boolean, value: string, error: string | null }}
 */
export function normalizeIndianMobile(value) {
  if (value === undefined || value === null || value === '') return { ok: true, value: '', error: null };
  if (typeof value !== 'string' && typeof value !== 'number') {
    return { ok: false, value: '', error: 'Mobile number must be text' };
  }
  const raw = String(value).trim();
  if (!raw) return { ok: true, value: '', error: null };
  if (/[^\d+\-()\s]/.test(raw)) {
    return { ok: false, value: '', error: 'Mobile number can only contain digits, spaces, +, - and ( )' };
  }
  let digits = raw.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  if (!/^[6-9]\d{9}$/.test(digits)) {
    return { ok: false, value: '', error: 'Enter a valid 10-digit Indian mobile number (starting 6–9)' };
  }
  return { ok: true, value: `+91${digits}`, error: null };
}

/** True when the owner asked to keep this number out of public/staff lists. */
export const isMobileHidden = (member) => Boolean(member && member.hideMobileNumber);

/** Masked display for lists, e.g. "+91 ••••• 43210". */
export function maskMobileNumber(mobile) {
  const digits = String(mobile || '').replace(/\D/g, '');
  if (digits.length < 4) return '••••••';
  const last4 = digits.slice(-4);
  return /^91\d{10}$/.test(digits) ? `+91 ••••• ${last4}` : `••••• ${last4}`;
}

export const DEFAULT_COMMISSION_PERCENT = 15;
export const MAX_COMMISSION_PERCENT = 100;

/**
 * Validate a commission percentage (0–100, one decimal).
 * @param {unknown} value
 * @returns {{ ok: boolean, value: number, error: string | null }}
 */
export function normalizeCommissionPercent(value) {
  if (value === undefined || value === null || value === '') {
    return { ok: true, value: DEFAULT_COMMISSION_PERCENT, error: null };
  }
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > MAX_COMMISSION_PERCENT) {
    return { ok: false, value: DEFAULT_COMMISSION_PERCENT, error: 'Commission must be between 0 and 100 percent' };
  }
  return { ok: true, value: Math.round(n * 10) / 10, error: null };
}

/* ------------------------------------------------------------------ */
/* Service assignment helpers                                          */
/* ------------------------------------------------------------------ */

/** De-duplicate a list of service ids (strings, max 80 chars). */
export function normalizeServiceIdList(value) {
  if (!Array.isArray(value)) return [];
  /** @type {string[]} */
  const out = [];
  const seen = new Set();
  for (const raw of value) {
    if (typeof raw !== 'string') continue;
    const id = raw.trim().slice(0, 80);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

/**
 * True when this staff member is allowed to deliver the given service id.
 * An empty assignment list means “not restricted” (all salon services).
 */
export function staffCanDeliverService(serviceIds, serviceId) {
  if (!Array.isArray(serviceIds) || serviceIds.length === 0) return true;
  if (!serviceId) return true;
  return serviceIds.includes(serviceId);
}
