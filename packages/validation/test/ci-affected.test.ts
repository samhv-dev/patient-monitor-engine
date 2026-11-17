// scripts/ci/affected.mjs, lanes.mjs and verdict.mjs: which ci.yml jobs a change runs, from the package graph; two test
// groups on one runner; and the one check a merge reads.
import { describe, expect, it } from 'vitest';
import { execSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
// @ts-expect-error -- a plain .mjs script without type declarations
import { GRAPH, SELECTIVE, documentOwners, plan, reach, scan } from '../../../scripts/ci/affected.mjs';
// @ts-expect-error -- a plain .mjs script without type declarations
import { floor } from '../../../scripts/ci/floor.mjs';
// @ts-expect-error -- a plain .mjs script without type declarations
import { laneRow, runLanes } from '../../../scripts/ci/lanes.mjs';
// @ts-expect-error -- a plain .mjs script without type declarations
import { verdict } from '../../../scripts/ci/verdict.mjs';

type Expect = Record<string, boolean>;
type Plan = { full: boolean; code: boolean; expect: Expect };
const pr = (files: string[], extra: Record<string, unknown> = {}) => plan({ event: 'pull_request', headRef: 'some-branch', labels: [], files, ...extra }) as Plan;
const yml = readFileSync(resolve(import.meta.dirname, '../../../.github/workflows/ci.yml'), 'utf8');
const ALL = { docs: false, build: true, unit: true, unit_core: true, e2e: true, showcase: true, test_slow: true };

describe('the package graph', () => {
  it('is the graph the code has: a package that gains an import the rule does not know fails here', () => {
    expect(scan()).toEqual(GRAPH);
  });

  it('sees an @pme import and every relative path into another package (through packages/ or a sibling), and keeps test edges apart', () => {
    const root = mkdtempSync(join(tmpdir(), 'ci-affected-'));
    const pkg = (dir: string, name: string, files: Record<string, string>) => {
      mkdirSync(join(root, dir), { recursive: true });
      writeFileSync(join(root, dir, 'package.json'), JSON.stringify({ name }));
      for (const [f, text] of Object.entries(files)) {
        mkdirSync(join(root, dir, f, '..'), { recursive: true });
        writeFileSync(join(root, dir, f), text);
      }
    };
    pkg('packages/a', '@pme/a', {
      'src/index.ts': "import { b } from '@pme/b';\n// import { c } from '@pme/c';\nimport t from '../../../docs/i18n/t.json';\n",
      'test/x.test.ts': "readFileSync(new URL('../../../apps/d/data.json', import.meta.url));\nimport { c } from '../../c/src/index.ts';\nreadFileSync('../../../docs/only-a-test-reads.md');\n",
    });
    pkg('packages/b', '@pme/b', { 'src/index.ts': "export const b = 1;\nexport { a } from './local.ts';\n" });
    pkg('packages/c', '@pme/c', { 'src/index.ts': 'export const c = 1;\n' });
    pkg('apps/d', '@pme/d', { 'src/main.ts': "const m = await import('@pme/a');\n" });
    expect(scan(root)).toEqual({
      'packages/a': { src: ['packages/b'], test: ['apps/d', 'packages/c'] },
      'packages/b': { src: [], test: [] },
      'packages/c': { src: [], test: [] },
      'apps/d': { src: ['packages/a'], test: [] },
    });
    expect(documentOwners(root)).toEqual({ 'docs/i18n/t.json': 'packages/a' });
  });

  it('carries a change on along shipped code only: a test that reads the demo does not make the demo reach the engine', () => {
    const r = reach() as Record<string, Set<string>>;
    expect([...r['packages/engine-core']!].sort()).toEqual(['packages/engine-core', 'packages/skins']);
    expect(r['packages/renderer']!.has('apps/demo')).toBe(false);
    expect(r['packages/controller']!.has('apps/demo')).toBe(true); // its scenario tests read the showcase cards
    for (const p of Object.keys(GRAPH)) expect(r['apps/demo']!.has(p)).toBe(true);
  });
});

describe('the plan', () => {
  it.each([
    ['a push to main', { event: 'push', files: [] }],
    ['a batch branch of the merge runner', { event: 'pull_request', headRef: 'batch/1117-1353-507-500', files: ['apps/demo/src/x.ts'] }],
    ['a pull request labelled run-validation', { event: 'pull_request', labels: ['run-validation'], files: ['apps/demo/src/x.ts'] }],
  ])('runs every job on %s', (_, input) => {
    expect((plan(input) as Plan).expect).toEqual(ALL);
  });

  it.each([
    ['a batch branch of the merge runner', { headRef: 'batch/1117-1353-507-500' }],
    ['a pull request labelled run-validation', { labels: ['run-validation'] }],
  ])('runs every job on %s that changes documents only', (_, extra) => {
    expect(pr(['docs/guides/x.md'], extra).expect).toEqual(ALL);
  });

  it('runs every job on an empty diff', () => {
    expect(pr([]).expect).toEqual(ALL);
  });

  it('sees a move at both of its paths, as ci.yml lists them: an engine file moved into the demo or into docs/', () => {
    const cmd = /git diff --name-only[^\n>]*HEAD\^1 HEAD/.exec(yml)?.[0] ?? '';
    expect(cmd).toContain('--no-renames');
    for (const to of ['apps/demo/src/x.ts', 'docs/x.ts']) {
      const repo = mkdtempSync(join(tmpdir(), 'ci-move-'));
      const git = (c: string) => execSync(`git -c user.name=t -c user.email=t@t ${c}`, { cwd: repo, encoding: 'utf8' });
      git('init -q');
      mkdirSync(join(repo, 'packages/engine-core/src'), { recursive: true });
      writeFileSync(join(repo, 'packages/engine-core/src/x.ts'), 'export const x = 1;\n'.repeat(20));
      git('add -A');
      git('commit -qm a');
      mkdirSync(join(repo, to, '..'), { recursive: true });
      git(`mv packages/engine-core/src/x.ts ${to}`);
      git('commit -qm b');
      const files = git(cmd.slice(4)).split('\n').filter(Boolean);
      expect(files.sort()).toEqual([to, 'packages/engine-core/src/x.ts'].sort());
      expect(pr(files).full).toBe(true);
    }
  });

  it('counts a file under a document path that shipped code reads as a file of that code, found by the scan', () => {
    const owners = documentOwners() as Record<string, string>;
    expect(owners['docs/showcase/i18n/fa-debrief.json']).toBe('apps/demo');
    for (const [doc, p] of Object.entries(owners)) expect(Object.keys(GRAPH)).toContain(p), expect(doc).toMatch(/^docs\/|\.md$/);
    const p = pr(['docs/showcase/i18n/fa-debrief.json'], { owners });
    expect(p.code).toBe(true);
    expect(p.expect).toEqual({ ...ALL, unit_core: false, test_slow: false });
  });

  it.each([
    'packages/engine-core/src/l2/x.ts',
    'packages/skins/src/x.ts',
    'packages/controller/src/scenario/driver.ts',
    'packages/controller/test/scenario/driver.test.ts',
    '.github/workflows/ci.yml',
    'scripts/ci/e2e-count.mjs',
    'pnpm-lock.yaml',
    'tsconfig.base.json',
    'playwright.config.ts',
    'research/notes.md',
    '.gitignore',
  ])('runs every job when a pull request changes %s', (f) => {
    const p = pr([f, 'apps/demo/src/x.ts']);
    expect(p.full).toBe(true);
    expect(p.expect).toEqual(ALL);
  });

  it('skips unit (core) and the slow groups for an interface change, and nothing else', () => {
    expect(pr(['apps/demo/src/app/views/x.ts', 'changes/unreleased/x.md']).expect).toEqual({ ...ALL, unit_core: false, test_slow: false });
  });

  it('runs unit (core) for the controller and the renderer, which the renderer imports, and not the slow groups', () => {
    for (const f of ['packages/controller/src/session/x.ts', 'packages/renderer/src/x.ts', 'packages/audio/src/x.ts']) {
      expect(pr([f]).expect).toEqual({ ...ALL, test_slow: false });
    }
  });

  it('runs neither for the ventilator or validation, whose code only the demo imports', () => {
    for (const f of ['packages/ventilator/src/x.ts', 'packages/validation/src/x.ts']) expect(pr([f]).expect).toEqual({ ...ALL, unit_core: false, test_slow: false });
  });

  it('runs the documents job beside the others when a partial run also changes a document', () => {
    expect(pr(['apps/demo/src/x.ts', 'docs/guides/x.md']).expect).toEqual({ ...ALL, docs: true, unit_core: false, test_slow: false });
  });

  it('leaves the documents job out when build, unit and unit (core) run its readers', () => {
    expect(pr(['packages/controller/src/session/x.ts', 'NOTICES.md']).expect).toEqual({ ...ALL, test_slow: false });
  });

  it('runs the documents job alone for documents only', () => {
    const p = pr(['docs/guides/x.md', 'README.md', 'CITATION.cff']);
    expect(p.code).toBe(false);
    expect(p.expect).toEqual({ docs: true, build: false, unit: false, unit_core: false, e2e: false, showcase: false, test_slow: false });
  });

  it('runs only the e2e sets of the nightly run', () => {
    expect((plan({ event: 'schedule', files: [], nightly: true }) as Plan).expect).toEqual({ docs: false, build: false, unit: false, unit_core: false, e2e: true, showcase: false, test_slow: false });
  });
});

describe('ci.yml', () => {
  const jobs = [...yml.matchAll(/^ {2}([a-z0-9-]+):\n/gm)].map((m) => m[1]!).filter((j) => yml.indexOf(`\n  ${j}:\n`) > yml.indexOf('\njobs:\n'));
  const keys = Object.keys(pr(['apps/demo/src/x.ts']).expect);

  it('gates every job on its own key of the plan, and the verdict needs every job', () => {
    const gated = jobs.filter((j) => j !== 'changes' && j !== 'verdict');
    expect(gated.map((j) => j.replaceAll('-', '_')).sort()).toEqual([...keys].sort());
    for (const j of gated) expect(yml).toContain(`\n  ${j}:\n    needs: changes\n    if: fromJSON(needs.changes.outputs.expect).${j.replaceAll('-', '_')}\n`);
    expect(yml).toContain(`\n  verdict:\n    needs: [${['changes', ...gated].join(', ')}]\n`);
  });

  it('runs the verdict even in a cancelled run, and bounds the changes job', () => {
    expect(yml).toMatch(/\n {2}verdict:\n {4}needs: \[[^\]]+\]\n {4}if: \$\{\{ always\(\) \}\}\n/);
    expect(yml).toMatch(/\n {2}changes:\n {4}runs-on: ubuntu-latest\n {4}timeout-minutes: \d+\n/);
    for (const m of yml.matchAll(/git diff --name-only[^\n]*/g)) expect(m[0]).toContain('--no-renames');
  });

  it('runs the floor from the base commit', () => {
    expect(yml).toContain('git show HEAD^1:scripts/ci/floor.mjs');
  });

  it('names every selective job in the plan', () => {
    for (const k of Object.keys(SELECTIVE)) expect(keys).toContain(k);
  });
});

describe('two groups on one runner', () => {
  const node = (code: number) => ({ cmd: process.execPath, args: ['-e', `console.log('out'); process.exit(${code})`], env: {} });

  it("returns each lane's own exit code and prefixes its output with its name", async () => {
    const lines: string[] = [];
    const r = await runLanes([{ name: 'ok', ...node(0) }, { name: 'bad', ...node(3) }], (s: string) => lines.push(s));
    expect(r).toEqual([{ name: 'ok', code: 0 }, { name: 'bad', code: 3 }]);
    expect(lines.sort()).toEqual(['[bad] out\n', '[ok] out\n']);
  });

  it('fails a lane that wrote no report, and names each failed file and test', () => {
    expect(laneRow({ name: 'slow-a', code: 0 }, null).ok).toBe(false);
    const report = {
      numPassedTests: 1,
      numTotalTests: 2,
      testResults: [{ name: '/w/packages/engine-core/test/engine/a.test.ts', status: 'failed', assertionResults: [{ status: 'passed', fullName: 'a ok' }, { status: 'failed', fullName: 'drift > stays put' }] }],
    };
    const row = laneRow({ name: 'slow-a', code: 1 }, report);
    expect(row.ok).toBe(false);
    expect(row.line).toContain('**test/engine/a.test.ts > drift > stays put**');
    const broken = laneRow({ name: 'slow-b', code: 1 }, { testResults: [{ name: '/w/test/engine/b.test.ts', status: 'failed', message: 'SyntaxError: x', assertionResults: [] }] });
    expect(broken.line).toContain('test/engine/b.test.ts (the file failed to run: SyntaxError: x)');
    expect(laneRow({ name: 'slow-c', code: 0 }, { numPassedTests: 2, numTotalTests: 2, testResults: [] }).ok).toBe(true);
  });
});

describe('the verdict', () => {
  const plan = { docs: false, build: true, unit_core: false };
  it('passes when every expected job succeeded and every other skipped', () => {
    expect(verdict({ changes: { result: 'success' }, docs: { result: 'skipped' }, build: { result: 'success' }, 'unit-core': { result: 'skipped' } }, plan).ok).toBe(true);
  });
  it.each([
    ['an expected job skipped (its needs failed)', { build: { result: 'skipped' } }],
    ['an expected job failed', { build: { result: 'failure' } }],
    ['an expected job cancelled', { build: { result: 'cancelled' } }],
    ['a job the plan left out ran', { 'unit-core': { result: 'success' } }],
    ['the plan itself failed', { changes: { result: 'failure' } }],
    ['a job the plan does not know', { other: { result: 'success' } }],
  ])('fails when %s', (_, change) => {
    expect(verdict({ changes: { result: 'success' }, docs: { result: 'skipped' }, build: { result: 'success' }, 'unit-core': { result: 'skipped' }, ...change }, plan).ok).toBe(false);
  });
});

describe('the verdict on the nightly run', () => {
  const needs = (e2e: string) => ({ changes: { result: 'success' }, e2e: { result: e2e }, build: { result: 'skipped' } });
  const expect_ = { e2e: true, build: false };
  it('accepts a failed quarantine leg on the nightly run, as the quarantine job itself does, and nowhere else', () => {
    expect(verdict(needs('failure'), expect_, true).ok).toBe(true);
    expect(verdict(needs('failure'), expect_, false).ok).toBe(false);
    expect(verdict(needs('skipped'), expect_, true).ok).toBe(false);
    expect(verdict(needs('cancelled'), expect_, true).ok).toBe(false);
  });
});

describe('the floor, from the facts alone', () => {
  const JOBS = ['changes', 'docs', 'build', 'unit', 'unit-core', 'e2e', 'showcase', 'test-slow'];
  const all = (r: string) => Object.fromEntries(JOBS.map((j) => [j, { result: j === 'changes' ? 'success' : r }]));
  const ok = all('success');
  const nothing = all('skipped'); // what a path rule that switched everything off would leave

  it('imports nothing from the repository, so the path rule cannot reach it', () => {
    const src = readFileSync(resolve(import.meta.dirname, '../../../scripts/ci/floor.mjs'), 'utf8');
    for (const m of src.matchAll(/^import .* from '([^']+)';$/gm)) expect(m[1]).toMatch(/^node:/);
  });

  it.each([
    ['a push to main', { event: 'push', ref: 'refs/heads/main' }],
    ['a batch branch', { event: 'pull_request', headRef: 'batch/1117-1', files: ['docs/x.md'] }],
    ['the run-validation label', { event: 'pull_request', labels: ['run-validation'], files: ['docs/x.md'] }],
    ['a workflow change', { event: 'pull_request', files: ['.github/workflows/ci.yml'] }],
    ['a change to the CI scripts', { event: 'pull_request', files: ['scripts/ci/affected.mjs'] }],
  ])('fails on %s unless every job succeeded', (_, facts) => {
    expect(floor({ needs: nothing, ...facts }).ok).toBe(false);
    expect(floor({ needs: { ...ok, 'test-slow': { result: 'skipped' } }, ...facts }).ok).toBe(false);
    expect(floor({ needs: ok, ...facts }).ok).toBe(true);
  });

  it('needs the code jobs for any code change, and lets the path rule skip unit (core) and the slow groups', () => {
    const facts = { event: 'pull_request', files: ['apps/demo/src/x.ts'] };
    expect(floor({ needs: nothing, ...facts }).ok).toBe(false);
    expect(floor({ needs: { ...ok, 'unit-core': { result: 'skipped' }, 'test-slow': { result: 'skipped' } }, ...facts }).ok).toBe(true);
    expect(floor({ needs: { ...ok, docs: { result: 'failure' } }, ...facts }).ok).toBe(false);
  });

  it('needs the quarantine to have run on the nightly run, whatever it found', () => {
    const night = (e2e: string) => floor({ needs: { ...nothing, e2e: { result: e2e } }, event: 'schedule' }).ok;
    expect(night('failure')).toBe(true);
    expect(night('success')).toBe(true);
    expect(night('skipped')).toBe(false);
    expect(night('cancelled')).toBe(false);
  });
});
