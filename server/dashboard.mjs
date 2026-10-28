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
  if (fitnessClass === 'cycling') return km / 3;
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
export function activityPage(activities, { cursor, limit = 50 } = {}) {
  const unique = [...new Map(activities.map(activity => [activity.id, activity])).values()]
    .sort((a, b) => b.startDate.localeCompare(a.startDate) || b.id - a.id);
  const index = cursor === undefined ? -1 : unique.findIndex(activity => String(activity.id) === cursor);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100 || (cursor !== undefined && index === -1)) {
    throw Object.assign(new Error('Invalid activity page. Refresh activity history and try again.'), { status: 400 });
  }
  const page = unique.slice(index + 1, index + 1 + limit);
  return { items: page.map(activity => ({ ...activity, classKey: classFor(activity.sportType), xp: activityXp(activity) })),
    total: unique.length, nextCursor: index + 1 + page.length < unique.length ? String(page.at(-1).id) : null };
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
      formula: { running: '1 km = 1 XP', cycling: '3 km = 1 XP', strength: 'Based on total pounds lifted; lifting volume is not available from Strava summaries yet' }[key] };
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

// Each page/result is committed independently. Queue timers never initiate a new
// daily check: only a dashboard visit does that. Pending work can finish off-screen.
export function createDashboardService({ client, clock = Date.now, initial = {}, persist = async () => {}, schedule = (fn, ms) => { const timer = setTimeout(fn, ms); timer.unref?.(); return () => clearTimeout(timer); } }) {
  let state = { activities: [], skillCache: {}, historyComplete: false, ...initial };
  let pending, cancelTimer, stopped = false, lastError = null, retryUntil = state.retryAt || 0;
  const day = value => new Date(value).toISOString().slice(0, 10);
  async function commit(next) {
    await persist(next);
    state = next;
  }
  function needsSkill(a) {
    const key = classFor(a.sportType), entry = state.skillCache[a.id];
    return skillDefinitions[key]?.[0][2] && a.distance >= skillDefinitions[key][0][2]
      && (key === 'running' ? client.details : client.streams)
      && (!entry || entry.fingerprint !== fingerprint(a) || entry.version !== calculationVersion(key));
  }
  function nextWork() {
    if (state.scan || !state.historyComplete) return clock();
    const work = state.activities.filter(needsSkill);
    return work.length ? Math.min(...work.map(a => state.skillCache[a.id]?.retryAt || 0)) : null;
  }
  async function step() {
    if (state.scan || !state.historyComplete) {
      const scan = state.scan;
      const before = scan ? scan.before : state.before;
      const items = await client.activities({ perPage: 200, before, ...(scan ? { after: scan.after } : {}) });
      if (stopped) return;
      const records = new Map(state.activities.map(a => [a.id, a]));
      // Previously imported workouts are immutable; only add new IDs.
      for (const a of items) if (!records.has(a.id)) records.set(a.id, a);
      const cursor = items.length ? Math.floor(Math.min(...items.map(a => Date.parse(a.startDate))) / 1000) : before;
      if (items.length >= 200 && before && cursor >= before) throw new Error('Strava history cursor did not advance.');
      const complete = items.length < 200;
      await commit({ ...state, activities: [...records.values()], syncedAt: clock(), retryAt: null,
        ...(scan ? { scan: complete ? null : { ...scan, before: cursor }, activityCheckAt: complete ? scan.startedAt : state.activityCheckAt }
          : { before: cursor, historyComplete: complete, activityCheckAt: complete ? clock() : state.activityCheckAt }) });
      return;
    }
    const activity = state.activities.filter(needsSkill)
      .filter(a => !(state.skillCache[a.id]?.retryAt > clock()))
      .sort((a, b) => (state.skillCache[a.id]?.attemptedAt || 0) - (state.skillCache[b.id]?.attemptedAt || 0))[0];
    if (!activity) return;
    const key = classFor(activity.sportType);
    try {
      const times = key === 'running' ? runningBestTimes(await client.details(activity.id)) : bestTimes(await client.streams(activity.id), skillDefinitions[key]);
      if (stopped) return;
      await commit({ ...state, retryAt: null, skillCache: { ...state.skillCache,
        [activity.id]: { fingerprint: fingerprint(activity), version: calculationVersion(key), checkedAt: clock(), attemptedAt: clock(), times, unavailable: times === null } } });
    } catch (error) {
      if (stopped) return;
      if (error.rateLimited) throw error;
      await commit({ ...state, skillCache: { ...state.skillCache,
        [activity.id]: { ...state.skillCache[activity.id], attemptedAt: clock(), retryAt: clock() + 15 * 60000 } } });
      lastError = error;
    }
  }
  function arm() {
    cancelTimer?.();
    cancelTimer = null;
    if (stopped) return;
    const work = nextWork();
    if (work !== null) cancelTimer = schedule(() => { cancelTimer = null; void run(); }, Math.max(0, work - clock(), retryUntil - clock()));
  }
  async function run() {
    if (pending) return pending;
    pending = (async () => {
      try {
        while (!stopped && nextWork() !== null && nextWork() <= clock() && !(retryUntil > clock())) {
          await step();
          lastError = null;
        }
      } catch (error) {
        lastError = error;
        retryUntil = error.retryAt || clock() + 60000;
        if (!stopped) {
          try { await commit({ ...state, retryAt: retryUntil }); }
          catch { /* Keep the last committed snapshot on storage failure. */ }
        }
      }
    })().finally(() => { pending = null; arm(); });
    return pending;
  }
  return {
    async get() {
      // A new visit may initiate one daily scan, but a running worker cannot.
      if (!pending && !state.scan && state.historyComplete && day(state.activityCheckAt || state.syncedAt || 0) !== day(clock())) {
        const newest = Math.max(0, ...state.activities.map(a => Date.parse(a.startDate) / 1000));
        await commit({ ...state, scan: { after: Math.max(0, Math.floor(newest) - 1), startedAt: clock() } });
      }
      if (!state.syncedAt) {
        // Only the first page blocks first load; subsequent work runs off-screen.
        if (retryUntil > clock()) throw lastError || new Error('Initial sync paused. Try again after the retry window.');
        if (!pending) {
          pending = step().catch(async error => {
            lastError = error;
            retryUntil = error.retryAt || clock() + 60000;
            try { await commit({ ...state, retryAt: retryUntil }); } catch { /* Retain the last committed snapshot. */ }
            throw error;
          }).finally(() => { pending = null; arm(); });
        }
        await pending;
      }
      arm();
      const result = buildDashboard(state.activities, { historyComplete: state.historyComplete, now: new Date(clock()),
        syncedAt: state.syncedAt ? new Date(state.syncedAt).toISOString() : null, stale: !!lastError,
        skillCache: state.skillCache, skillsStale: state.activities.some(a => needsSkill(a) && state.skillCache[a.id]?.retryAt) });
      const work = nextWork(), retryAt = Math.max(work || 0, retryUntil);
      return { ...result, syncInProgress: work !== null, syncRetryAt: work !== null && retryAt > clock() ? new Date(retryAt).toISOString() : null };
    },
    // Also useful for deterministic queue verification without real timers.
    run,
    activities(options) { return { ...activityPage(state.activities, options), historyComplete: state.historyComplete, source: 'strava' }; },
    async stop() { stopped = true; cancelTimer?.(); await pending?.catch(() => {}); },
  };
}
