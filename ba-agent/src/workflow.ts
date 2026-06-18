import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './prompt-loader';
import { getAgent, isActive } from './agents';
import { runSkill } from './agent';
import { logger } from './logger';
import { putArtifact, getArtifact, listArtifacts as storeListArtifacts, type ArtifactInfo } from './store';

/**
 * BMAD workflow runner.
 *
 * Phases are declared in workflows/bmad.json (read from disk every call).
 * Each phase reuses the agent stack via runSkill() and stores its Markdown
 * artifact in the SQLite store, scoped by sessionId (a "project" == a session).
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

/** Slugify a project/session name into a safe id. */
export function slug(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'project'
  );
}

export function listArtifacts(sessionId: string): ArtifactInfo[] {
  return storeListArtifacts(sessionId);
}

export function readArtifact(sessionId: string, name: string): string | null {
  return getArtifact(sessionId, path.basename(name));
}

/** Phases annotated with runnable/done status for the current session. */
export function describeWorkflow(sessionId?: string) {
  const def = loadWorkflow();
  const done = sessionId ? new Set(listArtifacts(sessionId).map((a) => a.name)) : new Set<string>();
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
        done: done.has(p.output),
      };
    }),
  };
}

export interface RunOptions {
  provider?: string;
  model?: string;
}

export interface RunResult {
  session: string;
  phase: string;
  artifact: string;
  content: string;
}

/** Run a single phase and store its artifact. */
export async function runPhase(
  sessionId: string,
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

  const parts: string[] = [];
  if (idea && idea.trim()) parts.push(`## Product idea / seed input\n\n${idea.trim()}`);
  for (const input of phase.inputs) {
    const content = getArtifact(sessionId, input);
    if (content === null) {
      throw new Error(`Missing input artifact "${input}". Run the previous phase first.`);
    }
    parts.push(`## ${input}\n\n${content}`);
  }
  if (parts.length === 0) {
    throw new Error('Provide an "idea" to start the Analysis phase.');
  }

  const content = await runSkill(phase.instruction, parts.join('\n\n'), {
    baseDir: agent.baseDir,
    provider: opts.provider,
    model: opts.model,
  });

  putArtifact(sessionId, phase.output, content, phase.id);
  logger.info(`[workflow] ${sessionId} · ${phase.id} → ${phase.output} (${content.length} chars)`);

  return { session: sessionId, phase: phase.id, artifact: phase.output, content };
}
