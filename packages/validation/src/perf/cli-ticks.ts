// Entry-only: pnpm --filter @pme/validation perf:ticks [--seconds 600] → docs/validation/perf/ticks.json
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tickBench } from './tick-bench.ts';

const i = process.argv.indexOf('--seconds');
const s = await tickBench(i >= 0 ? Number(process.argv[i + 1]) : 600);
const dir = fileURLToPath(new URL('../../../../docs/validation/perf', import.meta.url));
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, 'ticks.json'), `${JSON.stringify({ node: process.version, platform: `${process.platform}-${process.arch}`, date: new Date().toISOString(), ...s }, null, 1)}\n`);
console.log(JSON.stringify(s));
