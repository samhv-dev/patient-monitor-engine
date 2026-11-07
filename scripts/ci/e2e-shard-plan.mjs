// Splits one e2e test set into shards by MEASURED duration instead of Playwright's --shard, which hands each shard a
// contiguous run of files by test count, so adjacent long files land together (research/42 §1.4 b). The durations are
// the previous green main run's Playwright JSON reports: per file, the sum of every test result's duration (retries
// included). Files go longest first onto the least-loaded shard (LPT); a file with no recorded duration counts as the
// median recorded file. Nothing is weighted or ordered by hand.
//   node scripts/ci/e2e-shard-plan.mjs <set> <shard-index> <reports-dir|none>
//     <set>: a report name of scripts/ci/e2e-sets.mjs (chromium, webkit, webkit-known-flaky); its shard count is that
//     set's `shards` there, the one the e2e matrix is built from
//   stdout: the files of shard <shard-index>, one per line (relative to the Playwright testDir, for --test-list)
//   stderr: the whole plan
// Exit 3, printing nothing on stdout, when there is no usable report (`none`, no playwright-report-<set>.json under
// the directory, one that cannot be read, no listed file recorded) or fewer files than shards: the e2e job then runs
// Playwright's own --shard=<index>/<shards>. Any other failure exits non-zero too, with the same fallback.
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

const exit3 = (why) => {
  console.error(`e2e-shard-plan: ${why}; the job falls back to Playwright's --shard`);
  process.exit(3);
};

function main(argv) {
  const [set, index, dir] = [argv[0], Number(argv[1]), argv[2]];
  const count = SETS[set]?.shards;
  if (!SETS[set] || !Number.isInteger(index) || index < 1 || index > count || !dir) {
    console.error('usage: e2e-shard-plan.mjs <chromium|webkit|webkit-known-flaky> <shard-index> <reports-dir|none>');
    process.exit(2);
  }
  if (dir === 'none') exit3('no reports directory');
  const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]));
  let paths;
  try {
    paths = walk(dir).filter((f) => basename(f) === `playwright-report-${set}.json`).sort();
  } catch (e) {
    exit3(`${dir} cannot be read (${e.message})`);
  }
  if (paths.length === 0) exit3(`no playwright-report-${set}.json under ${dir}`);
  let reports;
  try {
    reports = paths.map((p) => JSON.parse(readFileSync(p, 'utf8')));
  } catch (e) {
    exit3(`a report cannot be read (${e.message})`);
  }
  const l = spawnSync('pnpm', ['exec', 'playwright', 'test', '--list', '--reporter=json', ...SETS[set].args], { encoding: 'utf8', maxBuffer: 256 << 20, stdio: ['ignore', 'pipe', 'inherit'] });
  if (l.status !== 0) {
    console.error(`e2e-shard-plan: playwright test --list failed (${l.status})`);
    process.exit(1);
  }
  const files = (JSON.parse(l.stdout).suites ?? []).map((s) => s.file);
  if (files.length < count) exit3(`${files.length} files for ${count} shards`);
  const plan = assignShards(files, fileDurations(reports), count);
  if (!plan) exit3('no listed file has a recorded duration');
  const min = (ms) => (ms / 60000).toFixed(1);
  console.error(`e2e-shard-plan ${set}: ${files.length} files from ${paths.length} report(s); unrecorded files count as the median, ${min(plan.median)} min`);
  plan.shards.forEach((s, i) =>
    console.error(`  shard ${i + 1}/${count}: ${min(s.ms)} min of recorded test time, ${s.files.length} files: ${s.files.map((w) => `${w.file} ${min(w.ms)}${w.recorded ? '' : ' (median)'}`).join(', ')}`),
  );
  if (plan.shards[index - 1].files.length === 0) exit3(`shard ${index} would run no file`);
  for (const w of plan.shards[index - 1].files) console.log(w.file);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main(process.argv.slice(2));
