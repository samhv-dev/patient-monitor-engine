// Which ci.yml jobs a change can affect, from the workspace's package graph. The one place the rule is set: ci.yml's
// `changes` job runs `plan` and every job's `if:` and the `verdict` job read its output.
//
// GRAPH: per workspace package, the packages its files import (`@pme/<name>`) or reach by a relative path into another
// package's folder. `src` edges come from shipped code and carry on: a change to engine-core reaches every package whose
// code imports it, and every package importing those. `test` edges come from tests and tooling (test/, e2e/, scripts/,
// *.test.*): they make the importing package's own tests depend on the target and go no further.
// packages/validation/test/ci-affected.test.ts scans the workspace and fails when GRAPH and the code disagree.
//
//   node scripts/ci/affected.mjs plan <changed-files.txt>   (env EVENT, HEAD_REF, LABELS (JSON), NIGHTLY)
//   → key=value lines for $GITHUB_OUTPUT and the job summary on stderr
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const GRAPH = {
  'packages/audio': { src: [], test: [] },
  'packages/skins': { src: [], test: ['packages/engine-core'] },
  'packages/engine-core': { src: ['packages/skins'], test: [] },
  'packages/controller': { src: ['packages/engine-core'], test: ['apps/demo', 'packages/ventilator'] },
  'packages/ventilator': { src: ['packages/engine-core'], test: [] },
  'packages/renderer': { src: ['packages/audio', 'packages/controller', 'packages/engine-core', 'packages/skins'], test: [] },
  'packages/validation': { src: ['packages/controller', 'packages/engine-core'], test: ['apps/demo', 'packages/skins'] },
  'apps/demo': {
    src: ['packages/audio', 'packages/controller', 'packages/engine-core', 'packages/renderer', 'packages/skins', 'packages/validation', 'packages/ventilator'],
    test: [],
  },
};

// The jobs whose work is one package's tests: each runs when the change reaches one of these packages. Every other job
// (build, unit, e2e, showcase) tests the demo or the whole workspace, which every package reaches.
export const SELECTIVE = {
  unit_core: ['packages/engine-core', 'packages/renderer', 'packages/skins', 'packages/audio'],
  test_slow: ['packages/engine-core'],
};

// A change here runs every job: the engine and its skins, the controller's scenario code, and the inputs every job shares
// (workflows, CI and repository scripts, the lockfile, the workspace and the root configs).
const FULL = [
  /^packages\/(engine-core|skins)\//,
  /^packages\/controller\/(src|test)\/scenario\//,
  /^\.github\//,
  /^scripts\//,
  /^(package\.json|pnpm-lock\.yaml|pnpm-workspace\.yaml|vitest\.workspace\.ts|typedoc\.json)$/,
  /^tsconfig[^/]*\.json$/,
  /^playwright[^/]*\.config\.ts$/,
];
const DOCUMENT = /^(docs\/|[^/]+\.md$|CITATION\.cff$)/;
// Read only by packages/validation's changelog test.
const OWNED = [[/^changes\//, 'packages/validation']];

const ROOT = resolve(import.meta.dirname, '../..');

/** The packages a change to `pkg` can affect the tests of: those whose own files reach it. */
export function reach(graph = GRAPH) {
  const closure = (p) => {
    const seen = new Set([p]);
    const stack = [...graph[p].src, ...graph[p].test];
    while (stack.length) {
      const q = stack.pop();
      if (seen.has(q)) continue;
      seen.add(q);
      stack.push(...graph[q].src);
    }
    return seen;
  };
  return Object.fromEntries(Object.keys(graph).map((p) => [p, closure(p)]));
}

function packageOf(path) {
  for (const [re, p] of OWNED) if (re.test(path)) return p;
  return Object.keys(GRAPH).find((p) => path.startsWith(`${p}/`));
}

/**
 * The run's plan. `files`: the paths the pull request changes. Everything runs on any event but a pull request, on a
 * merge runner's batch branch, on a pull request labelled run-validation, and when a changed path is in FULL or in no
 * known place.
 */
export function plan({ event, headRef = '', labels = [], files, nightly = false, owners = {} }) {
  let full = null;
  if (event !== 'pull_request') full = `a ${event} run`;
  else if (files.length === 0) full = 'an empty diff';
  else if (headRef.startsWith('batch/')) full = `the merge runner's batch branch ${headRef}`;
  else if (labels.includes('run-validation')) full = 'the run-validation label';
  const ownerOf = (f) => Object.entries(owners).find(([t]) => f === t || f.startsWith(t.endsWith('/') ? t : `${t}/`))?.[1];
  const isDocument = (f) => DOCUMENT.test(f) && !ownerOf(f);
  const code = full !== null || files.some((f) => !isDocument(f));
  const touched = new Set();
  for (const f of files) {
    if (isDocument(f)) continue;
    if (ownerOf(f)) { touched.add(ownerOf(f)); continue; }
    if (full === null && FULL.some((re) => re.test(f))) full = `${f} (an input of every job)`;
    const p = packageOf(f);
    if (p) touched.add(p);
    else if (full === null) full = `${f} (in no package the rule knows)`;
  }
  const r = reach();
  const runs = (pkgs) => full !== null || pkgs.some((p) => [...touched].some((t) => r[p].has(t)));
  const each = code && !nightly;
  const unitCore = each && runs(SELECTIVE.unit_core);
  const expect = {
    // the document checks are inside build, unit and unit (core); without all three, the docs job runs them
    docs: files.some(isDocument) && !unitCore,
    build: each,
    unit: each,
    unit_core: unitCore,
    e2e: code,
    showcase: each,
    test_slow: each && runs(SELECTIVE.test_slow),
  };
  const why = full !== null ? `every job: ${full}` : code ? `the packages changed: ${[...touched].sort().join(', ') || 'none'}` : 'documents only';
  return { full: full !== null, code, why, expect };
}

function workspace(root) {
  return Object.fromEntries(
    ['packages', 'apps'].flatMap((top) => readdirSync(join(root, top)).filter((d) => existsSync(join(root, top, d, 'package.json'))).map((d) => {
      const name = JSON.parse(readFileSync(join(root, top, d, 'package.json'), 'utf8')).name;
      return [name, `${top}/${d}`];
    })),
  );
}

/** Every reference a workspace file makes: an `@pme/<name>` import, or a relative path (resolved), with its kind. */
function* references(root) {
  const dirs = workspace(root);
  for (const dir of Object.values(dirs)) {
    for (const file of walk(join(root, dir))) {
      const rel = relative(join(root, dir), file);
      const kind = /(^|\/)(test|e2e|scripts)\//.test(rel) || /\.(test|spec|e2e|soak)\.[cm]?[jt]sx?$/.test(rel) ? 'test' : 'src';
      for (const line of readFileSync(file, 'utf8').split('\n')) {
        if (/^\s*(\/\/|\*|\/\*)/.test(line)) continue;
        for (const m of line.matchAll(/(?:from|import|require)\s*\(?\s*['"`]@pme\/([a-z-]+)/g)) if (dirs[`@pme/${m[1]}`]) yield { dir, kind, target: dirs[`@pme/${m[1]}`] };
        for (const m of line.matchAll(/['"`](\.\.?\/[^'"`$]*)/g)) yield { dir, kind, target: relative(root, resolve(dirname(file), m[1])) };
      }
    }
  }
}

/** Every package's edges as the code has them (what GRAPH must say). */
export function scan(root = ROOT) {
  const dirs = Object.values(workspace(root));
  const out = Object.fromEntries(dirs.map((d) => [d, { src: new Set(), test: new Set() }]));
  for (const { dir, kind, target } of references(root)) {
    const p = dirs.find((d) => target === d || target.startsWith(`${d}/`));
    if (p && p !== dir) out[dir][kind].add(p);
  }
  return Object.fromEntries(Object.entries(out).map(([d, e]) => [d, { src: [...e.src].sort(), test: [...[...e.test].filter((p) => !e.src.has(p))].sort() }]));
}

/** Files under a document path that shipped code imports or reads, each with that code's package. */
export function documentOwners(root = ROOT) {
  const owners = {};
  for (const { dir, kind, target } of references(root)) if (kind === 'src' && DOCUMENT.test(target)) owners[target] = dir;
  return owners;
}

function* walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', 'dist', 'coverage'].includes(e.name) || e.name.startsWith('.')) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (/\.[cm]?[jt]sx?$/.test(e.name)) yield p;
  }
}

/** The job summary: what runs and why, each selective job that does not run named with the packages it waits for. */
export function summary(p) {
  const rows = Object.entries(p.expect).map(([job, on]) => {
    const pkgs = SELECTIVE[job];
    const note = on ? 'runs' : pkgs ? `skipped: the change reaches none of ${pkgs.join(', ')}` : 'skipped';
    return `| ${job.replace('_', '-')} | ${note} |`;
  });
  return ['### The jobs this change can affect', '', `Rule: ${p.why}.`, '', '| job | |', '|---|---|', ...rows, ''].join('\n');
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href && process.argv[2] === 'plan') {
  const files = readFileSync(process.argv[3], 'utf8').split('\n').filter(Boolean);
  const p = plan({ event: process.env.EVENT, headRef: process.env.HEAD_REF, labels: JSON.parse(process.env.LABELS || 'null') ?? [], files, nightly: process.env.NIGHTLY === 'true', owners: documentOwners() });
  console.log(`code=${p.code}\nfull=${p.full}\nexpect=${JSON.stringify(p.expect)}`);
  console.error(summary(p));
}
