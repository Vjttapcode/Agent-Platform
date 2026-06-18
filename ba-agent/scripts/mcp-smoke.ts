import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

/** Smoke test: spawn the MCP server over stdio, list tools, call each one. */
const transport = new StdioClientTransport({
  command: process.execPath, // node
  args: ['node_modules/tsx/dist/cli.mjs', 'src/mcp-server.ts'],
  cwd: process.cwd(),
});

const client = new Client({ name: 'smoke-test', version: '1.0.0' });
await client.connect(transport);

const { tools } = await client.listTools();
console.log('TOOLS REGISTERED:', tools.map((t: any) => t.name).join(', '));

const inputs: Record<string, any> = {
  analyze_requirement: { requirement: 'Users can reset their password via an email link.' },
  create_user_story: { requirement: 'Users can reset their password via an email link.' },
  create_brd: { description: 'A self-service password reset feature for a web app.' },
  review_requirement: { requirement: 'The system should be fast and store data for 10 years but delete it after 30 days.' },
  ask_missing_questions: { requirement: 'Build a login page.' },
};

for (const t of tools as any[]) {
  const res: any = await client.callTool({ name: t.name, arguments: inputs[t.name] }, undefined, {
    timeout: 240000,
  });
  const text: string = res.content?.[0]?.text ?? '';
  console.log(`\n=== ${t.name} | isError=${res.isError ?? false} | chars=${text.length}`);
  console.log('   ' + text.replace(/\s+/g, ' ').slice(0, 160));
}

await client.close();
console.log('\n✅ smoke test done');
