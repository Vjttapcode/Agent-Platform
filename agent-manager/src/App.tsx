import { useCallback, useEffect, useState } from 'react';
import { api, type Agent, type Session } from './api';
import { Sidebar, type Section } from './components/Sidebar';
import { SessionBar } from './components/SessionBar';
import { Dashboard } from './components/Dashboard';
import { Chat } from './components/Chat';
import { SectionView } from './components/SectionView';
import { Memory } from './components/Memory';
import { Workflow } from './components/Workflow';

const LS_KEY = 'ba-agent.sessionId';

export default function App() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [agentId, setAgentId] = useState('ba');
  const [section, setSection] = useState<Section>('dashboard');

  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionId, setSessionId] = useState<string>(() => localStorage.getItem(LS_KEY) || 'default');

  useEffect(() => {
    api
      .agents()
      .then((list) => {
        setAgents(list);
        if (!list.some((a) => a.id === 'ba' && a.active)) {
          const firstActive = list.find((a) => a.active);
          if (firstActive) setAgentId(firstActive.id);
        }
      })
      .catch(() => setAgents([]));
  }, []);

  const refreshSessions = useCallback(async () => {
    const list = await api.sessions().catch(() => [] as Session[]);
    setSessions(list);
    // Keep the current selection valid after reload/delete.
    setSessionId((cur) => (list.some((s) => s.id === cur) ? cur : (list[0]?.id ?? 'default')));
  }, []);

  useEffect(() => {
    refreshSessions();
  }, [refreshSessions]);

  useEffect(() => {
    localStorage.setItem(LS_KEY, sessionId);
  }, [sessionId]);

  const newSession = async () => {
    const title = prompt('New session name?')?.trim();
    if (!title) return;
    const s = await api.createSession(title);
    await refreshSessions();
    setSessionId(s.id);
  };

  const renameSession = async () => {
    const cur = sessions.find((s) => s.id === sessionId);
    const title = prompt('Rename session', cur?.title ?? '')?.trim();
    if (!title) return;
    await api.renameSession(sessionId, title);
    refreshSessions();
  };

  const deleteSession = async () => {
    if (sessionId === 'default') {
      alert('The default session cannot be deleted.');
      return;
    }
    if (!confirm('Delete this session (chat + artifacts)?')) return;
    await api.deleteSession(sessionId);
    setSessionId('default');
    refreshSessions();
  };

  const agent = agents.find((a) => a.id === agentId);
  const active = agent?.active ?? false;

  return (
    <div className="flex h-screen bg-slate-100 text-slate-800">
      <Sidebar
        agents={agents}
        agentId={agentId}
        section={section}
        onAgent={(id) => {
          setAgentId(id);
          setSection('dashboard');
        }}
        onSection={setSection}
      />

      <main className="flex flex-1 flex-col overflow-hidden">
        <SessionBar
          sessions={sessions}
          sessionId={sessionId}
          onChange={setSessionId}
          onNew={newSession}
          onRename={renameSession}
          onDelete={deleteSession}
        />

        <div className="flex-1 overflow-y-auto">
          {!agent ? (
            <Empty>Loading agents…</Empty>
          ) : section === 'workflow' ? (
            <Workflow sessionId={sessionId} onArtifactsChanged={refreshSessions} />
          ) : section === 'chat' ? (
            <Chat sessionId={sessionId} onChanged={refreshSessions} />
          ) : section === 'memory' ? (
            <Memory sessionId={sessionId} onChanged={refreshSessions} />
          ) : !active ? (
            <Empty>
              <span className="text-2xl">🚧</span>
              <p className="mt-2 font-medium">{agent.name} — coming soon</p>
              <p className="mt-1 max-w-md text-sm text-slate-500">
                Create <code className="rounded bg-slate-200 px-1">agents/{agent.id}/prompts/system.md</code> to
                activate this agent — no code changes.
              </p>
            </Empty>
          ) : section === 'dashboard' ? (
            <Dashboard agentId={agentId} agent={agent} />
          ) : (
            <SectionView agentId={agentId} type={section} />
          )}
        </div>
      </main>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center text-slate-600">{children}</div>
  );
}
