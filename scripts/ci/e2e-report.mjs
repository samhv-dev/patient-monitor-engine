// Reads a Playwright JSON report for the e2e jobs' report steps (ci.yml), in place of the two jq programs they used:
// the Playwright image has no jq, and its download from github.com failed three runs before any test ran (research/42
// §1.5). Prints one line per test:
//   node scripts/ci/e2e-report.mjs quarantine <report.json> → "<status>\t<file>:<line> <title>", every test
//   node scripts/ci/e2e-report.mjs retry <report.json>      → "<known|new>\t<file>:<line> [<project>] <title>\t<folder>",
//                                                             the tests that passed only on a retry (status "flaky");
//                                                             <folder>: test-results/… of the first failed attempt, where
//                                                             its evidence is (brief 194), or "-" when it has none
// Exit 1 when the report cannot be read or the mode is unknown.
import { readFileSync } from 'node:fs';

const [mode, file] = process.argv.slice(2);
if (mode !== 'quarantine' && mode !== 'retry') {
  console.error('usage: e2e-report.mjs quarantine|retry <report.json>');
  process.exit(1);
}
const report = JSON.parse(readFileSync(file, 'utf8'));
const walk = (suite, out) => {
  for (const sp of suite.specs ?? []) for (const t of sp.tests ?? []) out.push({ sp, t });
  for (const s of suite.suites ?? []) walk(s, out);
  return out;
};
for (const { sp, t } of (report.suites ?? []).flatMap((s) => walk(s, []))) {
  if (mode === 'quarantine') console.log(`${t.status}\t${sp.file}:${sp.line} ${sp.title}`);
  else if (t.status === 'flaky') console.log(`${(sp.tags ?? []).includes('known-flaky') ? 'known' : 'new'}\t${sp.file}:${sp.line} [${t.projectName}] ${sp.title}\t${evidenceDir(t)}`);
}

/** The output folder of the test's first failed attempt (where its attachments are: test-results/<test>/), or "-". */
function evidenceDir(t) {
  const r = (t.results ?? []).find((x) => x.status !== 'passed' && x.status !== 'skipped');
  for (const a of r?.attachments ?? []) {
    const m = /(?:^|[\\/])(test-results[\\/][^\\/]+)[\\/]/.exec(a.path ?? '');
    if (m) return `${m[1].replace(/\\/g, '/')}/`;
  }
  return '-';
}
