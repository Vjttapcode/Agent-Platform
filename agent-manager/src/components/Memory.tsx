import { useCallback, useEffect, useState } from 'react';
import { api, type Msg } from '../api';

export function Memory({ sessionId, onChanged }: { sessionId: string; onChanged?: () => void }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    return api
      .history(sessionId)
      .then(setMsgs)
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [sessionId]);

  useEffect(() => {
    load();
  }, [load]);

  const clear = async () => {
    if (!confirm('Clear this session’s conversation memory?')) return;
    try {
      await api.reset(sessionId);
      await load();
      onChanged?.();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div className="mx-auto max-w-4xl p-6">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">
          Memory <span className="text-sm font-normal text-slate-400">({msgs.length} messages)</span>
        </h1>
        <button
          onClick={clear}
          className="rounded-md border border-rose-200 bg-rose-50 px-3 py-1.5 text-sm text-rose-700 hover:bg-rose-100"
        >
          Clear Memory
        </button>
      </header>

      {error && <p className="mb-3 text-sm text-rose-600">⚠ {error}</p>}

      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : msgs.length === 0 ? (
        <p className="text-sm text-slate-400">Memory is empty.</p>
      ) : (
        <div className="space-y-2">
          {msgs.map((m, i) => (
            <div key={i} className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                {m.role}
                {m.ts && <span className="ml-2 font-normal normal-case">{new Date(m.ts).toLocaleString()}</span>}
              </div>
              <div className="whitespace-pre-wrap text-sm text-slate-700">{m.content}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
