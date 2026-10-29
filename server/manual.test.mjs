import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { validateManual } from './manual.mjs';
import { openDatabase, hash } from './database.mjs';
import { activityXp, buildDashboard, createDashboardService } from './dashboard.mjs';
import { createApp } from './app.mjs';
import { fingerprint } from './skills.mjs';
import { DatabaseSync } from 'node:sqlite';

const now = Date.UTC(2026, 9, 28, 12);
const manual = (patch = {}) => ({ requestId: 'manual_request_0001', kind: 'manual', name: 'My long run', sportType: 'Run', startDate: '2026-10-27T12:00:00.000Z', movingTime: 7200, distance: 42195, ...patch });
const workout = (patch = {}) => manual({ requestId: 'workout_request_0001', kind: 'workout', name: 'Strength session', sportType: 'WeightTraining', distance: 0,
  weightUnit: 'lb', exercises: [{ name: 'Bench press', sets: [{ weight: 100, reps: 5, completed: true }, { weight: 100, reps: 10, completed: true }] }], ...patch });

test('validates manual records, calculates volume server-side, and awards only explained class XP', () => {
  const run = validateManual(manual({ xp: 999, source: 'strava' }), now);
  assert.equal(run.source, 'manual'); assert.equal(run.xp, undefined); assert.equal(activityXp(run), 42.195);
  assert.equal(activityXp(validateManual(manual({ sportType: 'Ride', distance: 15000 }), now)), 5);
  const strength = validateManual(workout({ volumeLb: 9999999 }), now);
  assert.equal(strength.volumeLb, 1500); assert.equal(activityXp(strength), 3);
  const kg = validateManual(workout({ weightUnit: 'kg' }), now);
  assert.ok(Math.abs(kg.volumeLb - 3306.93393277) < 0.00001);
  assert.equal(activityXp(validateManual(workout({ exercises: [{ name: 'Pull-up', sets: [{ weight: 0, reps: 10, completed: true }] }] }), now)), 0);
  assert.equal(activityXp(validateManual(manual({ sportType: 'Walk' }), now)), 0);
  assert.equal(activityXp({ sportType: 'WeightTraining', distance: 0, movingTime: 99999, volumeLb: 99999 }), 0, 'Strava summary volume is not inferred');
});

test('rejects invalid and incomplete manual activities without trusting submitted XP or volume', () => {
  for (const patch of [{ name: '' }, { distance: -1 }, { movingTime: 0 }, { movingTime: 1.5 }, { distance: Infinity }, { sportType: 'EBikeRide' }, { startDate: '2026-02-30' }, { startDate: '2027-01-01T00:00:00.000Z' }, { requestId: '' }, { kind: 'unknown' }, { sportType: 'WeightTraining' }]) {
    assert.throws(() => validateManual(manual(patch), now), error => error.status === 400);
  }
  for (const patch of [{ exercises: [] }, { weightUnit: 'oz' }, { exercises: [{ name: 'Fake', sets: [] }] }, { exercises: [{ name: 'Bench press', sets: [{ weight: 100, reps: 0, completed: true }] }] }, { exercises: [{ name: 'Bench press', sets: [{ weight: 100, reps: 5, completed: false }] }] }]) {
    assert.throws(() => validateManual(workout(patch), now), error => error.status === 400);
  }
});

test('manual records never become fastest times, pending skill fetches, or Strava import cursors', async () => {
  const entries = [validateManual(manual(), now), validateManual(manual({ sportType: 'Ride', distance: 100000, requestId: 'manual_request_0002' }), now), validateManual(workout(), now)]
    .map((entry, index) => ({ ...entry, id: -index - 1 }));
  const cache = Object.fromEntries(entries.map(a => [a.id, { fingerprint: fingerprint(a), version: 2, times: { marathon: 1, '100k': 1 } }]));
  const result = buildDashboard(entries, { skillCache: cache });
  assert.equal(result.skillsPending, 0);
  assert.ok(result.classes.every(item => item.skills.every(skill => skill.best === null)));
  assert.equal(result.classes[1].xp, 3); assert.equal(result.classes[1].xpUnavailable, false);
  assert.equal(result.importedCount, 0); assert.equal(result.activityCount, 3);
  let saved;
  const service = createDashboardService({ clock: () => now, manualActivities: () => entries, schedule: () => () => {}, persist: value => { saved = value; },
    client: { activities: async options => { assert.equal(options.after, undefined); return []; }, details: () => { throw new Error('must not fetch manual details'); }, streams: () => { throw new Error('must not fetch manual streams'); } } });
  await service.get(); await service.run();
  assert.equal(saved.activities.length, 0);
  assert.equal((await service.get()).activityCount, 3);
  assert.equal(service.activities().items.length, 3);
  await service.stop();
});

test('manual saves are account-scoped, idempotent under retries, survive restarts, and need no Strava request', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'fitness-manual-'));
  const path = join(directory, 'activities.sqlite');
  let db = openDatabase(path, () => now), app, upstream = 0;
  const server = createServer((req, res) => app(req, res));
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const origin = `http://127.0.0.1:${server.address().port}`;
  const env = { PORT: String(server.address().port), STRAVA_CLIENT_ID: 'test', STRAVA_CLIENT_SECRET: 'secret' };
  const client = async () => { upstream++; throw new Error('Strava offline'); };
  const restart = async () => { await app?.close(); db.close(); db = openDatabase(path, () => now); app = createApp({ db, env, clock: () => now, fetchImpl: client }); };
  app = createApp({ db, env, clock: () => now, fetchImpl: client });
  t.after(async () => { await app.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); db.close(); await rm(directory, { recursive: true, force: true }); });
  const request = (token, method = 'GET', payload, route = '/api/activities') => fetch(origin + route, { method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), 'Content-Type': 'application/json' }, ...(payload ? { body: JSON.stringify(payload) } : {}) });
  const tokens = [db.createSession(), db.createSession()];
  const accounts = tokens.map((token, index) => {
    const account = hash('test:secret') + ':' + (index + 1);
    db.connect(db.session(token).id, account, { access_token: 'not-real', expires_at: now / 1000 + 3600 });
    db.saveSnapshot(account, { activities: [], skillCache: {}, historyComplete: true, syncedAt: now });
    return account;
  });
  assert.equal((await request(null, 'POST', manual())).status, 401);
  assert.equal((await request(db.createSession(), 'POST', manual())).status, 409);
  const replies = await Promise.all([request(tokens[0], 'POST', manual()), request(tokens[0], 'POST', manual()), request(tokens[0], 'POST', manual())]);
  assert.ok(replies.every(reply => reply.status === 201));
  const saved = await replies[0].json();
  assert.equal(saved.activity.id, -1); assert.equal(saved.dashboard.classes[0].xp, 42.195);
  assert.equal(db.manualActivities(accounts[0]).length, 1);
  assert.equal((await request(tokens[0], 'POST', manual({ name: 'Different' }))).status, 409);
  assert.equal((await request(tokens[0], 'POST', manual({ requestId: 'invalid_request_01', distance: -2 }))).status, 400);
  assert.equal((await request(tokens[0], 'POST', workout())).status, 201);
  assert.equal((await request(tokens[1], 'POST', manual())).status, 201, 'idempotency keys are scoped to each athlete');
  assert.equal(upstream, 0);
  await restart();
  const history = await (await request(tokens[0])).json();
  assert.equal(history.total, 2); assert.ok(history.items.every(a => a.source === 'manual'));
  const other = await (await request(tokens[1])).json();
  assert.equal(other.total, 1);
  assert.ok(!other.items.some(a => a.id === saved.activity.id));
  const summary = await (await request(tokens[0], 'GET', undefined, '/api/dashboard')).json();
  assert.equal(summary.classes[1].xp, 3); assert.equal(summary.manualCount, 2); assert.equal(summary.skillsPending, 0);
  assert.equal(upstream, 0);
  assert.equal((await request(tokens[0], 'POST', manual())).status, 201);
  assert.equal(db.manualActivities(accounts[0]).length, 2);
  const route = `/api/activities/${saved.activity.id}`;
  assert.equal((await request(tokens[1], 'GET', undefined, route)).status, 404);
  assert.equal((await request(tokens[1], 'DELETE', { expectedRevision: 1 }, route)).status, 404);
  assert.equal((await request(tokens[0], 'PUT', manual(), '/api/activities/123')).status, 403);
  assert.equal((await request(tokens[0], 'DELETE', { expectedRevision: 1 }, '/api/activities/123')).status, 403);
  const changed = manual({ requestId: 'edit_request_000001', name: 'Corrected ride', sportType: 'Ride', distance: 15000, expectedRevision: 1 });
  const update = await request(tokens[0], 'PUT', changed, route);
  assert.equal(update.status, 200);
  const revised = await update.json();
  assert.equal(revised.activity.id, saved.activity.id); assert.equal(revised.activity.revision, 2);
  assert.equal(revised.dashboard.classes[0].xp, 0); assert.equal(revised.dashboard.classes[2].xp, 5);
  assert.equal((await request(tokens[0], 'PUT', changed, route)).status, 200, 'exact update retries succeed once');
  assert.equal((await (await request(tokens[0], 'GET', undefined, route)).json()).activity.revision, 2);
  assert.equal((await request(tokens[0], 'PUT', { ...changed, requestId: 'stale_request_00001' }, route)).status, 409);
  assert.equal((await request(tokens[0], 'PUT', { ...changed, distance: -1 }, route)).status, 400);
  assert.equal((await request(tokens[0], 'PUT', changed, '/api/activities/-999')).status, 404);
  assert.equal((await request(tokens[0], 'POST', manual())).status, 201, 'late create retry returns the latest record without reverting its edit');
  await restart();
  const loaded = await (await request(tokens[0], 'GET', undefined, route)).json();
  assert.equal(loaded.activity.name, 'Corrected ride'); assert.equal(loaded.activity.revision, 2);
  const strengthId = db.manualActivities(accounts[0]).find(a => a.recordingMethod === 'workout').id;
  const strengthRoute = `/api/activities/${strengthId}`;
  const strengthChange = workout({ requestId: 'strength_edit_0001', expectedRevision: 1, exercises: [{ name: 'Bench press', sets: [{ weight: 200, reps: 5, completed: true }] }] });
  const strengthUpdate = await (await request(tokens[0], 'PUT', strengthChange, strengthRoute)).json();
  assert.equal(strengthUpdate.activity.volumeLb, 1000); assert.equal(strengthUpdate.dashboard.classes[1].xp, 2);
  assert.equal((await request(tokens[0], 'DELETE', { expectedRevision: 1 }, strengthRoute)).status, 409);
  const removed = await (await request(tokens[0], 'DELETE', { expectedRevision: 2 }, strengthRoute)).json();
  assert.equal(removed.dashboard.classes[1].xp, 0);
  assert.equal((await request(tokens[0], 'DELETE', { expectedRevision: 2 }, strengthRoute)).status, 200);
  assert.equal((await request(tokens[0], 'POST', workout())).status, 410, 'create retry cannot resurrect a deleted workout');
  assert.equal((await request(tokens[0], 'PUT', strengthChange, strengthRoute)).status, 404);
  assert.equal((await request(tokens[0], 'DELETE', { expectedRevision: 2 }, route)).status, 200);
  await restart();
  assert.equal((await request(tokens[0], 'GET', undefined, route)).status, 404);
  assert.equal((await request(tokens[0], 'POST', manual())).status, 410);
  const afterDelete = await (await request(tokens[0], 'GET', undefined, '/api/dashboard')).json();
  assert.equal(afterDelete.activityCount, 0); assert.ok(afterDelete.classes.every(item => item.xp === 0));
  assert.equal((await (await request(tokens[1])).json()).total, 1, 'other athlete records survive edits/deletes');
  assert.equal(upstream, 0, 'manual corrections never contact Strava');
});

test('in-flight Strava snapshot commits cannot overwrite independently saved manual records', async () => {
  let release, entered;
  const started = new Promise(resolve => { entered = resolve; });
  const response = new Promise(resolve => { release = resolve; });
  const local = [];
  const service = createDashboardService({ clock: () => now, schedule: () => () => {}, manualActivities: () => local,
    initial: { activities: [], skillCache: {}, historyComplete: true, syncedAt: now - 86400000 },
    client: { activities: async () => { entered(); return response; } } });
  await service.get();
  const work = service.run(); await started;
  local.push({ ...validateManual(manual(), now), id: -1 });
  assert.equal((await service.get({ sync: false })).classes[0].xp, 42.195);
  release([]); await work;
  assert.equal((await service.get({ sync: false })).manualCount, 1);
  await service.stop();
});

test('existing manual records remain readable when a first Strava import fails', async () => {
  const entries = [{ ...validateManual(manual(), now), id: -1 }];
  const service = createDashboardService({ clock: () => now, schedule: () => () => {}, manualActivities: () => entries,
    client: { activities: async () => { throw new Error('offline'); } } });
  const result = await service.get();
  assert.equal(result.stale, true); assert.equal(result.manualCount, 1); assert.equal(result.classes[0].xp, 42.195);
  assert.equal((await service.get()).manualCount, 1, 'manual history remains readable during the retry cooldown');
  await service.stop();
});

test('upgrades existing manual tables without losing records and keeps deletion markers across restart', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'fitness-manual-upgrade-'));
  const path = join(directory, 'old.sqlite');
  let db;
  try {
    const old = new DatabaseSync(path);
    old.exec('CREATE TABLE manual_activities (id INTEGER PRIMARY KEY AUTOINCREMENT, account TEXT NOT NULL, request_id TEXT NOT NULL, data TEXT NOT NULL, UNIQUE(account, request_id))');
    const original = validateManual(manual(), now);
    old.prepare('INSERT INTO manual_activities (account, request_id, data) VALUES (?, ?, ?)').run('athlete', original.requestId, JSON.stringify(original));
    old.close();
    db = openDatabase(path);
    assert.equal(db.manualActivity('athlete', -1).revision, 1);
    assert.equal(db.manualActivity('athlete', -1).name, original.name);
    db.updateManual('athlete', -1, validateManual(manual({ requestId: 'upgrade_edit_00001', distance: 1000 }), now), 1);
    assert.equal(db.manualActivity('athlete', -1).distance, 1000);
    db.deleteManual('athlete', -1, 2); db.close();
    db = openDatabase(path);
    assert.equal(db.manualActivities('athlete').length, 0);
    assert.throws(() => db.saveManual('athlete', original), error => error.status === 410);
    db.close(); db = null;
    const raw = new DatabaseSync(path);
    const tombstone = raw.prepare('SELECT data, original_data FROM manual_activities').get();
    assert.equal(tombstone.data, '{}'); assert.equal(tombstone.original_data, '{}');
    raw.close();
  } finally { db?.close(); await rm(directory, { recursive: true, force: true }); }
});
