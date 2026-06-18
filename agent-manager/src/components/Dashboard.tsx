import { useCallback, useEffect, useState } from 'react';
import { api, type Agent, type LoadedFiles } from '../api';

const RELOADS: { type: string; label: string }[] = [
  { type: 'prompt', label: 'Reload Prompt' },
  { type: 'skills', label: 'Reload Skills' },
  { type: 'knowledge', label: 'Reload Knowledge' },
  { type: 'conventions', label: 'Reload Convention' },
];

export function Dashboard({ agentId, agent }: { agentId: string; agent: Agent }) {
  const [files, setFiles] = useState<LoadedFiles | null>(null);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(
    () => api.files(agentId).then((r) => setFiles(r.files)).catch(() => setFiles(null)),
    [agentId],
  );
  useEffect(() => {
    refresh();
  }, [refresh]);

  const doReload = async (type: string, label: string) => {
    setBusy(true);
    try {
      await api.reload(agentId, type);
      await refresh();
      setStatus(`✅ ${label} — reloaded from disk (no restart needed).`);
    } catch {
      setStatus(`⚠ ${label} failed.`);
    } finally {
      setBusy(false);
    }
  };

  const clearMemory = async () => {
    if (!confirm('Clear this agent’s conversation memory?')) return;
    setBusy(true);
    try {
      await api.clearMemory(agentId);
      setStatus('✅ Memory cleared.');
    } catch (e) {
      setStatus(`⚠ Clear failed: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl p-6">
      <header className="mb-5">
        <h1 className="text-xl font-semibold">{agent.name}</h1>
        <p className="text-sm text-slate-500">{agent.description}</p>
      </header>

      {/* Actions */}
      <section className="mb-6 rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Actions</h2>
        <div className="flex flex-wrap gap-2">
          {RELOADS.map((r) => (
            <button
              key={r.type}
              disabled={busy}
              onClick={() => doReload(r.type, r.label)}
              className="rounded-md border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-sm text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
            >
              {r.label}
            </button>
          ))}
          <button
            disabled={busy}
            onClick={() => doReload('all', 'Reload All')}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Reload All
          </button>
          <button
            disabled={busy}
            onClick={clearMemory}
            className="rounded-md border border-rose-200 bg-rose-50 px-3 py-1.5 text-sm text-rose-700 hover:bg-rose-100 disabled:opacity-50"
          >
            Clear Memory
          </button>
        </div>
        {status && <p className="mt-3 text-sm text-slate-600">{status}</p>}
      </section>

      {/* View loaded files */}
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Loaded Files</h2>
        {!files ? (
          <p className="text-sm text-slate-400">Loading…</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FileGroup title="Prompt" items={files.prompt} />
            <FileGroup title="Conventions" items={files.conventions} />
            <FileGroup title="Knowledge" items={files.knowledge} />
            <FileGroup title="Skills" items={files.skills} />
          </div>
        )}
      </section>
    </div>
  );
}

function FileGroup({ title, items }: { title: string; items: { name: string; bytes: number }[] }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
      <div className="mb-1.5 flex items-center justify-between text-xs font-semibold text-slate-500">
        <span>{title}</span>
        <span className="rounded-full bg-slate-200 px-1.5 text-[10px]">{items.length}</span>
      </div>
      <ul className="space-y-0.5 text-sm">
        {items.length === 0 && <li className="text-slate-400">—</li>}
        {items.map((f) => (
          <li key={f.name} className="flex justify-between gap-2">
            <span className="truncate font-mono text-[12px] text-slate-700">{f.name}</span>
            <span className="shrink-0 text-[11px] text-slate-400">{f.bytes} B</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
