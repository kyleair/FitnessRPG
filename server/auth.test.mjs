import assert from 'node:assert/strict';
import test from 'node:test';
import { createOAuthSession } from './oauth.mjs';

for (const scope of ['activity:read_all', 'activity:read,activity:read_all']) {
  test(`accepts granted ${scope} while requesting basic access`, async () => {
    let saved = false;
    const session = createOAuthSession({ clientId: 'id', clientSecret: 'secret', redirectUri: 'http://127.0.0.1/callback',
      saveTokens: async () => { saved = true; }, fetchImpl: async () => Response.json({ access_token: 'test' }) });
    const authorization = new URL(session.url);
    assert.equal(authorization.searchParams.get('scope'), 'activity:read');
    const callback = new URL('http://127.0.0.1/callback');
    callback.search = new URLSearchParams({ scope, code: 'code', state: authorization.searchParams.get('state') }).toString();
    await session.complete(callback);
    assert.equal(saved, true);
  });
}

test('OAuth validates state and activity permission before exchanging a code', async () => {
  let calls = 0;
  let saved;
  const session = createOAuthSession({ clientId: 'id', clientSecret: 'secret', redirectUri: 'http://127.0.0.1:3002/strava/callback',
    saveTokens: async tokens => { saved = tokens; },
    fetchImpl: async (url, options) => {
      calls++;
      assert.equal(url, 'https://www.strava.com/oauth/token');
      assert.equal(options.body.get('code'), 'one-time-code');
      assert.equal(options.body.get('client_secret'), 'secret');
      return Response.json({ access_token: 'access', refresh_token: 'refresh', expires_at: 9999999999 });
    },
  });
  const authorization = new URL(session.url);
  assert.equal(authorization.searchParams.get('scope'), 'activity:read');
  assert.equal(authorization.searchParams.has('client_secret'), false);
  const callback = new URL('http://127.0.0.1:3002/strava/callback?code=one-time-code&scope=activity:read&state=wrong');
  await assert.rejects(session.complete(callback), /Invalid authorization state/);
  callback.searchParams.set('state', authorization.searchParams.get('state'));
  callback.searchParams.set('scope', 'read');
  await assert.rejects(session.complete(callback), /Activity permission/);
  assert.equal(calls, 0);
  callback.searchParams.set('scope', 'read,activity:read');
  await session.complete(callback);
  assert.equal(calls, 1);
  assert.equal(saved.refresh_token, 'refresh');
  await assert.rejects(session.complete(callback), /already completed/);
});

test('OAuth denial makes no token request', async () => {
  const session = createOAuthSession({ clientId: 'id', clientSecret: 'secret', redirectUri: 'http://127.0.0.1:3002/strava/callback',
    saveTokens: async () => assert.fail('must not save'), fetchImpl: async () => assert.fail('must not fetch') });
  const callback = new URL('http://127.0.0.1:3002/strava/callback?error=access_denied');
  callback.searchParams.set('state', new URL(session.url).searchParams.get('state'));
  await assert.rejects(session.complete(callback), /declined/);
});
