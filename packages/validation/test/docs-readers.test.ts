// A pull request that changes only documents (docs/, a root *.md, CITATION.cff) runs only the test files listed in
// scripts/ci/docs-tests.mjs (ci.yml, the `docs` job). This test keeps that list from going stale: every unit-test file
// whose code (comments aside) names a document path is either listed there or exempted there with a reason, and every
// listed file exists.
import { existsSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { testFiles } from '../../../scripts/deviations.ts';
// @ts-expect-error -- a plain .mjs script without type declarations
import { DOCS_TESTS, NOT_READERS } from '../../../scripts/ci/docs-tests.mjs';

const root = resolve(import.meta.dirname, '../../..');
const listed = new Set(Object.entries(DOCS_TESTS as Record<string, string[]>).flatMap(([dir, files]) => files.map((f) => `${dir}/${f}`)));
const exempt = new Set(Object.keys(NOT_READERS as Record<string, string>));
// docs/…, CITATION.cff, or an upper-case *.md name (README.md, NOTICES.md, CHANGELOG.md, …)
const DOC_PATH = /docs\/|CITATION\.cff|\b[A-Z][A-Z_-]*\.md\b/;
const code = (text: string) =>
  text
    .split('\n')
    .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l))
    .map((l) => l.replace(/\s\/\/\s.*$/, ''))
    .join('\n');

describe('the docs-only CI job runs every test that reads a document', () => {
  it('every unit-test file that names a document path is listed in scripts/ci/docs-tests.mjs (or exempted there)', () => {
    const readers = testFiles(root)
      .filter((f) => f.endsWith('.test.ts'))
      .map((f) => relative(root, f))
      .filter((f) => DOC_PATH.test(code(readFileSync(join(root, f), 'utf8'))));
    expect(readers.filter((f) => !listed.has(f) && !exempt.has(f)), 'add it to DOCS_TESTS in scripts/ci/docs-tests.mjs').toEqual([]);
    expect([...exempt].filter((f) => !readers.includes(f)), 'a stale NOT_READERS entry').toEqual([]);
  });
  it('every listed file exists', () => {
    expect([...listed, ...exempt].filter((f) => !existsSync(join(root, f)))).toEqual([]);
  });
});
