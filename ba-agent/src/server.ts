import 'dotenv/config';
import express, { Router, type Request, type Response } from 'express';
import multer from 'multer';
import path from 'node:path';
import { chat, analyzeDocument, config } from './agent';
import { loadHistory, clearHistory } from './memory';
import { listSkills } from './skill-loader';
import { listKnowledge } from './knowledge-loader';
import { ROOT } from './prompt-loader';
import { hasApiKey, missingKeyMessage } from './llm';
import { docxBufferToMarkdown } from './docx';
import { saveDocument, listDocuments } from './documents';

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(ROOT, 'public')));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 30 * 1024 * 1024 }, // 30 MB
});

const api = Router();

/** Health + capability metadata. */
api.get('/health', (_req: Request, res: Response) => {
  res.json({
    ok: true,
    provider: config.provider,
    model: config.model,
    skills: listSkills(),
    knowledge: listKnowledge(),
    hasApiKey: hasApiKey(),
  });
});

/** Full conversation history (for hydrating clients on load). */
api.get('/history', (_req: Request, res: Response) => {
  res.json(loadHistory());
});

/** Reset the conversation memory. */
api.post('/reset', (_req: Request, res: Response) => {
  clearHistory();
  res.json({ ok: true });
});

/** Main chat endpoint. */
api.post('/chat', async (req: Request, res: Response) => {
  const message = (req.body?.message ?? '').toString().trim();
  if (!message) {
    res.status(400).json({ error: 'Field "message" is required.' });
    return;
  }
  if (!hasApiKey()) {
    res.status(500).json({ error: missingKeyMessage() });
    return;
  }
  try {
    const reply = await chat(message);
    res.json({ reply });
  } catch (err) {
    const messageText = err instanceof Error ? err.message : 'Internal error';
    console.error('[chat error]', messageText);
    res.status(500).json({ error: messageText });
  }
});

/** List imported documents. */
api.get('/documents', (_req: Request, res: Response) => {
  res.json(listDocuments());
});

/** Import a .docx file → convert to Markdown → store under documents/. */
api.post('/import', upload.single('file'), async (req: Request, res: Response) => {
  const file = req.file;
  if (!file) {
    res.status(400).json({ error: 'Upload a .docx file in the "file" field.' });
    return;
  }
  if (!/\.docx$/i.test(file.originalname)) {
    res.status(400).json({ error: 'Only .docx files are supported.' });
    return;
  }
  try {
    const markdown = await docxBufferToMarkdown(file.buffer);
    if (!markdown.trim()) {
      res.status(422).json({ error: 'Could not extract any text from the document.' });
      return;
    }
    const name = saveDocument(file.originalname, markdown);
    res.json({ name, chars: markdown.length, markdown });
  } catch (err) {
    const messageText = err instanceof Error ? err.message : 'Import failed';
    console.error('[import error]', messageText);
    res.status(500).json({ error: messageText });
  }
});

/** Analyze a stored document (default: full SRS review). */
api.post('/analyze', async (req: Request, res: Response) => {
  const doc = (req.body?.doc ?? '').toString().trim();
  const task = (req.body?.task ?? '').toString();
  if (!doc) {
    res.status(400).json({ error: 'Field "doc" is required.' });
    return;
  }
  if (!hasApiKey()) {
    res.status(500).json({ error: missingKeyMessage() });
    return;
  }
  try {
    const reply = await analyzeDocument(doc, task);
    res.json({ reply });
  } catch (err) {
    const messageText = err instanceof Error ? err.message : 'Analyze failed';
    console.error('[analyze error]', messageText);
    res.status(500).json({ error: messageText });
  }
});

// Mount the same routes under two prefixes:
//   /api/*  → used by the bundled web chat (public/index.html)
//   /*      → used by the VSCode extension, which always calls /chat
app.use('/api', api);
app.use('/', api);

app.listen(PORT, () => {
  console.log('\n  ┌──────────────────────────────────────────────┐');
  console.log('  │   BA Agent is running                          │');
  console.log(`  │   → http://localhost:${PORT}${' '.repeat(Math.max(0, 24 - String(PORT).length))}│`);
  const line = `${config.provider} · ${config.model}`;
  console.log(`  │   ${line}${' '.repeat(Math.max(0, 43 - line.length))}│`);
  console.log('  └──────────────────────────────────────────────┘\n');
  if (!hasApiKey()) {
    console.warn(`  ⚠  ${missingKeyMessage()}\n`);
  }
});
