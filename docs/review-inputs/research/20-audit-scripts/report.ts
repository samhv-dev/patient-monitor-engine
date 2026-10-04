// Prints the run's results tables (research/12 §4 format) from out/cells.json, grouped by family, with the gap id of
// research/20 §3 (V1–Vn) per cell. Usage: node --experimental-strip-types report.ts > out/matrix.md
import { readFileSync } from 'node:fs';
type Rec = { id: string; verdict: string; auto: string; tier: string; ctx: string; state: string; intv: string; owner: string; known?: string; dirOnly?: boolean; values: Record<string, unknown>; notes: string[] };
const s = JSON.parse(readFileSync(new URL('./out/cells.json', import.meta.url), 'utf8')) as Record<string, Rec>;
const FAM: [string, string[]][] = [
  ['2.1 Defibrillation of VF (P1)', ['DV-01a', 'DV-01b', 'DV-01c']],
  ['2.2 CPR quality and the arrest states under CPR (P1)', ['DV-02a', 'DV-02b', 'DV-02c', 'DV-03', 'DV-04a', 'DV-04b', 'DV-05a', 'DV-05b']],
  ['2.3 Synchronised cardioversion and R-on-T (P1/P2)', ['DV-06a', 'DV-06b', 'DV-06c', 'DV-07']],
  ['2.4 Transcutaneous and implanted pacing (P1/P2)', ['DV-08a', 'DV-08b', 'DV-08c', 'DV-09a', 'DV-09b', 'DV-10a', 'DV-10b', 'DV-10c', 'DV-11']],
  ['2.5 The defibrillator as a device; CPR pauses, ROSC and artefacts (P1/P2)', ['DV-21a', 'DV-21b', 'DV-22a', 'DV-22b', 'DV-23a', 'DV-23b']],
  ['2.6 IABP (P1/P2)', ['DV-13a', 'DV-13b', 'DV-13c', 'DV-13d', 'DV-14a', 'DV-14b', 'DV-14c', 'DV-14d', 'DV-15a', 'DV-15b']],
  ['2.7 LVAD, ICD, ECMO (P2/P3)', ['DV-16a', 'DV-16b', 'DV-16c', 'DV-16d', 'DV-17', 'DV-18a', 'DV-18b', 'DV-19', 'DV-12a', 'DV-12b', 'DV-20a', 'DV-20b', 'DV-20c', 'DV-20d']],
  ['2.8 Special-circumstance arrests (P2)', ['DV-24a', 'DV-24b', 'DV-25a', 'DV-25b', 'DV-26a', 'DV-26b']],
  ['2.9 MANUAL twins (direction-only; Q9 open)', ['DV-M1', 'DV-M2', 'DV-M3', 'DV-M4', 'DV-M5']],
];
const GAP: Record<string, string> = {};
const put = (g: string, ids: string[]) => { for (const i of ids) GAP[i] = GAP[i] ? `${GAP[i]}, ${g}` : g; };
put('V1', ['DV-01b']);
put('V2', ['DV-13b', 'DV-13c', 'DV-13d', 'DV-14a', 'DV-14c', 'DV-14d', 'DV-M5']);
put('V3', ['DV-04a']);
put('V4', ['DV-03', 'DV-04a']);
put('V5', ['DV-01a', 'DV-01c', 'DV-06a', 'DV-06b', 'DV-06c', 'DV-24a', 'DV-24b', 'DV-25a']);
put('V6', ['DV-08c']);
put('V7', ['DV-23a']);
put('V8', ['DV-02a']);
put('V9', ['DV-16b', 'DV-16c', 'DV-16d', 'DV-17', 'DV-18b']);
put('V10', ['DV-15b', 'DV-19']);
put('V11', ['DV-25b']);
put('V12', ['DV-M3', 'DV-21a', 'DV-10c']);
put('7h', ['DV-04b', 'DV-10c', 'DV-11', 'DV-12a', 'DV-12b', 'DV-20a', 'DV-20b', 'DV-20c', 'DV-20d']);
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
