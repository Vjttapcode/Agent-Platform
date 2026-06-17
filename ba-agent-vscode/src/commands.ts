import * as vscode from 'vscode';
import { SidebarProvider } from './sidebarProvider';

/** Read the current selection; fall back to the whole file; finally prompt. */
async function getInputText(): Promise<string | undefined> {
  const editor = vscode.window.activeTextEditor;
  if (editor) {
    const sel = editor.document.getText(editor.selection);
    if (sel.trim()) return sel;
    const all = editor.document.getText();
    if (all.trim()) return all;
  }
  return vscode.window.showInputBox({
    prompt: 'No text selected — enter the requirement / text for the BA Agent',
    placeHolder: 'e.g. Users should be able to reset their password via email',
  });
}

/** Wrap raw text with a task instruction so the agent applies the right skill. */
function wrap(instruction: string, text: string): string {
  return `${instruction}\n\n---\n${text}`;
}

const PROMPTS = {
  analyze: (t: string) =>
    wrap(
      'Analyze the following requirement. Identify stakeholders, functional & non-functional requirements (with FR-###/NFR-### ids), assumptions, constraints, risks, and open questions.',
      t,
    ),
  userStory: (t: string) =>
    wrap(
      'Generate user stories (INVEST, with US-### ids) for the following, then list acceptance criteria (Given/When/Then, AC-### ids) for each story.',
      t,
    ),
  brd: (t: string) =>
    wrap('Draft a Business Requirements Document (BRD) for the following.', t),
  review: (t: string) =>
    wrap(
      'Review the following requirement for clarity, completeness, testability, consistency, and ambiguity. Give concrete improvement suggestions and a prioritized list of clarifying questions.',
      t,
    ),
};

export function registerCommands(
  context: vscode.ExtensionContext,
  provider: SidebarProvider,
): void {
  const runWithText = async (build: (t: string) => string) => {
    const text = await getInputText();
    if (!text || !text.trim()) {
      vscode.window.showWarningMessage('BA Agent: nothing to send — select or type some text first.');
      return;
    }
    await provider.sendMessage(build(text));
  };

  context.subscriptions.push(
    // Command palette: "BA: Chat" — just open the chat (send selection if any).
    vscode.commands.registerCommand('baAgent.chat', async () => {
      const editor = vscode.window.activeTextEditor;
      const sel = editor?.document.getText(editor.selection).trim();
      if (sel) {
        await provider.sendMessage(sel);
      } else {
        await vscode.commands.executeCommand(`${SidebarProvider.viewType}.focus`);
      }
    }),

    vscode.commands.registerCommand('baAgent.analyze', () => runWithText(PROMPTS.analyze)),
    vscode.commands.registerCommand('baAgent.createUserStory', () => runWithText(PROMPTS.userStory)),
    vscode.commands.registerCommand('baAgent.generateBRD', () => runWithText(PROMPTS.brd)),
    vscode.commands.registerCommand('baAgent.review', () => runWithText(PROMPTS.review)),

    // Send the raw selected text verbatim.
    vscode.commands.registerCommand('baAgent.sendSelection', () => runWithText((t) => t)),

    vscode.commands.registerCommand('baAgent.newSession', async () => {
      await provider.newSession();
      vscode.window.showInformationMessage('BA Agent: conversation history cleared.');
    }),
  );
}
