// One gate per Strava application, shared by every athlete in this process.
// Persist reservations before sending requests so a restart cannot reset usage.
export function createApiBudget({ clock = Date.now, initial = {}, persist = () => {} } = {}) {
  let state = initial;
  let pending = Promise.resolve();
  const window = 15 * 60000, day = 86400000;
  function refresh() {
    const now = clock();
    state = { ...state };
    if (state.window !== Math.floor(now / window)) {
      state.window = Math.floor(now / window);
      state.shortUsed = 0;
      state.overallShortUsed = 0;
    }
    if (state.day !== Math.floor(now / day)) {
      state.day = Math.floor(now / day);
      state.dailyUsed = 0;
      state.overallDailyUsed = 0;
    }
  }
  function retryAt() {
    refresh();
    let until = state.blockedUntil || 0;
    if (state.shortUsed >= (state.shortLimit ?? 25) || state.overallShortUsed >= (state.overallShortLimit ?? 200)) until = Math.max(until, (state.window + 1) * window + 1000);
    if (state.dailyUsed >= (state.dailyLimit ?? 1000) || state.overallDailyUsed >= (state.overallDailyLimit ?? 2000)) until = Math.max(until, (state.day + 1) * day + 1000);
    return until > clock() ? until : null;
  }
  return {
    retryAt,
    request(fetchResponse) {
      const task = pending.catch(() => {}).then(async () => {
        const until = retryAt();
        if (until) throw Object.assign(new Error('Strava API budget paused.'), { retryAt: until, rateLimited: true });
        for (const key of ['shortUsed', 'dailyUsed', 'overallShortUsed', 'overallDailyUsed']) state[key] = (state[key] || 0) + 1;
        await persist(state);
        const response = await fetchResponse();
        const pair = name => {
          const raw = response.headers.get(name);
          if (!raw) return null;
          const values = raw.split(',').map(Number);
          return values.length === 2 && values.every(v => Number.isFinite(v) && v >= 0) ? values : null;
        };
        for (const [header, keys] of [
          ['x-readratelimit-limit', ['shortLimit', 'dailyLimit']],
          ['x-readratelimit-usage', ['shortUsed', 'dailyUsed']],
          ['x-ratelimit-limit', ['overallShortLimit', 'overallDailyLimit']],
          ['x-ratelimit-usage', ['overallShortUsed', 'overallDailyUsed']],
        ]) {
          const values = pair(header);
          if (values) keys.forEach((key, index) => { state[key] = header.endsWith('usage') ? Math.max(state[key] || 0, values[index]) : values[index]; });
        }
        if (response.status === 429) {
          const seconds = Number(response.headers.get('retry-after'));
          const date = Date.parse(response.headers.get('retry-after'));
          state.blockedUntil = Math.max((state.window + 1) * window + 1000,
            Number.isFinite(seconds) ? clock() + seconds * 1000 : Number.isFinite(date) ? date : 0);
        }
        await persist(state);
        if (response.status === 429) throw Object.assign(new Error('Strava API request failed (429).'), { retryAt: retryAt(), rateLimited: true });
        return response;
      });
      pending = task;
      return task;
    },
  };
}
