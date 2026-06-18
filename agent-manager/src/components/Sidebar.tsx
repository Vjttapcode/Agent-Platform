import type { Agent } from '../api';

export type Section =
  | 'dashboard'
  | 'workflow'
  | 'chat'
  | 'knowledge'
  | 'skills'
  | 'conventions'
  | 'memory';

const NAV: { id: Section; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '🛠️' },
  { id: 'workflow', label: 'Workflow', icon: '🔀' },
  { id: 'chat', label: 'Chat', icon: '💬' },
  { id: 'knowledge', label: 'Knowledge', icon: '📚' },
  { id: 'skills', label: 'Skills', icon: '🧩' },
  { id: 'conventions', label: 'Conventions', icon: '📐' },
  { id: 'memory', label: 'Memory', icon: '🧠' },
];

export function Sidebar(props: {
  agents: Agent[];
  agentId: string;
  section: Section;
  onAgent: (id: string) => void;
  onSection: (s: Section) => void;
}) {
  const { agents, agentId, section, onAgent, onSection } = props;

  return (
    <aside className="flex w-64 flex-col border-r border-slate-200 bg-white">
      <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
          AM
        </div>
        <div className="text-sm font-semibold">Agent Manager</div>
      </div>

      {/* Agent list */}
      <div className="px-3 py-3">
        <div className="px-1 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Agents</div>
        <div className="space-y-1">
          {agents.map((a) => {
            const selected = a.id === agentId;
            return (
              <button
                key={a.id}
                onClick={() => onAgent(a.id)}
                className={`flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-sm ${
                  selected ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="truncate">{a.name}</span>
                <span
                  className={`ml-2 shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                    a.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {a.active ? 'active' : 'soon'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Section nav */}
      <div className="border-t border-slate-200 px-3 py-3">
        <div className="space-y-1">
          {NAV.map((n) => (
            <button
              key={n.id}
              onClick={() => onSection(n.id)}
              className={`flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm ${
                section === n.id ? 'bg-slate-100 font-medium text-slate-900' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span>{n.icon}</span>
              {n.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-auto px-4 py-3 text-[11px] text-slate-400">Talks only to localhost:3000</div>
    </aside>
  );
}
