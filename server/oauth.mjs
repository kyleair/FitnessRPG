import { randomBytes } from 'node:crypto';

export function createOAuthSession({ clientId, clientSecret, redirectUri, saveTokens, fetchImpl = fetch, state = randomBytes(32).toString('hex') }) {
  const url = new URL('https://www.strava.com/oauth/authorize');
  for (const [key, value] of Object.entries({ client_id: clientId, redirect_uri: redirectUri,
    response_type: 'code', approval_prompt: 'force', scope: 'activity:read_all', state })) url.searchParams.set(key, value);
  let completed = false;
  return {
    url: url.href,
    async complete(callback) {
      if (completed) throw new Error('Authorization already completed.');
      if (callback.searchParams.get('state') !== state) throw new Error('Invalid authorization state. Start again.');
      if (callback.searchParams.has('error')) throw new Error('Strava authorization was declined.');
      const scopes = (callback.searchParams.get('scope') || '').split(/[ ,]+/);
      if (!scopes.includes('activity:read_all')) throw new Error('Activity permission is required. Start again and approve activity access.');
      const code = callback.searchParams.get('code');
      if (!code) throw new Error('Authorization code missing. Start again.');
      completed = true;
      const response = await fetchImpl('https://www.strava.com/oauth/token', {
        method: 'POST', signal: AbortSignal.timeout(15000),
        body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, code,
          grant_type: 'authorization_code', redirect_uri: redirectUri }),
      });
      if (!response.ok) throw new Error(`Strava authorization exchange failed (${response.status}). Start again.`);
      await saveTokens(await response.json());
    },
  };
}
