// No step of the validation workflow is lost (brief 218). Until brief 218 `.github/workflows/validation.yml` was ONE job,
// `validate`, that ran `pnpm validate` and then the Chromium soak. It is now two jobs side by side, `validate` and `soak`.
// This check fails when a step of the old job is missing from the job that now runs it (or is weakened by an `if:` or
// `continue-on-error:` it did not have), when a job is gone or can never run, and when a job's condition names a trigger
// the workflow does not have. It prints, per job, the triggers it runs on, so the soak is counted with its trigger named.
//   node scripts/ci/validation-steps.mjs [path to validation.yml]   (no dependencies: runs before `pnpm install`)
// A step that changes on purpose changes here in the same pull request, so the change is reviewed, not silent.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const file = process.argv[2] ?? resolve(root, '.github/workflows/validation.yml');

/** The steps of the single `validate` job as of origin/main 7fd4369d (comments left out), and the job that runs each now. */
export const OLD_STEPS = [
  { jobs: ['validate', 'soak'], step: ['uses: actions/checkout@v4'] },
  { jobs: ['validate', 'soak'], step: ['uses: pnpm/action-setup@v4'] },
  { jobs: ['validate', 'soak'], step: ['uses: actions/setup-node@v4', 'with:', 'node-version: 22', 'cache: pnpm'] },
  { jobs: ['validate', 'soak'], step: ['run: pnpm install --frozen-lockfile'] },
  {
    jobs: ['validate'],
    step: ['uses: actions/cache@v4', 'with:', 'path: packages/validation/datasets/cache', "key: datasets-${{ hashFiles('packages/validation/datasets/manifests/*.json') }}"],
  },
  { jobs: ['validate'], step: ['run: pnpm --filter @pme/validation datasets:fetch'] },
  { jobs: ['validate'], step: ['run: pnpm validate ${{ github.event.inputs.args }}'] },
  {
    jobs: ['validate'],
    step: ['uses: actions/upload-artifact@v4', 'if: always()', 'with:', 'name: validation-report', 'path: docs/validation/', 'if-no-files-found: error'],
  },
  {
    jobs: ['soak'],
    step: [
      'name: soak (Chromium) in the Playwright container',
      'run: |',
      "v=$(pnpm exec playwright --version | awk '{print $2}')",
      `echo "$v" | grep -Eq '^[0-9]+\\.[0-9]+\\.[0-9]+$' || { echo "::error::unexpected Playwright version: '$v'"; exit 1; }`,
      'docker run --rm --ipc=host --user "$(id -u):$(id -g)" -e CI -e PME_SOAK_MIN -e HOME=/tmp -v "$PWD:$PWD" -w "$PWD" \\',
      '"mcr.microsoft.com/playwright:v$v-noble" \\',
      'node_modules/.bin/playwright test -c playwright.validation.config.ts',
    ],
  },
  {
    jobs: ['soak'],
    step: ['uses: actions/upload-artifact@v4', 'if: always()', 'with:', 'name: soak-and-perf', 'path: docs/validation/perf/', 'if-no-files-found: ignore'],
  },
];

const lines = (text) => text.split('\n').map((l) => l.trim()).filter((l) => l !== '' && !l.startsWith('#'));

/** The workflow's top-level `on:` events and crons, and each job's `if:` and steps (normalised lines), from the text. */
export function parseWorkflow(yml) {
  const all = yml.split('\n');
  const top = (name) => all.findIndex((l) => l === `${name}:`);
  const onAt = top('on');
  const jobsAt = top('jobs');
  const onBlock = all.slice(onAt + 1, all.findIndex((l, i) => i > onAt && /^\S/.test(l)));
  const events = onBlock.filter((l) => /^ {2}[a-z_]+:/.test(l)).map((l) => l.trim().replace(/:.*$/, ''));
  const crons = onBlock.flatMap((l) => /cron:\s*'([^']+)'/.exec(l)?.[1] ?? []);
  const jobs = {};
  let cur = null;
  for (const l of all.slice(jobsAt + 1)) {
    const m = /^ {2}([\w-]+):\s*$/.exec(l);
    if (m) { cur = jobs[m[1]] = { if: null, continueOnError: false, steps: [], inSteps: false }; continue; }
    if (!cur) continue;
    if (/^ {4}if:/.test(l)) cur.if = l.replace(/^ {4}if:\s*/, '').trim();
    if (/^ {4}continue-on-error:/.test(l)) cur.continueOnError = true;
    if (/^ {4}steps:/.test(l)) { cur.inSteps = true; continue; }
    if (/^ {4}\S/.test(l)) cur.inSteps = false;
    if (!cur.inSteps) continue;
    if (/^ {6}- /.test(l)) cur.steps.push([]);
    if (cur.steps.length) cur.steps.at(-1).push(l.replace(/^ {6}- /, '      '));
  }
  for (const j of Object.values(jobs)) j.steps = j.steps.map((s) => lines(s.join('\n')));
  return { events, crons, jobs };
}

/** The triggers a job's `if:` names: [event, detail], e.g. ['schedule', "'30 22 * * *'"]. No `if:` = every event. */
export function triggersOf(cond, events) {
  if (cond == null) return events.map((e) => [e, 'any']);
  if (/^(false|\$\{\{\s*false\s*\}\})$/.test(cond.trim())) return [];
  const out = [];
  for (const m of cond.matchAll(/github\.event_name\s*==\s*'([a-z_]+)'/g)) {
    const e = m[1];
    const detail =
      e === 'pull_request' && /labels\.\*\.name,\s*'run-validation'/.test(cond) ? "label 'run-validation'"
        : e === 'push' && /startsWith\(github\.ref,\s*'refs\/tags\/v'\)/.test(cond) ? "tag 'v*'"
          : 'any';
    out.push([e, detail]);
  }
  for (const m of cond.matchAll(/github\.event\.schedule\s*==\s*'([^']+)'/g)) out.push(['schedule', `'${m[1]}'`]);
  if (/github\.event_name\s*!=\s*'pull_request'/.test(cond)) {
    for (const e of events) if (e !== 'pull_request') out.push([e, 'any']);
    if (/labels\.\*\.name,\s*'run-validation'/.test(cond)) out.push(['pull_request', "label 'run-validation'"]);
  }
  return out;
}

export function check(yml) {
  const { events, crons, jobs } = parseWorkflow(yml);
  const errors = [];
  const report = [];
  for (const name of ['validate', 'soak']) if (!jobs[name]) errors.push(`job \`${name}\` is missing`);
  for (const [name, j] of Object.entries(jobs)) {
    if (j.continueOnError) errors.push(`job \`${name}\` has continue-on-error: its failure would not fail the run`);
    const t = triggersOf(j.if, events);
    if (t.length === 0) errors.push(`job \`${name}\` can never run (if: ${j.if})`);
    for (const [e, d] of t) {
      if (!events.includes(e)) errors.push(`job \`${name}\` names the trigger ${e}, which the workflow's on: lacks`);
      if (e === 'schedule' && d !== 'any' && !crons.includes(d.slice(1, -1))) errors.push(`job \`${name}\` names the cron ${d}, which on.schedule lacks`);
    }
    report.push(`job ${name}: runs on ${t.map(([e, d]) => (d === 'any' ? e : `${e} (${d})`)).join(', ') || 'NOTHING'}`);
  }
  for (const { jobs: want, step } of OLD_STEPS) {
    for (const name of want) {
      const j = jobs[name];
      const hit = j?.steps.find((s) => step.every((l) => s.includes(l)) && s.every((l) => step.includes(l) || !/^(if|continue-on-error):/.test(l)));
      if (!hit) errors.push(`old step "${step[0]}" is missing from job \`${name}\` (or carries an if:/continue-on-error: it did not have)`);
      else report.push(`step "${step[0]}${step[0].startsWith('uses: actions/upload') ? ` ${step.find((l) => l.startsWith('name:'))}` : ''}": in ${name}`);
    }
  }
  return { errors, report };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { errors, report } = check(readFileSync(file, 'utf8'));
  for (const r of report) console.log(r);
  for (const e of errors) console.log(`::error title=validation steps::${e}`);
  console.log(errors.length ? `${errors.length} problem(s)` : `every step of the old validation job is in a job that runs (${OLD_STEPS.length} steps)`);
  process.exit(errors.length ? 1 : 0);
}
