import assert from 'node:assert/strict';
import test from 'node:test';
import { activityXp, activityPage, buildDashboard, createDashboardService, progression } from './dashboard.mjs';
const activity = (id, sportType = 'Run', distance = 5000, startDate = '2026-10-25T08:00:00Z') => ({ id, name: 'Example', sportType, distance, startDate, movingTime: 1800, elevationGain: 20 });

test('aggregates each class, deduplicates IDs, and excludes other sports from XP', () => {
  const run = activity(1);
  const result = buildDashboard([run, run, activity(2, 'Ride', 25000), activity(3, 'Swim', 1000), activity(4, 'WeightTraining', 0), activity(5, 'Walk', 2000)], { now: new Date('2026-10-25T12:00:00Z') });
  assert.equal(result.importedCount, 5);
  assert.equal(result.monthlyDistanceKm, 33);
  assert.deepEqual(result.classes.map(fitnessClass => fitnessClass.xp), [5, 0, 25 / 3]);
  assert.equal(result.classes[0].level, 1);
  assert.equal(result.classes[2].formula, '3 km = 1 XP');
  assert.equal(result.recentActivities.find(item => item.id === 2).xp, 25 / 3);
  assert.deepEqual(result.classes.map(item => item.key), ['running', 'strength', 'cycling']);
  assert.equal(result.classes[1].xpUnavailable, true);
  assert.equal(result.recentActivities.find(item => item.id === 1).classKey, 'running');
  assert.equal(result.recentActivities.find(item => item.id === 3).classKey, null);
  assert.equal(activityXp(activity(7, 'WeightTraining', 0)), 0);
  assert.equal(activityXp(activity(8, 'Swim', 1000)), 0);
  assert.equal(result.recentActivities.find(item => item.id === 5).xp, 0);
  assert.equal(activityXp(activity(6, 'EBikeRide', 10000)), 0);
});

test('handles level boundaries and UTC month boundaries without fabricating performance', () => {
  assert.deepEqual(progression(5), { level: 1, currentXp: 0, nextLevelXp: 7, progress: 0 });
  assert.equal(progression(12).level, 2);
  assert.equal(progression(22).level, 3);
  const result = buildDashboard([activity(1, 'Run', 5000, '2026-09-30T23:59:59Z'), activity(2, 'Run', 2000, '2026-10-01T00:00:00Z')], { now: new Date('2026-10-25T12:00:00Z') });
  assert.equal(result.monthlyDistanceKm, 2);
  assert.equal(result.classes[0].xp, 7);
  assert.equal(result.historyComplete, false);
  assert.equal(buildDashboard([]).classes.every(fitnessClass => fitnessClass.level === 0), true);
});

const noTimers = () => () => {};
async function drain(service) { await service.get(); await service.run(); return service.get(); }

test('imports 550 summaries in three pages, persists each page and resumes after restart', async () => {
  const all = Array.from({ length: 550 }, (_, i) => activity(i + 1, 'Swim', 1000, new Date(Date.UTC(2026, 9, 25) - i * 86400000).toISOString()));
  let saved, calls = 0;
  const client = { activities: async ({ before, perPage }) => {
    calls++; assert.equal(perPage, 200);
    return all.filter(a => !before || Date.parse(a.startDate) / 1000 < before).slice(0, perPage);
  } };
  const options = { client, schedule: noTimers, persist: async value => { saved = structuredClone(value); } };
  const first = createDashboardService(options);
  assert.equal((await first.get()).importedCount, 200);
  assert.equal(saved.activities.length, 200);
  first.stop();
  const restored = createDashboardService({ ...options, initial: saved });
  const result = await drain(restored);
  assert.equal(result.importedCount, 550);
  assert.equal(result.historyComplete, true);
  assert.equal(calls, 3);
});

test('checks new activities once per UTC day on visits, paginates and retains old summaries', async () => {
  let now = Date.parse('2026-10-25T12:00:00Z'), calls = 0, saved;
  const old = activity(1);
  let newer = [];
  const client = { activities: async ({ after, before }) => {
    calls++;
    if (after === undefined) return [old];
    return [...newer, old].filter(a => Date.parse(a.startDate) / 1000 > after && (!before || Date.parse(a.startDate) / 1000 < before)).slice(0, 200);
  } };
  const options = { client, clock: () => now, schedule: noTimers, persist: async value => { saved = structuredClone(value); } };
  let service = createDashboardService(options);
  await drain(service);
  await drain(service); assert.equal(calls, 1);
  service.stop(); service = createDashboardService({ ...options, initial: saved });
  await drain(service); assert.equal(calls, 1);
  now += 86400000;
  // A background queue alone must not start a daily scan.
  await service.run(); assert.equal(calls, 1);
  newer = Array.from({ length: 205 }, (_, i) => activity(i + 2, 'Swim', 1000, new Date(now - i * 1000).toISOString()));
  const result = await drain(service);
  assert.equal(calls, 3); assert.equal(result.importedCount, 206);
  await drain(service); assert.equal(calls, 3);
});

test('failures preserve committed pages, back off, and resume the same cursor', async () => {
  let now = Date.parse('2026-10-25T12:00:00Z'), calls = 0, fail = true;
  const page = Array.from({ length: 200 }, (_, i) => activity(i, 'Swim', 1000, new Date(now - i * 1000).toISOString()));
  const client = { activities: async ({ before }) => { calls++; if (!before) return page; if (fail) throw Object.assign(new Error('budget'), { retryAt: now + 900000 }); return []; } };
  const service = createDashboardService({ client, clock: () => now, schedule: noTimers });
  const result = await drain(service);
  assert.equal(result.importedCount, 200); assert.equal(result.stale, true);
  await service.run(); assert.equal(calls, 2);
  now += 900001; fail = false;
  assert.equal((await drain(service)).historyComplete, true);
  assert.equal(calls, 3);
});

test('failed disk writes retain committed data', async () => {
  let fail = false;
  const service = createDashboardService({ schedule: noTimers, client: { activities: async () => [activity(1)], details: async () => ({ best_efforts: [] }) },
    persist: async () => { if (fail) throw new Error('disk full'); } });
  await service.get(); fail = true;
  await service.run();
  assert.equal((await service.get()).importedCount, 1);
  assert.equal((await service.get()).skillsPending, 1);
  service.stop();
});

test('empty accounts complete and initial errors do not switch to demo', async () => {
  await assert.rejects(createDashboardService({ schedule: noTimers, client: { activities: async () => { throw new Error('offline'); } } }).get(), /offline/);
  assert.equal((await drain(createDashboardService({ schedule: noTimers, client: { activities: async () => [] } }))).historyComplete, true);
});

test('class XP reflects corrections and deletions independently of personal bests', () => {
  const runs = [activity(1), activity(2, 'Run', 2000)];
  assert.equal(buildDashboard(runs).classes[0].xp, 7);
  assert.equal(buildDashboard([runs[0], { ...runs[1], distance: 1000 }]).classes[0].xp, 6);
  assert.equal(buildDashboard([runs[1]]).classes[0].xp, 2);
});

test('queue automatically continues and wakes after budget pauses without another visit', async () => {
  let now = Date.UTC(2026, 9, 28, 12), scheduled, fail = true, calls = 0;
  const service = createDashboardService({ clock: () => now,
    schedule: (fn, ms) => { scheduled = { fn, ms }; return () => { scheduled = null; }; },
    client: { activities: async () => [activity(1)], details: async () => {
      calls++;
      if (fail) throw Object.assign(new Error('budget'), { rateLimited: true, retryAt: now + 900000 });
      return { best_efforts: [{ distance: 5000, elapsed_time: 1500 }] };
    } } });
  await service.get();
  assert.equal(scheduled.ms, 0);
  { const fn = scheduled.fn; scheduled = null; fn(); } await service.run();
  assert.equal(scheduled.ms, 900000);
  now += 900001; fail = false;
  { const fn = scheduled.fn; scheduled = null; fn(); } await service.run();
  assert.equal(calls, 2);
  assert.equal(scheduled, null);
  assert.equal((await service.get()).skillsPending, 0);
  await service.stop();
});

test('legacy saved summaries and skills survive daily checks without being rewritten or refetched', async () => {
  const now = Date.UTC(2026, 9, 28, 12), old = activity(1), seen = [];
  const skillCache = { 1: { fingerprint: JSON.stringify([old.sportType, old.distance, old.movingTime, old.startDate]), version: 2,
    times: { '5k': 1500000 }, checkedAt: now - 10 * 86400000 } };
  const service = createDashboardService({ schedule: noTimers, clock: () => now,
    initial: { activities: [old], skillCache, historyComplete: true, syncedAt: now - 86400000 },
    client: { activities: async () => [{ ...old, distance: 9999 }, activity(2, 'Run', 6000, '2026-10-28T08:00:00Z')],
      details: async id => { seen.push(id); return { best_efforts: [] }; } } });
  const result = await drain(service);
  assert.deepEqual(seen, [2]);
  assert.equal(result.classes[0].xp, 11);
  assert.equal(result.classes[0].skills.find(skill => skill.key === 'running_5k').best.timeMs, 1500000);
  assert.equal(result.importedCount, 2);
  await service.stop();
});

test('activity pages expose all 550 imported records beyond the dashboard limit, with XP and stable cursors', () => {
  const activities = Array.from({ length: 550 }, (_, i) => activity(i + 1, i % 2 ? 'Ride' : 'Run', 6000, new Date(Date.UTC(2026, 9, 28) - i * 60000).toISOString()));
  assert.equal(buildDashboard(activities).recentActivities.length, 30);
  let cursor, ids = [];
  do {
    const result = activityPage([...activities, activities[0]], { cursor });
    assert.equal(result.total, 550);
    ids.push(...result.items.map(a => a.id));
    assert.equal(result.items[0].xp, result.items[0].classKey === 'running' ? 6 : 2);
    cursor = result.nextCursor;
  } while (cursor !== null);
  assert.equal(ids.length, 550);
  assert.equal(new Set(ids).size, 550);
  const first = activityPage(activities);
  const withNewer = [activity(999, 'Run', 1000, '2026-10-29T08:00:00Z'), ...activities];
  assert.equal(activityPage(withNewer, { cursor: first.nextCursor }).items[0].id, 51);
  assert.deepEqual(activityPage([]), { items: [], total: 0, nextCursor: null });
  for (const limit of [0, -1, 101, 1.5, NaN]) assert.throws(() => activityPage(activities, { limit }), /Invalid activity page/);
  assert.throws(() => activityPage(activities, { cursor: '99999' }), /Invalid activity page/);
});
