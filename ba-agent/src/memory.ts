import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './prompt-loader';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  ts: string;
}

const HISTORY_PATH = path.join(ROOT, 'memory', 'history.json');

/** How many recent messages to feed back to the model as conversation memory. */
const MEMORY_WINDOW = Number(process.env.MEMORY_WINDOW || 40);

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
