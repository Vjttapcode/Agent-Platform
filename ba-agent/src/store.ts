import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { config } from './config';
import { ROOT } from './prompt-loader';
import { logger } from './logger';

/**
 * Centralized data store (SQLite, single file at DATA_DIR/app.db).
 *
 * Holds RUNTIME data only — sessions, chat messages, and (from D3) workflow
 * artifacts. Prompts/skills/knowledge/conventions stay as files in the repo.
 * WAL mode makes concurrent reads/writes safe on a server.
 */

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  ts: string;
}

export interface SessionRow {
  id: string;
  title: string;
  agent: string;
  created_at: string;
  updated_at: string;
}

let db: Database.Database | null = null;

function nowISO(): string {
  return new Date().toISOString();
}

function getDb(): Database.Database {
  if (db) return db;
  if (!fs.existsSync(config.dataDir)) fs.mkdirSync(config.dataDir, { recursive: true });
  const file = path.join(config.dataDir, 'app.db');
  db = new Database(file);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id         TEXT PRIMARY KEY,
      title      TEXT NOT NULL,
      agent      TEXT NOT NULL DEFAULT 'ba',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS messages (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      role       TEXT NOT NULL,
      content    TEXT NOT NULL,
      ts         TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id, id);
    CREATE TABLE IF NOT EXISTS artifacts (
      session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      name       TEXT NOT NULL,
      phase      TEXT,
      content    TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (session_id, name)
    );
  `);
  migrateLegacy(db);
  migrateWorkspace(db);
  logger.info(`[store] SQLite ready at ${file}`);
  return db;
}

/** One-time import of old workspace/<project>/*.md files into session artifacts. */
function migrateWorkspace(d: Database.Database): void {
  const count = (d.prepare('SELECT COUNT(*) AS c FROM artifacts').get() as { c: number }).c;
  if (count > 0) return;
  const wsRoot = path.join(ROOT, 'workspace');
  if (!fs.existsSync(wsRoot)) return;
  try {
    for (const project of fs.readdirSync(wsRoot)) {
      const dir = path.join(wsRoot, project);
      if (!fs.statSync(dir).isDirectory()) continue;
      const files = fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.md'));
      if (files.length === 0) continue;
      ensureSessionOn(d, project, project);
      const ins = d.prepare(
        `INSERT INTO artifacts(session_id,name,phase,content,updated_at) VALUES(?,?,?,?,?)
         ON CONFLICT(session_id,name) DO NOTHING`,
      );
      for (const f of files) {
        ins.run(project, f, null, fs.readFileSync(path.join(dir, f), 'utf-8'), nowISO());
      }
      logger.info(`[store] migrated workspace '${project}' (${files.length} artifacts)`);
    }
  } catch (err) {
    logger.warn('[store] workspace migration skipped:', err);
  }
}

/** One-time import of the old memory/history.json into a 'default' session. */
function migrateLegacy(d: Database.Database): void {
  const count = (d.prepare('SELECT COUNT(*) AS c FROM messages').get() as { c: number }).c;
  if (count > 0) return;
  const legacy = path.join(ROOT, 'memory', 'history.json');
  if (!fs.existsSync(legacy)) return;
  try {
    const arr = JSON.parse(fs.readFileSync(legacy, 'utf-8'));
    if (!Array.isArray(arr) || arr.length === 0) return;
    ensureSessionOn(d, 'default', 'Default');
    const ins = d.prepare('INSERT INTO messages(session_id,role,content,ts) VALUES(?,?,?,?)');
    const tx = d.transaction((rows: ChatMessage[]) => {
      for (const m of rows) ins.run('default', m.role, m.content, m.ts ?? nowISO());
    });
    tx(arr as ChatMessage[]);
    logger.info(`[store] migrated ${arr.length} legacy messages → session 'default'`);
  } catch (err) {
    logger.warn('[store] legacy migration skipped:', err);
  }
}

function ensureSessionOn(d: Database.Database, id: string, title: string, agent = 'ba'): void {
  const existing = d.prepare('SELECT id FROM sessions WHERE id=?').get(id);
  if (!existing) {
    const ts = nowISO();
    d.prepare('INSERT INTO sessions(id,title,agent,created_at,updated_at) VALUES(?,?,?,?,?)').run(
      id,
      title,
      agent,
      ts,
      ts,
    );
  }
}

// --- Sessions ---------------------------------------------------------------
export interface SessionSummary extends SessionRow {
  message_count: number;
}

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'session'
  );
}

export function ensureSession(id: string, title?: string, agent = 'ba'): void {
  ensureSessionOn(getDb(), id, title ?? id, agent);
}

/** Create a session with a generated id. */
export function createSession(title: string, agent = 'ba'): SessionRow {
  const id = `${slugify(title)}-${Date.now().toString(36)}`;
  ensureSessionOn(getDb(), id, title, agent);
  return getSession(id)!;
}

export function renameSession(id: string, title: string): void {
  getDb().prepare('UPDATE sessions SET title=?, updated_at=? WHERE id=?').run(title, nowISO(), id);
}

export function listSessions(): SessionSummary[] {
  return getDb()
    .prepare(
      `SELECT s.*, (SELECT COUNT(*) FROM messages m WHERE m.session_id = s.id) AS message_count
       FROM sessions s ORDER BY s.updated_at DESC`,
    )
    .all() as SessionSummary[];
}

export function getSession(id: string): SessionRow | undefined {
  return getDb().prepare('SELECT * FROM sessions WHERE id=?').get(id) as SessionRow | undefined;
}

export function deleteSession(id: string): void {
  getDb().prepare('DELETE FROM sessions WHERE id=?').run(id);
}

function touch(id: string): void {
  getDb().prepare('UPDATE sessions SET updated_at=? WHERE id=?').run(nowISO(), id);
}

// --- Messages ---------------------------------------------------------------
export function getMessages(sessionId: string): ChatMessage[] {
  return getDb()
    .prepare('SELECT role, content, ts FROM messages WHERE session_id=? ORDER BY id')
    .all(sessionId) as ChatMessage[];
}

export function appendMessage(sessionId: string, message: ChatMessage): void {
  ensureSession(sessionId);
  getDb()
    .prepare('INSERT INTO messages(session_id,role,content,ts) VALUES(?,?,?,?)')
    .run(sessionId, message.role, message.content, message.ts);
  touch(sessionId);
}

export function clearMessages(sessionId: string): void {
  getDb().prepare('DELETE FROM messages WHERE session_id=?').run(sessionId);
}

// --- Artifacts (workflow living documents) ----------------------------------
export interface ArtifactInfo {
  name: string;
  bytes: number;
  phase: string | null;
  updated_at: string;
}

export function putArtifact(sessionId: string, name: string, content: string, phase?: string): void {
  ensureSession(sessionId);
  getDb()
    .prepare(
      `INSERT INTO artifacts(session_id,name,phase,content,updated_at) VALUES(?,?,?,?,?)
       ON CONFLICT(session_id,name) DO UPDATE SET content=excluded.content, phase=excluded.phase, updated_at=excluded.updated_at`,
    )
    .run(sessionId, name, phase ?? null, content, nowISO());
  touch(sessionId);
}

export function listArtifacts(sessionId: string): ArtifactInfo[] {
  return getDb()
    .prepare(
      `SELECT name, LENGTH(content) AS bytes, phase, updated_at
       FROM artifacts WHERE session_id=? ORDER BY name`,
    )
    .all(sessionId) as ArtifactInfo[];
}

export function getArtifact(sessionId: string, name: string): string | null {
  const row = getDb()
    .prepare('SELECT content FROM artifacts WHERE session_id=? AND name=?')
    .get(sessionId, name) as { content: string } | undefined;
  return row ? row.content : null;
}
