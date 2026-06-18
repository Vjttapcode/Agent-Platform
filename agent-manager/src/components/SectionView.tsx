import { useCallback, useEffect, useState } from 'react';
import { api, type Doc } from '../api';

const TITLE: Record<string, string> = {
  knowledge: 'Knowledge',
  skills: 'Skills',
  conventions: 'Conventions',
};

/** Read-only viewer for knowledge / skills / conventions, with a Reload button. */
export function SectionView({ agentId, type }: { agentId: string; type: string }) {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    return api
      .section(agentId, type)
      .then(setDocs)
      .catch((e) => setStatus(`⚠ ${(e as Error).message}`))
      .finally(() => setLoading(false));
  }, [agentId, type]);

  useEffect(() => {
    setOpen(null);
    setStatus('');
    load();
  }, [load]);

  const reload = async () => {
    try {
      await api.reload(agentId, type);
      await load();
      setStatus('reloaded ✓');
      setTimeout(() => setStatus(''), 1500);
    } catch (e) {
      setStatus(`⚠ ${(e as Error).message}`);
    }
  };

  return (
    <div className="mx-auto max-w-4xl p-6">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">
          {TITLE[type] ?? type} <span className="text-sm font-normal text-slate-400">({docs.length})</span>
        </h1>
        <button
          onClick={reload}
          className="rounded-md border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-sm text-indigo-700 hover:bg-indigo-100"
        >
          Reload {status}
        </button>
      </header>

      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : docs.length === 0 ? (
        <p className="text-sm text-slate-400">No files.</p>
      ) : (
        <div className="space-y-2">
          {docs.map((d) => (
            <div key={d.name} className="overflow-hidden rounded-lg border border-slate-200 bg-white">
              <button
                onClick={() => setOpen(open === d.name ? null : d.name)}
                className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-slate-50"
              >
                <span className="font-mono text-[13px]">{d.name}</span>
                <span className="text-slate-400">{open === d.name ? '−' : '+'}</span>
              </button>
              {open === d.name && (
                <pre className="max-h-[28rem] overflow-auto border-t border-slate-100 bg-slate-50 p-4 text-[12px] leading-relaxed whitespace-pre-wrap text-slate-700">
                  {d.content}
                </pre>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
