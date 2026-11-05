// The unit-test files that read a document: anything under docs/, a root *.md or CITATION.cff (research/42 §1.4 a).
// A pull request that changes only documents runs these and nothing else (ci.yml, the `docs` job), so a test that reads
// a document must be listed here: packages/validation/test/docs-readers.test.ts fails when a test file names a document
// path and is in neither list below.
//   node scripts/ci/docs-tests.mjs   → runs every listed file, one Vitest run per package (no PME_TEST_SET: all of them)
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

/** Package directory → its test files that read a document. */
export const DOCS_TESTS = {
  'packages/validation': [
    'test/docs-honesty.test.ts', // docs/guides/*.md and the root documents
    'test/docs-examples.test.ts', // the examples in docs/guides/scenario-authoring.md, skin-authoring.md
    'test/model-docs.test.ts', // docs/model/*, docs/validation/known-misses.md (and target-audit.tsv)
    'test/release-versions.test.ts', // CITATION.cff, CHANGELOG.md, README.md
    'test/changelog-fragments.test.ts', // CHANGELOG.md's Unreleased section and the changes/unreleased/ fragments
    'test/debrief-fa.test.ts', // docs/showcase/i18n/fa-debrief.json, docs/showcase/kit-round-a/q2-pretag-chromium/*
    'test/datasets/sources.test.ts', // NOTICES.md rows of the bundled datasets
    'test/templates/bundled.test.ts', // NOTICES.md rows of the bundled templates
    'test/docs-readers.test.ts', // this list against the test files
  ],
  'packages/ventilator': [
    'test/catalogue-md.test.ts', // docs/physiology/vent-lung-pathology-data.md
  ],
  'packages/engine-core': [
    'test/l2/blood/headers.test.ts', // NOTICES.md rows of the ported files
  ],
  'apps/demo': [
    // docs/showcase/kit-round-a/**/*.json, imported
    'src/app/debrief-moments.test.ts',
    'src/app/views/debrief-course.test.ts',
    'src/app/views/debrief-marks-course.dom.test.ts',
    'src/app/views/debrief-moments-print.dom.test.ts',
  ],
};

/** Test files that name a document path in code without reading the repository's copy, each with the reason. */
export const NOT_READERS = {
  'apps/demo/src/app/teach2/drug-sheet.dom.test.ts': "asserts the drug sheet's text names docs/model/endocrine-thermal.md",
  'packages/controller/test/relay/kit-windows.test.ts': 'README.md is a file inside a zip the test builds',
  'packages/skins/test/grid.test.ts': 'NOTES.md is named in a test title',
  'packages/validation/test/check-licences.test.ts': 'NOTICES.md is in an expected error message; the NOTICES text is a literal',
  'packages/validation/test/check-notices.test.ts': 'writes its own NOTICES.md in a temporary folder',
  'packages/validation/test/check-size.test.ts': "'README.md' is a path in a list the test passes to findWasm",
};

const invokedDirectly = process.argv[1] !== undefined && resolve(process.argv[1]) === resolve(import.meta.filename);
if (invokedDirectly) {
  const root = resolve(import.meta.dirname, '../..');
  let failed = 0;
  for (const [dir, files] of Object.entries(DOCS_TESTS)) {
    console.log(`\n== ${dir}: ${files.length} files`);
    const env = { ...process.env };
    delete env.PME_TEST_SET;
    const r = spawnSync('pnpm', ['exec', 'vitest', 'run', ...files], { cwd: resolve(root, dir), stdio: 'inherit', env });
    if (r.status !== 0) failed++;
  }
  process.exit(failed ? 1 : 0);
}
