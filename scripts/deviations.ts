// Known deviations (Stage 8b): every expected failure — `it.fails` / `test.fails` in the package tests, Playwright's
// `test.fail(title, …)` in apps/demo/e2e — is a band the engine does not meet yet (R45: the band is kept, the miss is
// recorded), and every `it.skip` / `test.skip` / `describe.skip` / `.todo` with a LITERAL title is behaviour not
// tested yet (conditional skips such as `test.skip(browserName === 'webkit', …)` or `.skipIf(…)` are not). Lists
// both so docs/guides/known-deviations.md can carry one row per item; packages/validation/test/docs-honesty.test.ts
// fails when a title is missing from that page, or when an expected-failure call has a title this lister cannot
// read (a variable, or a template with `${…}`).
// Usage: node --experimental-strip-types scripts/deviations.ts   (prints two markdown tables' rows)
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

export interface Deviation {
  file: string;
  title: string;
}

const FAILS_RE = /\b(?:it|test)\.fails?\(\s*(["'`])((?:\\.|(?!\1)[^\\])*)\1/g;
// Playwright's in-body annotation `test.fail(condition, 'reason')`: an expected failure whenever the condition holds;
// the reason is its title (apps/demo/e2e/stage9-tasks.e2e.ts uses it).
const COND_FAIL_RE = /\btest\.fail\(\s*[^'"`\s,][^,]*,\s*(["'`])((?:\\.|(?!\1)[^\\])*)\1\s*\)/g;
const FAILS_CALL_RE = /\b(?:it|test)\.fails?\s*\(/g;
const SKIP_RE = /\b(?:it|test|describe)\.(?:skip|todo)\(\s*(["'`])((?:\\.|(?!\1)[^\\])*)\1/g;

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    if (e.name === 'node_modules' || e.name === 'dist') return [];
    const p = join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });
}

/** Test-file text with `//` line comments removed (a comment that mentions `it.fails (…)` is not a test). */
const code = (text: string) => text.replace(/(^|\s)\/\/.*$/gm, '$1');
const titles = (text: string, re: RegExp) =>
  [...code(text).matchAll(re)].filter((m) => !(m[1] === '`' && (m[2] as string).includes('${'))).map((m) => (m[2] as string).replace(/\\(.)/g, '$1'));

/** The expected-failure titles in one test file's text (escapes resolved: `\'` → `'`; `${…}` templates skipped). */
export function failsTitles(text: string): string[] {
  return [...titles(text, FAILS_RE), ...titles(text, COND_FAIL_RE)];
}
/** How many expected-failure calls the file makes, readable title or not. */
export function failsCalls(text: string): number {
  return [...code(text).matchAll(FAILS_CALL_RE)].length;
}
/** The literal titles of skipped / todo tests in one file. */
export function skippedTitles(text: string): string[] {
  return titles(text, SKIP_RE);
}

/** Package unit tests and the Playwright e2e, sorted. */
export function testFiles(root: string): string[] {
  return [...walk(join(root, 'packages')), ...walk(join(root, 'apps', 'demo', 'e2e'))].filter((f) => /\.(test|e2e)\.ts$/.test(f)).sort();
}
const list = (root: string, pick: (text: string) => string[]): Deviation[] =>
  testFiles(root).flatMap((f) => pick(readFileSync(f, 'utf8')).map((title) => ({ file: relative(root, f), title })));

/** Every expected failure (a band missed), by file. */
export function listDeviations(root: string): Deviation[] {
  return list(root, failsTitles);
}
/** Every literal-titled skipped or todo test, by file. */
export function listSkipped(root: string): Deviation[] {
  return list(root, skippedTitles);
}
/** Files with an expected-failure call whose title the lister cannot read. */
export function unreadableFails(root: string): string[] {
  return testFiles(root)
    .filter((f) => {
      const text = readFileSync(f, 'utf8');
      return failsCalls(text) > failsTitles(text).length;
    })
    .map((f) => relative(root, f));
}

const invokedDirectly = process.argv[1] !== undefined && resolve(process.argv[1]) === resolve(import.meta.filename);
if (invokedDirectly) {
  const root = resolve(import.meta.dirname, '..');
  const row = (d: Deviation) => `| \`${d.file}\` | ${d.title.replace(/\|/g, '\\|')} | FILL: tracked in |`;
  const fails = listDeviations(root);
  const skipped = listSkipped(root);
  console.log('<!-- Tests that record a miss -->');
  for (const d of fails) console.log(row(d));
  console.log('\n<!-- Tests not run -->');
  for (const d of skipped) console.log(row(d));
  console.error(`deviations: ${fails.length} expected failures, ${skipped.length} skipped; unreadable titles in: ${unreadableFails(root).join(', ') || 'none'}`);
}
