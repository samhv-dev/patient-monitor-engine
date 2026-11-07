// The e2e test sets of ci.yml's e2e matrix: report name (playwright-report-<name>.json) → the arguments the e2e job
// gives `playwright test`, whether the set gates the run, its job label and its shard count. This is the one place the
// shard count is set: ci.yml's e2e matrix is built from it (`node scripts/ci/e2e-sets.mjs matrix`, in the changes job),
// and scripts/ci/e2e-shard-plan.mjs and scripts/ci/e2e-count.mjs read it. Chromium has four shards since ci-shard4 (three
// by recorded duration still left each ≈ 17 min of tests plus set-up, 20.3–20.4 min wall); WebKit three.
import { pathToFileURL } from 'node:url';

export const SETS = {
  chromium: { args: ['--project=chromium'], gating: true, set: 'all', shards: 4 },
  webkit: { args: ['--project=webkit', '--grep-invert', '@known-flaky'], gating: true, set: 'gating', shards: 3 },
  'webkit-known-flaky': { args: ['--project=webkit', '--grep', '@known-flaky'], gating: false, set: 'known-flaky', shards: 1 },
};

/** ci.yml's e2e matrix: one row per shard of every set, in SETS order. */
export function e2eMatrix() {
  const include = [];
  for (const [report, s] of Object.entries(SETS)) {
    const browser = s.args.find((a) => a.startsWith('--project=')).slice('--project='.length);
    const grep = s.args.filter((a) => !a.startsWith('--project=')).join(' ');
    for (let shard = 1; shard <= s.shards; shard++) include.push({ browser, set: s.set, grep, report, shard, of: s.shards });
  }
  return { include };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href && process.argv[2] === 'matrix') console.log(JSON.stringify(e2eMatrix()));
