# BA Agent — MCP Server

The BA Agent is exposed as a standard **Model Context Protocol (MCP)** server
over **stdio**. Any MCP host — **ruflo**, **Claude Desktop**, or **Claude Code** —
can connect to it and call the BA tools.

> The MCP server calls the existing BA Agent **in-process** (via `runSkill`,
> reusing the same composed prompt: system + conventions + knowledge + skills).
> It does **not** call Claude/Gemini in any new way, and it does **not** require
> the HTTP server (`npm run dev`) to be running.

## Tools

| Tool | Argument | What it does |
| ---- | -------- | ------------ |
| `analyze_requirement` | `requirement` | Stakeholders, FR/NFR, assumptions, risks, open questions |
| `create_user_story` | `requirement` | INVEST user stories (US-###) + acceptance criteria (AC-###) |
| `create_brd` | `description` | Drafts a Business Requirements Document |
| `review_requirement` | `requirement` | Ambiguity + clarifying questions, technical risk, conflicts |
| `ask_missing_questions` | `requirement` | Prioritized clarifying questions (Q-###) |

## Run it directly

```bash
cd ba-agent
npm install
# put your key in .env  (GEMINI_API_KEY=…  — the server loads .env automatically)
npm run mcp        # speaks MCP over stdio (waits for a client)
```

The launch command used everywhere below is:

```
npx -y tsx <ABSOLUTE_PATH_TO>/ba-agent/src/mcp-server.ts
```

The server resolves its own project root from the file location, so it works no
matter which directory the host launches it from, and it loads `.env` from the
`ba-agent` folder. (You can also pass `GEMINI_API_KEY` / `LLM_PROVIDER` via the
host's `env` block instead of `.env`.)

---

## Connect: Claude Code

```bash
claude mcp add ba-agent -- npx -y tsx E:\agent-platform\ba-agent\src\mcp-server.ts
```

Verify:

```bash
claude mcp list           # should show "ba-agent"
```

Then in a chat: *"Use the ba-agent analyze_requirement tool on: users can reset
their password via email."*

To remove: `claude mcp remove ba-agent`.

### Project-scoped (`.mcp.json`)

Drop this in a project root so the whole team gets it (Claude Code auto-loads it):

```json
{
  "mcpServers": {
    "ba-agent": {
      "command": "npx",
      "args": ["-y", "tsx", "E:/agent-platform/ba-agent/src/mcp-server.ts"]
    }
  }
}
```

---

## Connect: Claude Desktop

Edit the config file:

- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "ba-agent": {
      "command": "npx",
      "args": ["-y", "tsx", "E:\\agent-platform\\ba-agent\\src\\mcp-server.ts"],
      "env": {
        "LLM_PROVIDER": "gemini",
        "GEMINI_API_KEY": "your-gemini-key"
      }
    }
  }
}
```

Restart Claude Desktop. The BA tools appear under the 🔌 (tools) menu.

> **Windows tip:** if `"command": "npx"` fails to start, use the cmd wrapper:
> ```json
> "command": "cmd",
> "args": ["/c", "npx", "-y", "tsx", "E:\\agent-platform\\ba-agent\\src\\mcp-server.ts"]
> ```
> The `env` block is optional — the server also reads `ba-agent/.env`.

---

## Connect: ruflo

ruflo consumes standard MCP servers, so the same stdio command works.

- ruflo runs on top of Claude Code, so once you've registered it with
  `claude mcp add` (above), the `ba-agent` tools are available inside ruflo's
  swarm / parallel-execution flows alongside its native tools.
- Or add it as an external server from the ruflo chat input: **MCP pill → Add
  Server**, then choose **stdio** and paste the launch command:
  ```
  npx -y tsx E:\agent-platform\ba-agent\src\mcp-server.ts
  ```
- List available MCP tools in ruflo:
  ```bash
  npx ruflo@latest mcp list
  ```

---

## Smoke test

Run the bundled client that spawns the server, lists tools, and calls each one:

```bash
npm run mcp:smoke
```

Expected: all 5 tools listed and each returns content with `isError=false`.
