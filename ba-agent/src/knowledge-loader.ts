import path from 'node:path';
import { ROOT, loadSection, loadMarkdownDir } from './prompt-loader';

const KNOWLEDGE_DIR = path.join(ROOT, 'knowledge');

/** Compose all domain knowledge (knowledge/*.md) into one prompt section. */
export function loadKnowledge(): string {
  return loadSection(KNOWLEDGE_DIR, 'Knowledge');
}

/** List the names of available knowledge documents. */
export function listKnowledge(): string[] {
  return loadMarkdownDir(KNOWLEDGE_DIR).map((d) => d.name);
}
