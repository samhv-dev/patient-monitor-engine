// Coverage run NN — CLI. Runs each cell's arms (seed 7, this branch's engine source, read-only), grades them and writes
// out/cells.json (one record per cell, no raw rows). Arms shared by several cells run once per process (cache).
// Rerun (from this directory, after `npx -y pnpm@9.15.9 install --frozen-lockfile` at the repo root):
//   node --import ./hooks.mjs --experimental-strip-types cli.ts P1        (a tier, an id prefix, `all`, or `new`)
//   node --experimental-strip-types report.ts > out/matrix.md && node --experimental-strip-types ledger.ts > out/ledger.md
// PME_ENGINE=<path to packages/engine-core/src/index.ts> points it at another worktree; NN_OUT=<file> writes a
// separate store for a concurrent partial run (merge.ts folds it in).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runArm, type Arm, type ArmResult } from './runner.ts';
import { CELLS } from './spec.ts';
import './cells-a.ts';
import './cells-b.ts';
import './cells-c.ts';
import './cells-m.ts';
import { grade, type Graded } from './grade.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, 'out');
mkdirSync(OUT, { recursive: true });
const FILE = process.env.NN_OUT ?? join(OUT, 'cells.json');
type Rec = Graded & { tier: string; ctx: string; state: string; intv: string; sys: string; owner: string; known?: string; dirOnly?: boolean; wallS?: number };
let store: Record<string, Rec> = {};
try { store = JSON.parse(readFileSync(FILE, 'utf8')) as typeof store; } catch { /* first run */ }

const sel = process.argv.slice(2);
const pick = CELLS.filter((c) => (sel.includes('new') ? store[c.id] === undefined
  : sel.length === 0 || sel.includes('all') || sel.some((p) => p === c.tier || c.id === p || c.id.startsWith(p))));
console.log(`# ${pick.length} of ${CELLS.length} cells`);
const cache = new Map<string, Promise<ArmResult>>();
const run = (a: Arm): Promise<ArmResult> => { const k = JSON.stringify(a); if (!cache.has(k)) cache.set(k, runArm(a)); return cache.get(k)!; };
for (const cell of pick) {
  const t0 = Date.now();
  let values: Record<string, number | boolean | string> = {};
  let rejected: string[] = [];
  if (Object.keys(cell.arms).length) {
    const R: Record<string, ArmResult> = {};
    for (const [name, arm] of Object.entries(cell.arms)) {
      R[name] = await run(arm);
      rejected = rejected.concat(R[name]!.rejected);
    }
    try { values = cell.measure ? cell.measure(R) : {}; } catch (err) { values = { error: String(err) }; }
    const ev: string[] = [];
    for (const [n, r] of Object.entries(R)) if (r.rhythms.length > 1) ev.push(`${n}:${r.rhythms.map(([t, id]) => `${t}s ${id}`).slice(0, 6).join('→')}`);
    if (ev.length) values.events = ev.join(' | ');
  }
  const g = grade(cell, values, rejected);
  store[cell.id] = { ...g, tier: cell.tier, ctx: cell.ctx, state: cell.state, intv: cell.intv, sys: cell.sys, owner: cell.owner,
    ...(cell.known ? { known: cell.known } : {}), ...(cell.dirOnly ? { dirOnly: true } : {}), wallS: Math.round((Date.now() - t0) / 100) / 10 };
  writeFileSync(FILE, JSON.stringify(store, null, 1));
  console.log(`\n== ${cell.id} [${cell.tier}] ${g.verdict}${g.auto !== g.verdict ? ` (auto ${g.auto})` : ''}  ${cell.ctx} · ${cell.state} · ${cell.intv}  (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  console.log(`   ${JSON.stringify(values)}`);
  for (const n of g.notes) console.log(`   ${n}`);
}
const counts: Record<string, number> = {};
for (const g of Object.values(store)) counts[g.verdict] = (counts[g.verdict] ?? 0) + 1;
console.log(`\n# verdicts so far (${Object.keys(store).length} cells): ${JSON.stringify(counts)}`);
