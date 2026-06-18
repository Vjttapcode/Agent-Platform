import { loadSystemPrompt, loadConventions, ROOT } from './prompt-loader';
import { loadKnowledge } from './knowledge-loader';
import { loadSkills } from './skill-loader';
import { recentMessages, appendMessage, type ChatMessage } from './memory';
import { readDocument } from './documents';
import { generate, activeModel, activeProvider, type LLMMessage } from './llm';
import { config as env } from './config';

const ANALYZE_MAX_TOKENS = env.analyzeMaxTokens;

/** Persist one user→assistant exchange to conversation memory. */
function persistTurn(userContent: string, reply: string): void {
  const turn: ChatMessage[] = [
    { role: 'user', content: userContent, ts: new Date().toISOString() },
    { role: 'assistant', content: reply, ts: new Date().toISOString() },
  ];
  turn.forEach(appendMessage);
}

const DEFAULT_SRS_TASK =
  'Review this SRS document using your SRS Review skill. Report: (1) ambiguous/unclear statements with prioritized clarifying questions, (2) features that are technically hard or risky, classified systematically with risk levels, and (3) conflicting or inconsistent requirements with suggested resolutions.';

/**
 * Compose the full system prompt from the building blocks:
 *   System Prompt + Conventions + Knowledge + Skills
 * (Conversation Memory is supplied separately as the message list.)
 */
export function buildSystemPrompt(baseDir: string = ROOT): string {
  const sections = [
    loadSystemPrompt(baseDir),
    loadConventions(baseDir),
    loadKnowledge(baseDir),
    loadSkills(baseDir),
  ].filter((s) => s && s.length > 0);

  return sections.join('\n\n---\n\n');
}

/**
 * Run one chat turn. Pulls conversation memory from disk, calls the active
 * LLM provider, persists both the user message and the assistant reply.
 */
export interface ModelChoice {
  provider?: string;
  model?: string;
}

export async function chat(userMessage: string, choice: ModelChoice = {}): Promise<string> {
  const system = buildSystemPrompt();

  // Conversation memory → message list.
  const messages: LLMMessage[] = recentMessages().map((m) => ({
    role: m.role,
    content: m.content,
  }));
  messages.push({ role: 'user', content: userMessage });

  const reply = await generate(system, messages, { provider: choice.provider, model: choice.model });

  persistTurn(userMessage, reply);
  return reply;
}

/**
 * Run a one-shot BA task using the full composed system prompt
 * (system + conventions + knowledge + skills) — without touching the rolling
 * conversation memory. This is the single entry point the MCP tools reuse, so
 * there is no duplicated prompt-loading logic.
 */
export interface SkillRunOptions {
  baseDir?: string;
  provider?: string;
  model?: string;
}

export async function runSkill(
  instruction: string,
  input?: string,
  opts: SkillRunOptions = {},
): Promise<string> {
  const text = input && input.trim() ? `${instruction}\n\n---\n${input.trim()}` : instruction;
  return generate(buildSystemPrompt(opts.baseDir ?? ROOT), [{ role: 'user', content: text }], {
    provider: opts.provider,
    model: opts.model,
    maxTokens: ANALYZE_MAX_TOKENS,
  });
}

/**
 * Analyze a previously imported document (e.g. a converted SRS) as a one-shot
 * task. The full document is NOT added to the rolling conversation memory (it
 * would be huge and re-sent every turn); instead we store a short marker plus
 * the resulting analysis so follow-up chat can reference it.
 */
export async function analyzeDocument(
  name: string,
  task?: string,
  choice: ModelChoice = {},
): Promise<string> {
  const doc = readDocument(name);
  if (!doc) throw new Error(`Document not found: ${name}. Import it first.`);

  const instruction = task && task.trim() ? task.trim() : DEFAULT_SRS_TASK;
  const userContent = `${instruction}\n\n--- BEGIN DOCUMENT (${name}) ---\n${doc}\n--- END DOCUMENT ---`;

  const reply = await generate(buildSystemPrompt(), [{ role: 'user', content: userContent }], {
    provider: choice.provider,
    model: choice.model,
    maxTokens: ANALYZE_MAX_TOKENS,
  });

  persistTurn(`📄 Analyzed document: ${name} (${doc.length.toLocaleString()} chars)`, reply);
  return reply;
}

/** Active provider/model — surfaced by /api/health and the MCP banner. */
export const agentInfo = {
  provider: activeProvider(),
  model: activeModel(),
};
