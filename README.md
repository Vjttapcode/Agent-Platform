# Agent Platform

A lightweight, file-based **Business Analyst Agent** and the tools around it.
No database — prompts/skills/knowledge/conventions are Markdown, memory is JSON.

## Projects

| Folder | What it is | Stack | Run |
| ------ | ---------- | ----- | --- |
| [`ba-agent/`](ba-agent/README.md) | Core API + MCP server (the agent "brain") | Node, TypeScript, Express | `npm install && npm run dev` → http://localhost:3000 |
| [`agent-manager/`](agent-manager/README.md) | Dashboard to manage agents (reload prompt/skills/knowledge, view files, memory, chat) | React, Vite, Tailwind | `npm install && npm run dev` → http://localhost:5174 |
| [`ba-agent-vscode/`](ba-agent-vscode/README.md) | VSCode extension (sidebar chat, context-menu BA actions) | TypeScript | press **F5**, or package a `.vsix` |

Everything talks to the **ba-agent API only** — no component calls an LLM
directly except `ba-agent` itself.

## Quick start

```bash
# 1) the API (required by everything else)
cd ba-agent
npm install
cp .env.example .env          # then set ONE provider key (see ba-agent/README)
npm run dev                   # http://localhost:3000

# 2) (optional) the dashboard
cd ../agent-manager
npm install && npm run dev    # http://localhost:5174

# 3) (optional) the VSCode extension
cd ../ba-agent-vscode
npm install && npm run compile   # then press F5 in VSCode
```

## Architecture

```
                    ┌──────────────────────────────┐
   Web chat  ─────►  │                              │
   Agent Manager ──► │   ba-agent API (Express)     │ ──► LLM provider
   VSCode ext  ────► │   + MCP server (stdio)       │     (tokenrouter / gemini / anthropic)
   Claude/ruflo ──►  │                              │
                    └──────────────────────────────┘
                          ▲ reads from disk every request
                          │
              prompts/ · skills/ · knowledge/ · conventions/ · memory/
              agents/<id>/…  (add a folder → new agent, no code change)
```

- **Pluggable LLM provider** — switch with `LLM_PROVIDER` in `ba-agent/.env`.
- **Hot reload** — editing a Markdown file is picked up on the next request; the
  Agent Manager exposes explicit Reload buttons.
- **Multi-agent ready** — BA lives at the `ba-agent` root; new agents are added
  by creating `ba-agent/agents/<id>/` (see `ba-agent/agents/README.md`).

See each project's README for details.
