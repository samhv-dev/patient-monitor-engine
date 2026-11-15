// Brief 194 (b): what the e2e tests left open when they ended (apps/demo/e2e/evidence.ts writes one JSON line per test
// that left a browser context or page open, into PME_E2E_LEAK_LOG; the fixture then closes them unless
// PME_E2E_LEAKS=keep). Prints the totals and the files that left the most, for the e2e job's log and summary:
//   node scripts/ci/e2e-leaks.mjs <dir>
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv[2];
const rows = dir && existsSync(dir)
  ? readdirSync(dir).filter((f) => f.endsWith('.jsonl')).flatMap((f) => readFileSync(join(dir, f), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)))
  : [];
const sum = (a, k) => a.reduce((n, r) => n + (r[k] ?? 0), 0);
const byFile = new Map();
for (const r of rows) {
  const e = byFile.get(r.file) ?? { tests: 0, contexts: 0, pages: 0, failed: 0 };
  e.tests++;
  e.contexts += r.contexts;
  e.pages += r.pages;
  if (r.status !== 'passed') e.failed++;
  byFile.set(r.file, e);
}
console.log(`tests that left a context or page open: ${rows.length} (attempts that failed among them: ${rows.filter((r) => r.status !== 'passed').length}); contexts ${sum(rows, 'contexts')}, pages ${sum(rows, 'pages')}; most open in one worker at a test's end: ${Math.max(0, ...rows.map((r) => r.openInWorker ?? 0))}; ${rows.some((r) => r.closed === false) ? 'LEFT OPEN (PME_E2E_LEAKS=keep)' : 'all closed by the fixture'}`);
for (const [f, e] of [...byFile].sort((a, b) => b[1].contexts + b[1].pages - (a[1].contexts + a[1].pages)).slice(0, 15))
  console.log(`  ${f}: ${e.tests} tests, ${e.contexts} contexts, ${e.pages} pages${e.failed ? ` (${e.failed} in failed attempts)` : ''}`);
