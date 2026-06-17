import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenAI } from '@google/genai';

/**
 * Provider-agnostic LLM layer.
 * Pick the engine with LLM_PROVIDER in .env: "gemini" (free) or "anthropic".
 * Everything else in the app stays the same.
 */

export type Role = 'user' | 'assistant';
export interface LLMMessage {
  role: Role;
  content: string;
}

const PROVIDER = (process.env.LLM_PROVIDER || 'anthropic').toLowerCase();
const MAX_TOKENS = Number(process.env.MAX_TOKENS || 4096);

const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

export function activeProvider(): string {
  return PROVIDER;
}

export function activeModel(): string {
  return PROVIDER === 'gemini' ? GEMINI_MODEL : ANTHROPIC_MODEL;
}

export function hasApiKey(): boolean {
  return PROVIDER === 'gemini'
    ? Boolean(process.env.GEMINI_API_KEY)
    : Boolean(process.env.ANTHROPIC_API_KEY);
}

export function missingKeyMessage(): string {
  return PROVIDER === 'gemini'
    ? 'GEMINI_API_KEY is not set. Get a FREE key at https://aistudio.google.com/apikey and add it to .env.'
    : 'ANTHROPIC_API_KEY is not set. Copy .env.example to .env and add your key.';
}

export interface GenerateOptions {
  maxTokens?: number;
}

/** Generate one reply from the active provider. */
export async function generate(
  system: string,
  messages: LLMMessage[],
  opts: GenerateOptions = {},
): Promise<string> {
  return PROVIDER === 'gemini'
    ? generateGemini(system, messages, opts)
    : generateAnthropic(system, messages, opts);
}

// ---------------------------------------------------------------------------
// Anthropic Claude
// ---------------------------------------------------------------------------
let anthropic: Anthropic | null = null;

async function generateAnthropic(
  system: string,
  messages: LLMMessage[],
  opts: GenerateOptions,
): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error(missingKeyMessage());
  if (!anthropic) anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const res = await anthropic.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: opts.maxTokens ?? MAX_TOKENS,
    system,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  });

  return res.content
    .map((b) => (b.type === 'text' ? b.text : ''))
    .join('')
    .trim();
}

// ---------------------------------------------------------------------------
// Google Gemini  (free tier — https://aistudio.google.com/apikey)
// ---------------------------------------------------------------------------
let gemini: GoogleGenAI | null = null;

async function generateGemini(
  system: string,
  messages: LLMMessage[],
  opts: GenerateOptions,
): Promise<string> {
  if (!process.env.GEMINI_API_KEY) throw new Error(missingKeyMessage());
  if (!gemini) gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  // Gemini uses role "model" for assistant turns.
  const contents = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const res = await gemini.models.generateContent({
    model: GEMINI_MODEL,
    contents,
    config: {
      systemInstruction: system,
      maxOutputTokens: opts.maxTokens ?? MAX_TOKENS,
    },
  });

  return (res.text ?? '').trim();
}
