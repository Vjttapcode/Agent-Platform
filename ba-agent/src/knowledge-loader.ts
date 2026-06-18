import path from 'node:path';
import { ROOT, loadSection, loadMarkdownDir } from './prompt-loader';

/** Compose all domain knowledge (knowledge/*.md) into one prompt section. */
export function loadKnowledge(baseDir: string = ROOT): string {
  return loadSection(path.join(baseDir, 'knowledge'), 'Knowledge');
}

/** List the names of available knowledge documents. */
export function listKnowledge(baseDir: string = ROOT): string[] {
  return loadMarkdownDir(path.join(baseDir, 'knowledge')).map((d) => d.name);
}
