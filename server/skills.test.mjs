import test from 'node:test';
import assert from 'node:assert/strict';
import { bestTimes, runningBestTimes, skillDefinitions } from './skills.mjs';
import { createDashboardService } from './dashboard.mjs';
const stream = (distance, time) => ({ distance: { data: distance }, time: { data: time } });
const run = (id, distance = 6000) => ({ id, name: `Run ${id}`, sportType: 'Run', distance, movingTime: 1000, startDate: '2026-10-26T12:00:00Z' });

test('calculates subactivity elapsed efforts with interpolation and includes stops', () => {
  assert.deepEqual(bestTimes(stream([0, 1000, 1000, 2000], [0, 100, 200, 300]), [['two', '2K', 2000]]), { two: 300000 });
  assert.deepEqual(bestTimes(stream([0, 200, 1200, 2000], [0, 100, 200, 600]), [['one', '1K', 1000]]), { one: 100000 });
  assert.deepEqual(bestTimes(stream([0, 6000], [0, 1800]), skillDefinitions.running), { '1k': 300000, '5k': 1500000 });
  assert.deepEqual(bestTimes(stream([0, 999], [0, 300]), skillDefinitions.running), {});
  assert.equal(bestTimes(stream([0, 2000, 1000], [0, 100, 200]), skillDefinitions.running), null);
  assert.equal(bestTimes(stream([0, 2000], [0, 0]), skillDefinitions.running), null);
  assert.equal(bestTimes(null, skillDefinitions.running), null);
});

test('cycling supports all five targets and running includes official marathon distances', () => {
  const times = bestTimes(stream([0, 100000], [0, 10000]), skillDefinitions.cycling);
  assert.deepEqual(Object.values(times), [500000, 2000000, 5000000, 7500000, 10000000]);
  assert.equal(bestTimes(stream([0, 42195], [0, 12600]), skillDefinitions.running).marathon, 12600000);
});

test('bounded enrichment persists, resumes, replaces edited results, and removes deleted winners', async () => {
  let now = Date.parse('2026-10-26T13:00:00Z'), saved, calls = 0;
  let activities = [run(1), run(2), run(3), run(4)];
  const client = { activities: async () => activities, details: async id => { calls++; return { best_efforts: [{ distance: 1000, elapsed_time: id * 100 }, { distance: 5000, elapsed_time: id * 500 }] }; } };
  const options = { client, clock: () => now, persist: async value => { saved = structuredClone(value); } };
  let service = createDashboardService(options);
  let result = await service.get();
  assert.equal(calls, 3); assert.equal(result.skillsPending, 1);
  assert.equal(result.classes[0].skills[0].best.activityId, 1);
  assert.equal(result.classes[1].skills.length, 3);
  assert.ok(result.classes[1].skills.every(s => s.best === null));
  service = createDashboardService({ ...options, initial: saved });
  await service.get(); assert.equal(calls, 3);
  now += 60001; result = await service.get();
  assert.equal(calls, 4); assert.equal(result.skillsPending, 0);
  activities = [run(2), run(3), run(4)]; now += 60001;
  result = await service.get(); assert.equal(result.classes[0].skills[0].best.activityId, 2);
  activities = [{ ...run(2), distance: 500 }, run(3), run(4)]; now += 60001;
  result = await service.get(); assert.equal(result.classes[0].skills[0].best.activityId, 3);
});

test('stream failures preserve XP and saved efforts, retry, and unavailable streams stay empty', async () => {
  let now = Date.parse('2026-10-26T13:00:00Z'), fail = true;
  const client = { activities: async () => [run(1)], details: async () => { if (fail) throw new Error('429'); return null; } };
  const service = createDashboardService({ client, clock: () => now });
  let result = await service.get();
  assert.equal(result.classes[0].xp, 6); assert.equal(result.skillsStale, true); assert.equal(result.skillsPending, 1);
  now += 60001; fail = false; result = await service.get();
  assert.equal(result.skillsPending, 0); assert.equal(result.classes[0].skills[0].best, null);
});

test('failed refresh keeps a saved best and retries do not starve other activities', async () => {
  let now = Date.parse('2026-10-26T13:00:00Z'), fail = false;
  let activities = [run(1)];
  const seen = [];
  const client = { activities: async () => activities, details: async id => {
    seen.push(id); if (fail && id <= 3) throw new Error('offline');
    return { best_efforts: [{ distance: 1000, elapsed_time: 300 }, { distance: 5000, elapsed_time: 1500 }] };
  } };
  const service = createDashboardService({ client, clock: () => now });
  assert.equal((await service.get()).classes[0].skills[1].best.timeMs, 1500000);
  now += 86400001; fail = true;
  let result = await service.get();
  assert.equal(result.skillsStale, true); assert.equal(result.classes[0].skills[1].best.timeMs, 1500000);
  activities = [run(1), run(2), run(3), run(4)]; now += 60001;
  await service.get(); now += 60001;
  result = await service.get();
  assert.ok(seen.includes(4)); assert.equal(result.classes[0].skills[0].best.timeMs, 300000);
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
  const result = await createDashboardService({ initial: { activities, skillCache: { 1: { version: 1, times: { '5k': 1 } } } },
    client: { activities: async () => activities, details: async id => { assert.equal(id, 1); details++; return { best_efforts: [{ distance: 5000, elapsed_time: 1519 }] }; },
      streams: async id => { assert.equal(id, 2); streams++; return stream([0, 100000], [0, 10000]); } } }).get();
  assert.equal(details, 1); assert.equal(streams, 1);
  assert.equal(result.classes[0].skills[1].best.timeMs, 1519000);
  assert.equal(result.classes[0].skills[1].best.method, 'strava_best_efforts');
  assert.equal(result.classes[2].skills[0].best.method, 'distance_time_stream_v1');
});
