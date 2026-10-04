// Prints the run's results tables (research/12 §4 format) from out/cells.json, grouped by family, with the gap id of
// research/13 §3 (H1–Hn) per cell. Usage: node --experimental-strip-types report.ts > out/matrix.md
import { readFileSync } from 'node:fs';
type Rec = { id: string; verdict: string; tier: string; ctx: string; state: string; intv: string; owner: string; fu4?: boolean; known?: string; values: Record<string, unknown>; notes: string[] };
const s = JSON.parse(readFileSync(new URL('./out/cells.json', import.meta.url), 'utf8')) as Record<string, Rec>;
export const FAM: [string, string[]][] = [
  ['2.1 The kidney at rest and under GA (P1)', ['RH-01a', 'RH-01b', 'RH-01c', 'RH-M1']],
  ['2.2 Haemorrhage and resuscitation (P1)', ['RH-02a', 'RH-02b', 'RH-02c', 'RH-03a', 'RH-03b', 'RH-21', 'RH-M2']],
  ['2.3 Pressure, output and the kidney (P1; RH-27 P2)', ['RH-04a', 'RH-04b', 'RH-05a', 'RH-05b', 'RH-27a', 'RH-27b']],
  ['2.4 Drug disposition in shock and hepatic flow under a volatile (P1)', ['RH-15a', 'RH-15b', 'RH-16']],
  ['2.5 Intra-abdominal pressure and PEEP (P2)', ['RH-06a', 'RH-06b', 'RH-06c', 'RH-06d', 'RH-26a', 'RH-26b']],
  ['2.6 Diuretics, osmotherapy and sodium loads (P2)', ['RH-07a', 'RH-07b', 'RH-07c', 'RH-08a', 'RH-08b', 'RH-08c', 'RH-23a', 'RH-23b', 'RH-23c', 'RH-25a', 'RH-25b']],
  ['2.7 Renal failure, sepsis and vasopressors (P2)', ['RH-09a', 'RH-09b', 'RH-10a', 'RH-10b', 'RH-10c', 'RH-11', 'RH-17a', 'RH-22a', 'RH-22b']],
  ['2.8 Liver failure, sepsis lactate and hypothermia (P2)', ['RH-12a', 'RH-12b', 'RH-12c', 'RH-12d', 'RH-12e', 'RH-13', 'RH-14a', 'RH-14b', 'RH-17b', 'RH-20a', 'RH-20b', 'RH-20c']],
  ['2.9 Not expressible (P2/P3)', ['RH-18', 'RH-19', 'RH-24a', 'RH-24b']],
];
export const GAP: Record<string, string> = {};
const put = (g: string, ids: string[]) => { for (const i of ids) GAP[i] = GAP[i] ? `${GAP[i]}, ${g}` : g; };
// gap ids of §3 (filled from the graded store)
const GAPS: Record<string, string[]> = JSON.parse(readFileSync(new URL('./gaps.json', import.meta.url), 'utf8')) as Record<string, string[]>;
for (const [g, ids] of Object.entries(GAPS)) put(g, ids);
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
    const v = Object.entries(r.values).filter(([k, x]) => k !== 'events' && x !== null).map(([k, x]) => `${k} ${typeof x === 'number' ? x : String(x)}`).join('; ');
    const n = r.notes.map((x) => esc(x.replace(/^(PL|TW|TS|WR|MI|IN|NE|NM) /, (m0) => `${m0.trim()}: `))).join('<br>');
    const flag = `${r.fu4 ? ' (FU-4 pending)' : ''}${r.known ? ` (${r.known} pending)` : ''}`;
    console.log(`| ${id} | ${r.tier} | ${esc(r.ctx)} · ${esc(r.state)} → ${esc(r.intv)} | ${esc(v) || '—'} | ${n} | **${r.verdict}**${flag} | ${GAP[id] ?? '—'} · ${esc(r.owner)} |`);
  }
}
const rest = Object.keys(s).filter((i) => !seen.has(i));
if (rest.length) console.log(`\n<!-- not placed: ${rest.join(' ')} -->`);
