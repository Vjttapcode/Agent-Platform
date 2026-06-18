// The Agent Manager talks ONLY to the local BA Agent API (via the Vite proxy).

export interface Agent {
  id: string;
  name: string;
  description: string;
  active: boolean;
}
export interface FileInfo {
  name: string;
  bytes: number;
}
export interface LoadedFiles {
  prompt: FileInfo[];
  conventions: FileInfo[];
  knowledge: FileInfo[];
  skills: FileInfo[];
}
export interface Doc {
  name: string;
  content: string;
}
export interface Msg {
  role: 'user' | 'assistant';
  content: string;
  ts?: string;
}
export interface ModelOption {
  id: string;
  label: string;
}
export interface Session {
  id: string;
  title: string;
  agent: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}
export interface Phase {
  id: string;
  label: string;
  agent: string;
  output: string;
  inputs: string[];
  runnable: boolean;
  done: boolean;
}
export interface Workflow {
  name: string;
  description?: string;
  phases: Phase[];
}

async function json<T>(r: Response): Promise<T> {
  if (!r.ok) {
    let msg = `Request failed (${r.status})`;
    try {
      const body = (await r.json()) as { error?: string };
      if (body?.error) msg = body.error;
    } catch {
      /* non-JSON error body */
    }
    throw new Error(msg);
  }
  return r.json() as Promise<T>;
}

export const api = {
  agents: (): Promise<Agent[]> => fetch('/api/agents').then((r) => json<Agent[]>(r)),

  files: (id: string): Promise<{ active: boolean; files: LoadedFiles }> =>
    fetch(`/api/agents/${id}/files`).then((r) => json(r)),

  section: (id: string, type: string): Promise<Doc[]> =>
    fetch(`/api/agents/${id}/section/${type}`).then((r) => json<Doc[]>(r)),

  memory: (id: string): Promise<Msg[]> =>
    fetch(`/api/agents/${id}/section/memory`).then((r) => json<Msg[]>(r)),

  reload: (id: string, type: string): Promise<{ reloaded: string; files: FileInfo[] | LoadedFiles }> =>
    fetch(`/api/agents/${id}/reload/${type}`, { method: 'POST' }).then((r) => json(r)),

  clearMemory: (id: string): Promise<{ ok: boolean }> =>
    fetch(`/api/agents/${id}/memory/clear`, { method: 'POST' }).then((r) => json(r)),

  models: (): Promise<{ models: ModelOption[]; default: string }> =>
    fetch('/api/models').then((r) => json(r)),

  // --- Sessions ---
  sessions: (): Promise<Session[]> => fetch('/api/sessions').then((r) => json<Session[]>(r)),

  createSession: (title: string): Promise<Session> =>
    fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    }).then((r) => json(r)),

  renameSession: (id: string, title: string): Promise<{ ok: boolean }> =>
    fetch(`/api/sessions/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    }).then((r) => json(r)),

  deleteSession: (id: string): Promise<{ ok: boolean }> =>
    fetch(`/api/sessions/${encodeURIComponent(id)}`, { method: 'DELETE' }).then((r) => json(r)),

  // --- Chat (session-scoped) ---
  history: (sessionId: string): Promise<Msg[]> =>
    fetch(`/api/history?session=${encodeURIComponent(sessionId)}`).then((r) => json<Msg[]>(r)),

  reset: (sessionId: string): Promise<{ ok: boolean }> =>
    fetch('/api/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    }).then((r) => json(r)),

  chat: (message: string, model: string | undefined, sessionId: string): Promise<{ reply: string }> =>
    fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, model, sessionId }),
    }).then((r) => json(r)),

  // --- BMAD workflow (session-scoped) ---
  workflow: (sessionId: string): Promise<Workflow> =>
    fetch(`/api/workflows/bmad?project=${encodeURIComponent(sessionId)}`).then((r) => json(r)),

  wfArtifacts: (sessionId: string): Promise<FileInfo[]> =>
    fetch(`/api/workflows/${encodeURIComponent(sessionId)}/artifacts`).then((r) => json<FileInfo[]>(r)),

  wfArtifact: (sessionId: string, name: string): Promise<{ name: string; content: string }> =>
    fetch(
      `/api/workflows/${encodeURIComponent(sessionId)}/artifact/${encodeURIComponent(name)}`,
    ).then((r) => json(r)),

  runPhase: (
    sessionId: string,
    phase: string,
    idea: string,
    model?: string,
  ): Promise<{ session: string; phase: string; artifact: string; content: string }> =>
    fetch('/api/workflows/run-phase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, phase, idea, model }),
    }).then((r) => json(r)),
};

/** Same slug rule as the server, so artifact reads line up before/after a run. */
export function slug(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'project'
  );
}
