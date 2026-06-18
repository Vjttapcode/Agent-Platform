import path from 'node:path';
import { ROOT } from './prompt-loader';
import { config } from './config';
import * as store from './store';

export type { ChatMessage } from './store';
import type { ChatMessage } from './store';

/**
 * Conversation memory, backed by the SQLite store and scoped by sessionId.
 * sessionId defaults to 'default' so older callers keep working unchanged.
 * Per-agent dashboard helpers map an agent baseDir to a session.
 */

export const DEFAULT_SESSION = 'default';

function sessionForBaseDir(baseDir: string): string {
  return baseDir === ROOT ? DEFAULT_SESSION : `agent-${path.basename(baseDir)}`;
}

export function loadHistory(sessionId: string = DEFAULT_SESSION): ChatMessage[] {
  return store.getMessages(sessionId);
}

export function appendMessage(sessionId: string, message: ChatMessage): void {
  store.appendMessage(sessionId, message);
}

export function clearHistory(sessionId: string = DEFAULT_SESSION): void {
  store.clearMessages(sessionId);
}

/** The most recent N messages for a session, used as short-term memory. */
export function recentMessages(
  sessionId: string = DEFAULT_SESSION,
  limit = config.memoryWindow,
): ChatMessage[] {
  return store.getMessages(sessionId).slice(-limit);
}

// --- Agent-scoped helpers (used by the Agent Manager dashboard) -------------

export function loadHistoryFrom(baseDir: string): ChatMessage[] {
  return store.getMessages(sessionForBaseDir(baseDir));
}

export function clearHistoryFrom(baseDir: string): void {
  store.clearMessages(sessionForBaseDir(baseDir));
}
