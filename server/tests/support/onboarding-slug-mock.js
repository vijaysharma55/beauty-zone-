import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';

/** Test-only PostgREST/Auth stand-in for owner-scoped onboarding and staff CRUD. */
export async function startOnboardingSlugMock() {
  const taken = new Set();
  const calls = [];
  const identities = new Map();
  const salons = new Map();
  const staff = new Map();
  let unavailable = false;

  const send = (res, status, value) => {
    res.statusCode = status;
    res.setHeader('content-type', 'application/json');
    res.end(value === null ? '' : JSON.stringify(value));
  };
  const ownerFor = (req) => {
    const token = /^Bearer\s+(.+)$/i.exec(req.headers.authorization || '')?.[1] || '';
    return identities.get(token) || null;
  };
  const parseEq = (url, name) => {
    const value = url.searchParams.get(name) || '';
    return value.startsWith('eq.') ? decodeURIComponent(value.slice(3)) : '';
  };
  const matches = (row, url) => {
    const id = parseEq(url, 'id');
    const salonId = parseEq(url, 'salon_id');
    const active = parseEq(url, 'active');
    return (!id || row.id === id) && (!salonId || row.salon_id === salonId) &&
      (!active || String(row.active) === active);
  };

  const server = createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const rawBody = Buffer.concat(chunks).toString();
    let body = {};
    try { body = rawBody ? JSON.parse(rawBody) : {}; } catch { body = {}; }
    const url = new URL(req.url, 'http://supabase.test');
    calls.push({ path: req.url, method: req.method, authorization: req.headers.authorization, body });
    if (unavailable) return send(res, 503, { message: 'Storage unavailable' });

    if (url.pathname === '/rest/v1/rpc/onboarding_slug_available_for_local' && req.method === 'POST') {
      const slug = body.p_slug || '';
      return send(res, 200, { available: !taken.has(slug), reason: taken.has(slug) ? 'This address is already in use.' : null });
    }

    if (url.pathname === '/auth/v1/user' && req.method === 'GET') {
      const identity = ownerFor(req);
      if (!identity) return send(res, 401, { message: 'Invalid token' });
      return send(res, 200, {
        id: identity.id,
        email: identity.email,
        user_metadata: { name: identity.name },
        email_confirmed_at: '2026-01-01T00:00:00.000Z',
      });
    }

    if (url.pathname === '/rest/v1/profiles' && req.method === 'GET') {
      const id = parseEq(url, 'id');
      const identity = id
        ? [...identities.values()].find((item) => item.id === id)
        : ownerFor(req);
      return send(res, 200, identity ? [{
        id: identity.id,
        email: identity.email,
        name: identity.name,
        role: identity.role,
        status: 'active',
        email_verified: true,
      }] : []);
    }

    if (url.pathname === '/rest/v1/salons') {
      const identity = ownerFor(req);
      if (!identity) return send(res, 401, { message: 'Authentication required' });
      const ownerId = parseEq(url, 'owner_id');
      if (req.method === 'GET') {
        const rows = [...salons.values()].filter((salon) =>
          (!ownerId || salon.owner_id === ownerId) &&
          (identity.role === 'super_admin' || salon.owner_id === identity.id)
        );
        return send(res, 200, rows.slice(0, Number(url.searchParams.get('limit') || 100)));
      }
      if (req.method === 'PATCH') {
        const salonId = parseEq(url, 'id');
        const salon = salons.get(salonId);
        if (!salon || (identity.role !== 'super_admin' && salon.owner_id !== identity.id)) {
          return send(res, 200, []);
        }
        const updated = { ...salon, ...body };
        salons.set(salonId, updated);
        return send(res, 200, [updated]);
      }
    }

    if (url.pathname === '/rest/v1/staff' || url.pathname === '/rest/v1/staff_public_profiles') {
      const identity = ownerFor(req);
      const anon = !identity;
      const salonId = parseEq(url, 'salon_id');
      const id = parseEq(url, 'id');

      if (req.method === 'GET') {
        let rows = [...staff.values()].filter((row) => matches(row, url));
        if (anon) rows = rows.filter((row) => row.active === true);
        else if (identity.role !== 'super_admin') {
          const ownSalonIds = new Set([...salons.values()].filter((s) => s.owner_id === identity.id).map((s) => s.id));
          rows = rows.filter((row) => ownSalonIds.has(row.salon_id));
        }
        return send(res, 200, rows);
      }

      if (!identity) return send(res, 401, { message: 'Authentication required' });
      const ownSalonIds = new Set([...salons.values()].filter((s) => s.owner_id === identity.id).map((s) => s.id));
      const mayManage = (targetSalonId) => identity.role === 'super_admin' || ownSalonIds.has(targetSalonId);

      if (req.method === 'POST') {
        const targetSalonId = body.salon_id;
        if (!targetSalonId || !mayManage(targetSalonId) || !salons.has(targetSalonId)) {
          return send(res, 403, { code: '42501', message: 'new row violates row-level security policy for table staff' });
        }
        const now = new Date().toISOString();
        const row = {
          id: randomUUID(),
          name: '',
          role_title: '',
          primary_role: '',
          app_access_role: 'service_provider',
          commission_percent: 15,
          mobile_number: '',
          hide_mobile_number: false,
          bio: '',
          photo_url: '',
          specialties: [],
          qualifications: [],
          work_photos: [],
          work_photos_consent: false,
          rating: null,
          review_count: 0,
          experience: '',
          active: true,
          booking_enabled: true,
          availability_status: 'available',
          service_ids: [],
          weekly_schedule: [],
          sort_order: 0,
          created_at: now,
          updated_at: now,
          ...body,
        };
        staff.set(row.id, row);
        return send(res, 201, [row]);
      }

      if (req.method === 'PATCH') {
        const row = [...staff.values()].find((item) => matches(item, url));
        if (!row || !mayManage(row.salon_id)) return send(res, 200, []);
        const next = { ...row, ...body, updated_at: new Date().toISOString() };
        staff.set(row.id, next);
        return send(res, 200, [next]);
      }

      if (req.method === 'DELETE') {
        const row = [...staff.values()].find((item) => matches(item, url));
        if (!row || !mayManage(row.salon_id)) return send(res, 200, []);
        staff.delete(row.id);
        return send(res, 200, [{ id: row.id }]);
      }
    }

    return send(res, 404, { code: 'PGRST202', message: 'Unknown endpoint' });
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return {
    url: `http://127.0.0.1:${server.address().port}`,
    taken,
    calls,
    setIdentity(id, email, role = 'salon_owner', name = 'Test User') {
      identities.set(id, { id, email, role, name });
    },
    setSalon(ownerId, salon) {
      const existing = salons.get(salon.id);
      salons.set(salon.id, {
        ...salon,
        owner_id: ownerId,
        website_published: Boolean(salon.published ?? salon.website_published),
        status: salon.status || (salon.published ? 'approved' : 'draft'),
        suspended: false,
        staff_migrated_at: salon.staff_migrated_at || existing?.staff_migrated_at || null,
      });
    },
    getStaff(salonId) {
      return [...staff.values()].filter((row) => row.salon_id === salonId);
    },
    setUnavailable(value) { unavailable = value; },
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}
