// Prints the run's results tables (research/12 §4 format) from out/cells.json, grouped by family, with the gap id of
// research 15 §3 (N1–Nn) per cell. Copied from research/22-audit-scripts/report.ts (run BF).
// Usage: node --experimental-strip-types report.ts > out/matrix.md
import { readFileSync } from 'node:fs';
type Rec = { id: string; verdict: string; tier: string; ctx: string; state: string; intv: string; owner: string; known?: string; values: Record<string, unknown>; notes: string[] };
const s = JSON.parse(readFileSync(new URL('./out/cells.json', import.meta.url), 'utf8')) as Record<string, Rec>;
export const FAM: [string, string[]][] = [
  ['2.1 Neuromuscular block: onset, duration, succinylcholine (P1)', ['NN-01a', 'NN-01b', 'NN-02', 'NN-03a', 'NN-03b', 'NN-03c', 'NN-04a', 'NN-04b', 'NN-09']],
  ['2.2 Reversal: sugammadex and neostigmine (P1)', ['NN-05a', 'NN-05b', 'NN-05c', 'NN-06a', 'NN-06b']],
  ['2.3 Depth, consciousness and movement (P1)', ['NN-15a', 'NN-15b', 'NN-15c', 'NN-16a', 'NN-16b', 'NN-16c', 'NN-17a', 'NN-17b', 'NN-18a', 'NN-18b', 'NN-18c', 'NN-21a', 'NN-21b']],
  ['2.4 Opioid reversal (P1)', ['NN-23a', 'NN-23b']],
  ['2.5 Brain: TBI, ICP treatment, CBF regulation (P1)', ['NN-25a', 'NN-25b', 'NN-25c', 'NN-26a', 'NN-26b', 'NN-26c', 'NN-26d', 'NN-26e', 'NN-26f', 'NN-26g', 'NN-27a', 'NN-27b']],
  ['2.6 NMB P2/P3: residual block, interactions, neuromuscular disease', ['NN-07', 'NN-08a', 'NN-08b', 'NN-10', 'NN-11a', 'NN-11b', 'NN-12', 'NN-13a', 'NN-13b', 'NN-14']],
  ['2.7 Sedation, awareness and benzodiazepine reversal (P2)', ['NN-19a', 'NN-19b', 'NN-19c', 'NN-20a', 'NN-20b', 'NN-22a', 'NN-22b', 'NN-24']],
  ['2.8 Brain P2/P3: gases, arrest, LAST, seizures, rigidity', ['NN-28a', 'NN-28b', 'NN-29a', 'NN-29b', 'NN-30a', 'NN-30b', 'NN-30c', 'NN-31', 'NN-32']],
  ['2.9 MANUAL twins (direction-only; Q9 open)', ['NN-M1', 'NN-M2', 'NN-M3']],
];
export const GAP: Record<string, string> = {};
const put = (g: string, ids: string[]) => { for (const i of ids) GAP[i] = GAP[i] ? `${GAP[i]}, ${g}` : g; };
// gap ids of §3 (filled from the graded store)
put('N1', ['NN-17a']);
put('N2', ['NN-20a', 'NN-20b']);
put('N3', ['NN-19c']);
put('N4', ['NN-06a', 'NN-07']);
put('N5', ['NN-02', 'NN-04a', 'NN-05b', 'NN-05c']);
put('N6', ['NN-23a', 'NN-23b']);
put('N7', ['NN-15b', 'NN-15c']);
put('N8', ['NN-21a']);
put('N9', ['NN-25c']);
put('N10', ['NN-26f']);
put('N11', ['NN-26g']);
put('N12', ['NN-30a', 'NN-30b', 'NN-31']);
put('N13', ['NN-14', 'NN-03a']);
put('N14', ['NN-25b']);
put('N15', ['NN-08b', 'NN-28b']);
put('N16', ['NN-31', 'NN-32']);
put('owned', ['NN-08a', 'NN-08b', 'NN-09', 'NN-10', 'NN-19a', 'NN-19b', 'NN-23a', 'NN-24']);
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
    const flag = r.known ? ` (${r.known} pending)` : '';
    console.log(`| ${id} | ${r.tier} | ${esc(r.ctx)} · ${esc(r.state)} → ${esc(r.intv)} | ${esc(v) || '—'} | ${n} | **${r.verdict}**${flag} | ${GAP[id] ?? '—'} · ${esc(r.owner)} |`);
  }
}
const rest = Object.keys(s).filter((i) => !seen.has(i));
if (rest.length) console.log(`\n<!-- not placed: ${rest.join(' ')} -->`);
