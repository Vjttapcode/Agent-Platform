import fs from 'node:fs';
import path from 'node:path';
import {
  Document,
  Packer,
  Paragraph,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
} from 'docx';

/** Dev helper: generate a small sample SRS .docx (with a requirements table). */
function cell(text: string): TableCell {
  return new TableCell({ children: [new Paragraph(text)] });
}
function row(cells: string[]): TableRow {
  return new TableRow({ children: cells.map(cell) });
}

const reqTable = new Table({
  width: { size: 100, type: WidthType.PERCENTAGE },
  rows: [
    row(['ID', 'Requirement']),
    row(['FR-1', 'The system should be fast and user-friendly.']),
    row(['FR-2', 'Support real-time video calls for up to 1,000,000 concurrent users with no lag.']),
    row(['FR-3', 'All user data must be retained for 10 years for analytics.']),
    row(['FR-4', 'When a user closes their account, delete all of their personal data within 30 days.']),
    row(['FR-5', 'Users can log in.']),
  ],
});

const doc = new Document({
  sections: [
    {
      children: [
        new Paragraph({ text: 'Software Requirements Specification — QuickMeet', heading: HeadingLevel.HEADING_1 }),
        new Paragraph({ text: 'Version 0.1' }),
        new Paragraph({ text: '1. Introduction', heading: HeadingLevel.HEADING_2 }),
        new Paragraph('QuickMeet is a video conferencing platform. This document specifies its requirements.'),
        new Paragraph({ text: '2. Functional Requirements', heading: HeadingLevel.HEADING_2 }),
        reqTable,
        new Paragraph({ text: '3. Non-Functional Requirements', heading: HeadingLevel.HEADING_2 }),
        new Paragraph('The application must be secure and scalable.'),
      ],
    },
  ],
});

const outDir = path.join(process.cwd(), 'samples');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, 'sample-srs.docx');

const buffer = await Packer.toBuffer(doc);
fs.writeFileSync(outPath, buffer);
console.log(`✅ Wrote ${outPath} (${buffer.length.toLocaleString()} bytes)`);
