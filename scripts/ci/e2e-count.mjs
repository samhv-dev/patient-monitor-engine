// The browser suites run in shards (ci.yml, the e2e matrix). This proves the shards together ran every test: per test
// set, the sum over its shards' JSON reports of expected + unexpected + flaky + skipped must equal the number of tests
// `playwright test --list` finds for that set on the same tree, from as many shard reports as the set has shards
// (scripts/ci/e2e-sets.mjs, `shards`). A missing shard report, a shard that lost tests, or a test run twice all show
// as a difference. Since brief 218 it checks the sets of the run it is in (scripts/ci/e2e-sets.mjs, `runs`): on a pull
// request and a push to main the gating sets, where a difference fails; on the nightly run the @known-flaky quarantine,
// where a difference also fails (the nightly run exists to run those tests, so a missing report must show), while the
// quarantine's own test failures stay non-blocking (its job).
//   node scripts/ci/e2e-count.mjs <dir> [pr|nightly]   (dir holds the downloaded e2e-report-* artifacts; no run = every set,
//   a gating set's difference failing and the quarantine's warning, as before brief 218)
import { spawnSync } from 'node:child_process';
import { appendFileSync, readdirSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { setsOf } from './e2e-sets.mjs';

const dir = process.argv[2];
const run = process.argv[3];
const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]));
const reports = walk(dir).filter((f) => /^playwright-report-.+\.json$/.test(basename(f)));
const rows = [];
let failed = false;
for (const [name, set] of Object.entries(setsOf(run))) {
  const mine = reports.filter((f) => basename(f) === `playwright-report-${name}.json`);
  const ran = mine.map((f) => {
    const s = JSON.parse(readFileSync(f, 'utf8')).stats ?? {};
    return (s.expected ?? 0) + (s.unexpected ?? 0) + (s.flaky ?? 0) + (s.skipped ?? 0);
  });
  const l = spawnSync('pnpm', ['exec', 'playwright', 'test', '--list', ...set.args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });
  const listed = Number(/^Total: (\d+) tests? in/m.exec(l.stdout ?? '')?.[1] ?? NaN);
  const sum = ran.reduce((a, b) => a + b, 0);
  const ok = l.status === 0 && sum === listed && mine.length === set.shards;
  rows.push(`| ${name} | ${mine.length} of ${set.shards} | ${ran.join(' + ') || '—'} = ${sum} | ${listed} | ${ok ? 'equal' : '**DIFFERENT**'} |`);
  if (!ok) {
    const msg = `${name}: the ${mine.length} shard report(s) of ${set.shards} ran ${sum} tests; playwright test --list ${set.args.join(' ')} lists ${listed}`;
    const fails = set.gating || run === 'nightly';
    console.log(`::${fails ? 'error' : 'warning'} title=e2e-count::${msg}`);
    if (fails) failed = true;
  }
}
const table = ['### e2e-count: the shards together ran every test', '', '| set | shard reports | tests per shard | `--list` | |', '|---|---|---|---|---|', ...rows, ''].join('\n');
console.log(table);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, table + '\n');
process.exit(failed ? 1 : 0);
