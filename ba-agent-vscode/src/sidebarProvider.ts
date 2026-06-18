import * as vscode from 'vscode';
import { sendChat, getHistory, resetHistory, describeError, type ChatMessage } from './api';
import { log } from './log';

/**
 * Renders the BA Agent chat as a Webview in the sidebar and is the single
 * entry point for sending messages (used by both the chat box and the
 * editor commands / context menu).
 */
export class SidebarProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'baAgent.chatView';

  private _view?: vscode.WebviewView;
  private _ready!: Promise<void>;
  private _markReady!: () => void;

  constructor(private readonly _extensionUri: vscode.Uri) {
    this._resetReadyGate();
  }

  private _resetReadyGate() {
    this._ready = new Promise<void>((resolve) => (this._markReady = resolve));
  }

  resolveWebviewView(webviewView: vscode.WebviewView): void {
    // The webview may be disposed and recreated; reset the readiness gate so a
    // fresh 'ready' message re-opens it instead of resolving a stale promise.
    this._resetReadyGate();
    this._view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };
    webviewView.webview.html = this._html(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(async (msg) => {
      switch (msg?.type) {
        case 'ready': {
          // Hydrate conversation history, THEN open the gate so any queued
          // command message is appended after the history renders.
          const items = await getHistory();
          this._post({ type: 'history', items });
          this._markReady();
          break;
        }
        case 'send':
          if (typeof msg.text === 'string' && msg.text.trim()) {
            await this.sendMessage(msg.text.trim());
          }
          break;
        case 'reset':
          await this.newSession();
          break;
      }
    });
  }

  private _post(message: unknown): void {
    this._view?.webview.postMessage(message);
  }

  /** Reveal the sidebar view and wait until its webview is ready. */
  private async _ensureVisible(): Promise<void> {
    await vscode.commands.executeCommand(`${SidebarProvider.viewType}.focus`);
    // If the view existed before this call, _ready is already resolved.
    await this._ready;
  }

  /**
   * The one funnel for all chat traffic. Shows the user message, calls the
   * local BA Agent API, then shows the reply (or a friendly error).
   */
  public async sendMessage(text: string): Promise<void> {
    await this._ensureVisible();
    this._post({ type: 'append', role: 'user', content: text });
    this._post({ type: 'thinking', on: true });
    try {
      const reply = await sendChat(text);
      this._post({ type: 'append', role: 'assistant', content: reply });
    } catch (err) {
      log('sendMessage failed:', err);
      this._post({ type: 'error', message: describeError(err) });
    } finally {
      this._post({ type: 'thinking', on: false });
    }
  }

  /** Clear server-side memory and the webview. */
  public async newSession(): Promise<void> {
    try {
      await resetHistory();
      this._post({ type: 'history', items: [] as ChatMessage[] });
    } catch (err) {
      log('newSession failed:', err);
      this._post({ type: 'error', message: describeError(err) });
    }
  }

  // -------------------------------------------------------------------------
  // Webview HTML (self-contained, no external/CDN dependencies → works offline)
  // -------------------------------------------------------------------------
  private _html(webview: vscode.Webview): string {
    const nonce = getNonce();
    const csp = [
      `default-src 'none'`,
      `style-src ${webview.cspSource} 'unsafe-inline'`,
      `script-src 'nonce-${nonce}'`,
      `font-src ${webview.cspSource}`,
    ].join('; ');

    return /* html */ `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta http-equiv="Content-Security-Policy" content="${csp}" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  :root { color-scheme: light dark; }
  body { margin:0; padding:0; font-family: var(--vscode-font-family); font-size: var(--vscode-font-size); color: var(--vscode-foreground); }
  #app { display:flex; flex-direction:column; height:100vh; }
  #toolbar { display:flex; align-items:center; gap:8px; padding:6px 10px; border-bottom:1px solid var(--vscode-panel-border); }
  #toolbar .title { font-weight:600; }
  #toolbar .spacer { flex:1; }
  button { font-family:inherit; font-size:12px; cursor:pointer; border:none; border-radius:4px; padding:5px 10px;
    color: var(--vscode-button-foreground); background: var(--vscode-button-background); }
  button:hover { background: var(--vscode-button-hoverBackground); }
  button.ghost { background:transparent; color: var(--vscode-foreground); border:1px solid var(--vscode-panel-border); }
  button.ghost:hover { background: var(--vscode-toolbar-hoverBackground); }
  #messages { flex:1; overflow-y:auto; padding:12px; display:flex; flex-direction:column; gap:10px; }
  .row { display:flex; }
  .row.user { justify-content:flex-end; }
  .bubble { max-width:92%; padding:8px 11px; border-radius:10px; line-height:1.45; word-wrap:break-word; overflow-wrap:anywhere; }
  .user .bubble { background: var(--vscode-button-background); color: var(--vscode-button-foreground); border-bottom-right-radius:3px; white-space:pre-wrap; }
  .assistant .bubble { background: var(--vscode-editor-inactiveSelectionBackground, rgba(128,128,128,.15)); border-bottom-left-radius:3px; }
  .assistant .bubble.error { background: var(--vscode-inputValidation-errorBackground, #5a1d1d); border:1px solid var(--vscode-inputValidation-errorBorder, #be1100); }
  .bubble h1,.bubble h2,.bubble h3 { margin:.5em 0 .3em; line-height:1.3; }
  .bubble h1{font-size:1.2em} .bubble h2{font-size:1.1em} .bubble h3{font-size:1em}
  .bubble p { margin:.35em 0; }
  .bubble ul,.bubble ol { margin:.35em 0 .35em 1.3em; padding:0; }
  .bubble li { margin:.15em 0; }
  .bubble code { font-family: var(--vscode-editor-font-family, monospace); background: var(--vscode-textCodeBlock-background, rgba(128,128,128,.2)); padding:.05em .35em; border-radius:3px; font-size:.92em; }
  .bubble pre { background: var(--vscode-textCodeBlock-background, rgba(128,128,128,.18)); padding:9px; border-radius:6px; overflow:auto; }
  .bubble pre code { background:transparent; padding:0; }
  .bubble table { border-collapse:collapse; margin:.5em 0; width:100%; font-size:.92em; }
  .bubble th,.bubble td { border:1px solid var(--vscode-panel-border); padding:4px 7px; text-align:left; }
  .bubble th { background: var(--vscode-editor-inactiveSelectionBackground, rgba(128,128,128,.2)); }
  .bubble a { color: var(--vscode-textLink-foreground); }
  .hint { color: var(--vscode-descriptionForeground); padding:12px; }
  .typing { display:inline-flex; gap:4px; }
  .typing span { width:6px; height:6px; border-radius:50%; background: var(--vscode-descriptionForeground); animation:blink 1.3s infinite both; }
  .typing span:nth-child(2){animation-delay:.2s} .typing span:nth-child(3){animation-delay:.4s}
  @keyframes blink { 0%,80%,100%{opacity:.2} 40%{opacity:1} }
  #composer { display:flex; gap:6px; padding:8px; border-top:1px solid var(--vscode-panel-border); }
  #input { flex:1; resize:none; max-height:140px; font-family:inherit; font-size:inherit; color: var(--vscode-input-foreground);
    background: var(--vscode-input-background); border:1px solid var(--vscode-input-border, var(--vscode-panel-border)); border-radius:6px; padding:7px 9px; }
  #input:focus { outline:1px solid var(--vscode-focusBorder); }
</style>
</head>
<body>
<div id="app">
  <div id="toolbar">
    <span class="title">💼 BA Agent</span>
    <span class="spacer"></span>
    <button id="resetBtn" class="ghost" title="Clear conversation history">New session</button>
  </div>
  <div id="messages"></div>
  <form id="composer">
    <textarea id="input" rows="1" placeholder="Ask the BA Agent…  (Enter to send, Shift+Enter = newline)"></textarea>
    <button id="sendBtn" type="submit">Send</button>
  </form>
</div>

<script nonce="${nonce}">
const vscode = acquireVsCodeApi();
const messagesEl = document.getElementById('messages');
const form = document.getElementById('composer');
const input = document.getElementById('input');
const resetBtn = document.getElementById('resetBtn');
let thinkingEl = null;

function escapeHtml(s){return s.replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}

// --- tiny, dependency-free Markdown renderer (headings, lists, tables, code, inline) ---
function inline(t){
  return escapeHtml(t)
    .replace(/\`([^\`]+)\`/g,'<code>$1</code>')
    .replace(/\\*\\*([^*]+)\\*\\*/g,'<strong>$1</strong>')
    .replace(/(^|[^*])\\*([^*]+)\\*/g,'$1<em>$2</em>')
    .replace(/\\[([^\\]]+)\\]\\((https?:[^)]+)\\)/g,'<a href="$2">$1</a>');
}
function renderMd(src){
  const lines = src.replace(/\\r\\n/g,'\\n').split('\\n');
  let html='', i=0;
  while(i<lines.length){
    let line=lines[i];
    if(/^\`\`\`/.test(line)){ // fenced code
      let code=''; i++;
      while(i<lines.length && !/^\`\`\`/.test(lines[i])){ code+=lines[i]+'\\n'; i++; }
      i++; html+='<pre><code>'+escapeHtml(code.replace(/\\n$/,''))+'</code></pre>'; continue;
    }
    let m=line.match(/^(#{1,6})\\s+(.*)$/);
    if(m){ const l=m[1].length; html+='<h'+l+'>'+inline(m[2])+'</h'+l+'>'; i++; continue; }
    if(/^\\s*\\|.*\\|\\s*$/.test(line) && i+1<lines.length && /^\\s*\\|?[\\s:|-]+\\|?\\s*$/.test(lines[i+1])){
      const cells=r=>r.trim().replace(/^\\||\\|$/g,'').split('|').map(c=>c.trim());
      const head=cells(line); i+=2; let body='';
      while(i<lines.length && /^\\s*\\|.*\\|\\s*$/.test(lines[i])){ body+='<tr>'+cells(lines[i]).map(c=>'<td>'+inline(c)+'</td>').join('')+'</tr>'; i++; }
      html+='<table><thead><tr>'+head.map(c=>'<th>'+inline(c)+'</th>').join('')+'</tr></thead><tbody>'+body+'</tbody></table>'; continue;
    }
    if(/^\\s*[-*+]\\s+/.test(line)){ let items='';
      while(i<lines.length && /^\\s*[-*+]\\s+/.test(lines[i])){ items+='<li>'+inline(lines[i].replace(/^\\s*[-*+]\\s+/,''))+'</li>'; i++; }
      html+='<ul>'+items+'</ul>'; continue;
    }
    if(/^\\s*\\d+\\.\\s+/.test(line)){ let items='';
      while(i<lines.length && /^\\s*\\d+\\.\\s+/.test(lines[i])){ items+='<li>'+inline(lines[i].replace(/^\\s*\\d+\\.\\s+/,''))+'</li>'; i++; }
      html+='<ol>'+items+'</ol>'; continue;
    }
    if(line.trim()===''){ i++; continue; }
    let para=line; i++;
    while(i<lines.length && lines[i].trim()!=='' && !/^(#{1,6}\\s|\`\`\`|\\s*[-*+]\\s|\\s*\\d+\\.\\s|\\s*\\|)/.test(lines[i])){ para+=' '+lines[i]; i++; }
    html+='<p>'+inline(para)+'</p>';
  }
  return html;
}

function bubble(role, html, isError){
  const row=document.createElement('div'); row.className='row '+role;
  const b=document.createElement('div'); b.className='bubble'+(isError?' error':'');
  b.innerHTML=html; row.appendChild(b); messagesEl.appendChild(row);
  messagesEl.scrollTop=messagesEl.scrollHeight; return b;
}
function render(role, text){ return role==='user' ? bubble('user', escapeHtml(text)) : bubble('assistant', renderMd(text)); }

function greeting(){
  messagesEl.innerHTML='<div class="hint">👋 <strong>BA Agent</strong> — select text in the editor and right-click → <em>BA Agent</em>, or just type below.<br><br>Try: <em>Analyze Requirement · Create User Story · Generate BRD · Review Requirement</em>.</div>';
}

function setThinking(on){
  if(on){ if(!thinkingEl){ thinkingEl=bubble('assistant','<span class="typing"><span></span><span></span><span></span></span>'); thinkingEl.parentElement.id='thinkingRow'; } }
  else if(thinkingEl){ thinkingEl.parentElement.remove(); thinkingEl=null; }
}

window.addEventListener('message', (e)=>{
  const m=e.data;
  if(m.type==='history'){ messagesEl.innerHTML=''; if(!m.items || !m.items.length){ greeting(); } else { m.items.forEach(it=>render(it.role, it.content)); } }
  else if(m.type==='append'){ setThinking(false); render(m.role, m.content); }
  else if(m.type==='thinking'){ setThinking(m.on); }
  else if(m.type==='error'){ setThinking(false); bubble('assistant','⚠ '+escapeHtml(m.message), true); }
});

function submit(){ const t=input.value.trim(); if(!t) return; input.value=''; autosize(); vscode.postMessage({type:'send', text:t}); }
form.addEventListener('submit', e=>{ e.preventDefault(); submit(); });
input.addEventListener('keydown', e=>{ if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); submit(); } });
function autosize(){ input.style.height='auto'; input.style.height=Math.min(input.scrollHeight,140)+'px'; }
input.addEventListener('input', autosize);
resetBtn.addEventListener('click', ()=>{ messagesEl.innerHTML=''; greeting(); vscode.postMessage({type:'reset'}); });

greeting();
vscode.postMessage({type:'ready'});
</script>
</body>
</html>`;
  }
}

function getNonce(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let text = '';
  for (let i = 0; i < 32; i++) text += chars.charAt(Math.floor(Math.random() * chars.length));
  return text;
}
