/**
 * PostgREST schema-resilience helper.
 *
 * Deployed Supabase projects are migrated at different times. A query that
 * names a column which does not exist yet returns 400/42703 (or 404/PGRST205
 * when the schema cache is stale) and used to surface as a 409/500 login or
 * catalogue error. Every server-side read degrades through progressively
 * smaller `select` lists and supplies safe defaults for optional columns.
 */
export const SCHEMA_ERROR_CODES = new Set([
  '42703', // undefined_column
  '42P01', // undefined_table
  'PGRST204', // column not found in schema cache
  'PGRST205', // table not found in schema cache
  'PGRST202', // function not found
]);

const SCHEMA_MESSAGE_RE =
  /column .*does not exist|relation .*does not exist|could not find .*in the schema cache|unknown column|no column named|does not exist|schema cache/i;

/** True when an error is caused by an out-of-date schema, not bad credentials. */
export function isSchemaMismatch(error) {
  if (!error) return false;
  const status = Number(error.status || error.statusCode || 0);
  const code = String(error.code || error.data?.code || error.error_code || '').toUpperCase();
  const message = String(error.message || error.data?.message || error.hint || '').toLowerCase();
  if (SCHEMA_ERROR_CODES.has(code)) return true;
  if (status === 400 || status === 404 || status === 406) {
    return SCHEMA_MESSAGE_RE.test(message);
  }
  return false;
}

/**
 * Execute `attempt(select)` for each variant until one succeeds.
 *
 * @param {Array<{ select: string, defaults?: Record<string, unknown> }>} variants
 *   Ordered from the richest schema to the oldest one.
 * @param {(select: string) => Promise<unknown[]>} attempt
 *   Must throw on HTTP error; must return an array of row objects.
 * @param {{ label?: string, onDegrade?: (info: object) => void }} [options]
 * @returns {Promise<{ rows: Record<string, unknown>[], select: string | null, degraded: boolean, attempts: number }>}
 */
export async function selectWithFallback(variants, attempt, options = {}) {
  const list = Array.isArray(variants) && variants.length
    ? variants
    : [{ select: '*' }];
  let lastError = null;
  let attempts = 0;

  for (const variant of list) {
    attempts += 1;
    try {
      const raw = await attempt(variant.select);
      const rows = Array.isArray(raw) ? raw : [];
      return {
        rows: variant.defaults
          ? rows.map((row) => ({ ...variant.defaults, ...row }))
          : rows,
        select: variant.select,
        degraded: variant.select !== list[0].select,
        attempts,
      };
    } catch (error) {
      lastError = error;
      if (!isSchemaMismatch(error)) throw error;
    }
  }

  // Every variant hit a missing column/table. Return a well-formed empty
  // result instead of a 500; callers decide whether that is fatal (profiles)
  // or simply an empty catalogue (services).
  const info = {
    label: options.label || 'query',
    attempts,
    error: lastError?.message || 'schema mismatch',
  };
  if (typeof options.onDegrade === 'function') options.onDegrade(info);
  else console.warn('[postgrest] degraded query', info);
  return { rows: [], select: null, degraded: true, attempts };
}

/** Convenience: build a query string with an explicit select list. */
export function withSelect(basePath, select) {
  const separator = basePath.includes('?') ? '&' : '?';
  return `${basePath}${separator}select=${encodeURIComponent(select)}`;
}
