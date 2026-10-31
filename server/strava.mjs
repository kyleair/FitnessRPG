export function createStravaClient({ clientId, clientSecret, initialTokens, saveTokens, fetchImpl = fetch, budget }) {
  let tokens = initialTokens;
  let pendingRefresh;
  async function accessToken() {
    if (tokens.access_token && tokens.expires_at > Date.now() / 1000 + 60) return tokens.access_token;
    if (!pendingRefresh) {
      pendingRefresh = (async () => {
        const response = await fetchImpl('https://www.strava.com/oauth/token', {
          method: 'POST',
          body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, grant_type: 'refresh_token', refresh_token: tokens.refresh_token }),
          signal: AbortSignal.timeout(15000),
        });
        if (!response.ok) throw new Error(`Strava token refresh failed (${response.status}). Check your credentials.`);
        const next = await response.json();
        if (!next.access_token || !next.refresh_token || !next.expires_at) throw new Error('Invalid Strava token response.');
        await saveTokens(next);
        tokens = next;
        return tokens.access_token;
      })().finally(() => { pendingRefresh = undefined; });
    }
    return pendingRefresh;
  }
  return {
    async details(id) {
      const token = await accessToken();
      const response = await request(`https://www.strava.com/api/v3/activities/${id}`, {
        headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15000),
      });
      if (response.status === 404) return null;
      if (!response.ok) throw new Error(`Strava activity details request failed (${response.status}).`);
      return response.json();
    },
    async streams(id) {
      const token = await accessToken();
      const response = await request(`https://www.strava.com/api/v3/activities/${id}/streams?keys=time,distance,altitude&key_by_type=true`, {
        headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15000),
      });
      if (response.status === 404) return null;
      if (!response.ok) throw new Error(`Strava streams request failed (${response.status}).`);
      return response.json();
    },
    async activities({ perPage = 200, before, after } = {}) {
      const token = await accessToken();
      const query = new URLSearchParams({ per_page: String(perPage) });
      if (before) query.set('before', String(before));
      if (after !== undefined) query.set('after', String(after));
      const response = await request(`https://www.strava.com/api/v3/athlete/activities?${query}`, {
        headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) throw new Error(`Strava activities request failed (${response.status}).`);
      const data = await response.json();
      if (!Array.isArray(data)) throw new Error('Invalid Strava activities response.');
      const amount = value => Number.isFinite(value) ? Math.max(0, value) : 0;
      return data.filter(item => Number.isFinite(item.id) && Number.isFinite(Date.parse(item.start_date)))
        .map(item => ({ id: item.id, name: String(item.name || 'Untitled activity'), sportType: item.sport_type || item.type || 'Workout',
          distance: amount(item.distance), movingTime: amount(item.moving_time), elevationGain: Number.isFinite(item.total_elevation_gain) && item.total_elevation_gain >= 0 ? item.total_elevation_gain : null, startDate: item.start_date }));
    },
  };
  function request(url, options) {
    return budget ? budget.request(() => fetchImpl(url, options)) : fetchImpl(url, options);
  }
}
