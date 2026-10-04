// Prints the run's results tables (research/12 §4 format) from out/cells.json, grouped by family, with the gap id of
// research/19 §3 (C1–C12) per cell. Usage: node report.ts > out/matrix.md
import { readFileSync } from 'node:fs';
type Rec = { id: string; verdict: string; tier: string; ctx: string; state: string; intv: string; owner: string; fu4?: boolean; known?: string; values: Record<string, unknown>; notes: string[] };
const s = JSON.parse(readFileSync(new URL('./out/cells.json', import.meta.url), 'utf8')) as Record<string, Rec>;
const FAM: [string, string[]][] = [
  ['2.1 Elderly 80 y (CM-01)', ['CM-01a', 'CM-01b', 'CM-01c', 'CM-01d', 'CM-01e', 'CM-01f', 'CM-M1']],
  ['2.2 Obesity BMI 41 (CM-02)', ['CM-02a', 'CM-02b', 'CM-02c', 'CM-02d', 'CM-02e']],
  ['2.3 Hypertension (CM-03)', ['CM-03a', 'CM-03b', 'CM-03c', 'CM-03d']],
  ['2.4 Coronary artery disease (CM-04)', ['CM-04a', 'CM-04b', 'CM-04c', 'CM-04d']],
  ['2.5 Severe aortic stenosis + CAD + HTN (CM-05)', ['CM-05a', 'CM-05b', 'CM-05c', 'CM-05d', 'CM-M2']],
  ['2.6 HFrEF (CM-06)', ['CM-06a', 'CM-06b', 'CM-06c', 'CM-06d', 'CM-06e', 'CM-M3']],
  ['2.7 COPD, asthma, OSA (CM-07, CM-11, CM-12)', ['CM-07a', 'CM-07b', 'CM-07c', 'CM-07d', 'CM-07e', 'CM-11a', 'CM-11b', 'CM-12a', 'CM-12b']],
  ['2.8 Pulmonary hypertension, mitral stenosis, AF, pacemaker (CM-13 to CM-16)', ['CM-13a', 'CM-13b', 'CM-13c', 'CM-13d', 'CM-14a', 'CM-14b', 'CM-14c', 'CM-15a', 'CM-15b', 'CM-15c', 'CM-16a', 'CM-16b']],
  ['2.9 Renal, diabetes, liver, smoker, anaemia (CM-08, 09, 10, 17, 18)', ['CM-08a', 'CM-08b', 'CM-08c', 'CM-08d', 'CM-08e', 'CM-09a', 'CM-09b', 'CM-09c', 'CM-09d', 'CM-10a', 'CM-10b', 'CM-10c', 'CM-10d', 'CM-10e', 'CM-17', 'CM-18a', 'CM-18b']],
];
const GAP: Record<string, string> = {};
const put = (g: string, ids: string[]) => { for (const i of ids) GAP[i] = GAP[i] ? `${GAP[i]}, ${g}` : g; };
put('C1', ['CM-01b', 'CM-03b', 'CM-05a', 'CM-05d', 'CM-06b', 'CM-13a', 'CM-M1', 'CM-M2', 'CM-M3']);
put('C2', ['CM-04a', 'CM-04c', 'CM-05a', 'CM-05c', 'CM-05d']);
put('C3', ['CM-15b', 'CM-15c', 'CM-05b', 'CM-15a']);
put('C4', ['CM-02a', 'CM-02b', 'CM-02d']);
put('C5', ['CM-01a', 'CM-03a', 'CM-06a']);
put('C6', ['CM-01a', 'CM-01f']);
put('C7', ['CM-07a', 'CM-07c', 'CM-07e']);
put('C8', ['CM-13a', 'CM-13b', 'CM-13c', 'CM-13d']);
put('C9', ['CM-06c', 'CM-06e', 'CM-14b']);
put('C10', ['CM-08e', 'CM-09a', 'CM-09b', 'CM-09d', 'CM-10a', 'CM-10b', 'CM-11a', 'CM-12a', 'CM-12b', 'CM-02e']);
put('C11', ['CM-11b', 'CM-10c', 'CM-10d', 'CM-10e', 'CM-08c', 'CM-01e', 'CM-03c']);
put('C12', ['CM-16a', 'CM-16b']);
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
