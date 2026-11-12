// The e2e test sets of ci.yml's e2e matrix: report name (playwright-report-<name>.json) → the arguments the e2e job
// gives `playwright test`, whether the set gates the run, its job label and its shard count. This is the one place the
// shard count is set: ci.yml's e2e matrix is built from it (`node scripts/ci/e2e-sets.mjs matrix`, in the changes job),
// and scripts/ci/e2e-shard-plan.mjs and scripts/ci/e2e-count.mjs read it. Chromium has four shards since ci-shard4 (three
// by recorded duration still left each ≈ 17 min of tests plus set-up, 20.3–20.4 min wall); WebKit three.
// `runs` (brief 218, the owner's ruling of 12 November 2026): which ci.yml run carries the set. 'pr' = every pull request
// and every push to main; 'nightly' = the nightly schedule on main, a manual dispatch and a `v*` tag, never a pull
// request. The @known-flaky WebKit quarantine is nightly: a PR's run ends when its gating tests end. Every set is in
// exactly one of the two, and a gating set is always 'pr', so no test falls between them (Chromium's set is every test,
// the @known-flaky ones included, on every PR).
import { pathToFileURL } from 'node:url';

export const SETS = {
  chromium: { args: ['--project=chromium'], gating: true, set: 'all', shards: 4, runs: 'pr' },
  webkit: { args: ['--project=webkit', '--grep-invert', '@known-flaky'], gating: true, set: 'gating', shards: 3, runs: 'pr' },
  'webkit-known-flaky': { args: ['--project=webkit', '--grep', '@known-flaky'], gating: false, set: 'known-flaky', shards: 1, runs: 'nightly' },
};
export const RUNS = ['pr', 'nightly'];
for (const [name, s] of Object.entries(SETS)) {
  if (!RUNS.includes(s.runs)) throw new Error(`e2e set ${name}: runs must be one of ${RUNS.join(', ')}`);
  if (s.gating && s.runs !== 'pr') throw new Error(`e2e set ${name} gates the run, so it runs on every PR ('pr')`);
}
/** The sets one run carries: `run` 'pr' or 'nightly'; no `run` = every set. */
export function setsOf(run) {
  if (run !== undefined && !RUNS.includes(run)) throw new Error(`unknown run '${run}' (${RUNS.join(', ')})`);
  return Object.fromEntries(Object.entries(SETS).filter(([, s]) => run === undefined || s.runs === run));
}

/** ci.yml's e2e matrix: one row per shard of every set the run carries (all sets without `run`), in SETS order. */
export function e2eMatrix(run) {
  const include = [];
  for (const [report, s] of Object.entries(setsOf(run))) {
    const browser = s.args.find((a) => a.startsWith('--project=')).slice('--project='.length);
    const grep = s.args.filter((a) => !a.startsWith('--project=')).join(' ');
    for (let shard = 1; shard <= s.shards; shard++) include.push({ browser, set: s.set, grep, report, shard, of: s.shards });
  }
  return { include };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href && process.argv[2] === 'matrix') console.log(JSON.stringify(e2eMatrix(process.argv[3])));
