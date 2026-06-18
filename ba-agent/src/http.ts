import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { logger } from './logger';
import { getAgent, type AgentDef } from './agents';

/** Wrap an async route so rejected promises reach the error middleware. */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}

/** Resolve `:id` to an agent or respond 404. */
export function withAgent(
  handler: (agent: AgentDef, req: Request, res: Response) => unknown | Promise<unknown>,
): RequestHandler {
  return asyncHandler(async (req, res) => {
    const agent = getAgent(req.params.id);
    if (!agent) {
      res.status(404).json({ error: `Unknown agent: ${req.params.id}` });
      return;
    }
    await handler(agent, req, res);
  });
}

/** One-line request log on completion. */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  res.on('finish', () => {
    logger.info(`${req.method} ${req.originalUrl} → ${res.statusCode} (${Date.now() - start}ms)`);
  });
  next();
}

/** Centralized error responder. */
export function errorMiddleware(err: unknown, req: Request, res: Response, next: NextFunction): void {
  const message = err instanceof Error ? err.message : 'Internal server error';
  logger.error(`[${req.method} ${req.path}]`, message);
  if (res.headersSent) {
    next(err);
    return;
  }
  res.status(500).json({ error: message });
}
