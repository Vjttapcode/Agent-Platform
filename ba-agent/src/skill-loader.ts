import path from 'node:path';
import { ROOT, loadSection, loadMarkdownDir } from './prompt-loader';

/** Compose all skills (skills/*.md) into one prompt section. */
export function loadSkills(baseDir: string = ROOT): string {
  return loadSection(path.join(baseDir, 'skills'), 'Skill');
}

/** List the names of available skills (used by the UI / health check). */
export function listSkills(baseDir: string = ROOT): string[] {
  return loadMarkdownDir(path.join(baseDir, 'skills')).map((d) => d.name);
}
