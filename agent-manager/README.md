# Agent Manager (MVP)

A lightweight dashboard to manage local agents. Talks **only** to the BA Agent
API (`http://localhost:3000`) via a Vite dev proxy (no CORS needed).

## Features
- **Dashboard** — lists agents (BA active; Dev / Tester / Architect shown as *coming soon*).
- **Sidebar** — Agent list + sections: Chat, Knowledge, Skills, Conventions, Memory.
- **Actions** — Reload Prompt / Skills / Knowledge / Convention / All, Clear Memory, View Loaded Files.
- The BA Agent **reloads without restarting** — loaders read from disk on every
  request, so editing a `.md` file + clicking Reload reflects immediately.

## Stack
React + Vite + Tailwind v4.

## Run

1. Start the BA Agent API first:
   ```bash
   cd ../ba-agent
   npm run dev          # http://localhost:3000
   ```
2. Start the manager:
   ```bash
   cd agent-manager
   npm install
   npm run dev          # http://localhost:5174
   ```

## Adding a new agent (no code change)
Create `../ba-agent/agents/<id>/prompts/system.md` (plus `skills/`, `knowledge/`,
`conventions/`). It activates automatically — `dev`, `tester`, `architect` are
already registered as placeholders in `ba-agent/src/agents.ts`.

## Architecture
```
React UI ──/api proxy──► BA Agent API ──► loaders read agents/<id>/… from disk
```
The UI never calls an LLM directly; everything goes through the BA Agent API.
