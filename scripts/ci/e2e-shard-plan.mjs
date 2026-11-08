// Splits one e2e test set into shards by MEASURED duration instead of Playwright's --shard, which hands each shard a
// contiguous run of files by test count, so adjacent long files land together (research/42 §1.4 b). The durations are
// the previous green main run's Playwright JSON reports: per file, the sum of every test result's duration (retries
// included). Files go longest first onto the least-loaded shard (LPT); a file with no recorded duration counts as the
// median recorded file. Nothing is weighted or ordered by hand.
// The plan is made ONCE per run, in ci.yml's renderer job, and every shard reads that one plan (research/41 row 64:
// when each shard downloaded the reports and planned for itself, one shard's failed download of one report gave it a
// different split from its siblings', and the set ran 174 tests against 165 listed, run 42284321017).
//   node scripts/ci/e2e-shard-plan.mjs plan <reports-dir|none>
//     stdout: one JSON line, {<set>: [[files of shard 1], [files of shard 2], …] | null} for every set of
//     scripts/ci/e2e-sets.mjs with more than one shard (its `shards` there); null for a set with no usable plan
//     (`none`, no playwright-report-<set>.json under the directory, one that cannot be read, no listed file
//     recorded, fewer files than shards, a shard with no file). Files are relative to the Playwright testDir.
//     stderr: the whole plan
//   node scripts/ci/e2e-shard-plan.mjs pick <set> <shard-index>   (the plan JSON in E2E_SHARD_PLAN)
//     stdout: that shard's files, one per line, for --test-list. Exit 3, printing nothing, when the set has no plan
//     (or E2E_SHARD_PLAN is empty or unreadable): the e2e job then runs Playwright's own --shard=<index>/<shards>, and
//     since every shard of the set reads the same value, all of them do.
import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { SETS } from './e2e-sets.mjs';

/** Per-file duration (ms) from parsed Playwright JSON reports: every result of every test, summed. */
export function fileDurations(reports) {
  const out = new Map();
  const walk = (suite, file) => {
    for (const sp of suite.specs ?? []) for (const t of sp.tests ?? []) for (const r of t.results ?? []) out.set(file, out.get(file) + (r.duration ?? 0));
    for (const s of suite.suites ?? []) walk(s, file);
  };
  for (const report of reports)
    for (const s of report.suites ?? []) {
      if (!out.has(s.file)) out.set(s.file, 0);
      walk(s, s.file);
    }
  return out;
}

/**
 * Longest-processing-time-first: `files` (names) onto `count` shards, weights from `durations` (Map file → ms), a
 * file without one weighted as the median of those that have one. Ties: name order, then the lowest shard index, so
 * every shard job computes the same plan. Returns null when no file has a recorded duration.
 */
export function assignShards(files, durations, count) {
  const known = files.filter((f) => durations.has(f)).map((f) => durations.get(f)).sort((a, b) => a - b);
  if (known.length === 0) return null;
  const m = known.length >> 1;
  const median = known.length % 2 ? known[m] : (known[m - 1] + known[m]) / 2;
  const weighted = [...new Set(files)].map((f) => ({ file: f, ms: durations.get(f) ?? median, recorded: durations.has(f) }));
  weighted.sort((a, b) => b.ms - a.ms || (a.file < b.file ? -1 : a.file > b.file ? 1 : 0));
  const shards = Array.from({ length: count }, () => ({ ms: 0, files: [] }));
  for (const w of weighted) {
    let best = 0;
    for (let i = 1; i < count; i++) if (shards[i].ms < shards[best].ms) best = i;
    shards[best].ms += w.ms;
    shards[best].files.push(w);
  }
  return { median, shards };
}

/** One set's plan as the shards read it: the files of each shard, or null when there is no usable plan (none
 *  recorded, fewer files than shards, a shard left with no file). */
export function setPlan(files, durations, count) {
  if (files.length < count) return null;
  const plan = assignShards(files, durations, count);
  if (!plan || plan.shards.some((s) => s.files.length === 0)) return null;
  return plan.shards.map((s) => s.files.map((w) => w.file));
}

/** The files of shard `index` (1-based) of `set` from the plan JSON every shard of the run is given; null for none. */
export function pickShard(json, set, index) {
  let plans;
  try {
    plans = JSON.parse(json);
  } catch {
    return null;
  }
  const files = plans?.[set]?.[index - 1];
  return Array.isArray(files) && files.length > 0 ? files : null;
}

const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]));

/** One set's plan from the reports under `dir` (or 'none'), its reasons and its table on stderr. */
function planOf(set, dir) {
  const count = SETS[set].shards;
  const none = (why) => (console.error(`e2e-shard-plan ${set}: ${why}; its shards run Playwright's --shard`), null);
  if (dir === 'none') return none('no reports directory');
  let reports;
  try {
    const paths = walk(dir).filter((f) => basename(f) === `playwright-report-${set}.json`).sort();
    if (paths.length === 0) return none(`no playwright-report-${set}.json under ${dir}`);
    reports = paths.map((p) => JSON.parse(readFileSync(p, 'utf8')));
  } catch (e) {
    return none(`a report cannot be read (${e.message})`);
  }
  const l = spawnSync('pnpm', ['exec', 'playwright', 'test', '--list', '--reporter=json', ...SETS[set].args], { encoding: 'utf8', maxBuffer: 256 << 20, stdio: ['ignore', 'pipe', 'inherit'] });
  if (l.status !== 0) return none(`playwright test --list failed (${l.status})`);
  const files = (JSON.parse(l.stdout).suites ?? []).map((s) => s.file);
  const durations = fileDurations(reports);
  const plan = setPlan(files, durations, count);
  if (!plan) return none(`no split of ${files.length} files into ${count} shards (none recorded, too few files, or an empty shard)`);
  const { median, shards } = assignShards(files, durations, count);
  const min = (ms) => (ms / 60000).toFixed(1);
  console.error(`e2e-shard-plan ${set}: ${files.length} files from ${reports.length} report(s); unrecorded files count as the median, ${min(median)} min`);
  shards.forEach((s, i) =>
    console.error(`  shard ${i + 1}/${count}: ${min(s.ms)} min of recorded test time, ${s.files.length} files: ${s.files.map((w) => `${w.file} ${min(w.ms)}${w.recorded ? '' : ' (median)'}`).join(', ')}`),
  );
  return plan;
}

function main(argv) {
  if (argv[0] === 'plan' && argv[1]) {
    const plans = Object.fromEntries(Object.entries(SETS).filter(([, s]) => s.shards > 1).map(([set]) => [set, planOf(set, argv[1])]));
    console.log(JSON.stringify(plans));
    return;
  }
  const [set, index] = [argv[1], Number(argv[2])];
  if (argv[0] !== 'pick' || !SETS[set] || !Number.isInteger(index) || index < 1 || index > SETS[set].shards) {
    console.error('usage: e2e-shard-plan.mjs plan <reports-dir|none> | pick <chromium|webkit|webkit-known-flaky> <shard-index>');
    process.exit(2);
  }
  const files = pickShard(process.env.E2E_SHARD_PLAN ?? '', set, index);
  if (!files) {
    console.error(`e2e-shard-plan: no plan for ${set} in this run; the job falls back to Playwright's --shard`);
    process.exit(3);
  }
  for (const f of files) console.log(f);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main(process.argv.slice(2));
