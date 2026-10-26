import assert from 'node:assert/strict';
import test from 'node:test';
import { activityXp, buildDashboard, createDashboardService, progression } from './dashboard.mjs';
const activity = (id, sportType = 'Run', distance = 5000, startDate = '2026-10-25T08:00:00Z') => ({ id, name: 'Example', sportType, distance, startDate, movingTime: 1800, elevationGain: 20 });

test('aggregates each domain, deduplicates IDs, and excludes other sports from XP', () => {
  const run = activity(1);
  const result = buildDashboard([run, run, activity(2, 'Ride', 25000), activity(3, 'Swim', 1000), activity(4, 'WeightTraining', 0), activity(5, 'Walk', 2000)], { now: new Date('2026-10-25T12:00:00Z') });
  assert.equal(result.importedCount, 5);
  assert.equal(result.monthlyDistanceKm, 33);
  assert.deepEqual(result.domains.map(domain => domain.xp), [5, 0, 5]);
  assert.equal(result.domains[0].level, 1);
  assert.deepEqual(result.domains.map(item => item.key), ['running', 'strength', 'cycling']);
  assert.equal(result.domains[1].xpUnavailable, true);
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
  assert.equal(result.domains[0].xp, 7);
  assert.equal(result.historyComplete, false);
  assert.equal(buildDashboard([]).domains.every(domain => domain.level === 0), true);
});

test('coalesces requests, caches for a minute, backfills, and reconciles latest edits', async () => {
  let calls = 0, now = Date.parse('2026-10-25T12:00:00Z');
  const latest = Array.from({ length: 100 }, (_, index) => activity(index + 1, 'Run', 1000, new Date(now - index * 86400000).toISOString()));
  const client = { activities: async ({ before }) => {
    calls++;
    if (before) return [activity(101, 'Swim', 1000, '2026-01-01T00:00:00Z')];
    return latest;
  } };
  const service = createDashboardService({ client, clock: () => now });
  const [first] = await Promise.all([service.get(), service.get(), service.get()]);
  assert.equal(calls, 1);
  assert.equal(first.historyComplete, false);
  await service.get(); assert.equal(calls, 1);
  latest[0] = { ...latest[0], distance: 2000 };
  now += 60001;
  const second = await service.get();
  assert.equal(calls, 3);
  assert.equal(second.importedCount, 101);
  assert.equal(second.historyComplete, true);
  assert.equal(second.domains[0].xp, 101);
  client.activities = async () => { throw new Error('rate limited'); };
  now += 60001;
  const stale = await service.get();
  assert.equal(stale.stale, true);
  assert.equal(stale.importedCount, 101);
});

test('an initial sync failure remains an error, and an empty account is not demo data', async () => {
  await assert.rejects(createDashboardService({ client: { activities: async () => { throw new Error('failed'); } } }).get(), /failed/);
  const empty = await createDashboardService({ client: { activities: async () => [] } }).get();
  assert.equal(empty.importedCount, 0);
  assert.equal(empty.historyComplete, true);
});

test('failed backfill keeps the successful snapshot and applies a retry cooldown', async () => {
  let now = Date.parse('2026-10-25T12:00:00Z'), calls = 0;
  const latest = Array.from({ length: 100 }, (_, index) => activity(index + 1, 'Run', 1000, new Date(now - index * 86400000).toISOString()));
  const client = { activities: async ({ before }) => { calls++; if (before) throw new Error('429'); return latest; } };
  const service = createDashboardService({ client, clock: () => now });
  await service.get();
  latest[0] = { ...latest[0], distance: 9000 };
  now += 60001;
  const failed = await service.get();
  assert.equal(failed.domains[0].xp, 100);
  assert.equal(failed.historyComplete, false);
  assert.equal(failed.stale, true);
  const attempts = calls;
  assert.equal((await service.get()).stale, true);
  assert.equal(calls, attempts);
});

test('restored snapshots resume pagination and failed disk writes keep the last committed data', async () => {
  let now = Date.parse('2026-10-25T12:00:00Z'), saved;
  const latest = Array.from({ length: 100 }, (_, index) => activity(index + 1, 'Run', 1000, new Date(now - index * 86400000).toISOString()));
  const first = createDashboardService({ clock: () => now, client: { activities: async () => latest }, persist: async value => { saved = structuredClone(value); } });
  await first.get();
  assert.equal(saved.activities.length, 100);
  const cursor = saved.before;
  now += 61000;
  let seenCursor;
  const restored = createDashboardService({ clock: () => now, initial: saved,
    client: { activities: async ({ before }) => { if (before) { seenCursor = before; return [activity(101, 'Run', 2000, '2025-01-01T00:00:00Z')]; } return latest; } },
    persist: async value => { saved = structuredClone(value); },
  });
  assert.equal((await restored.get()).importedCount, 101);
  assert.equal(seenCursor, cursor);
  assert.equal(saved.historyComplete, true);
  now += 61000;
  const failedWrite = createDashboardService({ clock: () => now, initial: saved,
    client: { activities: async () => [{ ...latest[0], distance: 999999 }] },
    persist: async () => { throw new Error('disk full'); },
  });
  const unchanged = await failedWrite.get();
  assert.equal(unchanged.importedCount, 101);
  assert.equal(unchanged.domains[0].xp, 102);
  assert.equal(unchanged.stale, true);
});

test('class XP reflects corrections and deletions independently of personal bests', () => {
  const runs = [activity(1), activity(2, 'Run', 2000)];
  assert.equal(buildDashboard(runs).domains[0].xp, 7);
  assert.equal(buildDashboard([runs[0], { ...runs[1], distance: 1000 }]).domains[0].xp, 6);
  assert.equal(buildDashboard([runs[1]]).domains[0].xp, 2);
});
