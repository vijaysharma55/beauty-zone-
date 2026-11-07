/**
 * Browser-side PostgREST schema fallbacks.
 *
 * A deployed Supabase project may not yet have the newest optional columns.
 * Rather than showing a 400/500 (or a blank catalogue), retry with a smaller
 * select/body and safe defaults. Framework-free so it can be unit-tested.
 */
const SCHEMA_CODES = new Set(['42703', '42P01', 'PGRST204', 'PGRST205', 'PGRST202']);
const SCHEMA_MESSAGE =
  /column .*does not exist|relation .*does not exist|could not find .*in the schema cache|unknown column|does not exist|schema cache/i;

/**
 * @param {unknown} error
 * @returns {boolean}
 */
export function isSchemaColumnError(error) {
  if (!error || typeof error !== 'object') return false;
  const err = /** @type {any} */ (error);
  const code = String(err.code || err.error_code || '').toUpperCase();
  const status = Number(err.status || err.statusCode || 0);
  const message = String(err.message || err.msg || '').toLowerCase();
  if (SCHEMA_CODES.has(code)) return true;
  return (status === 400 || status === 404 || status === 406) && SCHEMA_MESSAGE.test(message);
}

/**
 * Try each variant in order until one succeeds. A schema mismatch moves to the
 * next variant; every other error (401/403/network) is propagated unchanged.
 *
 * @template T, V
 * @param {V[]} variants
 * @param {(variant: V) => Promise<T>} attempt
 * @returns {Promise<{ value: T | null, variant: V | null, degraded: boolean, error: unknown }>}
 */
export async function withSchemaFallback(variants, attempt) {
  const list = Array.isArray(variants) ? variants : [];
  let lastError = null;
  for (let index = 0; index < list.length; index += 1) {
    try {
      const value = await attempt(list[index]);
      return { value, variant: list[index], degraded: index > 0, error: null };
    } catch (error) {
      lastError = error;
      if (!isSchemaColumnError(error)) throw error;
    }
  }
  return { value: null, variant: null, degraded: true, error: lastError };
}
