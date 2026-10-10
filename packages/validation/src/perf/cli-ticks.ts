// Entry-only: pnpm --filter @pme/validation perf:ticks [--seconds 600] → docs/validation/perf/ticks.json
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { overBudget, tickBench } from './tick-bench.ts';

const i = process.argv.indexOf('--seconds');
// FU-11 (F10): `--budget-ms <p99>` makes this a gate: the run fails (exit 1) when the tick p99 is over the budget. It is a
// MANUAL release check (8b's checklist runs it on an idle machine); CI does not run it — its runners share cores.
const b = process.argv.indexOf('--budget-ms');
const budget = b >= 0 ? Number(process.argv[b + 1]) : null;
const s = await tickBench(i >= 0 ? Number(process.argv[i + 1]) : 600);
const dir = fileURLToPath(new URL('../../../../docs/validation/perf', import.meta.url));
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, 'ticks.json'), `${JSON.stringify({ node: process.version, platform: `${process.platform}-${process.arch}`, date: new Date().toISOString(), ...s }, null, 1)}\n`);
console.log(JSON.stringify(s));
const over = overBudget(s, budget);
if (over) {
  console.error(over);
  process.exitCode = 1;
}
