import assert from 'node:assert/strict';
import test from 'node:test';
import { createStravaClient } from './strava.mjs';

test('refreshes once for concurrent requests, persists rotated tokens, and maps activities', async () => {
  let refreshes = 0;
  let saved;
  const client = createStravaClient({
    clientId: 'test-id', clientSecret: 'test-secret', initialTokens: { refresh_token: 'original' },
    saveTokens: async tokens => { saved = tokens; },
    fetchImpl: async (url, options) => {
      if (url.includes('/oauth/token')) {
        refreshes++;
        assert.equal(options.body.get('refresh_token'), 'original');
        return Response.json({ access_token: 'new-access', refresh_token: 'rotated', expires_at: Date.now() / 1000 + 3600 });
      }
      assert.equal(options.headers.Authorization, 'Bearer new-access');
      return Response.json([{ id: 1, name: 'Run', sport_type: 'Run', distance: 5000, moving_time: 1800, total_elevation_gain: 20, start_date: '2026-10-24T12:00:00Z' }]);
    },
  });
  const [activities] = await Promise.all([client.activities(), client.activities()]);
  await client.activities();
  assert.equal(refreshes, 1);
  assert.equal(saved.refresh_token, 'rotated');
  assert.equal(activities[0].movingTime, 1800);
  assert.equal(activities[0].distance, 5000);
});

test('reports rejected Strava credentials without disclosing secrets', async () => {
  const client = createStravaClient({ clientId: 'id', clientSecret: 'secret', initialTokens: { refresh_token: 'private' }, saveTokens: async () => {}, fetchImpl: async () => new Response('', { status: 401 }) });
  await assert.rejects(client.activities(), /Strava token refresh failed \(401\)/);
});

test('requests keyed distance/time streams and treats missing streams as unavailable', async () => {
  let status = 200;
  const client = createStravaClient({ clientId: 'id', clientSecret: 'secret', initialTokens: { access_token: 'test', expires_at: Date.now() / 1000 + 3600 }, saveTokens: async () => {},
    fetchImpl: async (url, options) => {
      assert.match(url, /activities\/42\/streams\?keys=time,distance,altitude&key_by_type=true/);
      assert.equal(options.headers.Authorization, 'Bearer test');
      return status === 200 ? Response.json({ distance: { data: [0, 1000] }, time: { data: [0, 300] } }) : new Response(null, { status });
    } });
  assert.equal((await client.streams(42)).time.data[1], 300);
  status = 404; assert.equal(await client.streams(42), null);
  status = 429; await assert.rejects(client.streams(42), /429/);
});

test('fetches activity details for provider best efforts', async () => {
  const client = createStravaClient({ initialTokens: { access_token: 'test', expires_at: Date.now() / 1000 + 3600 }, saveTokens: async () => {},
    fetchImpl: async (url, options) => { assert.equal(url, 'https://www.strava.com/api/v3/activities/42'); assert.equal(options.headers.Authorization, 'Bearer test'); return Response.json({ best_efforts: [{ distance: 5000, elapsed_time: 1519 }] }); } });
  assert.equal((await client.details(42)).best_efforts[0].elapsed_time, 1519);
});

test('passes incremental pagination and every activity request through the budget', async () => {
  let reservations = 0;
  const urls = [];
  const client = createStravaClient({ initialTokens: { access_token: 'test', expires_at: Date.now() / 1000 + 3600 },
    saveTokens: async () => {}, budget: { request: async fn => { reservations++; return fn(); } },
    fetchImpl: async url => { urls.push(url); return Response.json(url.includes('/athlete/activities') ? [] : {}); } });
  await client.activities({ after: 123, before: 456 });
  await client.details(1); await client.streams(1);
  assert.equal(reservations, 3);
  assert.match(urls[0], /per_page=200&before=456&after=123/);
});
