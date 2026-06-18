import fs from 'node:fs';
import path from 'node:path';
import { ROOT, loadMarkdownFile } from './prompt-loader';
import { getAgent, isActive } from './agents';
import { runSkill } from './agent';
import { logger } from './logger';

/**
 * BMAD workflow runner.
 *
 * Phases are declared in workflows/bmad.json (read from disk every call, so it
 * is editable without a restart). Each phase reuses the existing agent stack:
 * runSkill() composes the target agent's system prompt and calls the LLM, then
 * the result is written as a Markdown artifact under workspace/<project>/.
 * Human-in-the-loop: run one phase, review/edit the artifact, run the next.
 */

export interface PhaseDef {
  id: string;
  label: string;
  agent: string;
  output: string;
  inputs: string[];
  instruction: string;
}
export interface WorkflowDef {
  name: string;
  description?: string;
  phases: PhaseDef[];
}

const WORKFLOW_FILE = path.join(ROOT, 'workflows', 'bmad.json');

export function loadWorkflow(): WorkflowDef {
  return JSON.parse(fs.readFileSync(WORKFLOW_FILE, 'utf-8')) as WorkflowDef;
}

/** Slugify a project name into a safe folder name. */
export function slug(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'project'
  );
}

function workspaceDir(project: string): string {
  return path.join(ROOT, 'workspace', slug(project));
}

export interface FileInfo {
  name: string;
  bytes: number;
}

export function listArtifacts(project: string): FileInfo[] {
  const dir = workspaceDir(project);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith('.md'))
    .sort()
    .map((f) => ({ name: f, bytes: fs.statSync(path.join(dir, f)).size }));
}

export function readArtifact(project: string, name: string): string | null {
  const file = path.join(workspaceDir(project), path.basename(name));
  if (!fs.existsSync(file)) return null;
  return loadMarkdownFile(file);
}

/** Phases annotated with runnable/done status for the current project. */
export function describeWorkflow(project?: string) {
  const def = loadWorkflow();
  const artifacts = project ? new Set(listArtifacts(project).map((a) => a.name)) : new Set<string>();
  return {
    name: def.name,
    description: def.description,
    phases: def.phases.map((p) => {
      const agent = getAgent(p.agent);
      return {
        id: p.id,
        label: p.label,
        agent: p.agent,
        output: p.output,
        inputs: p.inputs,
        runnable: Boolean(agent && isActive(agent)),
        done: artifacts.has(p.output),
      };
    }),
  };
}

export interface RunOptions {
  provider?: string;
  model?: string;
}

export interface RunResult {
  project: string;
  phase: string;
  artifact: string;
  content: string;
}

/** Run a single phase and write its artifact. */
export async function runPhase(
  project: string,
  phaseId: string,
  idea: string | undefined,
  opts: RunOptions = {},
): Promise<RunResult> {
  const def = loadWorkflow();
  const phase = def.phases.find((p) => p.id === phaseId);
  if (!phase) throw new Error(`Unknown phase: ${phaseId}`);

  const agent = getAgent(phase.agent);
  if (!agent) throw new Error(`Phase "${phaseId}" needs unregistered agent "${phase.agent}".`);
  if (!isActive(agent)) {
    throw new Error(
      `The ${phase.label} phase needs the "${phase.agent}" agent, which is not active yet. ` +
        `Create agents/${phase.agent}/prompts/system.md to enable it.`,
    );
  }

  const dir = workspaceDir(project);
  const parts: string[] = [];
  if (idea && idea.trim()) parts.push(`## Product idea / seed input\n\n${idea.trim()}`);
  for (const input of phase.inputs) {
    const file = path.join(dir, input);
    if (!fs.existsSync(file)) {
      throw new Error(`Missing input artifact "${input}". Run the previous phase first.`);
    }
    parts.push(`## ${input}\n\n${fs.readFileSync(file, 'utf-8')}`);
  }
  if (parts.length === 0) {
    throw new Error('Provide an "idea" to start the Analysis phase.');
  }

  const content = await runSkill(phase.instruction, parts.join('\n\n'), {
    baseDir: agent.baseDir,
    provider: opts.provider,
    model: opts.model,
  });

  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const header = `<!-- BMAD · ${phase.label} · project: ${slug(project)} -->\n\n`;
  fs.writeFileSync(path.join(dir, phase.output), header + content, 'utf-8');
  logger.info(`[workflow] ${slug(project)} · ${phase.id} → ${phase.output} (${content.length} chars)`);

  return { project: slug(project), phase: phase.id, artifact: phase.output, content };
}
