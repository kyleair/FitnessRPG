import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { openDatabase } from './database.mjs';
import { createApp } from './app.mjs';

test('browser connection isolates athletes and persists sessions, rotating tokens and imports across restarts', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'fitness-auth-'));
  const path = join(directory, 'test.sqlite');
  let now = Date.now(), db = openDatabase(path, () => now), app;
  const server = createServer((req, res) => app(req, res));
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const origin = `http://127.0.0.1:${server.address().port}`;
  const env = { PUBLIC_BACKEND_URL: origin, STRAVA_CLIENT_ID: 'test', STRAVA_CLIENT_SECRET: 'test-secret' };
  let activityCalls = 0, refreshCalls = 0, offline = false;
  const fetchImpl = async (url, options) => {
    if (offline) throw new Error('Offline');
    if (url.endsWith('/oauth/token')) {
      const refresh = options.body.get('grant_type') === 'refresh_token';
      if (refresh) refreshCalls++;
      const id = refresh ? Number(options.body.get('refresh_token').split('-')[1]) : Number(options.body.get('code'));
      return Response.json({ access_token: `access-${id}`, refresh_token: `refresh-${id}-${refreshCalls}`,
        expires_at: refresh ? now / 1000 + 10000 : 1, athlete: { id } });
    }
    activityCalls++;
    const id = Number(options.headers.Authorization.split('-')[1]);
    return Response.json([{ id: id * 10, name: `Athlete ${id} run`, sport_type: 'Run', distance: id * 1000,
      moving_time: 600, start_date: '2026-10-24T12:00:00Z' }]);
  };
  const restart = () => { db.close(); db = openDatabase(path, () => now); app = createApp({ db, env, fetchImpl, clock: () => now }); };
  app = createApp({ db, env, fetchImpl, clock: () => now });
  t.after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); db.close(); await rm(directory, { recursive: true, force: true }); });
  const request = (path, token, method = 'GET', extra = {}) => fetch(origin + path, { method, redirect: 'manual', headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...extra } });
  const newSession = async () => (await (await request('/api/session', null, 'POST')).json()).token;
  async function begin(token, formOrigin = origin) {
    const { url } = await (await request('/api/strava/connect', token, 'POST')).json();
    assert.ok(!url.includes(token));
    const page = await fetch(url, { headers: { Origin: 'null' } });
    const cookie = page.headers.get('set-cookie').split(';')[0];
    const html = await page.text();
    assert.match(html, /Continue to Strava/);
    const csrf = html.match(/name="csrf" value="([a-f0-9]+)"/)[1];
    const headers = { Cookie: cookie, ...(formOrigin ? { Origin: formOrigin } : {}) };
    assert.equal((await fetch(url, { method: 'POST', headers })).status, 400, 'missing CSRF proof is rejected');
    assert.equal((await fetch(url, { method: 'POST', headers, body: 'csrf=incorrect' })).status, 400);
    assert.equal((await fetch(url, { method: 'POST', headers: { ...headers, Origin: 'https://evil.example' }, body: new URLSearchParams({ csrf }) })).status, 403);
    const redirect = await fetch(url, { method: 'POST', redirect: 'manual', headers, body: new URLSearchParams({ csrf }) });
    assert.equal(redirect.status, 303);
    const consent = new URL(redirect.headers.get('location'));
    assert.equal(consent.searchParams.get('redirect_uri'), origin + '/auth/strava/callback');
    return { state: consent.searchParams.get('state'), cookie };
  }
  const callback = (flow, id, scope = 'read,activity:read_all') => request(`/auth/strava/callback?state=${flow.state}&code=${id}&scope=${scope}`, null, 'GET', { Cookie: flow.cookie });
  assert.equal((await request('/api/dashboard')).status, 401);
  const a = await newSession(), b = await newSession();
  assert.equal((await request('/api/dashboard', b)).status, 409);
  const flow = await begin(a, 'null');
  assert.equal((await callback({ ...flow, cookie: 'fitness_oauth=wrong' }, 1)).status, 400);
  restart(); // A pending browser authorization also survives a restart.
  assert.equal((await callback(flow, 1)).status, 200);
  assert.equal((await callback(flow, 1)).status, 400);
  assert.equal((await callback(await begin(b, null), 2)).status, 200);
  const [one, two] = await Promise.all([request('/api/dashboard', a).then(r => r.json()), request('/api/dashboard', b).then(r => r.json())]);
  assert.equal(one.recentActivities[0].id, 10);
  assert.equal(two.recentActivities[0].id, 20);
  assert.equal(refreshCalls, 2);
  assert.equal(activityCalls, 2);
  const account = db.session(a).account;
  const rotated = db.tokens(account).refresh_token;
  assert.match(rotated, /^refresh-1-[12]$/);
  restart();
  assert.equal(db.tokens(account).refresh_token, rotated);
  assert.equal((await (await request('/api/session', a)).json()).connected, true);
  assert.equal((await (await request('/api/dashboard', a)).json()).recentActivities[0].id, 10);
  assert.equal(activityCalls, 2, 'restart reuses persisted cooldown and snapshot');
  now += 61000; offline = true;
  const cached = await (await request('/api/dashboard', a)).json();
  assert.equal(cached.stale, true); assert.equal(cached.importedCount, 1);
  assert.equal((await request('/api/session', a, 'GET', { Origin: 'https://evil.example' })).status, 403);
  assert.equal((await request('/api/session', a, 'GET', { Origin: 'null' })).status, 403);
  assert.equal((await request('/api/dashboard', a, 'OPTIONS', { Origin: 'http://localhost:8081' })).status, 204);
  await request('/api/logout', a, 'POST');
  assert.equal((await request('/api/dashboard', a)).status, 401);
  assert.equal((await (await request('/api/session', b)).json()).connected, true);
  offline = false;
  const c = await newSession();
  assert.equal((await callback(await begin(c), 3, 'read')).status, 400);
  assert.equal((await (await request('/api/session', c)).json()).connected, false);
  const expired = await begin(c); now += 600001;
  assert.equal((await callback(expired, 3)).status, 400);
  const pendingLogout = await begin(c); await request('/api/logout', c, 'POST');
  assert.equal((await callback(pendingLogout, 3)).status, 400);
  env.STRAVA_CLIENT_SECRET = 'different'; restart();
  assert.equal((await (await request('/api/session', b)).json()).connected, false);
  now += 91 * 86400000;
  assert.equal((await request('/api/session', b)).status, 401);
});
