import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';

/**
 * Load .env from the PROJECT ROOT (not the current working directory).
 *
 * Imported FIRST by mcp-server.ts so the API key / provider env vars are set
 * before agent.ts and llm.ts read them at module-eval time. This is required
 * because Claude Desktop / Code launch the server from an arbitrary cwd.
 */
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
config({ path: path.join(root, '.env') });
