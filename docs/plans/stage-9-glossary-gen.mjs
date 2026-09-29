// Stage 9 plan writer: research/11 §5 tables → apps/demo/src/app/glossary-data.ts (scratch generator; the output is committed).
import { readFileSync, writeFileSync } from 'node:fs';
const src = readFileSync(process.argv[2], 'utf8');
const out = process.argv[3];
const body = src.slice(src.indexOf('## 5. Glossary'), src.indexOf('### 5.16'));
let section = '';
const rows = [];
const clean = (s) => s.replace(/\*\*/g, '').replace(/`/g, '').trim();
const brace = (s) => {
  const m = s.match(/^(.*)\{([^}]*)\}(.*)$/);
  if (!m) return [s];
  return m[2].split(',').flatMap((x) => brace(`${m[1]}${x.trim()}${m[3]}`));
};
const LAB = ['ev.labs.values.', 'ev.labResult.values.', 'blood.out.'];
function keysOf(cell, sec) {
  const toks = [...cell.matchAll(/`([^`]+)`/g)].map((m) => m[1]);
  const keys = [];
  let prefix = '';
  for (let t of toks) {
    if (/^Measured\./.test(t) || t.includes('…') || t === 'measure.ts') continue;
    if (t.startsWith('.')) t = t.slice(1);
    if (sec.startsWith('5.7') && !t.includes('.')) { for (const p of LAB) keys.push(p + t); continue; }
    if (sec.startsWith('5.2')) continue; // waveform channels: lane labels, not truth paths
    if (t.startsWith('lp.')) t = `resp.lung.${t}`;
    if (!t.includes('.') && prefix) t = prefix + t;
    for (let k of brace(t)) {
      const sl = k.match(/^(.*\.)([a-zA-Z]+)((?:\/[A-Z][a-zA-Z]*)+)$/); // mon.nibpSys/Dia/Mean, ev.endo.glucoseMmolL/MgDl, qLungL/R
      if (sl) {
        const stem = sl[2];
        const alts = sl[3].split('/').filter(Boolean);
        const base = stem.replace(new RegExp(`${alts[0].length === 1 ? alts[0] : ''}$`), '');
        keys.push(sl[1] + stem);
        for (const a of alts) keys.push(sl[1] + (a.length === 1 ? stem.slice(0, -1) + a : stem.replace(/[A-Z][a-z]*$/, a)));
        void base;
      } else keys.push(k);
    }
    prefix = t.slice(0, t.lastIndexOf('.') + 1);
  }
  return [...new Set(keys)];
}
for (const line of body.split('\n')) {
  const h = line.match(/^### (5\.\d+) (.*)$/);
  if (h) { section = `${h[1]} ${h[2]}`; continue; }
  if (!/^\| \d+ \|/.test(line)) continue;
  const c = line.split('|').slice(1, -1).map((x) => x.trim());
  const n = Number(c[0]);
  // column sets differ: 5.2 (#, channel, Label, Name, Unit, Convention, Current, Flag); 5.13 / 5.14 / 5.15 have no child column
  let label, name, unit, normal = '', child = '', conv = '';
  if (section.startsWith('5.2')) [, , label, name, unit, conv] = c;
  else if (section.startsWith('5.13')) [, , label, name, unit, conv] = c;
  else if (section.startsWith('5.14') || section.startsWith('5.15')) [, , label, name, unit, normal, conv] = c;
  else [, , label, name, unit, normal, child, conv] = c;
  rows.push({ n, section: section.split(' ')[0], keys: keysOf(c[1], section), label: clean(label), name: clean(name), unit: clean(unit), normal: clean(normal), other: clean(child === '—' ? '' : child), convention: clean(conv) });
}
const esc = (s) => JSON.stringify(s);
const lines = rows.map((r) => `  { n: ${r.n}, s: '${r.section}', keys: [${r.keys.map(esc).join(', ')}], label: ${esc(r.label)}, name: ${esc(r.name)}, unit: ${esc(r.unit)}, normal: ${esc(r.normal)}${r.other ? `, other: ${esc(r.other)}` : ''}${r.convention ? `, convention: ${esc(r.convention)}` : ''} },`);
writeFileSync(out, `// R56 clinical glossary: engine key → clinical label, full name, unit, adult normal range (research/11-capability-inventory-
// and-glossary.md §5, 294 entries, generated 2026-09-28 by the Stage 9 plan writer from the workspace research file; edits
// go HERE and are reviewed by Ali). \`keys\` are console truth paths; \`#\` = side index (0 L, 1 R), \`*\`/\`<id>\` = any segment.
// Entries without keys are planned labels (R57/R58/R59) that the UI already uses for placeholders.
export interface GlossaryEntry {
  n: number;
  /** research/11 section (5.1 monitor … 5.15 obstetric). */
  s: string;
  keys: string[];
  label: string;
  name: string;
  unit: string;
  normal: string;
  /** Child / pregnancy values where they differ. */
  other?: string;
  convention?: string;
}

export const GLOSSARY: readonly GlossaryEntry[] = [
${lines.join('\n')}
];
`);
console.log(rows.length, 'entries', rows.reduce((a, r) => a + r.keys.length, 0), 'keys');
for (const r of rows.filter((r) => [13, 20, 71, 86, 129, 134, 166, 183, 245, 256, 285].includes(r.n))) console.log(r.n, r.keys.join(' '));
