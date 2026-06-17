# BA Agent — VSCode Extension

Bring the **Business Analyst Agent** into VSCode. Chat in the sidebar, or
right-click any selected text to analyze requirements, generate user stories,
draft a BRD, or review a requirement.

> This extension is a **thin client**. It never calls Claude/Gemini directly —
> it always talks to your local **BA Agent API** and POSTs to
> `http://localhost:3000/chat`.

---

## Features

| Feature | How to use |
| ------- | ---------- |
| 💬 **Sidebar Chat** (WebView) | Click the **BA Agent** icon in the Activity Bar |
| 🕘 **Conversation History** | Auto-loaded from the API; **New session** clears it |
| ✂️ **Send Selected Text** | Select text → right-click → *BA Agent ▸ Send Selected Text* |
| 🖱️ **Context Menu** | Right-click in the editor → **BA Agent**: Analyze Requirement · Create User Story · Generate BRD · Review Requirement |
| ⌨️ **Command Palette** | `BA: Chat` · `BA: Analyze Requirement` · `BA: Create User Story` · `BA: Review Requirement` · `BA: Generate BRD` |

---

## Prerequisites

The **BA Agent API must be running** (the sibling `ba-agent` project):

```bash
cd ../ba-agent
npm install
# set GEMINI_API_KEY (free) in .env  — see that project's README
npm run dev          # → http://localhost:3000
```

Verify it's up:

```bash
curl http://localhost:3000/health
```

---

## Run it with F5 (Extension Development Host)

1. Open **this** folder (`ba-agent-vscode`) in VSCode.
2. Install dev dependencies:
   ```bash
   npm install
   ```
3. Press **F5** (Run → *Run BA Agent Extension*).
   - VSCode compiles TypeScript (`npm: compile` pre-launch task) and opens a new
     **[Extension Development Host]** window with the extension loaded.
4. In that new window:
   - Click the **BA Agent** icon in the left Activity Bar → the chat opens.
   - Type a message and press **Enter**.
   - Or open any file, **select** some text, **right-click → BA Agent → Analyze Requirement**.
   - Or open the Command Palette (`Ctrl+Shift+P`) and run **`BA: Chat`**.

> If you see *"Cannot reach the BA Agent…"*, the API isn't running — start it
> (see Prerequisites) or change the `baAgent.apiUrl` setting.

---

## Settings

| Setting | Default | Description |
| ------- | ------- | ----------- |
| `baAgent.apiUrl` | `http://localhost:3000` | Base URL of the BA Agent API. The extension always POSTs to `<apiUrl>/chat`. |

---

## Commands

| Command | ID |
| ------- | -- |
| BA: Chat | `baAgent.chat` |
| BA: Analyze Requirement | `baAgent.analyze` |
| BA: Create User Story | `baAgent.createUserStory` |
| BA: Generate BRD | `baAgent.generateBRD` |
| BA: Review Requirement | `baAgent.review` |
| BA: Send Selected Text | `baAgent.sendSelection` |
| BA: New Session (clear history) | `baAgent.newSession` |

---

## Packaging (optional)

To produce an installable `.vsix`:

```bash
npm install -g @vscode/vsce
vsce package
code --install-extension ba-agent-vscode-1.0.0.vsix
```

---

## How it works

```
Editor selection / chat box
        │
        ▼
 commands.ts ──► SidebarProvider.sendMessage()
                        │  POST <apiUrl>/chat  { message }
                        ▼
              BA Agent API (Express)  ──►  Gemini / Claude
                        │  { reply }
                        ▼
              WebView renders Markdown
```

- `src/extension.ts` — activation, registers the view + commands.
- `src/sidebarProvider.ts` — the WebView chat UI + the single send funnel.
- `src/commands.ts` — palette & context-menu commands, prompt templates.
- `src/api.ts` — HTTP client for the BA Agent API (`/chat`, `/history`, `/reset`).
