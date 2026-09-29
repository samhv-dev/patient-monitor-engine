// `pnpm audit:monitor [name|prefix …]` (FU-5 Task 1; research/10-monitor-fidelity-audit.md): runs the scenarios in
// scenarios.ts through runner.ts, prints each one's command log, a 1 s-resolution table (truth left of "|HR", what the
// monitor shows right of it; "?" questionable, "--" invalid), the alarm log and the NIBP log, then the fidelity report
// (report.ts). All scenarios take ≈ 1 min. Raw JSON: $PME_AUDIT_OUT/results (default <repo>/.audit-monitor).
import { SCENARIOS } from './scenarios.ts';
import { run, save, table } from './runner.ts';
import { report } from './report.ts';

const sel = process.argv.slice(2);
const pick = SCENARIOS.filter((s) => sel.length === 0 || sel.includes('all') || sel.some((p) => s.name === p || s.name.startsWith(p)));
for (const sc of pick) {
  const t0 = Date.now();
  const res = await run(sc);
  save(sc, res);
  console.log(`\n=== ${sc.name} — ${sc.title} (${sc.mode}, ${sc.skin ?? 'philips-like'}) [${((Date.now() - t0) / 1000).toFixed(1)} s wall]`);
  console.log(res.log.join('\n'));
  console.log(table(sc, res.rows));
  console.log('-- alarms:\n' + res.alarmLog.join('\n'));
  console.log('-- nibp:\n' + res.nibpLog.join('\n'));
}
console.log('\n' + report());
