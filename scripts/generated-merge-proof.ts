// Shows that independent changes never meet in the generated pages. In a throwaway copy of the committed tree, a few
// branches each add files to one module and regenerate the pages; every pair is merged with `git merge-tree` and must
// merge clean, and the merged tree must be exactly what the generators produce from it. The last pair inserts two
// files at the same point of one module's sorted file list: it is expected to conflict (a committed sorted list
// cannot avoid that) and is reported as such.
//   node --experimental-strip-types scripts/generated-merge-proof.ts   → exit 1 if a pair behaves otherwise
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { CENSUS_PAGE, census, renderCensus } from './coupling-seams.ts';
import { renderKnownMisses } from './known-misses.ts';
import { renderAll } from './model-docs.ts';

type Files = Record<string, string>;
const source = (name: string) => `// A file added by the merge proof.\nexport const ${name.toUpperCase()}_GAIN = 2;\nexport function ${name}(x: number) {\n  return x * ${name.toUpperCase()}_GAIN * 3;\n}\n`;
const test = (name: string) => `import { expect, it } from 'vitest';\nit('${name}', () => expect(1).toBe(1));\n`;

const BRANCHES: Record<string, Files> = {
  circulation: { 'packages/engine-core/src/l2/circ/proof-a.ts': source('proofA') },
  'pressure-waveforms': { 'packages/engine-core/src/l2/hemo/proof-b.ts': source('proofB'), 'packages/engine-core/test/l2/hemo/proof-b.test.ts': test('proof b') },
  'presentation-two': { 'apps/demo/src/app/proof-c1.ts': source('proofC1'), 'apps/demo/src/app/proof-c2.ts': source('proofC2') },
  'presentation-other': { 'apps/demo/src/app/a-proof-d.ts': source('proofD') },
  'presentation-same-gap': { 'apps/demo/src/app/proof-c3.ts': source('proofC3') },
};
const EXPECTED_CONFLICT = new Set(['presentation-two+presentation-same-gap']);

const env = { ...process.env, GIT_AUTHOR_NAME: 'merge-proof', GIT_AUTHOR_EMAIL: 'proof@example.invalid', GIT_COMMITTER_NAME: 'merge-proof', GIT_COMMITTER_EMAIL: 'proof@example.invalid' };
const git = (cwd: string, ...args: string[]) => execFileSync('git', args, { cwd, env, encoding: 'utf8' }).trim();

async function regenerate(dir: string) {
  for (const [p, text] of await renderAll(dir)) writeFileSync(join(dir, p), text);
  writeFileSync(join(dir, CENSUS_PAGE), renderCensus(census(dir)));
  writeFileSync(join(dir, 'docs/validation/known-misses.md'), renderKnownMisses(dir));
}

const root = resolve(import.meta.dirname, '..');
const tmp = mkdtempSync(join(tmpdir(), 'pme-merge-proof-'));
const failures: string[] = [];
try {
  const repo = join(tmp, 'repo');
  mkdirSync(repo);
  execFileSync('sh', ['-c', `git -C "${root}" archive HEAD | tar -x -C "${repo}"`]);
  git(repo, 'init', '-q', '-b', 'base');
  await regenerate(repo);
  git(repo, 'add', '-A');
  git(repo, 'commit', '-q', '-m', 'base');

  const heads: Record<string, string> = {};
  for (const [name, files] of Object.entries(BRANCHES)) {
    const dir = join(tmp, name);
    git(repo, 'worktree', 'add', '-q', '-b', name, dir, 'base');
    for (const [p, text] of Object.entries(files)) {
      mkdirSync(dirname(join(dir, p)), { recursive: true });
      writeFileSync(join(dir, p), text);
    }
    await regenerate(dir);
    git(dir, 'add', '-A');
    git(dir, 'commit', '-q', '-m', name);
    heads[name] = git(dir, 'rev-parse', 'HEAD');
    console.log(`${name}: ${git(dir, 'diff', '--name-only', 'base', 'HEAD').split('\n').filter((f) => !(f in files)).join(', ')}`);
  }

  const names = Object.keys(BRANCHES);
  for (const [i, a] of names.entries())
    for (const b of names.slice(i + 1)) {
      const pair = `${a}+${b}`;
      const merge = spawnSync('git', ['merge-tree', '--write-tree', '--name-only', '--no-messages', heads[a]!, heads[b]!], { cwd: repo, env, encoding: 'utf8' });
      const [tree, ...conflicted] = merge.stdout.trim().split('\n');
      if (merge.status !== 0) {
        const expected = EXPECTED_CONFLICT.has(pair);
        console.log(`${pair}: conflict in ${conflicted.join(', ')}${expected ? ' (expected: the same point of a sorted list)' : ''}`);
        if (!expected) failures.push(pair);
        continue;
      }
      if (EXPECTED_CONFLICT.has(pair)) console.log(`${pair}: clean (expected a conflict)`);
      const commit = git(repo, 'commit-tree', tree!, '-p', heads[a]!, '-p', heads[b]!, '-m', pair);
      const dir = join(tmp, `merge-${i}-${b}`);
      git(repo, 'worktree', 'add', '-q', '--detach', dir, commit);
      await regenerate(dir);
      const stale = git(dir, 'status', '--porcelain');
      console.log(`${pair}: clean${stale ? `, but the merged pages are stale: ${stale.replace(/\n/g, ', ')}` : ', merged pages current'}`);
      if (stale) failures.push(pair);
    }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
if (failures.length) {
  console.error(`generated-merge-proof: ${failures.join('; ')}`);
  process.exit(1);
}
