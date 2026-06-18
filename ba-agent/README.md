# BA Agent — MVP Business Analyst Agent

A production-ready MVP **Business Analyst Agent** powered by the Anthropic Claude
API. No database — everything is loaded from / stored as **Markdown & JSON files**.

The agent helps you:

1. **Chat** about a product idea
2. **Requirement Analysis**
3. **User Story Generation** (INVEST)
4. **Acceptance Criteria** (Given/When/Then)
5. **BRD Draft**
6. **Ask Missing Questions**

---

## How the prompt is composed

Every request to Claude is built from auto-loaded files:

```
System Prompt   (prompts/system.md)
   + Conventions   (conventions/*.md)
   + Knowledge     (knowledge/*.md)
   + Skills        (skills/*.md)
   + Conversation Memory (memory/history.json)
```

Drop a new `*.md` file into `conventions/`, `knowledge/`, or `skills/` and it is
**loaded automatically** on the next request — no code changes needed.

---

## Tech stack

- **Node.js + TypeScript** (run directly with `tsx`, no build step required)
- **Express** HTTP server + JSON API
- **Pluggable LLM provider** — **Google Gemini (free)** or **Anthropic Claude**,
  switchable with one env var (`@google/genai` / `@anthropic-ai/sdk`)
- **dotenv** for configuration
- **TailwindCSS** (CDN) + `marked` for the web chat UI
- **No database** — Markdown for knowledge, JSON for memory

## Choosing a provider (free vs paid)

Set `LLM_PROVIDER` in `.env`:

| `LLM_PROVIDER` | Model env | Cost | Get a key |
| -------------- | --------- | ---- | --------- |
| `tokenrouter` (default) | `TOKENROUTER_MODEL` (e.g. `minimax-m3`) | Paid — your TokenRouter account | TokenRouter dashboard |
| `gemini`           | `GEMINI_MODEL` | **Free tier** — Google account, no card | <https://aistudio.google.com/apikey> |
| `anthropic`        | `ANTHROPIC_MODEL` | Paid — needs credits | <https://console.anthropic.com/settings/keys> |

`tokenrouter` works with any OpenAI-compatible gateway — set `TOKENROUTER_BASE_URL`,
`TOKENROUTER_API_KEY`, and `TOKENROUTER_MODEL` in `.env`.

To test for **free**, keep `LLM_PROVIDER=gemini` and set `GEMINI_API_KEY`.
The BA logic (prompts, skills, knowledge, memory, UI) is identical either way —
only the LLM engine in `src/llm.ts` changes.

---

## Project structure

```
ba-agent/
├─ src/
│  ├─ server.ts            # Express server + API routes
│  ├─ agent.ts             # Composes the prompt & calls Claude
│  ├─ prompt-loader.ts     # System prompt + conventions + generic md loaders
│  ├─ skill-loader.ts      # Loads skills/*.md
│  ├─ knowledge-loader.ts  # Loads knowledge/*.md
│  ├─ llm.ts               # Pluggable LLM provider (Gemini / Anthropic)
│  └─ memory.ts            # Reads/writes conversation memory (JSON)
├─ prompts/system.md       # Base system prompt
├─ skills/                 # One playbook per capability (auto-loaded)
├─ knowledge/              # BA domain knowledge (auto-loaded)
├─ conventions/            # Output/format conventions (auto-loaded)
├─ memory/history.json     # Conversation memory (auto-created)
├─ public/index.html       # Tailwind web chat
├─ package.json
├─ tsconfig.json
└─ .env.example
```

---

## Setup & run

### 1. Install dependencies

```bash
cd ba-agent
npm install
```

### 2. Configure your API key

```bash
# macOS / Linux
cp .env.example .env

# Windows (PowerShell)
Copy-Item .env.example .env
```

Then edit `.env`. For **free** testing, use Gemini:

```
LLM_PROVIDER=gemini
GEMINI_API_KEY=AIza...        # free key from https://aistudio.google.com/apikey
```

Or use Claude (paid):

```
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...  # from https://console.anthropic.com/settings/keys
```

### 3. Start the app

```bash
npm run dev      # auto-reload during development
# or
npm start        # run once
```

Open <http://localhost:3000> and start chatting.

---

## Available scripts

| Command            | What it does                                  |
| ------------------ | --------------------------------------------- |
| `npm run dev`      | Start with auto-reload (`tsx watch`)          |
| `npm start`        | Start the server once (`tsx`)                 |
| `npm run build`    | Compile TypeScript to `dist/`                 |
| `npm run serve`    | Run the compiled build (`node dist/server.js`)|
| `npm run mcp`      | Run the MCP server (stdio) — see [MCP.md](MCP.md) |
| `npm run mcp:smoke`| Smoke-test all MCP tools                      |
| `npm run import`   | Convert a `.docx` to Markdown (CLI)           |
| `npm run make-sample` | Generate a sample SRS `.docx` to try        |
| `npm run typecheck`| Type-check without emitting                   |
| `npm run lint`     | Lint with ESLint (typescript-eslint)          |

---

## Configuration

All settings come from `.env` (read once in [`src/config.ts`](src/config.ts)):

| Variable | Default | Purpose |
| -------- | ------- | ------- |
| `LLM_PROVIDER` | `anthropic` | `tokenrouter` \| `gemini` \| `anthropic` |
| `*_API_KEY` | — | Key for the active provider |
| `*_MODEL` | per provider | Default model for that provider |
| `TOKENROUTER_BASE_URL` | `https://api.tokenrouter.com/v1` | OpenAI-compatible gateway URL |
| `TOKENROUTER_MODELS` | — | Extra model ids for the picker (comma-separated) |
| `MAX_TOKENS` | `4096` | Max output tokens per reply |
| `ANALYZE_MAX_TOKENS` | `8192` | Max output tokens for SRS/document analysis |
| `MEMORY_WINDOW` | `40` | Recent messages sent back as memory |
| `LOG_LEVEL` | `info` | `debug` \| `info` \| `warn` \| `error` |
| `PORT` | `3000` | HTTP port |

Logs are written to **stderr** (leveled, timestamped) via [`src/logger.ts`](src/logger.ts),
including one line per HTTP request — safe for the MCP stdio transport.

---

## API

| Method | Route          | Body                | Description                       |
| ------ | -------------- | ------------------- | --------------------------------- |
| `GET`  | `/api/health`  | —                   | Model + loaded skills/knowledge   |
| `GET`  | `/api/history` | —                   | Full conversation memory          |
| `POST` | `/api/chat`    | `{ "message": "" }` | Send a message, get a reply       |
| `POST` | `/api/reset`   | —                   | Clear conversation memory         |
| `GET`  | `/api/documents` | —                 | List imported documents           |
| `POST` | `/api/import`  | `multipart: file=<.docx>` | Convert a `.docx` → Markdown, store it |
| `POST` | `/api/analyze` | `{ "doc": "name.md" }` | Run an SRS review on a stored doc |

Example:

```bash
curl -s http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Analyze requirements for a food delivery app"}'
```

---

## Import & analyze an SRS (.docx)

Upload a Word SRS, convert it to Markdown (headings + **requirement tables**
preserved), and get an automatic review covering:

1. **Ambiguous / unclear statements** → prioritized clarifying questions.
2. **Technically hard or risky features** → classified with risk levels and
   suggested spikes / fallbacks.
3. **Conflicts & inconsistencies** → with suggested resolutions.

**From the web UI:** click **📎 Import SRS (.docx)**, pick the file — it converts
and analyzes automatically.

**Try it with the bundled sample:**

```bash
npm run make-sample          # writes samples/sample-srs.docx
# then click "Import SRS" in the UI and choose that file
```

**From the CLI (best for large files):**

```bash
npm run import -- "C:\path\to\your-srs.docx"
# → documents/your-srs.md  (then POST /analyze { "doc": "your-srs.md" })
```

Imported docs live in `documents/` and are analyzed **on demand** — they are not
injected into every prompt, so a large SRS never bloats the system prompt.
Review depth is bounded by `ANALYZE_MAX_TOKENS` (default 8192).

---

## Use as an MCP server (ruflo / Claude Desktop / Claude Code)

The same agent is exposed as a standard **MCP server** over stdio, with five
tools — `analyze_requirement`, `create_user_story`, `create_brd`,
`review_requirement`, `ask_missing_questions` — each reusing the existing agent
in-process (no duplicated prompt logic, no HTTP server required).

```bash
npm run mcp          # start the MCP server (stdio)
npm run mcp:smoke    # verify all five tools
```

Full connection instructions for **ruflo**, **Claude Desktop**, and **Claude
Code** are in **[MCP.md](MCP.md)**.

---

## BMAD workflow (Analysis phase — M1)

A lightweight [BMAD](https://github.com/bmad-code-org/BMAD-METHOD)-style pipeline:
each phase produces a Markdown **artifact** (living document) under
`workspace/<project>/`, with a **human-in-the-loop gate** — run one phase, review
or edit the artifact, then run the next. A phase is runnable only when its agent
is active (BA is; PM / Architect / Dev activate when you create `agents/<id>/`).

| Phase | Agent | Artifact | Status |
| ----- | ----- | -------- | ------ |
| Analysis | `ba` | `brief.md` | ✅ active |
| Planning | `pm` | `prd.md` | ✅ active |
| Solutioning | `architect` | `architecture.md` | ✅ active |
| Implementation | `dev` | `stories.md` | ✅ active |
| QA | `tester` | `test-plan.md` | ✅ active |

Phases are declared in [`workflows/bmad.json`](workflows/bmad.json) (read from
disk per call — editable without restart). Each phase runs its own agent
(`agents/<id>/`, except BA at the project root) and reads the prior phase's
artifact as input. BA skills powering Analysis: `project-brief`, `brainstorming`,
`market-research`, `competitor-analysis`, `stakeholder-interview`,
`success-metrics`.

```bash
# run the Analysis phase for a new project
curl -s http://localhost:3000/api/workflows/run-phase \
  -H "Content-Type: application/json" \
  -d '{"project":"my-app","phase":"analysis","idea":"<your product idea>"}'

curl http://localhost:3000/api/workflows/my-app/artifacts          # list artifacts
curl http://localhost:3000/api/workflows/my-app/artifact/brief.md  # read brief
```

---

## Customizing the agent

- **Change behavior** → edit `prompts/system.md`.
- **Add a skill** → drop `skills/my-skill.md`.
- **Add domain knowledge** → drop `knowledge/my-domain.md`.
- **Enforce formats** → drop `conventions/my-rule.md`.
- **Switch model** → set `ANTHROPIC_MODEL` in `.env`
  (`claude-opus-4-8`, `claude-sonnet-4-6`, `claude-haiku-4-5-20251001`).

All Markdown changes take effect on the next message — no restart needed.

---

## Notes

- No authentication (MVP, intended for local/internal use).
- Conversation memory is a single shared `memory/history.json`. Use
  **New session** in the UI (or `POST /api/reset`) to clear it.
