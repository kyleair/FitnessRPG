const domainTypes = {
  running: ['Run', 'TrailRun', 'VirtualRun'],
  strength: ['WeightTraining'],
  cycling: ['Ride', 'VirtualRide', 'MountainBikeRide', 'GravelRide'],
  swimming: ['Swim'],
};
const labels = { running: 'Running', strength: 'Strength', cycling: 'Cycling', swimming: 'Swimming' };
export function domainFor(type) {
  return Object.keys(domainTypes).find(key => domainTypes[key].includes(type)) ?? null;
}
export function activityXp(activity) {
  const domain = domainFor(activity.sportType);
  const km = Math.max(0, activity.distance || 0) / 1000;
  if (domain === 'running') return km;
  if (domain === 'cycling') return km / 5;
  if (domain === 'swimming') return km * 4;
  if (domain === 'strength') return Math.max(0, activity.movingTime || 0) / 600;
  return 0;
}
export function progression(xp) {
  let level = 0, currentXp = Math.max(0, xp), nextLevelXp = 5;
  while (currentXp >= nextLevelXp) {
    currentXp -= nextLevelXp;
    level++;
    nextLevelXp = Math.ceil(nextLevelXp * 1.4);
  }
  return { level, currentXp, nextLevelXp, progress: currentXp / nextLevelXp };
}
export function buildDashboard(activities, { now = new Date(), historyComplete = false, syncedAt = null, stale = false } = {}) {
  const unique = [...new Map(activities.map(activity => [activity.id, activity])).values()]
    .sort((a, b) => b.startDate.localeCompare(a.startDate));
  const month = now.toISOString().slice(0, 7);
  const domains = Object.keys(domainTypes).map(key => {
    const items = unique.filter(activity => domainFor(activity.sportType) === key);
    const xp = items.reduce((total, activity) => total + activityXp(activity), 0);
    return { key, name: labels[key], xp, ...progression(xp), activityCount: items.length,
      distanceKm: items.reduce((total, activity) => total + activity.distance, 0) / 1000,
      minutes: items.reduce((total, activity) => total + activity.movingTime, 0) / 60,
      formula: { running: '1 km = 1 XP', cycling: '5 km = 1 XP', swimming: '250 m = 1 XP', strength: '10 min = 1 XP' }[key] };
  });
  return {
    source: 'strava', syncedAt, stale, historyComplete, importedCount: unique.length,
    month, monthlyDistanceKm: unique.filter(activity => activity.startDate.slice(0, 7) === month)
      .reduce((total, activity) => total + activity.distance, 0) / 1000,
    domains, recentActivities: unique.slice(0, 30).map(activity => ({ ...activity, domain: domainFor(activity.sportType), xp: activityXp(activity) })),
  };
}

// One import per minute, shared by concurrent requests. History progresses one page
// per refresh; at most two activity-list calls, no per-activity detail calls.
export function createDashboardService({ client, clock = () => Date.now(), initial = {}, persist = async () => {} }) {
  let records = new Map((initial.activities || []).map(activity => [activity.id, activity]));
  let { before, historyComplete = false, syncedAt = null } = initial;
  let pending;
  let lastAttempt = syncedAt, lastError = null;
  async function sync() {
    const staged = new Map(records);
    let nextBefore = before, nextComplete = historyComplete;
    const latest = await client.activities({ perPage: 100 });
    // Reconcile edits/deletions within the latest page's time window.
    if (latest.length) {
      const oldest = latest[latest.length - 1].startDate;
      for (const [id, activity] of staged) if (activity.startDate >= oldest) staged.delete(id);
    } else staged.clear();
    for (const activity of latest) staged.set(activity.id, activity);
    if (!before) {
      nextComplete = latest.length < 100;
      nextBefore = latest.length ? Math.floor(Date.parse(latest[latest.length - 1].startDate) / 1000) : undefined;
    } else if (!historyComplete) {
      const older = await client.activities({ perPage: 100, before });
      for (const activity of older) staged.set(activity.id, activity);
      nextComplete = older.length < 100;
      if (older.length) nextBefore = Math.floor(Date.parse(older[older.length - 1].startDate) / 1000);
    }
    if (!latest.length) nextComplete = true;
    const nextSyncedAt = clock();
    await persist({ activities: [...staged.values()], before: nextBefore, historyComplete: nextComplete, syncedAt: nextSyncedAt });
    records = staged;
    before = nextBefore;
    historyComplete = nextComplete;
    syncedAt = nextSyncedAt;
  }
  return {
    async get() {
      if (pending || lastAttempt === null || clock() - lastAttempt >= 60000) {
        if (!pending) {
          lastAttempt = clock();
          pending = sync().then(() => { lastError = null; }).catch(error => {
            lastError = error;
          }).finally(() => { pending = undefined; });
        }
        await pending;
      }
      if (lastError && !syncedAt) throw lastError;
      return buildDashboard([...records.values()], { now: new Date(clock()), historyComplete,
        syncedAt: syncedAt ? new Date(syncedAt).toISOString() : null, stale: !!lastError });
    },
  };
}
