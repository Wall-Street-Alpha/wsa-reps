import { readFileSync, writeFileSync } from 'node:fs';
import mammoth from 'mammoth';
import { parseQA } from '../src/lib/parser.js';

const file = process.argv[2];
const out = process.argv[3];
if (!file) { console.log('usage: node scripts/test-parser.mjs <file.docx|file.txt> [out.json]'); process.exit(0); }
const text = file.endsWith('.docx')
  ? (await mammoth.extractRawText({ buffer: readFileSync(file) })).value
  : readFileSync(file, 'utf8');
const { cards, sections } = parseQA(text, { source: 'Test' });
console.log('cards', cards.length);
const by = {};
for (const c of cards) by[c.category + ' | ' + c.difficulty] = (by[c.category + ' | ' + c.difficulty] || 0) + 1;
console.table(by);
for (const c of cards.slice(0, 3).concat(cards.slice(-3))) console.log('Q:', c.q, '\nA:', c.a.slice(0, 160), '\n');
if (out) writeFileSync(out, JSON.stringify(cards, null, 1));
