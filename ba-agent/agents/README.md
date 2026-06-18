# Agents

Each agent is a folder with the **same layout** as the BA Agent. To add a new
agent (e.g. `dev`), create:

```
agents/dev/
├─ prompts/
│  └─ system.md          ← required; presence flips the agent to "active"
├─ skills/*.md
├─ knowledge/*.md
├─ conventions/*.md
└─ memory/history.json   ← auto-created
```

The agent then appears as **active** in the Agent Manager dashboard
(`GET /api/agents`) — no code change needed. Until `prompts/system.md` exists,
the agent is shown as **coming soon**.

Registered placeholders (see `src/agents.ts`): `dev`, `tester`, `architect`.

> The BA Agent itself lives at the project root (not under `agents/`) for
> backward compatibility; it is registered with `baseDir = <project root>`.
