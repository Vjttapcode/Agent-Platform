import fs from 'node:fs';
import path from 'node:path';
import { ROOT, loadMarkdownDir, type MarkdownDoc } from './prompt-loader';

/**
 * Lightweight agent registry.
 *
 * BA lives at the project root (its prompts/skills/knowledge/conventions/memory
 * folders). New agents are added simply by creating an `agents/<id>/` folder
 * with the same layout — `isActive()` flips to true once it has prompts/system.md.
 * Dev / Tester / Architect are listed as placeholders until then.
 */
export interface AgentDef {
  id: string;
  name: string;
  description: string;
  baseDir: string;
}

export const AGENTS: AgentDef[] = [
  { id: 'ba', name: 'BA Agent', description: 'Business Analyst — requirements, user stories, BRD, SRS review', baseDir: ROOT },
  { id: 'pm', name: 'PM Agent', description: 'Product Manager — PRD, epics, prioritization', baseDir: path.join(ROOT, 'agents', 'pm') },
  { id: 'dev', name: 'Dev Agent', description: 'Developer — implementation & code', baseDir: path.join(ROOT, 'agents', 'dev') },
  { id: 'tester', name: 'Tester Agent', description: 'QA — test design & review', baseDir: path.join(ROOT, 'agents', 'tester') },
  { id: 'architect', name: 'Architect Agent', description: 'Solution architecture & design', baseDir: path.join(ROOT, 'agents', 'architect') },
];

/** An agent is "active" once its base folder has a system prompt. */
export function isActive(agent: AgentDef): boolean {
  return fs.existsSync(path.join(agent.baseDir, 'prompts', 'system.md'));
}

export function getAgent(id: string): AgentDef | undefined {
  return AGENTS.find((a) => a.id === id);
}

export function listAgents() {
  return AGENTS.map((a) => ({
    id: a.id,
    name: a.name,
    description: a.description,
    active: isActive(a),
  }));
}

// Category → folder name on disk.
const CATEGORY_DIR: Record<string, string> = {
  prompt: 'prompts',
  conventions: 'conventions',
  knowledge: 'knowledge',
  skills: 'skills',
};

export interface FileInfo {
  name: string;
  bytes: number;
}

/** List the *.md files for a category with their sizes. */
export function fileList(baseDir: string, category: string): FileInfo[] {
  const folder = CATEGORY_DIR[category];
  if (!folder) return [];
  const dir = path.join(baseDir, folder);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith('.md'))
    .sort()
    .map((f) => ({ name: f, bytes: fs.statSync(path.join(dir, f)).size }));
}

/** All loaded files grouped by category — powers "View Loaded Files". */
export function loadedFiles(baseDir: string) {
  return {
    prompt: fileList(baseDir, 'prompt'),
    conventions: fileList(baseDir, 'conventions'),
    knowledge: fileList(baseDir, 'knowledge'),
    skills: fileList(baseDir, 'skills'),
  };
}

/** Read the freshly-loaded documents for a category (name + content). */
export function sectionDocs(baseDir: string, category: string): MarkdownDoc[] {
  const folder = CATEGORY_DIR[category];
  if (!folder) return [];
  return loadMarkdownDir(path.join(baseDir, folder));
}

export const CATEGORIES = Object.keys(CATEGORY_DIR);
