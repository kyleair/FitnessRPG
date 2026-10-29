import { Buffer } from 'node:buffer';
import { createOAuthSession } from './oauth.mjs';
import { createStravaClient } from './strava.mjs';
import { createDashboardService } from './dashboard.mjs';
import { hash, secret } from './database.mjs';
import { createApiBudget } from './budget.mjs';
import { validateManual } from './manual.mjs';

const safeTokens = tokens => {
  if (!tokens.access_token || !tokens.refresh_token || !Number.isFinite(tokens.expires_at)) throw new Error('Invalid Strava token response.');
  return { access_token: tokens.access_token, refresh_token: tokens.refresh_token, expires_at: tokens.expires_at };
};
const escapeHtml = text => String(text).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

export function createApp({ db, env, fetchImpl = fetch, clock = Date.now }) {
  const origin = `http://127.0.0.1:${Number(env.PORT || 3001)}`;
  const publicOrigin = env.PUBLIC_BACKEND_URL ? new URL(env.PUBLIC_BACKEND_URL).origin : null;
  const configured = !!(origin && env.STRAVA_CLIENT_ID && env.STRAVA_CLIENT_SECRET);
  const namespace = hash(`${env.STRAVA_CLIENT_ID}:${env.STRAVA_CLIENT_SECRET}`) + ':';
  const budgetId = hash(String(env.STRAVA_CLIENT_ID));
  const budget = createApiBudget({ clock, initial: db.budget(budgetId), persist: value => db.saveBudget(budgetId, value) });
  const origins = new Set(['http://localhost:8081', 'http://127.0.0.1:8081', env.DEV_WEB_ORIGIN, publicOrigin, origin].filter(Boolean));
  const services = new Map(), locks = new Map(), rates = new Map();
  async function exclusive(account, fn) {
    const previous = locks.get(account) || Promise.resolve();
    const next = previous.catch(() => {}).then(fn);
    locks.set(account, next);
    try { return await next; } finally { if (locks.get(account) === next) locks.delete(account); }
  }
  function dashboard(account) {
    if (!services.has(account)) services.set(account, createDashboardService({
      clock, initial: db.snapshot(account), persist: value => db.saveSnapshot(account, value),
      manualActivities: () => db.manualActivities(account),
      client: createStravaClient({ clientId: env.STRAVA_CLIENT_ID, clientSecret: env.STRAVA_CLIENT_SECRET,
        initialTokens: db.tokens(account), saveTokens: value => db.saveTokens(account, safeTokens(value)), fetchImpl, budget }),
    }));
    return services.get(account);
  }
  const handler = async (request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; form-action 'self' https://www.strava.com; frame-ancestors 'none'; base-uri 'none'");
    const json = (status, body) => { response.writeHead(status, { 'Content-Type': 'application/json' }); response.end(JSON.stringify(body)); };
    const page = (status, title, body) => {
      response.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8' });
      response.end(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)} · FitnessRPG</title><style>body{background:#211b18;color:#f3e3bb;font:18px/1.6 system-ui;margin:0;padding:32px}main{max-width:440px;margin:10vh auto}h1{color:#e8c765}button{background:#fc4c02;color:white;border:0;border-radius:6px;padding:16px 24px;font-size:18px;cursor:pointer}</style><main><p>FITNESS RPG</p><h1>${escapeHtml(title)}</h1>${body}</main></html>`);
    };
    const url = new URL(request.url, 'http://local');
    const path = url.pathname;
    const browserRoute = path === '/connect' || path === '/auth/strava' || path === '/auth/strava/callback';
    if (browserRoute && (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(request.socket.remoteAddress) || request.headers.host !== new URL(origin).host)) {
      return page(403, 'Use your computer browser', `<p>Open ${origin}/connect on the computer running the backend, then enter the code shown in Expo Go.</p>`);
    }
    // Browser navigations are not API CORS requests. In particular our
    // no-referrer policy can make a normal form submission send Origin: null.
    if (!browserRoute && request.headers.origin && !origins.has(request.headers.origin)) return json(403, { error: 'Origin not allowed.' });
    if (!browserRoute && request.headers.origin && origins.has(request.headers.origin)) {
      response.setHeader('Access-Control-Allow-Origin', request.headers.origin);
      response.setHeader('Vary', 'Origin');
      response.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
      response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    }
    if (request.method === 'OPTIONS') { response.writeHead(204); return response.end(); }
    const browser = (request.headers.cookie || '').split('; ').find(value => value.startsWith('fitness_oauth='))?.slice(14) || '';
    try {
      if (path === '/connect' && request.method === 'GET') {
        return page(200, 'Connect your phone', '<p>Tap Connect Strava in Expo Go, then enter the code from your phone. Only use a code from your own device.</p><form method="get" action="/auth/strava"><label for="ticket">Connection code</label><p><input id="ticket" name="ticket" required maxlength="14" autocomplete="off" spellcheck="false" style="font-size:22px;width:100%;box-sizing:border-box;padding:12px"></p><button>Continue</button></form>');
      }
      if (path === '/health' && request.method === 'GET') return json(200, { ok: true, stravaConfigured: configured });
      if (path === '/api/session' && request.method === 'POST') {
        for (const [ip, value] of rates) if (value.until <= clock()) rates.delete(ip);
        const ip = request.socket.remoteAddress;
        const rate = rates.get(ip) || { count: 0, until: clock() + 60000 };
        rates.set(ip, rate);
        if (++rate.count > 30) return json(429, { error: 'Too many sessions. Try again in a minute.' });
        return json(201, { token: db.createSession() });
      }
      if (path === '/auth/strava/callback' && request.method === 'GET') {
        const attempt = db.consume(url.searchParams.get('state') || '', browser);
        if (!attempt) return page(400, 'Connection expired', '<p>Return to Expo Go and tap Connect Strava again. Use the same browser for the whole flow.</p>');
        const oauth = createOAuthSession({ clientId: env.STRAVA_CLIENT_ID, clientSecret: env.STRAVA_CLIENT_SECRET,
          redirectUri: `${origin}/auth/strava/callback`, state: attempt.state, fetchImpl,
          saveTokens: async value => {
            if (!Number.isSafeInteger(value.athlete?.id) || value.athlete.id <= 0) throw new Error('Strava did not return an athlete.');
            const account = namespace + value.athlete.id;
            await exclusive(account, async () => { await services.get(account)?.stop(); db.connect(attempt.session, account, safeTokens(value)); services.delete(account); });
          } });
        try { await oauth.complete(url); }
        catch { return page(400, 'Could not connect', '<p>Authorization was declined, activity permission was missing, or Strava could not complete the connection. Return to Expo Go and try again.</p>'); }
        response.setHeader('Set-Cookie', 'fitness_oauth=; HttpOnly; SameSite=Lax; Path=/auth/strava; Max-Age=0');
        return page(200, 'Strava connected', '<p>You can now return to Expo Go. Your activities will load automatically, or tap Check connection.</p>');
      }
      if (path === '/auth/strava' && ['GET', 'POST'].includes(request.method)) {
        if (!configured) return page(503, 'Setup needed', '<p>The backend needs Strava client credentials.</p>');
        const ticket = (url.searchParams.get('ticket') || '').replace(/[-\s]/g, '').toLowerCase();
        const attempt = db.attempt(ticket);
        if (!attempt || attempt.state) return page(400, 'Connection expired', '<p>Return to Expo Go and start a new connection.</p>');
        if (request.method === 'GET') {
          const nonce = secret();
          response.setHeader('Set-Cookie', `fitness_oauth=${nonce}; HttpOnly; SameSite=Lax; Path=/auth/strava; Max-Age=600${origin.startsWith('https:') ? '; Secure' : ''}`);
          return page(200, 'Connect your Strava', `<p>Link your own Strava account to the device where you started this connection. Allow basic activity access to import workouts visible to Everyone or Followers. If you grant broader activity access, Only You activities are included too.</p><form method="post" action="/auth/strava?ticket=${escapeHtml(ticket)}"><input type="hidden" name="csrf" value="${hash(nonce + ':' + ticket)}"><button>Continue to Strava</button></form><p>After approval, switch back to Expo Go.</p>`);
        }
        const submittedOrigin = request.headers.origin;
        if (submittedOrigin && submittedOrigin !== 'null' && submittedOrigin !== origin) return page(403, 'Start again', '<p>Open a new connection from Expo Go.</p>');
        let body = '';
        for await (const chunk of request) {
          body += chunk.toString();
          if (Buffer.byteLength(body) > 4096) return page(413, 'Start again', '<p>Invalid connection form.</p>');
        }
        // Bind the form to both the HttpOnly browser cookie and this ticket.
        // Missing/null Origin is safe only with this proof from our own page.
        const csrf = new URLSearchParams(body).get('csrf');
        const state = secret();
        if (!browser || csrf !== hash(browser + ':' + ticket) || !db.start(ticket, browser, state)) return page(400, 'Start again', '<p>Open a new connection from Expo Go.</p>');
        const oauth = createOAuthSession({ clientId: env.STRAVA_CLIENT_ID, clientSecret: env.STRAVA_CLIENT_SECRET,
          redirectUri: `${origin}/auth/strava/callback`, state, saveTokens: () => {} });
        response.writeHead(303, { Location: oauth.url }); return response.end();
      }
      if (!path.startsWith('/api/')) return json(404, { error: 'Not found.' });
      const token = request.headers.authorization?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];
      const session = token && db.session(token);
      if (!session) return json(401, { error: 'Session expired. Connect again.' });
      const account = session.account?.startsWith(namespace) ? session.account : null;
      if (path === '/api/session' && request.method === 'GET') return json(200, { connected: !!account, configured, accountKey: account ? hash(account) : null });
      if (path === '/api/logout' && request.method === 'POST') { db.logout(session.id); return json(200, { ok: true }); }
      if (path === '/api/strava/connect' && request.method === 'POST') {
        if (!configured) return json(503, { error: 'Set STRAVA_CLIENT_ID and STRAVA_CLIENT_SECRET in server/.env.' });
        const ticket = db.ticket(session.id);
        return json(200, { code: ticket.toUpperCase().match(/.{4}/g).join('-'), computerUrl: `${origin}/connect` });
      }
      const activityMatch = path.match(/^\/api\/activities\/(-?\d+)$/);
      if (activityMatch && ['GET', 'PUT', 'DELETE'].includes(request.method)) {
        if (!account) return json(409, { error: 'Connect Strava from the dashboard to manage your activities.' });
        const id = Number(activityMatch[1]);
        if (!Number.isSafeInteger(id) || id >= 0) return json(403, { error: 'Strava activities are read-only. Only manual entries can be changed.' });
        if (request.method === 'GET') {
          try { return json(200, { activity: db.manualActivity(account, id) }); }
          catch (error) { if (error.status === 404) return json(404, { error: error.message }); throw error; }
        }
      }
      if ((path === '/api/activities' && request.method === 'POST') || (activityMatch && ['PUT', 'DELETE'].includes(request.method))) {
        if (!account) return json(409, { error: 'Connect Strava from the dashboard before saving activities to your account.' });
        if (request.headers['content-type']?.split(';')[0] !== 'application/json') return json(415, { error: 'Send the activity as JSON.' });
        const chunks = [];
        let bytes = 0;
        for await (const chunk of request) {
          bytes += chunk.length;
          if (bytes > 131072) return json(413, { error: 'Activity is too large. Use fewer exercises or sets.' });
          chunks.push(chunk);
        }
        let input;
        try { input = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return json(400, { error: 'Invalid activity JSON.' }); }
        try {
          const updating = request.method === 'PUT', deleting = request.method === 'DELETE';
          if ((updating || deleting) && (!Number.isSafeInteger(input?.expectedRevision) || input.expectedRevision < 1)) return json(400, { error: 'A valid activity revision is required. Refresh and try again.' });
          const activity = deleting ? null : validateManual(input, clock());
          const result = await exclusive(account, async () => {
            const id = activityMatch ? Number(activityMatch[1]) : null;
            if (deleting) db.deleteManual(account, id, input.expectedRevision);
            const saved = deleting ? null : updating ? db.updateManual(account, id, activity, input.expectedRevision) : db.saveManual(account, activity);
            // Saving a local entry must not depend on a successful Strava request.
            return { activity: saved, dashboard: await dashboard(account).get({ sync: false }) };
          });
          return json(request.method === 'POST' ? 201 : 200, result);
        } catch (error) {
          if ([400, 404, 409, 410].includes(error.status)) return json(error.status, { error: error.message });
          throw error;
        }
      }
      if (['/api/dashboard', '/api/activities'].includes(path) && request.method === 'GET') {
        if (!account) return json(409, { error: 'Connect Strava to view your activities.' });
        try {
          const result = await exclusive(account, async () => {
            const service = dashboard(account);
            const summary = await service.get();
            return path === '/api/dashboard' ? summary : service.activities({
              cursor: url.searchParams.get('cursor') ?? undefined,
              limit: url.searchParams.has('limit') ? Number(url.searchParams.get('limit')) : 50,
            });
          });
          return json(200, result);
        } catch (error) {
          if (error.status === 400) return json(400, { error: error.message });
          throw error;
        }
      }
      return json(404, { error: 'Not found.' });
    } catch {
      return json(502, { error: 'Unable to complete the request. Check backend configuration or try again.' });
    }
  };
  handler.close = () => Promise.all([...services.values()].map(service => service.stop()));
  handler.idle = () => Promise.all([...services.values()].map(service => service.run()));
  return handler;
}
