import path from 'node:path';
import { ROOT, loadSection, loadMarkdownDir } from './prompt-loader';

const SKILLS_DIR = path.join(ROOT, 'skills');

/** Compose all skills (skills/*.md) into one prompt section. */
export function loadSkills(): string {
  return loadSection(SKILLS_DIR, 'Skill');
}

/** List the names of available skills (used by the UI / health check). */
export function listSkills(): string[] {
  return loadMarkdownDir(SKILLS_DIR).map((d) => d.name);
}
