// Prints the run's results tables (research/12 §4 format) from out/cells.json, grouped by family, with the gap id of
// research/14 §3 (D1–D15) per cell. Usage: node report.ts > out/matrix.md
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
type Rec = { id: string; verdict: string; tier: string; ctx: string; state: string; intv: string; owner: string; fu4?: boolean; known?: string; values: Record<string, unknown>; notes: string[] };
const s = JSON.parse(readFileSync(join(process.env.PME_AUDIT_OUT ?? fileURLToPath(new URL('../../.audit-drugs', import.meta.url)), 'cells.json'), 'utf8')) as Record<string, Rec>;
const FAM: [string, string[]][] = [
  ['2.1 Induction agents × comorbidity (MODELED)', ['DI-01a', 'DI-46', 'DI-47', 'DI-48', 'DI-49', 'DI-36', 'DI-79', 'DI-78', 'DI-22', 'DI-80', 'DI-66', 'DI-32', 'DI-81', 'DI-82', 'DI-21', 'DI-31', 'DI-07', 'DI-06']],
  ['2.2 Hypnotic × opioid × benzodiazepine × volatile: depth, drive, MAP', ['DI-01b', 'DI-01c', 'DI-01d', 'DI-02', 'DI-03', 'DI-77', 'DI-89', 'DI-30', 'DI-43']],
  ['2.3 Neuromuscular block: volatile potentiation, reversal, Mg/Ca, succinylcholine hazards', ['DI-50', 'DI-51', 'DI-17', 'DI-52', 'DI-29', 'DI-45', 'DI-53', 'DI-25', 'DI-90', 'DI-37a', 'DI-37b', 'DI-37c', 'DI-37d']],
  ['2.4 Vasopressors and inotropes × β-blockade × volatile × acidosis × sepsis; stimulus', ['DI-04a', 'DI-04b', 'DI-04c', 'DI-05', 'DI-55', 'DI-56', 'DI-57', 'DI-09', 'DI-10', 'DI-83', 'DI-12', 'DI-11', 'DI-41', 'DI-08']],
  ['2.5 Vasodilators × preload-dependent states; histamine; α2', ['DI-33', 'DI-34', 'DI-58', 'DI-59', 'DI-42', 'DI-60', 'DI-35']],
  ['2.6 Antiarrhythmics, anticholinergics and rhythm', ['DI-13a', 'DI-13b', 'DI-14a', 'DI-14b', 'DI-14c', 'DI-61', 'DI-54', 'DI-18', 'DI-62', 'DI-63', 'DI-15', 'DI-16']],
  ['2.7 LAST, electrolytes, metabolic, MH, bronchospasm, brain, kidney', ['DI-23', 'DI-24', 'DI-26', 'DI-27', 'DI-28', 'DI-64', 'DI-65', 'DI-40', 'DI-39', 'DI-38']],
  ['2.8 Disposition: TCI and flow, CSHT, onset/offset, antagonists, volatiles, placeholders', ['DI-84', 'DI-67', 'DI-44', 'DI-85', 'DI-86', 'DI-68', 'DI-88', 'DI-69', 'DI-71', 'DI-72', 'DI-87', 'DI-70', 'DI-19', 'DI-20', 'DI-73', 'DI-74', 'DI-75', 'DI-76']],
  ['2.9 MANUAL subset (direction-only; Q9 open)', ['DI-M1', 'DI-M2', 'DI-M3', 'DI-M4']],
];
const GAP: Record<string, string> = {};
const put = (g: string, ids: string[]) => { for (const i of ids) GAP[i] = GAP[i] ? `${GAP[i]}, ${g}` : g; };
put('D1', ['DI-01a', 'DI-46', 'DI-47', 'DI-48', 'DI-49', 'DI-36', 'DI-34', 'DI-78', 'DI-79', 'DI-01c', 'DI-60', 'DI-M1', 'DI-M2', 'DI-M3', 'DI-31']);
put('D2', ['DI-69', 'DI-71', 'DI-72', 'DI-88', 'DI-63', 'DI-17']);
put('D3', ['DI-69']);
put('D4', ['DI-04a', 'DI-05', 'DI-41', 'DI-04c']);
put('D5', ['DI-01b', 'DI-62', 'DI-17']);
put('D6', ['DI-37a', 'DI-37b', 'DI-37c', 'DI-26']);
put('D7', ['DI-13a', 'DI-61', 'DI-14c', 'DI-15']);
put('D8', ['DI-08']);
put('D9', ['DI-21']);
put('D10', ['DI-03', 'DI-01d', 'DI-89', 'DI-71']);
put('D11', ['DI-66', 'DI-84', 'DI-22']);
put('D12', ['DI-25', 'DI-90']);
put('D13', ['DI-19', 'DI-70', 'DI-51']);
put('D14', ['DI-23']);
put('D15', ['DI-42', 'DI-45', 'DI-76', 'DI-73', 'DI-74', 'DI-75', 'DI-12', 'DI-32', 'DI-11', 'DI-33', 'DI-07', 'DI-40', 'DI-10', 'DI-M4', 'DI-57', 'DI-52']);
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
