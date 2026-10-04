// Prints the run's results tables (research/12 §4 format) from out/cells.json, grouped by family, with the gap id of
// research/14-coverage-endocrine-thermal.md §3 (E1–En) per cell. Usage: node --experimental-strip-types report.ts > out/matrix.md
import { readFileSync } from 'node:fs';
type Rec = { id: string; verdict: string; auto: string; tier: string; ctx: string; state: string; intv: string; owner: string; known?: string; dirOnly?: boolean; values: Record<string, unknown>; notes: string[] };
const s = JSON.parse(readFileSync(new URL('./out/cells.json', import.meta.url), 'utf8')) as Record<string, Rec>;
const FAM: [string, string[]][] = [
  ['2.1 Perioperative hypothermia: redistribution, warming, age, neuraxial (P1)', ['ET-01a', 'ET-01b', 'ET-02', 'ET-03a', 'ET-03b', 'ET-04', 'ET-29', 'ET-35']],
  ['2.2 Shivering at emergence; cold fluids and blood (P1)', ['ET-05a', 'ET-05b', 'ET-05c', 'ET-05d', 'ET-06', 'ET-07']],
  ['2.3 Malignant hyperthermia and dantrolene (P1)', ['ET-10a', 'ET-10b', 'ET-10c', 'ET-10d', 'ET-10e', 'ET-10f', 'ET-10g', 'ET-11a', 'ET-11b', 'ET-11c']],
  ['2.4 The surgical stress response (P1)', ['ET-16a', 'ET-16b', 'ET-16c', 'ET-17']],
  ['2.5 Glucose, insulin, diabetes and steroids (P1)', ['ET-18a', 'ET-18b', 'ET-18c', 'ET-19', 'ET-20a', 'ET-20b', 'ET-20c']],
  ['2.6 Anaphylaxis and adrenaline (P1)', ['ET-27a', 'ET-27b', 'ET-27c']],
  ['2.7 Deep hypothermia, fever and hyperthermia (P2)', ['ET-08a', 'ET-08b', 'ET-08c', 'ET-08d', 'ET-09a', 'ET-09b', 'ET-09c', 'ET-12', 'ET-30', 'ET-33']],
  ['2.8 Thyroid, adrenal and the stress axis (P2/P3)', ['ET-13a', 'ET-13b', 'ET-14', 'ET-15a', 'ET-15b', 'ET-32', 'ET-34']],
  ['2.9 Glucose emergencies and DKA (P2)', ['ET-21a', 'ET-21b', 'ET-22', 'ET-31', 'ET-23a', 'ET-23b', 'ET-23c', 'ET-23d']],
  ['2.10 Septic phases, vasoplegia, endocrine tumours (P2/P3)', ['ET-26a', 'ET-26b', 'ET-26c', 'ET-28', 'ET-24', 'ET-25']],
  ['2.11 MANUAL twins (direction-only; Q9 open)', ['ET-M1', 'ET-M2', 'ET-M3']],
];
const GAP: Record<string, string> = JSON.parse(readFileSync(new URL('./gaps.json', import.meta.url), 'utf8'));
const esc = (x: string) => x.replace(/\|/g, '/');
const counts: Record<string, number> = {};
for (const r of Object.values(s)) counts[r.verdict] = (counts[r.verdict] ?? 0) + 1;
console.log(`<!-- cells ${Object.keys(s).length} ${JSON.stringify(counts)} -->`);
const seen = new Set<string>();
for (const [title, ids] of FAM) {
  console.log(`\n### ${title}\n`);
  console.log('| cell | tier | context · state → intervention | measured | graded items: value vs expected [source] | verdict | gap · owner |');
  console.log('|---|---|---|---|---|---|---|');
  for (const id of ids) {
    const r = s[id];
    if (!r) { console.log(`| ${id} | | (not in store) | | | | |`); continue; }
    seen.add(id);
    const v = Object.entries(r.values).filter(([k]) => k !== 'events').map(([k, x]) => `${k} ${typeof x === 'number' ? x : String(x)}`).join('; ');
    const n = r.notes.map((x) => esc(x.replace(/^(PL|TW|TS|WR|MI|IN|NE|NM) /, (m0) => `${m0.trim()}: `))).join('<br>');
    const flag = `${r.known ? ` (${r.known} pending)` : ''}${r.dirOnly ? ' (direction only)' : ''}`;
    console.log(`| ${id} | ${r.tier} | ${esc(r.ctx)} · ${esc(r.state)} → ${esc(r.intv)} | ${esc(v) || '—'} | ${n} | **${r.verdict}**${flag} | ${GAP[id] ?? '—'} · ${esc(r.owner)} |`);
  }
}
const rest = Object.keys(s).filter((i) => !seen.has(i));
if (rest.length) console.log(`\n<!-- not placed: ${rest.join(' ')} -->`);
