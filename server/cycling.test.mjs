import test from 'node:test';
import assert from 'node:assert/strict';
import { cyclingMetrics, cyclingWindow, fingerprint, calculationVersion } from './skills.mjs';
import { buildDashboard, createDashboardService } from './dashboard.mjs';
import { openDatabase } from './database.mjs';

const trace = (time, altitude, distance = time.map(t => t * 10)) => ({ time: { data: time }, altitude: { data: altitude }, distance: { data: distance } });
const ride = (id, extra = {}) => ({ id, name: `Ride ${id}`, sportType: 'Ride', distance: 40000, elevationGain: 600, movingTime: 4000, startDate: '2026-10-20T12:00:00Z', ...extra });
const skill = (dashboard, key) => dashboard.classes.find(c => c.key === 'cycling').skills.find(s => s.key === `cycling_${key}`);
const now = new Date('2026-10-31T12:00:00Z');

test('rolling hour counts positive ascent, includes stops and interpolates both endpoints', () => {
  const result = cyclingMetrics(trace([0, 1000, 2000, 4000, 5000], [0, 200, 100, 900, 900]));
  assert.equal(result.metrics.vertical_meters_one_hour.value, 920);
  assert.equal(result.metrics.longest_sustained_cycling_climb.value, 2000000);
  // Optimum ends at the last sample, with its start inside the first interval.
  assert.equal(cyclingMetrics(trace([0, 2000, 4000], [0, 200, 1000])).metrics.vertical_meters_one_hour.value, 960);
  assert.equal(cyclingMetrics(trace([0, 3600], [100, 460])).metrics.vertical_meters_one_hour.value, 360);
  assert.equal(cyclingMetrics(trace([0, 3599], [0, 500])).metrics.vertical_meters_one_hour, undefined);
  assert.equal(cyclingMetrics(trace([0, 3600], [0, -100])).metrics.vertical_meters_one_hour.value, 0);
});

test('sustained climbs end on flat or falling samples and count elapsed rather than moving time', () => {
  const result = cyclingMetrics(trace([0, 100, 300, 800, 1000, 1400], [0, 10, 10, 50, 40, 60]));
  assert.equal(result.metrics.longest_sustained_cycling_climb.value, 500000);
  assert.deepEqual(cyclingMetrics(trace([0, 100], [0, 0])).metrics, {});
});

test('invalid or missing altitude does not discard valid distance efforts and vice versa', () => {
  for (const altitude of [undefined, [0], [0, NaN]]) {
    const streams = trace([0, 3600], altitude);
    const result = cyclingMetrics(streams);
    assert.equal(result.times['1k'], 100000);
    assert.deepEqual(result.metrics, {});
    assert.equal(result.unavailable, true);
  }
  const altitudeOnly = cyclingMetrics(trace([0, 3600], [-10, 350], [100, 0]));
  assert.equal(altitudeOnly.times, null);
  assert.equal(altitudeOnly.metrics.vertical_meters_one_hour.value, 360);
  assert.deepEqual(cyclingMetrics(trace([0, 0], [0, 20])).metrics, {});
});

test('four-week windows update on Saturday UTC, exclude the end and include the start', () => {
  assert.deepEqual(cyclingWindow(now), { start: '2026-10-03T00:00:00.000Z', end: '2026-10-31T00:00:00.000Z' });
  assert.equal(cyclingWindow(new Date('2026-10-30T23:59:59Z')).end, '2026-10-24T00:00:00.000Z');
  const activities = [ride(1, { startDate: '2026-10-03T00:00:00Z' }), ride(2, { startDate: '2026-10-31T00:00:00Z' }),
    ride(3, { startDate: '2026-10-02T23:59:59Z' }), ride(-1, { source: 'manual' }), ride(4, { elevationGain: null }), ride(1, { startDate: '2026-10-03T00:00:00Z' })];
  const dashboard = buildDashboard(activities, { now });
  assert.equal(skill(dashboard, 'monthly_distance').best.value, 80);
  assert.equal(skill(dashboard, 'monthly_elevation_cycling').best.value, 600);
  assert.equal(skill(dashboard, 'monthly_elevation_cycling').best.partial, true);
  assert.equal(skill(dashboard, 'monthly_distance').best.activityCount, 2);
  assert.equal(skill(buildDashboard(activities, { now: new Date('2026-12-05T00:00:00Z') }), 'monthly_distance').best.value, 0);
});

test('summary skills are immediate, exclude manual rides, retain ties and missing values honestly', () => {
  const dashboard = buildDashboard([ride(2), ride(1, { startDate: '2026-10-19T12:00:00Z' }), ride(-1, { source: 'manual', distance: 999999, elevationGain: 9999 })], { now });
  assert.equal(skill(dashboard, 'longest_ride').best.value, 40);
  assert.equal(skill(dashboard, 'longest_ride').best.activityId, 1);
  assert.equal(skill(dashboard, 'total_elevation_ride').best.value, 600);
  assert.equal(skill(dashboard, 'total_elevation_ride').processing, false);
  assert.equal(skill(buildDashboard([ride(1, { elevationGain: null })], { now }), 'total_elevation_ride').best, null);
  assert.equal(skill(buildDashboard([ride(1, { elevationGain: 0 })], { now }), 'total_elevation_ride').best.value, 0);
});

test('upgrades cycling cache through the queue, saves compact results in isolated SQLite snapshots, and resumes without refetch', async () => {
  const db = openDatabase(':memory:');
  const activity = ride(1, { distance: 500 }); // short rides still need climbing processing
  const old = { activities: [activity], historyComplete: true, syncedAt: now.getTime(), activityCheckAt: now.getTime(), skillCache: { 1: { version: 1, fingerprint: fingerprint(activity), times: { '5k': 1 } } } };
  db.saveSnapshot('a', old);
  db.saveSnapshot('b', { activities: [], skillCache: {} });
  let calls = 0;
  const options = { clock: () => now.getTime(), schedule: () => () => {}, persist: async state => db.saveSnapshot('a', state),
    client: { streams: async () => { calls++; return trace([0, 4000], [0, 1000], [0, 500]); }, activities: async () => [] } };
  let service = createDashboardService({ ...options, initial: db.snapshot('a') });
  assert.equal((await service.get()).skillsPending, 1);
  await service.run();
  let dashboard = await service.get();
  assert.equal(skill(dashboard, 'vertical_meters_one_hour').best.value, 900);
  assert.equal(dashboard.skillsPending, 0);
  const entry = db.snapshot('a').skillCache[1];
  assert.equal(entry.version, calculationVersion('cycling'));
  assert.equal(entry.metrics.longest_sustained_cycling_climb.unit, 'ms');
  assert.equal(entry.streams, undefined);
  assert.deepEqual(db.snapshot('b'), { activities: [], skillCache: {} });
  await service.stop();
  service = createDashboardService({ ...options, initial: db.snapshot('a') });
  await service.get(); await service.run();
  assert.equal(calls, 1);
  dashboard = await service.get();
  assert.equal(skill(dashboard, 'longest_sustained_cycling_climb').best.value, 4000000);
  await service.stop(); db.close();
});

test('cycling failures retry fairly, keep summary results, and a later result exposes the runner-up', async () => {
  let clock = now.getTime(), fail = true;
  const activities = [ride(1), ride(2)];
  let saved;
  const service = createDashboardService({ clock: () => clock, schedule: () => () => {}, initial: { activities, historyComplete: true, syncedAt: clock, activityCheckAt: clock },
    persist: async s => { saved = s; }, client: { activities: async () => [], streams: async id => { if (id === 1 && fail) throw new Error('offline'); return trace([0, 4000], [0, id * 100]); } } });
  await service.get(); await service.run();
  assert.equal((await service.get()).skillsPending, 1);
  assert.equal(skill(await service.get(), 'longest_ride').best.value, 40);
  clock += 900001; fail = false; await service.run();
  assert.equal((await service.get()).skillsPending, 0);
  const result = buildDashboard(activities.filter(a => a.id !== 2), { now, skillCache: saved.skillCache });
  assert.equal(skill(result, 'vertical_meters_one_hour').best.activityId, 1);
  const corrected = buildDashboard([ride(1, { elevationGain: 900 })], { now, skillCache: saved.skillCache });
  assert.equal(skill(corrected, 'vertical_meters_one_hour').best, null);
  assert.equal(skill(corrected, 'total_elevation_ride').best.value, 900);
  await service.stop();
});
