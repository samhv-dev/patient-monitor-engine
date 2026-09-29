// Physiology integration audit (research/08-physiology-integration-audit.md; FU-4 Task 1). From the repo root:
//   npx -y pnpm@9.15.9 run audit:physiology              → every scenario (≈ 5–8 min), then the matrix and the arrest table
//   npx -y pnpm@9.15.9 run audit:physiology B7 C4 X1     → the named scenarios / prefixes only, then the arrest table
// Raw per-scenario JSON goes to $PME_AUDIT_OUT (default <repo>/.audit-physiology/results, git-ignored); tables print to
// stdout. PME_ENGINE=<path to engine-core/src/index.ts> audits another tree. Each scenario yields once per sim-minute.
// Node ≥ 22.15 (module.registerHooks in hooks.mjs: engine-core imports skin JSON without an import attribute).
import { SCENARIOS } from './scenarios.ts';
import { extremes, run, save, table } from './runner.ts';
import { arrests, matrix } from './report.ts';

const sel = process.argv.slice(2);
const all = sel.length === 0 || sel.includes('all');
const pick = SCENARIOS.filter((s) => all || sel.some((p) => s.name === p || s.name.startsWith(p)));
for (const sc of pick) {
  const t0 = Date.now();
  const { rows, log } = await run(sc);
  save(sc, rows, log);
  console.log(`\n=== ${sc.name} — ${sc.title} (${sc.mode}) [${((Date.now() - t0) / 1000).toFixed(1)} s wall]`);
  console.log(log.filter((l) => !l.includes('airwayDevice') && !l.startsWith('1s')).join('\n'));
  console.log(table(sc, rows));
  const firstT = Math.min(...sc.steps.map((s) => s[0]).filter((t) => t > 1), sc.tEnd);
  console.log('extremes after first intervention:', JSON.stringify(extremes(rows, firstT, sc.tEnd)));
}
if (all) console.log(`\n## Propofol state-dependence (audit §K)\n${matrix()}`);
console.log(`\n## Arrests\n${arrests(all ? [] : sel)}`);
