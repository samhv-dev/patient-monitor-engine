#!/usr/bin/env node
// Nothing is published unless ci has passed on a push to main for exactly the commit to publish (kit-and-site.yml).
// The decision is made from each run's own fields, never from the run list's `status` filter: GitHub can answer a
// filtered question with no runs while the same question without the filter lists the completed, successful run.
//   gh api "repos/OWNER/REPO/actions/workflows/ci.yml/runs?head_sha=SHA&event=push&branch=main&per_page=100" \
//     | node scripts/showcase/ci-passed.mjs SHA   → exit 0 when such a run exists, exit 1 (and an error line) otherwise
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const passed = (run, sha) =>
  run.head_sha === sha && run.event === 'push' && run.head_branch === 'main' && run.status === 'completed' && run.conclusion === 'success';

/** answer: GitHub's reply to GET /repos/{repo}/actions/workflows/ci.yml/runs; sha: the commit to publish. */
export function ciPassed(answer, sha) {
  const run = (answer?.workflow_runs ?? []).find((r) => passed(r, sha));
  return run
    ? { publish: true, why: `ci run ${run.id} of a push to main passed on ${sha}` }
    : { publish: false, why: `no successful ci run of a push to main for ${sha}: nothing is published` };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const sha = process.argv[2] ?? '';
  if (!/^[0-9a-f]{40}$/.test(sha)) throw new Error('usage: gh api …/ci.yml/runs?… | node scripts/showcase/ci-passed.mjs SHA (40 hex)');
  const d = ciPassed(JSON.parse(readFileSync(0, 'utf8')), sha);
  if (d.publish) console.log(d.why);
  else {
    console.log(`::error::${d.why}`);
    process.exitCode = 1;
  }
}
