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
    CREATE TABLE IF NOT EXISTS attempts (id TEXT PRIMARY KEY, session TEXT NOT NULL, browser TEXT,
      state TEXT UNIQUE, expires INTEGER NOT NULL);
  `);
  return {
    close: () => db.close(),
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
      const ticket = secret();
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
