import { DatabaseSync } from 'node:sqlite';
import { createHash, randomBytes } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export const secret = () => randomBytes(32).toString('hex');
export const hash = value => createHash('sha256').update(value).digest('hex');
export function openDatabase(path, clock = Date.now) {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, account TEXT, expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS accounts (id TEXT PRIMARY KEY, tokens TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS snapshots (account TEXT PRIMARY KEY, data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS api_budgets (id TEXT PRIMARY KEY, data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS manual_activities (id INTEGER PRIMARY KEY AUTOINCREMENT, account TEXT NOT NULL,
      request_id TEXT NOT NULL, data TEXT NOT NULL, UNIQUE(account, request_id));
    CREATE TABLE IF NOT EXISTS attempts (id TEXT PRIMARY KEY, session TEXT NOT NULL, browser TEXT,
      state TEXT UNIQUE, expires INTEGER NOT NULL);
  `);
  // Upgrade databases created before manual corrections were supported.
  const manualColumns = new Set(db.prepare('PRAGMA table_info(manual_activities)').all().map(column => column.name));
  for (const [name, type] of [['revision', 'INTEGER NOT NULL DEFAULT 1'], ['deleted', 'INTEGER NOT NULL DEFAULT 0'], ['original_data', 'TEXT']]) {
    if (!manualColumns.has(name)) db.exec(`ALTER TABLE manual_activities ADD COLUMN ${name} ${type}`);
  }
  db.exec('UPDATE manual_activities SET original_data = data WHERE original_data IS NULL');
  const manualRecord = row => ({ ...JSON.parse(row.data), id: -row.id, revision: row.revision });
  const manualRow = (account, id) => db.prepare('SELECT * FROM manual_activities WHERE account = ? AND id = ?').get(account, -id);
  const failure = (status, message) => { throw Object.assign(new Error(message), { status }); };
  return {
    close: () => db.close(),
    manualActivities(account) {
      return db.prepare('SELECT * FROM manual_activities WHERE account = ? AND deleted = 0').all(account).map(manualRecord);
    },
    manualActivity(account, id) {
      const row = manualRow(account, id);
      if (!row || row.deleted) failure(404, 'Manual activity not found. It may have been deleted.');
      return manualRecord(row);
    },
    saveManual(account, activity) {
      const data = JSON.stringify(activity);
      db.prepare('INSERT INTO manual_activities (account, request_id, data, original_data) VALUES (?, ?, ?, ?) ON CONFLICT(account, request_id) DO NOTHING').run(account, activity.requestId, data, data);
      const row = db.prepare('SELECT * FROM manual_activities WHERE account = ? AND request_id = ?').get(account, activity.requestId);
      if (row.deleted) failure(410, 'This activity was deleted. A retried save cannot restore it.');
      if (row.original_data !== data) failure(409, 'This save request was already used. Reopen the form to create another activity.');
      return manualRecord(row);
    },
    updateManual(account, id, activity, expectedRevision) {
      const row = manualRow(account, id);
      if (!row || row.deleted) failure(404, 'Manual activity not found. It may have been deleted.');
      const data = JSON.stringify(activity);
      // A lost response can retry the exact update without advancing revision.
      if (JSON.parse(row.data).requestId === activity.requestId) {
        if (row.data !== data) failure(409, 'This edit request was already used for different changes. Reopen the activity.');
        return manualRecord(row);
      }
      if (row.revision !== expectedRevision) failure(409, 'This activity changed in another session. Reopen it to edit the latest version.');
      const updated = db.prepare('UPDATE manual_activities SET data = ?, revision = revision + 1 WHERE account = ? AND id = ? AND deleted = 0 AND revision = ?').run(data, account, -id, expectedRevision);
      if (!updated.changes) failure(409, 'This activity changed in another session. Reopen it before saving.');
      return manualRecord(manualRow(account, id));
    },
    deleteManual(account, id, expectedRevision) {
      const row = manualRow(account, id);
      if (!row) failure(404, 'Manual activity not found.');
      if (row.deleted) return; // Repeated delete requests are safe.
      if (row.revision !== expectedRevision) failure(409, 'This activity changed in another session. Refresh before deleting it.');
      // Keep a tombstone so a delayed create/update retry cannot resurrect it.
      const removed = db.prepare("UPDATE manual_activities SET deleted = 1, data = '{}', original_data = '{}', revision = revision + 1 WHERE account = ? AND id = ? AND revision = ?").run(account, -id, expectedRevision);
      if (!removed.changes) failure(409, 'This activity changed in another session. Refresh before deleting it.');
    },
    budget(id) { const row = db.prepare('SELECT data FROM api_budgets WHERE id = ?').get(id); return row ? JSON.parse(row.data) : undefined; },
    saveBudget(id, data) { db.prepare('INSERT INTO api_budgets VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data').run(id, JSON.stringify(data)); },
    createSession() {
      db.prepare('DELETE FROM sessions WHERE expires <= ?').run(clock());
      const token = secret();
      db.prepare('INSERT INTO sessions VALUES (?, NULL, ?)').run(hash(token), clock() + 90 * 86400000);
      return token;
    },
    session(token) { return db.prepare('SELECT * FROM sessions WHERE id = ? AND expires > ?').get(hash(token), clock()); },
    logout(id) {
      db.prepare('DELETE FROM attempts WHERE session = ?').run(id);
      db.prepare('DELETE FROM sessions WHERE id = ?').run(id);
    },
    ticket(session) {
      db.prepare('DELETE FROM attempts WHERE expires <= ? OR session = ?').run(clock(), session);
      // 48-bit, short-lived pairing code; browser redemption is loopback-only.
      const ticket = secret().slice(0, 12);
      db.prepare('INSERT INTO attempts (id, session, expires) VALUES (?, ?, ?)').run(hash(ticket), session, clock() + 600000);
      return ticket;
    },
    attempt(ticket) { return db.prepare('SELECT * FROM attempts WHERE id = ? AND expires > ?').get(hash(ticket), clock()); },
    start(ticket, browser, state) {
      return db.prepare('UPDATE attempts SET browser = ?, state = ? WHERE id = ? AND state IS NULL AND expires > ?')
        .run(hash(browser), state, hash(ticket), clock()).changes === 1;
    },
    consume(state, browser) {
      // Single synchronous statement prevents concurrent callback replay, including across restarts.
      return db.prepare('DELETE FROM attempts WHERE state = ? AND browser = ? AND expires > ? RETURNING *')
        .get(state, hash(browser), clock());
    },
    connect(session, account, tokens) {
      db.exec('BEGIN IMMEDIATE');
      try {
        const result = db.prepare('UPDATE sessions SET account = ? WHERE id = ? AND expires > ?').run(account, session, clock());
        if (!result.changes) throw new Error('Session expired. Return to the app and start again.');
        db.prepare('INSERT INTO accounts VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET tokens = excluded.tokens').run(account, JSON.stringify(tokens));
        db.exec('COMMIT');
      } catch (error) { db.exec('ROLLBACK'); throw error; }
    },
    tokens(account) { const row = db.prepare('SELECT tokens FROM accounts WHERE id = ?').get(account); return row ? JSON.parse(row.tokens) : null; },
    saveTokens(account, tokens) { db.prepare('UPDATE accounts SET tokens = ? WHERE id = ?').run(JSON.stringify(tokens), account); },
    snapshot(account) { const row = db.prepare('SELECT data FROM snapshots WHERE account = ?').get(account); return row ? JSON.parse(row.data) : undefined; },
    saveSnapshot(account, data) {
      db.prepare('INSERT INTO snapshots VALUES (?, ?) ON CONFLICT(account) DO UPDATE SET data = excluded.data').run(account, JSON.stringify(data));
    },
  };
}
