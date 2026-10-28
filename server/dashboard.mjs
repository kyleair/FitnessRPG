import { skillDefinitions, calculationVersion, fingerprint, bestTimes, runningBestTimes, classSkills } from './skills.mjs';
const classTypes = {
  running: ['Run', 'TrailRun', 'VirtualRun'],
  strength: ['WeightTraining'],
  cycling: ['Ride', 'VirtualRide', 'MountainBikeRide', 'GravelRide'],
};
const labels = { running: 'Running', strength: 'Strength', cycling: 'Cycling' };
export function classFor(type) {
  return Object.keys(classTypes).find(key => classTypes[key].includes(type)) ?? null;
}
export function activityXp(activity) {
  const fitnessClass = classFor(activity.sportType);
  const km = Math.max(0, activity.distance || 0) / 1000;
  if (fitnessClass === 'running') return km;
  if (fitnessClass === 'cycling') return km / 5;
  // Strava summaries contain no sets, reps, or weights. Never substitute duration for lifting volume.
  if (fitnessClass === 'strength') return 0;
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
export function buildDashboard(activities, { now = new Date(), historyComplete = false, syncedAt = null, stale = false, skillCache = {}, skillsStale = false } = {}) {
  const unique = [...new Map(activities.map(activity => [activity.id, activity])).values()]
    .sort((a, b) => b.startDate.localeCompare(a.startDate));
  const month = now.toISOString().slice(0, 7);
  const classes = Object.keys(classTypes).map(key => {
    const items = unique.filter(activity => classFor(activity.sportType) === key);
    const xp = items.reduce((total, activity) => total + activityXp(activity), 0);
    return { key, name: labels[key], skills: classSkills(key, items, skillCache), xp, ...progression(xp), activityCount: items.length,
      distanceKm: items.reduce((total, activity) => total + activity.distance, 0) / 1000,
      minutes: items.reduce((total, activity) => total + activity.movingTime, 0) / 60,
      xpUnavailable: key === 'strength',
      formula: { running: '1 km = 1 XP', cycling: '5 km = 1 XP', strength: 'Based on total pounds lifted; lifting volume is not available from Strava summaries yet' }[key] };
  });
  return {
    source: 'strava', syncedAt, stale, skillsStale,
    skillsUnavailable: unique.filter(a => skillCache[a.id]?.unavailable && skillCache[a.id]?.fingerprint === fingerprint(a)).length,
    skillsPending: unique.filter(a => skillDefinitions[classFor(a.sportType)]?.[0][2] && a.distance >= skillDefinitions[classFor(a.sportType)][0][2] && (!skillCache[a.id] || skillCache[a.id].fingerprint !== fingerprint(a) || skillCache[a.id].version !== calculationVersion(classFor(a.sportType)))).length, historyComplete, importedCount: unique.length,
    month, monthlyDistanceKm: unique.filter(activity => activity.startDate.slice(0, 7) === month)
      .reduce((total, activity) => total + activity.distance, 0) / 1000,
    classes, recentActivities: unique.slice(0, 30).map(activity => ({ ...activity, classKey: classFor(activity.sportType), xp: activityXp(activity) })),
  };
}

// One import per minute, shared by concurrent requests. History progresses one page
// per refresh; at most two activity-list calls and three skill-detail/stream calls.
export function createDashboardService({ client, clock = () => Date.now(), initial = {}, persist = async () => {} }) {
  let records = new Map((initial.activities || []).map(activity => [activity.id, activity]));
  let { before, historyComplete = false, syncedAt = null } = initial;
  let skillCache = initial.skillCache || {}, skillsStale = false;
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
    // Keep enrichment bounded and cache per activity across process restarts.
    const nextCache = Object.fromEntries(Object.entries(skillCache).filter(([id]) => staged.has(Number(id))));
    let attempts = 0;
    skillsStale = false;
    for (const activity of [...staged.values()].sort((a, b) => (nextCache[a.id]?.attemptedAt || 0) - (nextCache[b.id]?.attemptedAt || 0))) {
      const classKey = classFor(activity.sportType);
      const definitions = skillDefinitions[classKey];
      if (!definitions?.[0][2] || activity.distance < definitions[0][2] || !(classKey === 'running' ? client.details : client.streams)) continue;
      const cached = nextCache[activity.id];
      const matching = cached?.fingerprint === fingerprint(activity) && cached?.version === calculationVersion(classKey);
      if (matching && clock() - cached.checkedAt < 86400000) continue;
      if (cached?.retryAt > clock()) { skillsStale = true; continue; }
      if (attempts++ >= 3) break;
      try {
        const times = classKey === 'running'
          ? runningBestTimes(await client.details(activity.id))
          : bestTimes(await client.streams(activity.id), definitions);
        nextCache[activity.id] = { fingerprint: fingerprint(activity), version: calculationVersion(classKey), checkedAt: clock(), attemptedAt: clock(), times, unavailable: times === null };
      } catch {
        skillsStale = true;
        nextCache[activity.id] = { ...cached, attemptedAt: clock(), retryAt: clock() + 60000 };
      }
    }
    const nextSyncedAt = clock();
    await persist({ skillCache: nextCache, activities: [...staged.values()], before: nextBefore, historyComplete: nextComplete, syncedAt: nextSyncedAt });
    records = staged;
    skillCache = nextCache;
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
        syncedAt: syncedAt ? new Date(syncedAt).toISOString() : null, stale: !!lastError, skillCache, skillsStale });
    },
  };
}
