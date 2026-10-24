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
