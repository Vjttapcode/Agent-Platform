import * as vscode from 'vscode';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  ts?: string;
}

/** Configured base URL (no trailing slash). The extension never calls Claude directly. */
export function baseUrl(): string {
  const url =
    vscode.workspace.getConfiguration('baAgent').get<string>('apiUrl') ||
    'http://localhost:3000';
  return url.replace(/\/+$/, '');
}

/** POST <apiUrl>/chat  →  { reply } */
export async function sendChat(message: string): Promise<string> {
  const res = await fetch(`${baseUrl()}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });
  if (!res.ok) {
    let detail = '';
    try {
      detail = ((await res.json()) as { error?: string }).error ?? '';
    } catch {
      /* ignore parse errors */
    }
    throw new Error(detail || `BA Agent responded with ${res.status} ${res.statusText}`);
  }
  const data = (await res.json()) as { reply: string };
  return data.reply ?? '';
}

/** GET <apiUrl>/history  →  ChatMessage[] */
export async function getHistory(): Promise<ChatMessage[]> {
  try {
    const res = await fetch(`${baseUrl()}/history`);
    if (!res.ok) return [];
    const data = (await res.json()) as ChatMessage[];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

/** POST <apiUrl>/reset */
export async function resetHistory(): Promise<void> {
  await fetch(`${baseUrl()}/reset`, { method: 'POST' });
}

/** Turn any failure into a friendly, actionable message. */
export function describeError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (/fetch failed|ECONNREFUSED|ENOTFOUND|EAI_AGAIN|network|Failed to fetch/i.test(msg)) {
    return `Cannot reach the BA Agent at ${baseUrl()}. Start it first (run "npm run dev" in the ba-agent project), or update the "baAgent.apiUrl" setting.`;
  }
  return msg;
}
