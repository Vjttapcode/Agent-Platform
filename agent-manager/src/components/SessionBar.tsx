import type { Session } from '../api';

export function SessionBar(props: {
  sessions: Session[];
  sessionId: string;
  onChange: (id: string) => void;
  onNew: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  const { sessions, sessionId, onChange, onNew, onRename, onDelete } = props;
  return (
    <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-5 py-2 text-sm">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Session</span>
      <select
        value={sessionId}
        onChange={(e) => onChange(e.target.value)}
        className="min-w-[12rem] rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
      >
        {sessions.length === 0 && <option value="default">default</option>}
        {sessions.map((s) => (
          <option key={s.id} value={s.id}>
            {s.title} ({s.message_count})
          </option>
        ))}
      </select>
      <button onClick={onNew} className="rounded-md border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-indigo-700 hover:bg-indigo-100">
        + New
      </button>
      <button onClick={onRename} className="rounded-md border border-slate-300 px-2.5 py-1 text-slate-600 hover:bg-slate-50">
        Rename
      </button>
      <button onClick={onDelete} className="rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1 text-rose-700 hover:bg-rose-100">
        Delete
      </button>
    </div>
  );
}
