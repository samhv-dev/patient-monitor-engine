// The e2e test sets of ci.yml's e2e matrix: report name (playwright-report-<name>.json) → the arguments the e2e job
// gives `playwright test`. Read by scripts/ci/e2e-count.mjs and scripts/ci/e2e-shard-plan.mjs.
export const SETS = {
  chromium: { args: ['--project=chromium'], gating: true },
  webkit: { args: ['--project=webkit', '--grep-invert', '@known-flaky'], gating: true },
  'webkit-known-flaky': { args: ['--project=webkit', '--grep', '@known-flaky'], gating: false },
};
