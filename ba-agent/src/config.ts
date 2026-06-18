/**
 * Single source of truth for environment configuration.
 *
 * Read once here instead of scattering process.env across modules. dotenv is
 * loaded before this module is imported (server.ts imports "dotenv/config"
 * first; mcp-server.ts imports "./mcp-env" first), so values are populated.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

function int(name: string, fallback: number): number {
  const v = Number(process.env[name]);
  return Number.isFinite(v) && v > 0 ? v : fallback;
}

function str(name: string, fallback: string): string {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : fallback;
}

function list(name: string): string[] {
  return (process.env[name] || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export const config = {
  port: int('PORT', 3000),
  logLevel: str('LOG_LEVEL', 'info').toLowerCase() as LogLevel,

  provider: str('LLM_PROVIDER', 'anthropic').toLowerCase(),
  maxTokens: int('MAX_TOKENS', 4096),
  analyzeMaxTokens: int('ANALYZE_MAX_TOKENS', 8192),
  memoryWindow: int('MEMORY_WINDOW', 40),

  models: {
    anthropic: str('ANTHROPIC_MODEL', 'claude-sonnet-4-6'),
    gemini: str('GEMINI_MODEL', 'gemini-2.5-flash'),
    tokenrouter: str('TOKENROUTER_MODEL', 'minimax-m3'),
  },

  tokenrouter: {
    baseUrl: str('TOKENROUTER_BASE_URL', 'https://api.tokenrouter.com/v1'),
    extraModels: list('TOKENROUTER_MODELS'),
  },

  // Keys via getters so they always reflect the current process.env.
  keys: {
    get anthropic(): string | undefined {
      return process.env.ANTHROPIC_API_KEY;
    },
    get gemini(): string | undefined {
      return process.env.GEMINI_API_KEY;
    },
    get tokenrouter(): string | undefined {
      return process.env.TOKENROUTER_API_KEY;
    },
  },
};
