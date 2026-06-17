import { loadSystemPrompt, loadConventions } from './prompt-loader';
import { loadKnowledge } from './knowledge-loader';
import { loadSkills } from './skill-loader';
import { recentMessages, appendMessage } from './memory';
import { readDocument } from './documents';
import { generate, activeModel, activeProvider, type LLMMessage } from './llm';

const ANALYZE_MAX_TOKENS = Number(process.env.ANALYZE_MAX_TOKENS || 8192);

const DEFAULT_SRS_TASK =
  'Review this SRS document using your SRS Review skill. Report: (1) ambiguous/unclear statements with prioritized clarifying questions, (2) features that are technically hard or risky, classified systematically with risk levels, and (3) conflicting or inconsistent requirements with suggested resolutions.';

/**
 * Compose the full system prompt from the building blocks:
 *   System Prompt + Conventions + Knowledge + Skills
 * (Conversation Memory is supplied separately as the message list.)
 */
export function buildSystemPrompt(): string {
  const sections = [
    loadSystemPrompt(),
    loadConventions(),
    loadKnowledge(),
    loadSkills(),
  ].filter((s) => s && s.length > 0);

  return sections.join('\n\n---\n\n');
}

/**
 * Run one chat turn. Pulls conversation memory from disk, calls the active
 * LLM provider, persists both the user message and the assistant reply.
 */
export async function chat(userMessage: string): Promise<string> {
  const system = buildSystemPrompt();

  // Conversation memory → message list.
  const messages: LLMMessage[] = recentMessages().map((m) => ({
    role: m.role,
    content: m.content,
  }));
  messages.push({ role: 'user', content: userMessage });

  const reply = await generate(system, messages);

  appendMessage({ role: 'user', content: userMessage, ts: new Date().toISOString() });
  appendMessage({ role: 'assistant', content: reply, ts: new Date().toISOString() });

  return reply;
}

/**
 * Analyze a previously imported document (e.g. a converted SRS) as a one-shot
 * task. The full document is NOT added to the rolling conversation memory (it
 * would be huge and re-sent every turn); instead we store a short marker plus
 * the resulting analysis so follow-up chat can reference it.
 */
export async function analyzeDocument(name: string, task?: string): Promise<string> {
  const doc = readDocument(name);
  if (!doc) throw new Error(`Document not found: ${name}. Import it first.`);

  const instruction = task && task.trim() ? task.trim() : DEFAULT_SRS_TASK;
  const userContent = `${instruction}\n\n--- BEGIN DOCUMENT (${name}) ---\n${doc}\n--- END DOCUMENT ---`;

  const reply = await generate(buildSystemPrompt(), [{ role: 'user', content: userContent }], {
    maxTokens: ANALYZE_MAX_TOKENS,
  });

  const now = new Date().toISOString();
  appendMessage({
    role: 'user',
    content: `📄 Analyzed document: ${name} (${doc.length.toLocaleString()} chars)`,
    ts: now,
  });
  appendMessage({ role: 'assistant', content: reply, ts: new Date().toISOString() });

  return reply;
}

export const config = {
  provider: activeProvider(),
  model: activeModel(),
};
