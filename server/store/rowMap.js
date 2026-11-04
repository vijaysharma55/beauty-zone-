/**
 * Pure converters between the app's existing SQLite row shape and the Supabase
 * (Postgres) shape. Repositories return the SQLite shape so the existing serializers
 * and routes keep working unchanged.
 *
 *  - booleans: 0/1 <-> true/false
 *  - JSON text columns `x_json` <-> jsonb column `x`
 *  - a few renamed/duplicated columns (see TABLES below)
 */

const TABLES = {
  salons: {
    bool: ['website_published', 'suspended', 'onboarding_completed'],
    json: { gallery_json: 'gallery', theme_json: 'theme', timings_json: 'timings' },
  },
  services: { bool: ['active'] },
  staff: { bool: ['active', 'booking_enabled'], json: { specialties_json: 'specialties' } },
  bookings: {
    bool: ['bridal_trial'],
    // local column -> remote columns (written to all, read from the first present)
    alias: { date: ['booking_date', 'date'], time: ['booking_time', 'time'] },
  },
  waitlist: { bool: [] },
  loyalty_transactions: { alias: { type: ['transaction_type', 'type'] } },
  loyalty_vouchers: { bool: ['used'] },
  audit_logs: { json: { meta: 'metadata' }, alsoWrite: { meta: 'meta' } },
  platform_settings: { jsonValue: true },
  profiles: { bool: ['email_verified'] },
};

/** NOT NULL jsonb columns need a concrete empty value; nullable ones (audit metadata) stay null. */
const EMPTY_JSON = { gallery: [], timings: [], specialties: [], theme: {} };

const IPV4 = /^(\d{1,3}\.){3}\d{1,3}$/;
const IPV6 = /^[0-9a-f:]+$/i;
/** `audit_logs.ip` is inet in Postgres: anything that is not an IP must become null. */
export const toInet = (ip) => {
  if (!ip || typeof ip !== 'string') return null;
  const v = ip.replace(/^::ffff:/i, '');
  return IPV4.test(v) || (v.includes(':') && IPV6.test(v)) ? v : null;
};

const parseJson = (v, fallback) => {
  if (v === null || v === undefined) return fallback;
  if (typeof v !== 'string') return v;
  try {
    return JSON.parse(v);
  } catch {
    return fallback;
  }
};

export function toRemote(table, row) {
  const cfg = TABLES[table] || {};
  const out = { ...row };
  for (const col of cfg.bool || []) if (col in out) out[col] = !!out[col];
  for (const [local, remote] of Object.entries(cfg.json || {})) {
    if (local in out) {
      out[remote] = parseJson(out[local], EMPTY_JSON[remote] ?? null);
      if (local !== remote) delete out[local];
    }
  }
  for (const [local, remotes] of Object.entries(cfg.alias || {})) {
    if (local in out) {
      for (const r of remotes) out[r] = out[local];
      if (!remotes.includes(local)) delete out[local];
    }
  }
  if (cfg.alsoWrite) for (const [from, to] of Object.entries(cfg.alsoWrite)) if (from in row) out[to] = out[cfg.json[from]];
  if (table === 'audit_logs' && 'ip' in out) out.ip = toInet(out.ip);
  if (cfg.jsonValue && 'value' in out) out.value = parseJson(out.value, out.value);
  return out;
}

export function toLocal(table, row) {
  if (!row) return row;
  const cfg = TABLES[table] || {};
  const out = { ...row };
  for (const col of cfg.bool || []) if (col in out) out[col] = out[col] ? 1 : 0;
  for (const [local, remote] of Object.entries(cfg.json || {})) {
    if (remote in out && local !== remote) {
      out[local] = out[remote] === null || out[remote] === undefined ? null : JSON.stringify(out[remote]);
      delete out[remote];
    }
  }
  for (const [local, remotes] of Object.entries(cfg.alias || {})) {
    const present = remotes.find((r) => out[r] !== undefined && out[r] !== null);
    if (present !== undefined) out[local] = out[present];
    for (const r of remotes) if (r !== local) delete out[r];
  }
  if (cfg.jsonValue && 'value' in out) out.value = typeof out.value === 'string' ? out.value : JSON.stringify(out.value);
  return out;
}

export const toLocalRows = (table, rows) => (rows || []).map((r) => toLocal(table, r));
