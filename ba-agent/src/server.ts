import 'dotenv/config';
import express, { Router, type Request, type Response } from 'express';
import multer from 'multer';
import fs from 'node:fs';
import path from 'node:path';
import { config } from './config';
import { logger } from './logger';
import { asyncHandler, withAgent, requestLogger, errorMiddleware } from './http';
import { chat, analyzeDocument, agentInfo } from './agent';
import { loadHistory, clearHistory, loadHistoryFrom, clearHistoryFrom } from './memory';
import {
  listSessions,
  createSession,
  getSession,
  deleteSession,
  renameSession,
  ensureSession,
} from './store';
import { listSkills } from './skill-loader';
import { listKnowledge } from './knowledge-loader';
import { ROOT } from './prompt-loader';
import { hasApiKey, missingKeyMessage, availableModels, defaultModelId, resolveModel } from './llm';
import { docxBufferToMarkdown } from './docx';
import { saveDocument, listDocuments } from './documents';
import { listAgents, isActive, loadedFiles, sectionDocs, fileList } from './agents';
import { describeWorkflow, runPhase, listArtifacts, readArtifact, slug } from './workflow';

const app = express();

app.use(requestLogger);
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(ROOT, 'public')));

// Serve the built Agent Manager UI at /manager (same origin → no CORS/proxy).
// Built with `npm run build` in ../agent-manager (base '/manager/').
const managerDist = path.join(ROOT, '..', 'agent-manager', 'dist');
if (fs.existsSync(managerDist)) {
  app.use('/manager', express.static(managerDist));
  logger.info('Serving Agent Manager UI at /manager');
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 30 * 1024 * 1024 }, // 30 MB
});

const api = Router();

/** Health + capability metadata. */
api.get('/health', (_req: Request, res: Response) => {
  res.json({
    ok: true,
    provider: agentInfo.provider,
    model: agentInfo.model,
    skills: listSkills(),
    knowledge: listKnowledge(),
    hasApiKey: hasApiKey(),
  });
});

/** Models the user can pick from (only providers with a real API key). */
api.get('/models', (_req: Request, res: Response) => {
  res.json({ models: availableModels(), default: defaultModelId() });
});

/** Full conversation history for a session (default: 'default'). */
api.get('/history', (req: Request, res: Response) => {
  res.json(loadHistory((req.query.session ?? 'default').toString()));
});

/** Reset a session's conversation memory. */
api.post('/reset', (req: Request, res: Response) => {
  clearHistory((req.body?.sessionId ?? 'default').toString());
  res.json({ ok: true });
});

// --- Sessions ---------------------------------------------------------------

/** List sessions (always ensures a 'default' exists). */
api.get('/sessions', (_req: Request, res: Response) => {
  ensureSession('default', 'Default');
  res.json(listSessions());
});

/** Create a session. */
api.post('/sessions', (req: Request, res: Response) => {
  const title = (req.body?.title ?? '').toString().trim() || 'New session';
  const agent = (req.body?.agent ?? 'ba').toString();
  res.json(createSession(title, agent));
});

/** Get one session. */
api.get('/sessions/:id', (req: Request, res: Response) => {
  const s = getSession(req.params.id);
  if (!s) {
    res.status(404).json({ error: `Unknown session: ${req.params.id}` });
    return;
  }
  res.json(s);
});

/** Rename a session. */
api.patch('/sessions/:id', (req: Request, res: Response) => {
  const title = (req.body?.title ?? '').toString().trim();
  if (!title) {
    res.status(400).json({ error: 'Field "title" is required.' });
    return;
  }
  if (!getSession(req.params.id)) {
    res.status(404).json({ error: `Unknown session: ${req.params.id}` });
    return;
  }
  renameSession(req.params.id, title);
  res.json({ ok: true });
});

/** Delete a session (cascades messages + artifacts). */
api.delete('/sessions/:id', (req: Request, res: Response) => {
  deleteSession(req.params.id);
  res.json({ ok: true });
});

/** Main chat endpoint. */
api.post(
  '/chat',
  asyncHandler(async (req, res) => {
    const message = (req.body?.message ?? '').toString().trim();
    if (!message) {
      res.status(400).json({ error: 'Field "message" is required.' });
      return;
    }
    const choice = resolveModel(req.body?.model);
    if (!choice && !hasApiKey()) {
      res.status(500).json({ error: missingKeyMessage() });
      return;
    }
    const sessionId = (req.body?.sessionId ?? 'default').toString();
    res.json({ reply: await chat(message, choice ?? {}, sessionId) });
  }),
);

/** List imported documents. */
api.get('/documents', (_req: Request, res: Response) => {
  res.json(listDocuments());
});

/** Import a .docx file → convert to Markdown → store under documents/. */
api.post(
  '/import',
  upload.single('file'),
  asyncHandler(async (req, res) => {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: 'Upload a .docx file in the "file" field.' });
      return;
    }
    if (!/\.docx$/i.test(file.originalname)) {
      res.status(400).json({ error: 'Only .docx files are supported.' });
      return;
    }
    const markdown = await docxBufferToMarkdown(file.buffer);
    if (!markdown.trim()) {
      res.status(422).json({ error: 'Could not extract any text from the document.' });
      return;
    }
    const name = saveDocument(file.originalname, markdown);
    res.json({ name, chars: markdown.length, markdown });
  }),
);

/** Analyze a stored document (default: full SRS review). */
api.post(
  '/analyze',
  asyncHandler(async (req, res) => {
    const doc = (req.body?.doc ?? '').toString().trim();
    const task = (req.body?.task ?? '').toString();
    if (!doc) {
      res.status(400).json({ error: 'Field "doc" is required.' });
      return;
    }
    const choice = resolveModel(req.body?.model);
    if (!choice && !hasApiKey()) {
      res.status(500).json({ error: missingKeyMessage() });
      return;
    }
    const sessionId = (req.body?.sessionId ?? 'default').toString();
    res.json({ reply: await analyzeDocument(doc, task, choice ?? {}, sessionId) });
  }),
);

// --- Agent Manager (dashboard) endpoints -----------------------------------

/** List all agents (BA active; dev/tester/architect activate when created). */
api.get('/agents', (_req: Request, res: Response) => {
  res.json(listAgents());
});

/** "View Loaded Files" — files composing the agent prompt, grouped by category. */
api.get(
  '/agents/:id/files',
  withAgent((agent, _req, res) => {
    res.json({ active: isActive(agent), files: loadedFiles(agent.baseDir) });
  }),
);

/** Read a section's content: prompt | conventions | knowledge | skills | memory. */
api.get(
  '/agents/:id/section/:type',
  withAgent((agent, req, res) => {
    if (req.params.type === 'memory') {
      res.json(loadHistoryFrom(agent.baseDir));
      return;
    }
    res.json(sectionDocs(agent.baseDir, req.params.type));
  }),
);

/**
 * Reload a section from disk. Loaders read from disk on every request, so this
 * re-reads and returns the current state — the agent picks up edits on the next
 * message with no restart.
 */
api.post(
  '/agents/:id/reload/:type',
  withAgent((agent, req, res) => {
    const type = req.params.type;
    if (type === 'all') {
      res.json({ reloaded: 'all', files: loadedFiles(agent.baseDir) });
      return;
    }
    res.json({ reloaded: type, files: fileList(agent.baseDir, type) });
  }),
);

/** Clear an agent's conversation memory. */
api.post(
  '/agents/:id/memory/clear',
  withAgent((agent, _req, res) => {
    clearHistoryFrom(agent.baseDir);
    res.json({ ok: true });
  }),
);

// --- BMAD workflow endpoints -----------------------------------------------

// A workflow "project" maps to a session: sessionId = explicit sessionId, else slug(project).

/** Workflow definition with per-phase runnable/done status for a session. */
api.get('/workflows/bmad', (req: Request, res: Response) => {
  const project = req.query.project?.toString();
  res.json(describeWorkflow(project ? slug(project) : undefined));
});

/** Artifacts produced for a session/project. */
api.get('/workflows/:project/artifacts', (req: Request, res: Response) => {
  res.json(listArtifacts(slug(req.params.project)));
});

/** Read one artifact's content. */
api.get('/workflows/:project/artifact/:name', (req: Request, res: Response) => {
  const content = readArtifact(slug(req.params.project), req.params.name);
  if (content === null) {
    res.status(404).json({ error: `Artifact not found: ${req.params.name}` });
    return;
  }
  res.json({ name: req.params.name, content });
});

/** Run one BMAD phase (stores its artifact). Human reviews, then runs the next. */
api.post(
  '/workflows/run-phase',
  asyncHandler(async (req, res) => {
    const project = (req.body?.project ?? '').toString().trim();
    const explicit = (req.body?.sessionId ?? '').toString().trim();
    const phase = (req.body?.phase ?? '').toString().trim();
    const idea = (req.body?.idea ?? '').toString();
    if ((!project && !explicit) || !phase) {
      res.status(400).json({ error: 'Fields "project" (or "sessionId") and "phase" are required.' });
      return;
    }
    const sessionId = explicit || slug(project);
    ensureSession(sessionId, project || sessionId);
    const choice = resolveModel(req.body?.model);
    if (!choice && !hasApiKey()) {
      res.status(500).json({ error: missingKeyMessage() });
      return;
    }
    res.json(await runPhase(sessionId, phase, idea, choice ?? {}));
  }),
);

// Mount the same routes under two prefixes:
//   /api/*  → used by the bundled web chat (public/index.html) and Agent Manager
//   /*      → used by the VSCode extension, which always calls /chat
app.use('/api', api);
app.use('/', api);

app.use(errorMiddleware);

process.on('unhandledRejection', (reason) => logger.error('unhandledRejection:', reason));
process.on('uncaughtException', (err) => logger.error('uncaughtException:', err));

app.listen(config.port, () => {
  logger.info(`BA Agent API on http://localhost:${config.port} · ${agentInfo.provider} · ${agentInfo.model}`);
  if (!hasApiKey()) logger.warn(missingKeyMessage());
});
