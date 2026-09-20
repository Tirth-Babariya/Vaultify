// In-memory stand-in for Supabase Auth + PostgREST, wired up via Playwright
// request interception. State is shared so several browser contexts behave like
// several devices talking to one backend.
const HOST = 'https://mock-vaultify.supabase.co';

const b64u = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
const jwt = (uid, email) =>
  `${b64u({ alg: 'HS256', typ: 'JWT' })}.${b64u({ sub: uid, email, role: 'authenticated', aud: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 })}.sig`;

function createState({ autoconfirm = false } = {}) {
  return {
    autoconfirm,
    users: new Map(), // email -> { id, secret, confirmed }
    tokens: new Map(), // access token -> uid
    vaults: new Map(), // uid -> row
    events: [],
    bodies: [], // every request body seen, to prove the server never sees secrets
    offline: false,
    seq: 1,
  };
}

async function install(context, state, host = HOST) {
  await context.route(`${host}/**`, async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const method = req.method();
    const cors = {
      'access-control-allow-origin': '*',
      'access-control-allow-headers': '*',
      'access-control-allow-methods': '*',
      'access-control-expose-headers': '*',
    };
    const json = (status, body, extra = {}) =>
      route.fulfill({ status, headers: { ...cors, 'content-type': 'application/json', ...extra }, body: body === undefined ? '' : JSON.stringify(body) });

    if (method === 'OPTIONS') return route.fulfill({ status: 200, headers: cors });
    if (state.offline) return route.abort('internetdisconnected');

    const raw = req.postData();
    if (raw) state.bodies.push(raw);
    let body = {};
    try { body = raw ? JSON.parse(raw) : {}; } catch { /* not json */ }

    const path = url.pathname;
    const bearer = (req.headers()['authorization'] || '').replace('Bearer ', '');
    const uid = state.tokens.get(bearer);

    const userJson = (email, u) => ({ id: u.id, aud: 'authenticated', role: 'authenticated', email, email_confirmed_at: u.confirmed ? new Date().toISOString() : null, identities: [{ id: u.id }], app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() });
    const sessionFor = (email, u) => {
      const access = jwt(u.id, email);
      state.tokens.set(access, u.id);
      return { access_token: access, token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: 'r' + state.seq++, user: userJson(email, u) };
    };
    const emailOfUid = (id) => [...state.users.entries()].find(([, u]) => u.id === id)?.[0];

    // ---------------- auth ----------------
    if (path === '/auth/v1/signup') {
      const email = body.email.toLowerCase();
      if (state.users.has(email)) {
        return json(200, { ...userJson(email, state.users.get(email)), identities: [] }); // obfuscated "already exists"
      }
      const u = { id: `uid-${state.seq++}`, secret: body.password, confirmed: state.autoconfirm };
      state.users.set(email, u);
      return state.autoconfirm ? json(200, sessionFor(email, u)) : json(200, userJson(email, u));
    }
    if (path === '/auth/v1/token' && url.searchParams.get('grant_type') === 'password') {
      const email = body.email.toLowerCase();
      const u = state.users.get(email);
      if (!u || u.secret !== body.password) return json(400, { code: 400, error_code: 'invalid_credentials', msg: 'Invalid login credentials' });
      if (!u.confirmed) return json(400, { code: 400, error_code: 'email_not_confirmed', msg: 'Email not confirmed' });
      return json(200, sessionFor(email, u));
    }
    if (path === '/auth/v1/user') {
      if (!uid) return json(401, { code: 401, msg: 'invalid token' });
      const email = emailOfUid(uid);
      const u = state.users.get(email);
      if (method === 'PUT') {
        if (body.password) u.secret = body.password;
        state.users.set(email, u);
      }
      return json(200, userJson(email, u));
    }
    if (path === '/auth/v1/logout') return route.fulfill({ status: 204, headers: cors });
    if (path === '/auth/v1/recover' || path === '/auth/v1/resend') return json(200, {});

    // ---------------- rest ----------------
    if (path.startsWith('/rest/v1/')) {
      if (!uid) return json(401, { code: 'PGRST301', message: 'JWT required' });
      const table = path.replace('/rest/v1/', '');
      const prefer = req.headers()['prefer'] || '';
      const wantsRows = prefer.includes('return=representation');
      const filters = {};
      for (const [k, v] of url.searchParams) if (v.startsWith('eq.')) filters[k] = v.slice(3);

      if (table === 'vaults') {
        const own = (row) => row && row.user_id === uid;
        if (method === 'GET') {
          const row = state.vaults.get(filters.user_id);
          return json(200, own(row) ? [row] : []);
        }
        if (method === 'POST') {
          if (body.user_id !== uid) return json(403, { code: '42501', message: 'row violates row-level security policy' });
          if (state.vaults.has(uid)) return json(409, { code: '23505', message: 'duplicate key' });
          const row = { updated_at: new Date().toISOString(), ...body };
          state.vaults.set(uid, row);
          return json(201, wantsRows ? [row] : undefined);
        }
        if (method === 'PATCH') {
          const row = state.vaults.get(filters.user_id);
          if (!own(row) || (filters.version !== undefined && String(row.version) !== filters.version)) return json(200, []);
          Object.assign(row, body);
          return json(200, wantsRows ? [{ version: row.version }] : undefined);
        }
        if (method === 'DELETE') {
          if (own(state.vaults.get(filters.user_id))) state.vaults.delete(filters.user_id);
          return route.fulfill({ status: 204, headers: cors });
        }
      }
      if (table === 'login_events') {
        if (method === 'POST') {
          if (body.user_id !== uid) return json(403, { code: '42501', message: 'rls' });
          state.events.push({ id: state.events.length + 1, created_at: new Date().toISOString(), ...body });
          return json(201);
        }
        if (method === 'GET') {
          const rows = state.events.filter((e) => e.user_id === uid).reverse().map(({ id, event, device_id, device_label, created_at }) => ({ id, event, device_id, device_label, created_at }));
          return json(200, rows);
        }
      }
    }
    return json(404, { message: `mock: unhandled ${method} ${path}` });
  });
}

module.exports = { createState, install, HOST };

// Mints a signed-in session for an existing mock user (used to simulate the
// temporary session a password-reset email link creates).
module.exports.mintSession = (state, email) => {
  const u = state.users.get(email);
  const access = jwt(u.id, email);
  state.tokens.set(access, u.id);
  return {
    access_token: access, token_type: 'bearer', expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: 'r-mint',
    user: { id: u.id, aud: 'authenticated', role: 'authenticated', email, identities: [{ id: u.id }], app_metadata: {}, user_metadata: {} },
  };
};
