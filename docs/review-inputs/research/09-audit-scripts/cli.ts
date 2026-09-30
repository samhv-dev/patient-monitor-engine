// Respiratory integration audit — scenario CLI (research/09-respiratory-integration-audit.md).
// Rerun (about 7.5 min for all 78 scenarios on an M-series Mac, plus about 4 min of probes):
//   git -C <repo> worktree add --detach <wt> origin/main && (cd <wt> && npx -y pnpm@9.15.9 install --frozen-lockfile)
//   export PME_ENGINE=<wt>/packages/engine-core/src/index.ts RESULTS=<scratch>/results
//   node --import ./hooks.mjs cli.ts all > out/tables.txt        (or a scenario name / prefix, e.g. `cli.ts B`)
//   node --import ./hooks.mjs probe-capno.ts > out/capno.txt;  node --import ./hooks.mjs probe-link.ts > out/link.txt
//   node --import ./hooks.mjs probe-deadspace.ts > out/deadspace.txt; node --import ./hooks.mjs probe-drive.ts > out/drive.txt
//   node --import ./hooks.mjs probe-olv.ts > out/olv.txt; RESULTS=… node summarize.ts > out/summary.txt
//   probe-link.ts also needs PME_VENT=<wt>/packages/ventilator/src/index.ts
// (hooks.mjs adds the JSON import attribute engine-core's skin import lacks; RESULTS holds one JSON per scenario and
//  is not committed.)
import { SCENARIOS } from './scenarios.ts';
import { run, table, save } from './runner.ts';
const sel = process.argv.slice(2);
const pick = SCENARIOS.filter((s) => sel.length === 0 || sel.includes('all') || sel.some((p) => s.name === p || s.name.startsWith(p)));
for (const sc of pick) {
  const t0 = Date.now();
  const { rows, log, alarms } = await run(sc);
  save(sc, rows, log, alarms);
  console.log(`\n=== ${sc.name} — ${sc.title} (${sc.mode ?? 'modeled'}) [${((Date.now() - t0) / 1000).toFixed(1)} s wall]`);
  console.log(log.filter((l) => !l.startsWith('1s')).join('\n'));
  console.log('alarms:', alarms.slice(0, 40).join(' '));
  console.log(table(sc, rows));
}
