import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './prompt-loader';
import { config } from './config';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  ts: string;
}

const HISTORY_PATH = path.join(ROOT, 'memory', 'history.json');

/** How many recent messages to feed back to the model as conversation memory. */
const MEMORY_WINDOW = config.memoryWindow;

function ensureStore(): void {
  const dir = path.dirname(HISTORY_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(HISTORY_PATH)) fs.writeFileSync(HISTORY_PATH, '[]', 'utf-8');
}

/** Read the full conversation history from disk. */
export function loadHistory(): ChatMessage[] {
  ensureStore();
  try {
    const raw = fs.readFileSync(HISTORY_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ChatMessage[]) : [];
  } catch {
    return [];
  }
}

/** Append one message and persist immediately. */
export function appendMessage(message: ChatMessage): void {
  const history = loadHistory();
  history.push(message);
  fs.writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2), 'utf-8');
}

/** Wipe conversation memory (start a fresh session). */
export function clearHistory(): void {
  ensureStore();
  fs.writeFileSync(HISTORY_PATH, '[]', 'utf-8');
}

/** The most recent N messages, used as short-term conversation memory. */
export function recentMessages(limit = MEMORY_WINDOW): ChatMessage[] {
  return loadHistory().slice(-limit);
}

// --- Agent-scoped helpers (used by the Agent Manager dashboard) -------------

/** Read an agent's conversation memory from its own baseDir. */
export function loadHistoryFrom(baseDir: string): ChatMessage[] {
  try {
    const parsed = JSON.parse(fs.readFileSync(path.join(baseDir, 'memory', 'history.json'), 'utf-8'));
    return Array.isArray(parsed) ? (parsed as ChatMessage[]) : [];
  } catch {
    return [];
  }
}

/** Clear an agent's conversation memory. */
export function clearHistoryFrom(baseDir: string): void {
  const dir = path.join(baseDir, 'memory');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'history.json'), '[]', 'utf-8');
}
