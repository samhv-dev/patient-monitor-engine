#!/usr/bin/env node
// An older commit is never published over a newer one (kit-and-site.yml, the owner's ruling of 12 Nov 2026: publish
// only after ci has passed on main). ci's runs on main are never cancelled and can finish out of order, so the run for
// an older merge may reach the publishing jobs after the run for a newer one. Each publishing job first asks GitHub how
// the commit it would publish relates to the one already published (GET /repos/{repo}/compare/{published}...{candidate})
// and publishes only when the candidate is strictly AHEAD of it (or nothing is published yet).
//   node scripts/showcase/publish-order.mjs REPO PUBLISHED_SHA|"" CANDIDATE_SHA   → prints "publish" or "skip: <why>"
// Needs `gh` with GH_TOKEN (read access is enough). Exits 0 either way; it fails only when GitHub cannot be asked.
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

/** status: GitHub's compare status of candidate against published ('ahead', 'behind', 'identical', 'diverged'), or
 *  null when nothing is published yet. */
export function decide(status) {
  if (status === null) return { publish: true, why: 'nothing is published yet' };
  if (status === 'ahead') return { publish: true, why: 'the candidate is newer than the published commit' };
  if (status === 'identical') return { publish: false, why: 'this commit is already published' };
  if (status === 'behind') return { publish: false, why: 'a newer commit is already published (an older ci run finished later)' };
  if (status === 'diverged') return { publish: false, why: 'the candidate and the published commit have diverged (main was rewritten?): nothing published, look at it by hand' };
  throw new Error(`unknown compare status: ${status}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [repo, published, candidate] = process.argv.slice(2);
  if (!repo || !/^[0-9a-f]{40}$/.test(candidate ?? '') || (published && !/^[0-9a-f]{40}$/.test(published))) {
    throw new Error('usage: node scripts/showcase/publish-order.mjs OWNER/REPO PUBLISHED_SHA|"" CANDIDATE_SHA (40 hex each)');
  }
  const status = published ? execFileSync('gh', ['api', `repos/${repo}/compare/${published}...${candidate}`, '--jq', '.status'], { encoding: 'utf8' }).trim() : null;
  const d = decide(status);
  console.log(d.publish ? 'publish' : `skip: ${d.why}`);
  console.error(`published ${published || 'none'}, candidate ${candidate}: ${status ?? 'no published commit'} → ${d.why}`);
}
