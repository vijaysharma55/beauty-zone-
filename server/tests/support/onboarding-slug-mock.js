import { createServer } from 'node:http';

/** Stand in for the anonymous, availability-only Supabase RPC in local API tests. */
export async function startOnboardingSlugMock() {
  const taken = new Set();
  const calls = [];
  let unavailable = false;
  const server = createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : {};
    calls.push({ path: req.url, authorization: req.headers.authorization, body });
    res.setHeader('content-type', 'application/json');
    if (req.url !== '/rest/v1/rpc/onboarding_slug_available_for_local') {
      res.statusCode = 404;
      res.end(JSON.stringify({ code: 'PGRST202', message: 'Unknown endpoint' }));
    } else if (unavailable) {
      res.statusCode = 503;
      res.end(JSON.stringify({ message: 'Storage unavailable' }));
    } else {
      res.end(JSON.stringify({ available: !taken.has(body.p_slug), reason: taken.has(body.p_slug) ? 'This address is already in use.' : null }));
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return {
    url: `http://127.0.0.1:${server.address().port}`,
    taken,
    calls,
    setUnavailable(value) { unavailable = value; },
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}
