import mammoth from 'mammoth';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';

const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
});
// GFM plugin → keeps requirement tables as Markdown tables.
turndown.use(gfm);

/**
 * mammoth emits every table cell as <td> (no <th>) and wraps cell text in <p>.
 * The GFM table rule only converts a table when its first row is a heading row
 * (all <th>), so we (1) flatten <p> inside cells and (2) promote the first row
 * of each table to <th>. Without this, tables survive as raw HTML.
 */
function normalizeTables(html: string): string {
  return html.replace(/<table[\s\S]*?<\/table>/g, (table) => {
    let t = table
      .replace(/<(td|th)>\s*<p>/g, '<$1>')
      .replace(/<\/p>\s*<\/(td|th)>/g, '</$1>')
      .replace(/<\/p>\s*<p>/g, '<br>');
    // Promote the first row's cells to header cells.
    t = t.replace(/<tr>([\s\S]*?)<\/tr>/, (_row, inner) =>
      `<tr>${inner.replace(/<td>/g, '<th>').replace(/<\/td>/g, '</th>')}</tr>`,
    );
    return t;
  });
}

/**
 * Convert a .docx file buffer to Markdown, preserving headings, lists and
 * tables. docx → HTML (mammoth) → normalize tables → Markdown (turndown + GFM).
 */
export async function docxBufferToMarkdown(buffer: Buffer): Promise<string> {
  const { value: html } = await mammoth.convertToHtml({ buffer });
  return turndown.turndown(normalizeTables(html)).trim();
}
