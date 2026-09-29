// Prints the run's results tables (research/12 §4 format) from out/cells.json, grouped by family, with the gap id of
// research 22 §3 (F1–Fn) per cell. Usage: node --experimental-strip-types report.ts > out/matrix.md
import { readFileSync } from 'node:fs';
type Rec = { id: string; verdict: string; tier: string; ctx: string; state: string; intv: string; owner: string; fu4?: boolean; known?: string; values: Record<string, unknown>; notes: string[] };
const s = JSON.parse(readFileSync(new URL('./out/cells.json', import.meta.url), 'utf8')) as Record<string, Rec>;
const FAM: [string, string[]][] = [
  ['2.1 Crystalloids and colloids (P1)', ['BF-01a', 'BF-01b', 'BF-02a', 'BF-02b', 'BF-03a', 'BF-03b']],
  ['2.2 Transfusion and calcium (P1)', ['BF-04', 'BF-05a', 'BF-05b', 'BF-05c', 'BF-05d', 'BF-05e', 'BF-06a', 'BF-06b']],
  ['2.3 Acid–base, CO2 and the blood gas (P1)', ['BF-13a', 'BF-13b', 'BF-13c', 'BF-16a', 'BF-16b', 'BF-17a', 'BF-17b', 'BF-17c', 'BF-29a', 'BF-29b', 'BF-30']],
  ['2.4 Coagulation (P1, 7i: not expressible)', ['BF-24', 'BF-25a', 'BF-25b', 'BF-25c', 'BF-25d', 'BF-25e', 'BF-26a', 'BF-26b', 'BF-26c', 'BF-26d']],
  ['2.5 Hyperkalaemia and its treatment (P1)', ['BF-07a', 'BF-07b', 'BF-07c', 'BF-08a', 'BF-08b', 'BF-08c', 'BF-08d']],
  ['2.6 Fluids, anaemia, leak and overload (P2)', ['BF-12', 'BF-14', 'BF-18a', 'BF-18b', 'BF-19', 'BF-20a', 'BF-20b', 'BF-21a', 'BF-21b', 'BF-21c', 'BF-22a', 'BF-22b', 'BF-22c']],
  ['2.7 Metabolic alkalosis; coagulation P2 (NE)', ['BF-15a', 'BF-15b', 'BF-27a', 'BF-27b', 'BF-27c', 'BF-28a', 'BF-28b', 'BF-31']],
  ['2.8 Electrolyte extremes and poisoning (P2/P3)', ['BF-09a', 'BF-09b', 'BF-10a', 'BF-10b', 'BF-11a', 'BF-11b', 'BF-32a', 'BF-32b', 'BF-23']],
  ['2.9 MANUAL twins (direction-only; Q9 open)', ['BF-M1', 'BF-M2']],
];
const GAP: Record<string, string> = {};
const put = (g: string, ids: string[]) => { for (const i of ids) GAP[i] = GAP[i] ? `${GAP[i]}, ${g}` : g; };
// gap ids of §3 (filled from the graded store)
put('F1', ['BF-02a', 'BF-02b', 'BF-04', 'BF-01a']);
const esc = (x: string) => x.replace(/\|/g, '/');
const counts: Record<string, number> = {};
for (const r of Object.values(s)) counts[r.verdict] = (counts[r.verdict] ?? 0) + 1;
console.log(`<!-- cells ${Object.keys(s).length} ${JSON.stringify(counts)} -->`);
const seen = new Set<string>();
for (const [title, ids] of FAM) {
  console.log(`\n### ${title}\n`);
  console.log('| cell | tier | context · state → intervention | measured (control-subtracted unless named) | graded items: value vs expected [source] | verdict | gap · owner |');
  console.log('|---|---|---|---|---|---|---|');
  for (const id of ids) {
    const r = s[id];
    if (!r) { console.log(`| ${id} | | (not in store) | | | | |`); continue; }
    seen.add(id);
    const v = Object.entries(r.values).filter(([k]) => k !== 'events').map(([k, x]) => `${k} ${typeof x === 'number' ? x : String(x)}`).join('; ');
    const n = r.notes.map((x) => esc(x.replace(/^(PL|TW|TS|WR|MI|IN|NE|NM) /, (m0) => `${m0.trim()}: `))).join('<br>');
    const flag = `${r.fu4 ? ' (FU-4 pending)' : ''}${r.known ? ` (${r.known} pending)` : ''}`;
    console.log(`| ${id} | ${r.tier} | ${esc(r.ctx)} · ${esc(r.state)} → ${esc(r.intv)} | ${esc(v) || '—'} | ${n} | **${r.verdict}**${flag} | ${GAP[id] ?? '—'} · ${esc(r.owner)} |`);
  }
}
const rest = Object.keys(s).filter((i) => !seen.has(i));
if (rest.length) console.log(`\n<!-- not placed: ${rest.join(' ')} -->`);
