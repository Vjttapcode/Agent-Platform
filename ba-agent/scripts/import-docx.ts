import fs from 'node:fs';
import path from 'node:path';
import { docxBufferToMarkdown } from '../src/docx';
import { saveDocument } from '../src/documents';

/**
 * CLI: convert a .docx into documents/<name>.md
 * Usage:  npm run import -- "C:\\path\\to\\srs.docx"
 */
const input = process.argv[2];
if (!input) {
  console.error('Usage: npm run import -- <path-to-srs.docx>');
  process.exit(1);
}
if (!/\.docx$/i.test(input)) {
  console.error('Only .docx files are supported.');
  process.exit(1);
}

const buffer = fs.readFileSync(path.resolve(input));
const markdown = await docxBufferToMarkdown(buffer);
const name = saveDocument(path.basename(input), markdown);
console.log(`✅ Converted → documents/${name} (${markdown.length.toLocaleString()} chars)`);
console.log('   Analyze it from the web UI, or POST /analyze { "doc": "' + name + '" }');
