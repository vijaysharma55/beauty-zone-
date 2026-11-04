/**
 * Which persistence backend the server uses. Default is the local SQLite file so
 * nothing changes until `DATA_BACKEND=supabase` is set explicitly.
 */
export const dataBackend = () => (process.env.DATA_BACKEND || 'sqlite').trim().toLowerCase();

export const serviceRoleKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY || '';
export const supabaseRestUrl = () =>
  (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/+$/, '');

/** True only when Supabase is selected AND fully configured (URL + service-role key). */
export const backendIsSupabase = () =>
  dataBackend() === 'supabase' && Boolean(supabaseRestUrl() && serviceRoleKey());
