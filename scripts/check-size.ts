// IIFE size budget (BUILD-PLAN Stage 8 acceptance 4: "the IIFE is ≤ 400 KB gzipped including templates" [ENG]).
// Measures packages/renderer/dist/patient-monitor.iife.js (build first) at gzip level 9 and fails above the budget.
// Also fails when a `.wasm` file is tracked by git or sits in a distribution folder (packages/*/dist,
// apps/demo/dist/embed): the Pulse wasm is never committed or distributed (NOTICES N-062, N-084).
// Usage: pnpm check-size            (exit 1 over budget, on a .wasm, or when the file is missing)
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { brotliCompressSync, gzipSync } from 'node:zlib';

export const IIFE_PATH = 'packages/renderer/dist/patient-monitor.iife.js';
/** 400 KB = 400 × 1024 bytes, gzip -9. */
export const GZIP_BUDGET_BYTES = 400 * 1024;

export interface SizeReport {
  raw: number;
  gzip: number;
  brotli: number;
}

export function measure(bytes: Uint8Array): SizeReport {
  return { raw: bytes.length, gzip: gzipSync(bytes, { level: 9 }).length, brotli: brotliCompressSync(bytes).length };
}

/** Problems for a size report; empty = within budget. */
export function checkSize(r: SizeReport, budget = GZIP_BUDGET_BYTES): string[] {
  return r.gzip > budget ? [`patient-monitor.iife.js is ${(r.gzip / 1024).toFixed(1)} KB gzipped, over the ${(budget / 1024).toFixed(0)} KB budget`] : [];
}

/** `.wasm` files among the git-tracked paths or under a distribution folder of `root` (repo-relative, sorted). */
export function findWasm(root: string, tracked: string[]): string[] {
  const walk = (d: string): string[] =>
    existsSync(join(root, d)) ? readdirSync(join(root, d), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)])) : [];
  const pkgs = existsSync(join(root, 'packages')) ? readdirSync(join(root, 'packages')) : [];
  const dist = [...pkgs.map((p) => join('packages', p, 'dist')), join('apps', 'demo', 'dist', 'embed')].flatMap(walk);
  return [...new Set([...tracked, ...dist])].filter((f) => f.endsWith('.wasm')).sort();
}

const invokedDirectly = process.argv[1] !== undefined && resolve(process.argv[1]) === resolve(import.meta.filename);
if (invokedDirectly) {
  const root = resolve(import.meta.dirname, '..');
  const tracked = execFileSync('git', ['ls-files', '*.wasm'], { cwd: root, encoding: 'utf8' }).split('\n').filter(Boolean);
  const wasm = findWasm(root, tracked);
  for (const w of wasm) console.error(`check-size: ${w} — no .wasm may be committed or distributed (NOTICES N-062, N-084)`);
  const file = resolve(root, IIFE_PATH);
  if (!existsSync(file)) {
    console.error(`check-size: ${IIFE_PATH} is missing (run pnpm build first)`);
    process.exit(1);
  }
  const r = measure(readFileSync(file));
  const kb = (n: number) => `${(n / 1024).toFixed(1)} KB`;
  const problems = checkSize(r);
  for (const p of problems) console.error(`check-size: ${p}`);
  if (wasm.length > 0) process.exit(1);
  if (problems.length > 0) process.exit(1);
  console.log(`check-size: OK — patient-monitor.iife.js ${kb(r.raw)} raw, ${kb(r.gzip)} gzip -9, ${kb(r.brotli)} brotli (budget ${kb(GZIP_BUDGET_BYTES)} gzip)`);
}
