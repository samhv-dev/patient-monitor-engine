// The floor under ci.yml's verdict: what must have succeeded, from facts the workflow itself knows (the event, the ref,
// the head branch, the labels, the changed files), never from the path rule (scripts/ci/affected.mjs). The verdict job
// runs the base commit's copy of this file, so a pull request cannot lower the floor it is judged by. It imports
// nothing from the repository.
//   NEEDS='${{ toJSON(needs) }}' EVENT REF HEAD_REF LABELS (JSON) node floor.mjs <changed-files.txt>
import { appendFileSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const DOCUMENT = /^(docs\/|[^/]+\.md$|CITATION\.cff$)/;
const EVERY = /^(\.github\/|scripts\/ci\/)/;
const CODE_JOBS = ['changes', 'build', 'unit', 'e2e', 'showcase'];

/** { ok, why, missing }: the jobs the facts require that did not succeed. */
export function floor({ needs, event, ref = '', headRef = '', labels = [], files = [] }) {
  const result = (j) => needs[j]?.result ?? 'absent';
  const nightly = event === 'schedule' || event === 'workflow_dispatch' || (event === 'push' && ref.startsWith('refs/tags/'));
  let why, required;
  if (nightly) {
    // the nightly sets are the non-gating quarantine: its legs must have run, whatever they found
    why = `a ${event} run: the quarantine ran and was counted`;
    const missing = [result('changes') === 'success' ? null : 'changes', ['success', 'failure'].includes(result('e2e')) ? null : 'e2e'].filter(Boolean);
    return { ok: missing.length === 0, why, missing };
  }
  if (event === 'push') why = `a push to ${ref}`;
  else if (headRef.startsWith('batch/')) why = `the batch branch ${headRef}`;
  else if (labels.includes('run-validation')) why = 'the run-validation label';
  else if (files.some((f) => EVERY.test(f))) why = `${files.find((f) => EVERY.test(f))} changed`;
  if (why) { why = `every job: ${why}`; required = Object.keys(needs).filter((j) => j !== 'docs'); }
  else if (files.some((f) => !DOCUMENT.test(f))) { why = 'the code jobs: a code file changed'; required = CODE_JOBS; }
  else { why = 'documents only'; required = ['changes']; }
  const missing = required.filter((j) => result(j) !== 'success');
  if (['failure', 'cancelled'].includes(result('docs'))) missing.push('docs');
  return { ok: missing.length === 0, why, missing };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const files = process.argv[2] ? readFileSync(process.argv[2], 'utf8').split('\n').filter(Boolean) : [];
  const r = floor({ needs: JSON.parse(process.env.NEEDS), event: process.env.EVENT, ref: process.env.REF, headRef: process.env.HEAD_REF, labels: JSON.parse(process.env.LABELS || 'null') ?? [], files });
  const text = `### floor\n\n${r.why}: ${r.ok ? 'met' : `**NOT met**: ${r.missing.join(', ')} did not succeed`}\n`;
  console.log(text);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${text}\n`);
  for (const j of r.missing) console.log(`::error title=floor::${j}: ${r.why}`);
  process.exit(r.ok ? 0 : 1);
}
