import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';
import { config } from './config';

/**
 * Provider-agnostic LLM layer.
 * Default engine = LLM_PROVIDER in .env ("tokenrouter" | "gemini" | "anthropic"),
 * but callers may override the provider/model per request (used by the model
 * picker in the UI).
 */

export type Role = 'user' | 'assistant';
export interface LLMMessage {
  role: Role;
  content: string;
}

const PROVIDER = config.provider;
const MAX_TOKENS = config.maxTokens;

const ANTHROPIC_MODEL = config.models.anthropic;
const GEMINI_MODEL = config.models.gemini;
const TOKENROUTER_MODEL = config.models.tokenrouter;
const TOKENROUTER_BASE_URL = config.tokenrouter.baseUrl;
const TOKENROUTER_EXTRA = config.tokenrouter.extraModels;

// ---------------------------------------------------------------------------
// Key helpers
// ---------------------------------------------------------------------------
function keyFor(provider: string): string | undefined {
  if (provider === 'tokenrouter') return config.keys.tokenrouter;
  if (provider === 'gemini') return config.keys.gemini;
  if (provider === 'anthropic') return config.keys.anthropic;
  return undefined;
}

/** A non-empty key that is not an obvious placeholder (e.g. sk-ant-xxxx). */
function isRealKey(value?: string): boolean {
  return Boolean(value && value.length > 8 && !/x{4,}/i.test(value));
}

function providerHasKey(provider: string): boolean {
  return isRealKey(keyFor(provider));
}

function missingKeyForProvider(provider: string): string {
  if (provider === 'tokenrouter')
    return 'TOKENROUTER_API_KEY is not set. Add your TokenRouter API key to .env.';
  if (provider === 'gemini')
    return 'GEMINI_API_KEY is not set. Get a FREE key at https://aistudio.google.com/apikey.';
  return 'ANTHROPIC_API_KEY is not set. Add it to .env.';
}

function defaultModelFor(provider: string): string {
  if (provider === 'tokenrouter') return TOKENROUTER_MODEL;
  if (provider === 'gemini') return GEMINI_MODEL;
  return ANTHROPIC_MODEL;
}

// ---------------------------------------------------------------------------
// Active (default) provider/model — used by health, config, MCP
// ---------------------------------------------------------------------------
export function activeProvider(): string {
  return PROVIDER;
}

export function activeModel(): string {
  return defaultModelFor(PROVIDER);
}

export function hasApiKey(): boolean {
  return providerHasKey(PROVIDER);
}

export function missingKeyMessage(): string {
  return missingKeyForProvider(PROVIDER);
}

// ---------------------------------------------------------------------------
// Model catalog (what the picker offers — only providers with a real key)
// ---------------------------------------------------------------------------
export interface ModelOption {
  id: string; // "<provider>:<model>"
  provider: string;
  model: string;
  label: string;
}

export function availableModels(): ModelOption[] {
  const base: Array<Omit<ModelOption, 'id'>> = [
    { provider: 'tokenrouter', model: TOKENROUTER_MODEL, label: `${TOKENROUTER_MODEL} · TokenRouter` },
    ...TOKENROUTER_EXTRA.map((m) => ({ provider: 'tokenrouter', model: m, label: `${m} · TokenRouter` })),
    { provider: 'gemini', model: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
    { provider: 'gemini', model: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
    { provider: 'anthropic', model: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6' },
    { provider: 'anthropic', model: 'claude-opus-4-8', label: 'Claude Opus 4.8' },
    { provider: 'anthropic', model: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5' },
  ];

  const seen = new Set<string>();
  const out: ModelOption[] = [];
  for (const item of base) {
    const id = `${item.provider}:${item.model}`;
    if (seen.has(id)) continue;
    seen.add(id);
    if (!providerHasKey(item.provider)) continue;
    out.push({ id, ...item });
  }
  return out;
}

export function defaultModelId(): string {
  return `${PROVIDER}:${activeModel()}`;
}

/** Resolve a picker id ("<provider>:<model>") to a provider/model pair. */
export function resolveModel(id?: string): { provider: string; model: string } | undefined {
  if (!id) return undefined;
  const found = availableModels().find((m) => m.id === id);
  return found ? { provider: found.provider, model: found.model } : undefined;
}

// ---------------------------------------------------------------------------
// Generate
// ---------------------------------------------------------------------------
export interface GenerateOptions {
  provider?: string;
  model?: string;
  maxTokens?: number;
}

export async function generate(
  system: string,
  messages: LLMMessage[],
  opts: GenerateOptions = {},
): Promise<string> {
  const provider = (opts.provider || PROVIDER).toLowerCase();
  const model = opts.model || defaultModelFor(provider);
  const maxTokens = opts.maxTokens ?? MAX_TOKENS;

  if (provider === 'tokenrouter') return generateTokenRouter(system, messages, model, maxTokens);
  if (provider === 'gemini') return generateGemini(system, messages, model, maxTokens);
  return generateAnthropic(system, messages, model, maxTokens);
}

// ---------------------------------------------------------------------------
// TokenRouter / OpenAI-compatible gateway (e.g. MiniMax-M3)
// ---------------------------------------------------------------------------
let openaiCompatible: OpenAI | null = null;

async function generateTokenRouter(
  system: string,
  messages: LLMMessage[],
  model: string,
  maxTokens: number,
): Promise<string> {
  if (!config.keys.tokenrouter) throw new Error(missingKeyForProvider('tokenrouter'));
  if (!openaiCompatible) {
    openaiCompatible = new OpenAI({
      apiKey: config.keys.tokenrouter,
      baseURL: TOKENROUTER_BASE_URL,
    });
  }

  const res = await openaiCompatible.chat.completions.create({
    model,
    max_tokens: maxTokens,
    messages: [
      { role: 'system', content: system },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ],
  });

  const content = res.choices[0]?.message?.content ?? '';
  // Reasoning models (e.g. MiniMax-M3) emit <think>…</think> — strip it.
  return content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
}

// ---------------------------------------------------------------------------
// Anthropic Claude
// ---------------------------------------------------------------------------
let anthropic: Anthropic | null = null;

async function generateAnthropic(
  system: string,
  messages: LLMMessage[],
  model: string,
  maxTokens: number,
): Promise<string> {
  if (!config.keys.anthropic) throw new Error(missingKeyForProvider('anthropic'));
  if (!anthropic) anthropic = new Anthropic({ apiKey: config.keys.anthropic });

  const res = await anthropic.messages.create({
    model,
    max_tokens: maxTokens,
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
  model: string,
  maxTokens: number,
): Promise<string> {
  if (!config.keys.gemini) throw new Error(missingKeyForProvider('gemini'));
  if (!gemini) gemini = new GoogleGenAI({ apiKey: config.keys.gemini });

  const contents = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const res = await gemini.models.generateContent({
    model,
    contents,
    config: { systemInstruction: system, maxOutputTokens: maxTokens },
  });

  return (res.text ?? '').trim();
}
