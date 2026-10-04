// Coverage run DI — CLI. Runs each cell's arms (seed 7, pinned commit), grades them and writes out/cells.json (one
// record per cell) plus out/matrix.md (the run's rows in research/12 §4 format). No raw row dumps are committed.
// Rerun:
//   git -C <repo> worktree add --detach <wt> origin/main && (cd <wt> && npx -y pnpm@9.15.9 install --frozen-lockfile)
//   PME_ENGINE=<wt>/packages/engine-core/src/index.ts node --import ./hooks.mjs --experimental-strip-types cli.ts all
//   node --experimental-strip-types report.ts > out/matrix.md   (and ledger.ts > out/ledger.md)
// Arms are cached per cell in out/cells.json, so `cli.ts DI-13` re-runs one cell only.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runArm, type ArmResult } from './runner.ts';
import { CELLS } from './spec.ts';
import './cells-a.ts';
import './cells-b.ts';
import './cells-c.ts';
import './cells-d.ts';
import './cells-e.ts';
import './cells-f.ts';
import './cells-g.ts';
import { grade, type Graded } from './grade.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = process.env.PME_AUDIT_OUT ?? join(HERE, '../../.audit-drugs');
mkdirSync(OUT, { recursive: true });
const FILE = process.env.DI_OUT ?? join(OUT, 'cells.json'); // DI_OUT: a separate store for a concurrent partial run (merge.ts folds it in)
let store: Record<string, Graded & { tier: string; ctx: string; state: string; intv: string; sys: string; owner: string; fu4?: boolean; known?: string }> = {};
try { store = JSON.parse(readFileSync(FILE, 'utf8')) as typeof store; } catch { /* first run */ }

const sel = process.argv.slice(2);
const pick = CELLS.filter((c) => (sel.includes('new') ? store[c.id] === undefined : sel.length === 0 || sel.includes('all') || sel.some((p) => c.id === p || c.id.startsWith(p))));
console.log(`# ${pick.length} of ${CELLS.length} cells`);
for (const cell of pick) {
  const t0 = Date.now();
  let values: Record<string, number | boolean | string> = {};
  let rejected: string[] = [];
  if (!cell.ne) {
    const R: Record<string, ArmResult> = {};
    for (const [name, arm] of Object.entries(cell.arms)) {
      R[name] = await runArm(arm);
      rejected = rejected.concat(R[name]!.rejected);
    }
    try { values = cell.measure ? cell.measure(R) : {}; } catch (err) { values = { error: String(err) }; }
    const ev: string[] = [];
    for (const [n, r] of Object.entries(R)) {
      if (r.rhythms.length > 1) ev.push(`${n}:${r.rhythms.map(([t, id]) => `${t}s ${id}`).join('→')}`);
      const marks = r.marks.filter(([, k]) => k !== 'breathing');
      if (marks.length) ev.push(`${n}:${[...new Set(marks.map(([t, k]) => `${t}s ${k}`))].slice(0, 8).join(',')}`);
    }
    if (ev.length) values.events = ev.join(' | ');
  }
  const g = grade(cell, values, rejected);
  store[cell.id] = { ...g, tier: cell.tier, ctx: cell.ctx, state: cell.state, intv: cell.intv, sys: cell.sys, owner: cell.owner, ...(cell.fu4 ? { fu4: true } : {}), ...(cell.known ? { known: cell.known } : {}) };
  writeFileSync(FILE, JSON.stringify(store, null, 1));
  console.log(`\n== ${cell.id} [${cell.tier}] ${g.verdict}  ${cell.ctx} · ${cell.state} · ${cell.intv}  (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  console.log(`   ${JSON.stringify(values)}`);
  for (const n of g.notes) console.log(`   ${n}`);
}
const counts: Record<string, number> = {};
for (const g of Object.values(store)) counts[g.verdict] = (counts[g.verdict] ?? 0) + 1;
console.log(`\n# verdicts so far: ${JSON.stringify(counts)}`);
