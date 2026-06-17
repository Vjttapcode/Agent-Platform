import fs from 'node:fs';
import path from 'node:path';
import { ROOT, loadMarkdownFile, loadMarkdownDir } from './prompt-loader';

/**
 * Imported documents (e.g. converted SRS files). Stored separately from
 * knowledge/ on purpose: they are analyzed on demand, NOT injected into every
 * prompt, so a large SRS never bloats the system prompt.
 */
const DOCS_DIR = path.join(ROOT, 'documents');

/** Turn an uploaded filename into a safe "<name>.md". */
export function sanitizeName(filename: string): string {
  const base = filename
    .replace(/\.docx$/i, '')
    .replace(/[^a-zA-Z0-9-_ ]/g, '')
    .trim()
    .replace(/\s+/g, '-');
  return `${base || 'document'}.md`;
}

export function saveDocument(originalName: string, markdown: string): string {
  if (!fs.existsSync(DOCS_DIR)) fs.mkdirSync(DOCS_DIR, { recursive: true });
  const name = sanitizeName(originalName);
  fs.writeFileSync(path.join(DOCS_DIR, name), markdown, 'utf-8');
  return name;
}

/** Read a stored document by name (with or without the .md extension). */
export function readDocument(name: string): string {
  const file = name.toLowerCase().endsWith('.md') ? name : `${name}.md`;
  return loadMarkdownFile(path.join(DOCS_DIR, path.basename(file)));
}

export function listDocuments(): string[] {
  return loadMarkdownDir(DOCS_DIR).map((d) => d.name);
}
