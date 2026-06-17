import fs from 'node:fs';
import path from 'node:path';

/**
 * Project root. All loaders resolve paths relative to this.
 * npm scripts run from the project root, so process.cwd() is reliable.
 */
export const ROOT = process.cwd();

export interface MarkdownDoc {
  name: string;
  content: string;
}

/** Read a single markdown/text file. Returns '' if it does not exist. */
export function loadMarkdownFile(filePath: string): string {
  try {
    return fs.readFileSync(filePath, 'utf-8').trim();
  } catch {
    return '';
  }
}

/**
 * Reusable loader: read EVERY *.md file in a directory, sorted by filename.
 * Empty/missing files and non-existent directories are skipped gracefully.
 */
export function loadMarkdownDir(dirPath: string): MarkdownDoc[] {
  if (!fs.existsSync(dirPath)) return [];
  return fs
    .readdirSync(dirPath)
    .filter((f) => f.toLowerCase().endsWith('.md'))
    .sort()
    .map((f) => ({
      name: path.basename(f, '.md'),
      content: loadMarkdownFile(path.join(dirPath, f)),
    }))
    .filter((doc) => doc.content.length > 0);
}

/** Compose a labelled section from every markdown file in a directory. */
export function loadSection(dirPath: string, label: string): string {
  const docs = loadMarkdownDir(dirPath);
  if (docs.length === 0) return '';
  return docs.map((d) => `### ${label}: ${d.name}\n\n${d.content}`).join('\n\n');
}

/** The base system prompt (prompts/system.md). */
export function loadSystemPrompt(): string {
  return loadMarkdownFile(path.join(ROOT, 'prompts', 'system.md'));
}

/** All team conventions (conventions/*.md). */
export function loadConventions(): string {
  return loadSection(path.join(ROOT, 'conventions'), 'Convention');
}
