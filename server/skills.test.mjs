import test from 'node:test';
import assert from 'node:assert/strict';
import { bestTimes, runningBestTimes, skillDefinitions } from './skills.mjs';
import { createDashboardService } from './dashboard.mjs';
const stream = (distance, time) => ({ distance: { data: distance }, time: { data: time } });
const run = (id, distance = 6000) => ({ id, name: `Run ${id}`, sportType: 'Run', distance, movingTime: 1000, startDate: '2026-10-26T12:00:00Z' });

test('calculates subactivity elapsed efforts with interpolation and includes stops', () => {
  assert.deepEqual(bestTimes(stream([0, 1000, 1000, 2000], [0, 100, 200, 300]), [['two', '2K', 2000]]), { two: 300000 });
  assert.deepEqual(bestTimes(stream([0, 200, 1200, 2000], [0, 100, 200, 600]), [['one', '1K', 1000]]), { one: 100000 });
  assert.deepEqual(bestTimes(stream([0, 6000], [0, 1800]), skillDefinitions.running), { '1k': 300000, '5k': 1500000, '100m': 30000 });
  assert.deepEqual(bestTimes(stream([0, 999], [0, 300]), skillDefinitions.running), { '100m': 30030 });
  assert.equal(bestTimes(stream([0, 2000, 1000], [0, 100, 200]), skillDefinitions.running), null);
  assert.equal(bestTimes(stream([0, 2000], [0, 0]), skillDefinitions.running), null);
  assert.equal(bestTimes(null, skillDefinitions.running), null);
});

test('cycling supports all five targets and running includes official marathon distances', () => {
  const times = bestTimes(stream([0, 100000], [0, 10000]), skillDefinitions.cycling);
  assert.deepEqual(Object.values(times), [500000, 2000000, 5000000, 7500000, 10000000]);
  assert.equal(bestTimes(stream([0, 42195], [0, 12600]), skillDefinitions.running).marathon, 12600000);
});

test('processes the whole queue, persists results, and never rechecks completed old workouts', async () => {
  let now = Date.parse('2026-10-26T13:00:00Z'), saved, calls = 0;
  const activities = Array.from({ length: 55 }, (_, i) => run(i + 1));
  const options = { schedule: () => () => {}, clock: () => now, persist: async value => { saved = structuredClone(value); },
    client: { activities: async () => activities, details: async id => { calls++; return { best_efforts: [{ distance: 5000, elapsed_time: id * 500 }] }; } } };
  let service = createDashboardService(options);
  await service.get(); await service.run();
  assert.equal(calls, 55); assert.equal((await service.get()).skillsPending, 0);
  service.stop(); now += 10 * 86400000;
  service = createDashboardService({ ...options, initial: saved });
  await service.get(); await service.run();
  assert.equal(calls, 55);
  assert.equal((await service.get()).classes[0].skills[1].best.activityId, 1);
});

test('failed details retry without starving other work; unavailable results remain processed', async () => {
  let now = Date.parse('2026-10-26T13:00:00Z'), fail = true;
  const seen = [];
  const service = createDashboardService({ schedule: () => () => {}, clock: () => now,
    client: { activities: async () => [run(1), run(2)], details: async id => { seen.push(id); if (id === 1 && fail) throw new Error('offline'); return null; } } });
  await service.get(); await service.run();
  let result = await service.get();
  assert.equal(result.skillsPending, 1); assert.equal(result.skillsUnavailable, 1);
  assert.deepEqual(seen, [1, 2]);
  now += 900001; fail = false; await service.run();
  result = await service.get();
  assert.equal(result.skillsPending, 0); assert.equal(result.skillsUnavailable, 2);
  assert.deepEqual(seen, [1, 2, 1]);
  now += 86400000; await service.get(); await service.run();
  assert.deepEqual(seen, [1, 2, 1]);
});

test('running uses provider elapsed best efforts, handles half marathon rounding, and ignores unrelated or invalid results', () => {
  assert.deepEqual(runningBestTimes({ best_efforts: [
    { name: 'Half-Marathon', distance: 21097, elapsed_time: 6480 },
    { distance: 42195, elapsed_time: 13400 },
    { distance: 5000, elapsed_time: 1519, moving_time: 1400 },
    { distance: 5000, elapsed_time: 1600 },
    { distance: 1609, elapsed_time: 400 },
    { distance: 1000, elapsed_time: -1 }, null,
  ] }), { half_marathon: 6480000, marathon: 13400000, '5k': 1519000 });
  assert.equal(runningBestTimes({}), null);
  assert.deepEqual(runningBestTimes({ best_efforts: [] }), {});
});

test('running never calls streams and replaces legacy cached calculations; cycling still uses streams', async () => {
  const activities = [run(1), { ...run(2, 100000), sportType: 'Ride' }];
  let details = 0, streams = 0;
  const service = createDashboardService({ schedule: () => () => {}, initial: { activities, skillCache: { 1: { version: 1, times: { '5k': 1 } } } },
    client: { activities: async () => activities, details: async id => { assert.equal(id, 1); details++; return { best_efforts: [{ distance: 5000, elapsed_time: 1519 }] }; },
      streams: async id => { assert.equal(id, 2); streams++; return stream([0, 100000], [0, 10000]); } } });
  await service.get(); await service.run();
  const result = await service.get();
  assert.equal(details, 1); assert.equal(streams, 1);
  assert.equal(result.classes[0].skills[1].best.timeMs, 1519000);
  assert.equal(result.classes[0].skills[1].best.method, 'strava_best_efforts');
  assert.equal(result.classes[2].skills[0].best.method, 'distance_time_stream_v1');
});
