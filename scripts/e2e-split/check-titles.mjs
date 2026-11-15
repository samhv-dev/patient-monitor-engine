// Proof that splitting an e2e file lost no test (brief 219: app-accessibility.e2e.ts became one file per area). The
// committed list (accessibility-titles.tsv) is every test of the old file as `playwright test --list` named it, one
// "project<TAB>title" row each, taken on the tree before the split. This lists the same projects again and checks that
// every row of the list exists EXACTLY ONCE among the files whose path matches the filter. A test added after the split
// is printed as new and does not fail the check; a missing or doubled one does.
//   node scripts/e2e-split/check-titles.mjs write <list.tsv> <file filter>   (before the split: write the list)
//   node scripts/e2e-split/check-titles.mjs check <list.tsv> <file filter>   (after it: exit 1 on any difference)
// e.g. node scripts/e2e-split/check-titles.mjs check scripts/e2e-split/accessibility-titles.tsv app-accessibility
// Run it from the repository root, through the slot helper (it runs Playwright's --list; no browser starts).
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const [mode, listFile, filter] = process.argv.slice(2);
if (!['write', 'check'].includes(mode) || !listFile || !filter) {
  console.error('usage: check-titles.mjs write|check <list.tsv> <file filter>');
  process.exit(2);
}
const l = spawnSync('pnpm', ['exec', 'playwright', 'test', '--list', filter], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });
if (l.status !== 0) process.exit(l.status ?? 1);
// "  [chromium] › app-accessibility-views.e2e.ts:17:3 › accessibility: laptop 1280×800"
const rows = [...l.stdout.matchAll(/^\s*\[([^\]]+)\] › (\S+?):\d+:\d+ › (.+)$/gm)].map(([, project, file, title]) => ({ project, file, title }));
const key = (r) => `${r.project}\t${r.title}`;
if (mode === 'write') {
  writeFileSync(listFile, rows.map(key).join('\n') + '\n');
  console.log(`${rows.length} tests written to ${listFile} (${new Set(rows.map((r) => r.file)).size} file(s))`);
  process.exit(0);
}
const before = readFileSync(listFile, 'utf8').split('\n').filter(Boolean);
const now = new Map();
for (const r of rows) now.set(key(r), [...(now.get(key(r)) ?? []), r.file]);
let bad = 0;
for (const k of before) {
  const files = now.get(k) ?? [];
  if (files.length !== 1) {
    bad++;
    console.log(`${files.length === 0 ? 'MISSING' : `FOUND ${files.length} TIMES`}\t${k}${files.length ? `\t${files.join(', ')}` : ''}`);
  }
}
const listed = new Set(before);
for (const r of rows) if (!listed.has(key(r))) console.log(`new (not in the list)\t${key(r)}\t${r.file}`);
const perFile = new Map();
for (const r of rows) if (listed.has(key(r))) perFile.set(r.file, (perFile.get(r.file) ?? 0) + 1);
for (const [f, n] of [...perFile].sort()) console.log(`${f}\t${n}`);
console.log(`before: ${before.length} tests; now: ${rows.filter((r) => listed.has(key(r))).length} of them across ${perFile.size} file(s), ${bad} missing or doubled`);
process.exit(bad ? 1 : 0);
