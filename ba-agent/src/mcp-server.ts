import './mcp-env'; // MUST be first: loads .env from project root before agent/llm read env
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { runSkill, agentInfo } from './agent';
import { hasApiKey, missingKeyMessage } from './llm';
import { logger } from './logger';

/**
 * BA Agent MCP server (stdio, standard Model Context Protocol).
 * Compatible with ruflo, Claude Desktop and Claude Code.
 *
 * Every tool reuses the existing BA Agent via runSkill() — same composed
 * system prompt (system + conventions + knowledge + skills). No duplicated
 * prompt logic, and the agent never calls the model in any other way here.
 */

interface ToolDef {
  name: string;
  description: string;
  property: string;
  propertyDescription: string;
  instruction: string;
}

const TOOLS: ToolDef[] = [
  {
    name: 'analyze_requirement',
    description:
      'Analyze a requirement or feature: stakeholders, functional & non-functional requirements (FR-###/NFR-### ids), assumptions, constraints, risks, and open questions.',
    property: 'requirement',
    propertyDescription: 'The requirement, feature, or problem statement to analyze.',
    instruction:
      'Analyze the following requirement using your Requirement Analysis skill. Identify stakeholders, functional & non-functional requirements (with FR-###/NFR-### ids), assumptions, constraints, risks, and open questions.',
  },
  {
    name: 'create_user_story',
    description:
      'Generate INVEST user stories (US-### ids) with acceptance criteria (Given/When/Then, AC-### ids) for a feature.',
    property: 'requirement',
    propertyDescription: 'The feature or requirement to turn into user stories.',
    instruction:
      'Generate user stories (INVEST, with US-### ids) for the following, then list acceptance criteria (Given/When/Then, AC-### ids) for each story.',
  },
  {
    name: 'create_brd',
    description: 'Draft a Business Requirements Document (BRD) for a product or feature.',
    property: 'description',
    propertyDescription: 'The product/feature description the BRD should cover.',
    instruction:
      'Draft a Business Requirements Document (BRD) for the following, following the standard BRD structure from your knowledge base.',
  },
  {
    name: 'review_requirement',
    description:
      'Review a requirement or SRS for clarity, completeness, testability, ambiguity, technical risk, and conflicts; returns clarifying questions and concrete improvements.',
    property: 'requirement',
    propertyDescription: 'The requirement or SRS text to review.',
    instruction:
      'Review the following using your SRS Review and review skills. Report: (1) ambiguous or unclear statements with prioritized clarifying questions, (2) technically hard or risky parts classified systematically with risk levels, and (3) conflicts or inconsistencies. Give concrete improvement suggestions.',
  },
  {
    name: 'ask_missing_questions',
    description:
      'Return a prioritized list of clarifying questions (Q-### ids) for the gaps and ambiguities in a requirement.',
    property: 'requirement',
    propertyDescription: 'The requirement or brief to find gaps in.',
    instruction:
      'Using your Ask Missing Questions skill, return a prioritized list of clarifying questions (Q-### ids) for the gaps and ambiguities in the following — each with one line on why it matters.',
  },
];

const server = new Server(
  { name: 'ba-agent', version: '1.0.0' },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS.map((t) => ({
    name: t.name,
    description: t.description,
    inputSchema: {
      type: 'object',
      properties: {
        [t.property]: { type: 'string', description: t.propertyDescription },
      },
      required: [t.property],
      additionalProperties: false,
    },
  })),
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const tool = TOOLS.find((t) => t.name === request.params.name);
  if (!tool) {
    return { content: [{ type: 'text', text: `Unknown tool: ${request.params.name}` }], isError: true };
  }
  if (!hasApiKey()) {
    return { content: [{ type: 'text', text: missingKeyMessage() }], isError: true };
  }

  const args = (request.params.arguments ?? {}) as Record<string, unknown>;
  const input = (args[tool.property] ?? '').toString();
  if (!input.trim()) {
    return {
      content: [{ type: 'text', text: `Missing required argument "${tool.property}".` }],
      isError: true,
    };
  }

  try {
    const result = await runSkill(tool.instruction, input);
    return { content: [{ type: 'text', text: result }] };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Tool execution failed';
    return { content: [{ type: 'text', text: message }], isError: true };
  }
});

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // logger writes to stderr only — stdout is reserved for the MCP protocol.
  logger.info(`[ba-agent mcp] ready · ${agentInfo.provider} · ${agentInfo.model} · ${TOOLS.length} tools`);
}

process.on('unhandledRejection', (reason) => logger.error('[ba-agent mcp] unhandledRejection:', reason));

main().catch((err) => {
  logger.error('[ba-agent mcp] fatal:', err);
  process.exit(1);
});
