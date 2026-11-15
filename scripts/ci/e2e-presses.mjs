// The plain presses the e2e tests made that could get no click (apps/demo/e2e/evidence.ts writes one JSON line per
// press into PME_E2E_PRESS_LOG: its pressed node was taken out of the page before the release, or the release landed on
// another node). Prints the count and every press, by test, for the e2e job's log and summary:
//   node scripts/ci/e2e-presses.mjs <dir>
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv[2];
const rows = dir && existsSync(dir)
  ? readdirSync(dir).filter((f) => f.endsWith('.jsonl')).flatMap((f) => readFileSync(join(dir, f), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)))
  : [];
const tests = new Map();
for (const r of rows) {
  const k = `${r.file} › ${r.title} [${r.project}${r.retry ? ` retry ${r.retry}` : ''}, ${r.status}]`;
  tests.set(k, [...(tests.get(k) ?? []), r]);
}
console.log(`presses that could get no click: ${rows.length}, in ${tests.size} test attempts`);
for (const [k, rs] of tests) {
  console.log(`  ${k}`);
  for (const r of rs) console.log(`    ${r.how}: pressed ${r.down}, released ${r.up} after ${r.heldMs} ms (${r.url.replace(/^https?:\/\/[^/]+/, '')})`);
}
