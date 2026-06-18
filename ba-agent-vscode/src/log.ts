import * as vscode from 'vscode';

let channel: vscode.OutputChannel | undefined;

/** Create the output channel (called once from activate). */
export function initLog(): vscode.OutputChannel {
  channel ??= vscode.window.createOutputChannel('BA Agent');
  return channel;
}

/** Append a timestamped line to the "BA Agent" output channel. */
export function log(...parts: unknown[]): void {
  const line = parts
    .map((p) => (p instanceof Error ? (p.stack ?? p.message) : String(p)))
    .join(' ');
  channel?.appendLine(`${new Date().toISOString()} ${line}`);
}
