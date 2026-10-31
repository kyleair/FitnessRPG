import test from 'node:test';
import assert from 'node:assert/strict';
import { runningBestTimes, runningStreamMetrics, calculationVersion, fingerprint } from './skills.mjs';
import { buildDashboard, createDashboardService } from './dashboard.mjs';
import { openDatabase } from './database.mjs';

const now = Date.parse('2026-10-31T12:00:00Z');
const run = (id, extra = {}) => ({ id, name: `Run ${id}`, sportType: 'Run', distance: 1000, movingTime: 250, elevationGain: 120, startDate: '2026-10-20T12:00:00Z', ...extra });
const trace = { time: { data: [0, 300] }, distance: { data: [0, 1000] }, altitude: { data: [0, 100] } };
const skill = (dashboard, key) => dashboard.classes.find(c => c.key === 'running').skills.find(s => s.key === `running_${key}`);
const initial = activities => ({ activities, historyComplete: true, syncedAt: now, activityCheckAt: now, skillCache: {} });
const noTimers = () => () => {};

test('matches exact running targets without confusing half a mile with 800 meters', () => {
  const efforts = [100, 200, 400, 800, 5000, 10000, 21097, 42195].map(distance => ({ distance, elapsed_time: distance / 4 }));
  const times = runningBestTimes({ best_efforts: efforts });
  assert.deepEqual(Object.keys(times), ['100m', '200m', '400m', '800m', '5k', '10k', 'half_marathon', 'marathon']);
  assert.deepEqual(runningBestTimes({ best_efforts: [{ distance: 804.672, elapsed_time: 120 }, { distance: 1609, elapsed_time: 300 }] }), {});
  assert.equal(runningBestTimes({ best_efforts: [{ distance: 400, elapsed_time: 80 }, { distance: 400, elapsed_time: 75 }] })['400m'], 75000);
});

test('running streams calculate unsupported sprints and climbs independently of missing dimensions', () => {
  const result = runningStreamMetrics(trace);
  assert.deepEqual(result.times, { '100m': 30000, '200m': 60000, '800m': 240000 });
  assert.equal(result.metrics.longest_sustained_run_climb.value, 300000);
  assert.equal(result.metrics.vertical_meters_one_hour, undefined);
  assert.equal(runningStreamMetrics({ ...trace, altitude: undefined }).times['200m'], 60000);
  assert.deepEqual(runningStreamMetrics({ ...trace, altitude: { data: [0, NaN] } }).metrics, {});
  assert.equal(runningStreamMetrics({ ...trace, distance: undefined }).metrics.longest_sustained_run_climb.value, 300000);
  assert.deepEqual(runningStreamMetrics({ ...trace, time: { data: [300, 0] } }).metrics, {});
});

test('prefers exact provider efforts, fills only unsupported sprint distances, and persists typed duration', async () => {
  let saved;
  const requests = [];
  const service = createDashboardService({ clock: () => now, schedule: noTimers, initial: initial([run(1)]), persist: async state => { saved = structuredClone(state); },
    client: { activities: async () => [], details: async id => { requests.push(['details', id]); return { elapsed_time: 400, best_efforts: [{ distance: 400, elapsed_time: 125 }, { distance: 800, elapsed_time: 250 }] }; },
      streams: async id => { requests.push(['streams', id]); return trace; } } });
  await service.get(); await service.run();
  const dashboard = await service.get();
  assert.deepEqual(requests, [['details', 1], ['streams', 1]]);
  assert.equal(skill(dashboard, '400m').best.timeMs, 125000);
  assert.equal(skill(dashboard, '800m').best.timeMs, 250000);
  assert.equal(skill(dashboard, '800m').best.method, 'strava_best_efforts');
  assert.equal(skill(dashboard, '100m').best.method, 'distance_time_stream_v1');
  assert.equal(skill(dashboard, '200m').best.value, 60000);
  assert.equal(skill(dashboard, 'longest_run').best.value, 400000);
  assert.equal(skill(dashboard, 'longest_run').best.method, 'strava_details_v1');
  assert.equal(skill(dashboard, 'longest_run').best.unit, 'ms');
  assert.equal(skill(dashboard, 'longest_sustained_run_climb').best.value, 300000);
  assert.equal(dashboard.skillsPending, 0);
  assert.equal(saved.skillCache[1].detailsCheckedAt, now);
  assert.equal(saved.skillCache[1].streamsCheckedAt, now);
  assert.equal(saved.skillCache[1].streams, undefined);
  await service.stop();
});

test('summary/window running skills work immediately, choose longest duration, and exclude manual and cycling data', () => {
  const activities = [run(1, { distance: 10000, elapsedTime: 3600, startDate: '2026-10-03T00:00:00Z' }), run(2, { elapsedTime: 4000, elevationGain: null }),
    run(3, { elapsedTime: 2000, startDate: '2026-10-31T00:00:00Z' }), run(4, { elapsedTime: 2000, startDate: '2026-10-02T23:59:59Z' }),
    run(-1, { source: 'manual', elapsedTime: 99999, distance: 9999999, elevationGain: 99999 }), run(5, { sportType: 'Ride', elapsedTime: 99999, elevationGain: 99999 })];
  const dashboard = buildDashboard([...activities, activities[0]], { now: new Date(now) });
  assert.equal(skill(dashboard, 'longest_run').best.activityId, 2);
  assert.equal(skill(dashboard, 'longest_run').best.value, 4000000);
  assert.equal(skill(dashboard, 'longest_run').processing, false);
  assert.equal(skill(dashboard, 'monthly_distance').best.value, 11);
  assert.equal(skill(dashboard, 'monthly_elevation_run').best.value, 120);
  assert.equal(skill(dashboard, 'monthly_elevation_run').best.partial, true);
  assert.equal(skill(dashboard, 'monthly_distance').best.activityName, '2 Strava runs');
  assert.equal(skill(dashboard, 'total_elevation_run').best.value, 120);
  assert.equal(skill(buildDashboard([run(1)], { now: new Date(now) }), 'longest_run').best, null); // never substitute movingTime
  assert.equal(skill(buildDashboard([], { now: new Date(now) }), 'monthly_distance').best, null);
  assert.equal(skill(buildDashboard(activities, { now: new Date('2026-12-05T00:00:00Z') }), 'monthly_distance').best.value, 0);
});

test('checkpoints provider results before a budget pause and resumes streams from SQLite without repeating details', async () => {
  const db = openDatabase(':memory:');
  let clock = now, blocked = true, details = 0, streams = 0;
  db.saveSnapshot('a', { ...initial([run(1, { distance: 50 })]), skillCache: { 1: { version: 2, times: { '5k': 1 }, fingerprint: 'legacy' } } });
  db.saveSnapshot('b', initial([]));
  const options = { clock: () => clock, schedule: noTimers, persist: async state => db.saveSnapshot('a', state),
    client: { activities: async () => [], details: async () => { details++; return { elapsed_time: 45, best_efforts: [{ distance: 400, elapsed_time: 75 }] }; },
      streams: async () => { streams++; if (blocked) throw Object.assign(new Error('budget'), { rateLimited: true, retryAt: now + 900000 }); return trace; } } };
  let service = createDashboardService({ ...options, initial: db.snapshot('a') });
  await service.get(); await service.run();
  const saved = db.snapshot('a');
  assert.equal(saved.skillCache[1].version, calculationVersion('running'));
  assert.equal(saved.skillCache[1].detailsProcessed, true);
  assert.equal(saved.skillCache[1].streamsProcessed, false);
  assert.equal((await service.get()).skillsPending, 1);
  assert.equal(skill(await service.get(), 'longest_run').best.value, 45000);
  assert.equal(skill(await service.get(), 'longest_sustained_run_climb').processing, true);
  await service.stop(); clock += 900001; blocked = false;
  service = createDashboardService({ ...options, initial: db.snapshot('a') });
  await service.get(); await service.run();
  assert.equal(details, 1); assert.equal(streams, 2);
  assert.equal((await service.get()).skillsPending, 0);
  assert.equal(skill(await service.get(), 'longest_sustained_run_climb').best.value, 300000);
  assert.deepEqual(db.snapshot('b'), initial([]));
  await service.stop();
  service = createDashboardService({ ...options, initial: db.snapshot('a') });
  await service.get(); await service.run();
  assert.equal(details, 1); assert.equal(streams, 2);
  await service.stop(); db.close();
});

test('stream failure retains provider results and retries only the failed stream stage', async () => {
  let clock = now, fail = true, details = 0;
  const service = createDashboardService({ clock: () => clock, schedule: noTimers, initial: initial([run(1, { distance: 6000 })]),
    client: { activities: async () => [], details: async () => { details++; return { best_efforts: [{ distance: 5000, elapsed_time: 1500 }] }; },
      streams: async () => { if (fail) throw new Error('offline'); return trace; } } });
  await service.get(); await service.run();
  let result = await service.get();
  assert.equal(skill(result, '5k').best.timeMs, 1500000);
  assert.equal(skill(result, '5k').processing, false);
  assert.equal(skill(result, '100m').processing, true);
  assert.equal(result.skillsPending, 1);
  clock += 900001; fail = false; await service.run();
  result = await service.get();
  assert.equal(details, 1); assert.equal(result.skillsPending, 0);
  assert.equal(skill(result, '800m').best.value, 240000);
  await service.stop();
});

test('missing provider efforts preserve stream-only results without inventing supported provider distances', async () => {
  const service = createDashboardService({ clock: () => now, schedule: noTimers, initial: initial([run(1)]),
    client: { activities: async () => [], details: async () => null, streams: async () => trace } });
  await service.get(); await service.run();
  const result = await service.get();
  assert.equal(skill(result, '100m').best.value, 30000);
  assert.equal(skill(result, '800m').best.value, 240000);
  assert.equal(skill(result, '400m').best, null);
  assert.equal(skill(result, 'longest_sustained_run_climb').best.value, 300000);
  assert.equal(result.skillsPending, 0);
  assert.equal(result.skillsUnavailable, 1);
  await service.stop();
});

test('changed running summary fingerprints hide outdated results and deletion reveals the next record', async () => {
  let saved;
  const activities = [run(1), run(2, { startDate: '2026-10-19T12:00:00Z' })];
  const service = createDashboardService({ clock: () => now, schedule: noTimers, initial: initial(activities), persist: async s => { saved = structuredClone(s); },
    client: { activities: async () => [], details: async () => ({ best_efforts: [] }), streams: async () => trace } });
  await service.get(); await service.run();
  assert.equal(skill(await service.get(), '100m').best.activityId, 2);
  assert.equal(skill(buildDashboard([activities[0]], { skillCache: saved.skillCache }), '100m').best.activityId, 1);
  const changed = { ...activities[0], elevationGain: 999 };
  assert.notEqual(fingerprint(changed), fingerprint(activities[0]));
  assert.equal(skill(buildDashboard([changed], { skillCache: saved.skillCache }), '100m').best, null);
  await service.stop();
});
