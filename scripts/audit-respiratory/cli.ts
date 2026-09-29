// Respiratory integration audit — CLI (research/09-respiratory-integration-audit.md; FU-6 Task 1).
//   pnpm run audit:respiratory [scenario-or-prefix … | all]    one JSON per scenario → .audit-respiratory/results
//   pnpm run audit:respiratory probe <capno|deadspace|drive|link|olv>
//   pnpm run audit:respiratory summary                         per-step digest of every saved scenario
// Environment (defaults in runner.ts): PME_ENGINE, PME_VENT, RESULTS. A full run takes ≈ 8 min (M-series).
// Exit code (F10(6), Orchestrator ruling (FU-6 review), 2026-09-28): a bare invocation prints this usage and exits 0 —
// it never starts the ≈ 8 min `all` run by accident; `all` (or any selection) runs every picked scenario even if one
// raises an engine exception, prints `ENGINE EXCEPTIONS: <names>` at the end and exits 2 when any did (0 otherwise), so
// the gate can tell "a scenario threw" (2) from "the CLI itself failed" (1).
import { SCENARIOS } from './scenarios.ts';
import { run, table, save } from './runner.ts';
const args = process.argv.slice(2);
if (args.length === 0) {
  console.log('usage: pnpm run audit:respiratory <scenario-or-prefix … | all> | probe <capno|deadspace|drive|link|olv> | summary');
  console.log(`scenarios (${SCENARIOS.length}): ${SCENARIOS.map((s) => s.name).join(' ')}`);
} else if (args[0] === 'probe') {
  await import(`./probe-${args[1] ?? 'capno'}.ts`);
} else if (args[0] === 'summary') {
  await import('./summarize.ts');
} else {
  const pick = SCENARIOS.filter((s) => args.includes('all') || args.some((p) => s.name === p || s.name.startsWith(p)));
  const threw: string[] = [];
  for (const sc of pick) {
    const t0 = Date.now();
    let out: Awaited<ReturnType<typeof run>>;
    try {
      out = await run(sc);
    } catch (err) {
      // one engine exception must not end an `all` run (measured on 94040f7: the M-PD12 infant throws "rhythm sinus: next
      // event time is NaN" at 175 s — main at 240 s — once the R1 fit's 400 mL dead space drives PaCO2 to NaN)
      console.log(`\n=== ${sc.name} — ENGINE EXCEPTION after ${((Date.now() - t0) / 1000).toFixed(1)} s wall: ${String(err).slice(0, 200)}`);
      threw.push(sc.name);
      continue;
    }
    const { rows, log, alarms } = out;
    save(sc, rows, log, alarms);
    console.log(`\n=== ${sc.name} — ${sc.title} (${sc.mode ?? 'modeled'}) [${((Date.now() - t0) / 1000).toFixed(1)} s wall]`);
    console.log(log.filter((l) => !l.startsWith('1s')).join('\n'));
    console.log('alarms:', alarms.slice(0, 40).join(' '));
    console.log(table(sc, rows));
  }
  console.log(`\nENGINE EXCEPTIONS: ${threw.length ? threw.join(' ') : 'none'} (${pick.length} scenarios)`);
  if (threw.length) process.exitCode = 2;
}
