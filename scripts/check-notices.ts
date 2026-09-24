// Enforces the NOTICES rule (brief §8): every file under packages/*/src/vendor/** and
// packages/engine-core/templates/** must start with a `NOTICE-ID: N-###` header whose ID is a row in NOTICES.md.
// Usage: node --experimental-strip-types scripts/check-notices.ts [repoRoot]   (exit 1 on any problem)
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const HEADER_BYTES = 512;
const HEADER_RE = /NOTICE-ID:\s*(N-\d{3})/;
const ROW_RE = /^\|\s*(N-\d{3})\s*\|/gm;

function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

/** Files that must carry a NOTICE-ID header. */
export function governedFiles(root: string): string[] {
  const files: string[] = [];
  const pkgs = join(root, 'packages');
  if (existsSync(pkgs)) {
    for (const pkg of readdirSync(pkgs)) files.push(...walk(join(pkgs, pkg, 'src', 'vendor')));
  }
  files.push(...walk(join(root, 'packages', 'engine-core', 'templates')));
  return files.sort();
}

/** IDs listed as table rows in NOTICES.md. */
export function noticeIds(noticesMd: string): Set<string> {
  return new Set([...noticesMd.matchAll(ROW_RE)].map((m) => m[1] as string));
}

/** Returns a list of human-readable problems; an empty list means the check passes. */
export function checkNotices(root: string): string[] {
  const problems: string[] = [];
  const noticesPath = join(root, 'NOTICES.md');
  if (!existsSync(noticesPath)) return ['NOTICES.md is missing'];
  const md = readFileSync(noticesPath, 'utf8');
  const ids = noticeIds(md);
  const all = [...md.matchAll(ROW_RE)].map((m) => m[1] as string);
  const dupes = all.filter((id, i) => all.indexOf(id) !== i);
  for (const d of new Set(dupes)) problems.push(`NOTICES.md: duplicate row ${d}`);
  for (const file of governedFiles(root)) {
    const head = readFileSync(file).subarray(0, HEADER_BYTES).toString('latin1');
    const firstLine = head.split(/\r?\n/, 1)[0] ?? '';
    const m = HEADER_RE.exec(firstLine);
    const rel = relative(root, file);
    if (!m) problems.push(`${rel}: first line has no "NOTICE-ID: N-###" header`);
    else if (!ids.has(m[1] as string)) problems.push(`${rel}: ${m[1]} is not a row in NOTICES.md`);
  }
  return problems;
}

const invokedDirectly = process.argv[1] !== undefined && resolve(process.argv[1]) === resolve(import.meta.filename);
if (invokedDirectly) {
  const root = resolve(process.argv[2] ?? '.');
  const problems = checkNotices(root);
  if (problems.length > 0) {
    for (const p of problems) console.error(`check-notices: ${p}`);
    process.exit(1);
  }
  console.log(`check-notices: OK (${governedFiles(root).length} governed files)`);
}
