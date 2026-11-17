// ci.yml's `verdict` job: the one check a merge reads. Every job the plan (scripts/ci/affected.mjs) expected must have
// succeeded and every job it left out must have been skipped, so a job that should have run but never reported (its
// `needs` failed, the run was cut short) fails the run instead of passing by its absence.
//   NEEDS='${{ toJSON(needs) }}' EXPECT='<changes.outputs.expect>' node scripts/ci/verdict.mjs
import { appendFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

/** `needs`: { job: { result } }; `expect`: { job_key: boolean } (a job id's '-' is a key's '_'); `changes` must succeed. */
export function verdict(needs, expect) {
  const rows = Object.entries(needs).map(([job, { result }]) => {
    const want = job === 'changes' ? true : expect[job.replaceAll('-', '_')];
    if (want === undefined) return { job, result, ok: false, note: 'not in the plan' };
    const ok = want ? result === 'success' : result === 'skipped';
    return { job, result, ok, note: want ? 'expected to run' : 'skipped by the path rule' };
  });
  return { ok: rows.every((r) => r.ok), rows };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const { ok, rows } = verdict(JSON.parse(process.env.NEEDS), JSON.parse(process.env.EXPECT || '{}'));
  const table = ['### verdict', '', '| job | result | plan | |', '|---|---|---|---|', ...rows.map((r) => `| ${r.job} | ${r.result} | ${r.note} | ${r.ok ? 'ok' : '**NOT OK**'} |`), ''].join('\n');
  console.log(table);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${table}\n`);
  for (const r of rows.filter((x) => !x.ok)) console.log(`::error title=verdict::${r.job}: ${r.result} (${r.note})`);
  process.exit(ok ? 0 : 1);
}
