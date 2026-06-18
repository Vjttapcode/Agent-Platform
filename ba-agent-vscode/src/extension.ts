import * as vscode from 'vscode';
import { SidebarProvider } from './sidebarProvider';
import { registerCommands } from './commands';
import { initLog, log } from './log';

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(initLog());
  log('BA Agent extension activated');

  const provider = new SidebarProvider(context.extensionUri);

  // Sidebar chat (WebView).
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(SidebarProvider.viewType, provider, {
      webviewOptions: { retainContextWhenHidden: true },
    }),
  );

  // Command palette + context-menu commands.
  registerCommands(context, provider);
}

export function deactivate(): void {
  /* nothing to clean up */
}
