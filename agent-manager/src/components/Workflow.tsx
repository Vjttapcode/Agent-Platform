import { useCallback, useEffect, useState } from 'react';
import { api, type Phase, type FileInfo, type ModelOption } from '../api';

export function Workflow({ sessionId, onArtifactsChanged }: { sessionId: string; onArtifactsChanged?: () => void }) {
  const [idea, setIdea] = useState('');
  const [phases, setPhases] = useState<Phase[]>([]);
  const [artifacts, setArtifacts] = useState<FileInfo[]>([]);
  const [models, setModels] = useState<ModelOption[]>([]);
  const [model, setModel] = useState('');
  const [open, setOpen] = useState<{ name: string; content: string } | null>(null);
  const [busy, setBusy] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    api.models().then((d) => { setModels(d.models); setModel(d.default); }).catch(() => setModels([]));
  }, []);

  const load = useCallback(async () => {
    try {
      const [wf, arts] = await Promise.all([api.workflow(sessionId), api.wfArtifacts(sessionId)]);
      setPhases(wf.phases);
      setArtifacts(arts);
    } catch (e) {
      setStatus(`⚠ ${(e as Error).message}`);
    }
  }, [sessionId]);

  useEffect(() => {
    setOpen(null);
    setStatus('');
    load();
  }, [load]);

  const run = async (phase: Phase) => {
    if (phase.id === 'analysis' && !idea.trim()) {
      setStatus('⚠ Enter a product idea for Analysis.');
      return;
    }
    setBusy(phase.id);
    setStatus('');
    try {
      const res = await api.runPhase(sessionId, phase.id, idea, model || undefined);
      setOpen({ name: res.artifact, content: res.content });
      await load();
      onArtifactsChanged?.();
      setStatus(`✅ ${phase.label} → ${res.artifact}`);
    } catch (e) {
      setStatus(`⚠ ${(e as Error).message}`);
    } finally {
      setBusy('');
    }
  };

  const view = async (name: string) => {
    try {
      setOpen(await api.wfArtifact(sessionId, name));
    } catch (e) {
      setStatus(`⚠ ${(e as Error).message}`);
    }
  };

  const doneSet = new Set(artifacts.map((a) => a.name));

  return (
    <div className="mx-auto max-w-4xl p-6">
      <header className="mb-4">
        <h1 className="text-xl font-semibold">BMAD Workflow</h1>
        <p className="text-sm text-slate-500">
          Session <code className="rounded bg-slate-100 px-1">{sessionId}</code> · run a phase, review the artifact,
          then run the next.
        </p>
      </header>

      <section className="mb-5 space-y-3 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="rounded-md border border-slate-300 px-2 py-2 text-sm"
          >
            {models.map((m) => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
        </div>
        <textarea
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          rows={3}
          placeholder="Product idea / seed input (used by the Analysis phase)…"
          className="w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
        />
        {status && <p className="text-sm text-slate-600">{status}</p>}
      </section>

      <section className="mb-5 space-y-2">
        {phases.map((p) => {
          const inputsReady = p.inputs.every((i) => doneSet.has(i));
          const disabled = !p.runnable || !inputsReady || busy !== '';
          return (
            <div key={p.id} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 text-sm font-medium">
                  {p.label}
                  <span className="rounded bg-slate-100 px-1.5 text-[11px] text-slate-500">{p.agent}</span>
                  {doneSet.has(p.output) && (
                    <span className="rounded-full bg-emerald-100 px-1.5 text-[10px] text-emerald-700">done</span>
                  )}
                  {!p.runnable && (
                    <span className="rounded-full bg-slate-100 px-1.5 text-[10px] text-slate-400">agent not active</span>
                  )}
                </div>
                <div className="text-[11px] text-slate-400">
                  → {p.output}
                  {p.inputs.length > 0 && ` · needs ${p.inputs.join(', ')}`}
                </div>
              </div>
              <button
                disabled={disabled}
                onClick={() => run(p)}
                className="rounded-md border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-sm text-indigo-700 hover:bg-indigo-100 disabled:opacity-40"
              >
                {busy === p.id ? 'Running…' : doneSet.has(p.output) ? 'Re-run' : 'Run'}
              </button>
            </div>
          );
        })}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold text-slate-700">
          Artifacts <span className="font-normal text-slate-400">({artifacts.length})</span>
        </h2>
        {artifacts.length === 0 ? (
          <p className="text-sm text-slate-400">No artifacts yet — run the Analysis phase.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {artifacts.map((a) => (
              <button
                key={a.name}
                onClick={() => view(a.name)}
                className="rounded-md border border-slate-300 px-2.5 py-1 text-sm hover:bg-slate-50"
              >
                {a.name} <span className="text-[11px] text-slate-400">{a.bytes} B</span>
              </button>
            ))}
          </div>
        )}
        {open && (
          <pre className="mt-3 max-h-[28rem] overflow-auto rounded-lg border border-slate-100 bg-slate-50 p-4 text-[12px] leading-relaxed whitespace-pre-wrap text-slate-700">
            {open.content}
          </pre>
        )}
      </section>
    </div>
  );
}
