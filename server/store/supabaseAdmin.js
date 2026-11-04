import { supabaseRestUrl, serviceRoleKey } from './config.js';

/**
 * Minimal PostgREST client for the server. Uses the service-role key, which bypasses
 * RLS: authorization MUST be enforced by the Express layer before calling this.
 * The key is read per call from env and is never logged.
 */
export class StoreError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

function buildQuery({ filters = {}, select, order, limit } = {}) {
  const params = new URLSearchParams();
  if (select) params.set('select', select);
  for (const [col, cond] of Object.entries(filters)) {
    // A bare value means equality; pass `{ op: 'in', value: [...] }` etc. for others.
    if (cond && typeof cond === 'object' && 'op' in cond) {
      const v = Array.isArray(cond.value) ? `(${cond.value.join(',')})` : cond.value;
      params.append(col, `${cond.op}.${v}`);
    } else {
      params.append(col, `eq.${cond}`);
    }
  }
  if (order) params.set('order', order);
  if (limit) params.set('limit', String(limit));
  const q = params.toString();
  return q ? `?${q}` : '';
}

async function request(method, table, { query, body, prefer } = {}) {
  const key = serviceRoleKey();
  const base = supabaseRestUrl();
  if (!key || !base) throw new StoreError(500, 'Supabase is not configured on the server.');
  const res = await fetch(`${base}/rest/v1/${table}${query || ''}`, {
    method,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: prefer || 'return=representation',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(8000),
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    throw new StoreError(res.status, (data && data.message) || `Supabase ${method} ${table} failed`, data);
  }
  return data;
}

export const sb = {
  select: (table, opts) => request('GET', table, { query: buildQuery(opts) }),
  insert: (table, rows) => request('POST', table, { body: rows }),
  upsert: (table, rows, onConflict = 'id') =>
    request('POST', table, {
      query: `?on_conflict=${encodeURIComponent(onConflict)}`,
      body: rows,
      prefer: 'resolution=merge-duplicates,return=representation',
    }),
  update: (table, filters, patch) => request('PATCH', table, { query: buildQuery({ filters }), body: patch }),
  remove: (table, filters) => request('DELETE', table, { query: buildQuery({ filters }) }),
  rpc: (fn, args) => request('POST', `rpc/${fn}`, { body: args || {} }),
};
