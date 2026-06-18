import { config } from './config';

/**
 * Tiny leveled logger. Writes to **stderr** for every level so it is safe to
 * use from the MCP server too (where stdout is reserved for the protocol).
 */

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 } as const;
type Level = keyof typeof LEVELS;

const threshold = LEVELS[(config.logLevel in LEVELS ? config.logLevel : 'info') as Level];

function fmt(arg: unknown): string {
  if (arg instanceof Error) return arg.stack ?? arg.message;
  if (typeof arg === 'object' && arg !== null) {
    try {
      return JSON.stringify(arg);
    } catch {
      return String(arg);
    }
  }
  return String(arg);
}

function emit(level: Level, args: unknown[]): void {
  if (LEVELS[level] < threshold) return;
  const ts = new Date().toISOString();
  process.stderr.write(`${ts} ${level.toUpperCase().padEnd(5)} ${args.map(fmt).join(' ')}\n`);
}

export const logger = {
  debug: (...args: unknown[]) => emit('debug', args),
  info: (...args: unknown[]) => emit('info', args),
  warn: (...args: unknown[]) => emit('warn', args),
  error: (...args: unknown[]) => emit('error', args),
};
