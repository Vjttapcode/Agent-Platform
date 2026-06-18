import { useEffect, useState } from 'react';
import { api, type Agent } from './api';
import { Sidebar, type Section } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { Chat } from './components/Chat';
import { SectionView } from './components/SectionView';
import { Memory } from './components/Memory';
import { Workflow } from './components/Workflow';

export default function App() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [agentId, setAgentId] = useState('ba');
  const [section, setSection] = useState<Section>('dashboard');

  useEffect(() => {
    api
      .agents()
      .then((list) => {
        setAgents(list);
        // If BA isn't active for some reason, select the first active agent.
        if (!list.some((a) => a.id === 'ba' && a.active)) {
          const firstActive = list.find((a) => a.active);
          if (firstActive) setAgentId(firstActive.id);
        }
      })
      .catch(() => setAgents([]));
  }, []);

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

      <main className="flex-1 overflow-y-auto">
        {!agent ? (
          <Empty>Loading agents…</Empty>
        ) : section === 'workflow' ? (
          <Workflow />
        ) : !active ? (
          <Empty>
            <span className="text-2xl">🚧</span>
            <p className="mt-2 font-medium">{agent.name} — coming soon</p>
            <p className="mt-1 max-w-md text-sm text-slate-500">
              Create <code className="rounded bg-slate-200 px-1">agents/{agent.id}/prompts/system.md</code> (plus
              skills/knowledge/conventions) and this agent activates automatically — no code changes.
            </p>
          </Empty>
        ) : section === 'dashboard' ? (
          <Dashboard agentId={agentId} agent={agent} />
        ) : section === 'chat' ? (
          <Chat agentId={agentId} />
        ) : section === 'memory' ? (
          <Memory agentId={agentId} />
        ) : (
          <SectionView agentId={agentId} type={section} />
        )}
      </main>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center text-slate-600">{children}</div>
  );
}
