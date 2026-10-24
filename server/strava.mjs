export function createStravaClient({ clientId, clientSecret, initialTokens, saveTokens, fetchImpl = fetch }) {
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
    async activities() {
      const token = await accessToken();
      const response = await fetchImpl('https://www.strava.com/api/v3/athlete/activities?per_page=30', {
        headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) throw new Error(`Strava activities request failed (${response.status}).`);
      const data = await response.json();
      return data.map(item => ({ id: item.id, name: item.name, sportType: item.sport_type, distance: item.distance, movingTime: item.moving_time, elevationGain: item.total_elevation_gain, startDate: item.start_date }));
    },
  };
}
