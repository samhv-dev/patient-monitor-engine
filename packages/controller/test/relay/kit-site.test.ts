// The kit-and-site workflow (brief 169): the classroom kit and the GitHub Pages site are built and published by
// .github/workflows/kit-and-site.yml (every merge to main) and release.yml (a v* tag), both through kit-build.yml.
// These tests pin the rules learned while the site was published by hand, and the workflows' safety rules:
//  - pme-kit.json is never on the site (the app reads it to tell a kit from the site: apps/demo/src/app/kit-store.ts);
//  - the site's README names the commit; the site tree is LICENSE, LICENSES/, NOTICES.md, VERSION.txt, .nojekyll,
//    README.md and the app;
//  - nothing runs `git worktree prune` (the hand script's lesson: it deleted other worktrees' records);
//  - write permission only in the jobs that publish, no pull_request trigger, no secret but the built-in token, every
//    action pinned by version and already used in this repository, gh-pages pushed as a fast-forward (never forced).
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '../../../..');
const showcase = join(root, 'scripts/showcase');
const workflows = join(root, '.github/workflows');
const site = (await import(pathToFileURL(join(showcase, 'site-tree.mjs')).href)) as {
  siteTree: (kit: string, out: string) => string[];
  siteReadme: (template: string, version: string) => string;
};
const COMMIT = '0123456789abcdef0123456789abcdef01234567';
const version = (commitLine = `Commit:   ${COMMIT}`) =>
  ['Patient monitor simulator - offline showcase kit', commitLine, 'Branch:   main', 'Subject:  Merge pull request #1 from x/y', 'Built:    2026-11-12T00:00:00.000Z', ''].join('\n');

/** A small stand-in for a built kit: what make-bundle.mjs writes that the site takes, pme-kit.json included. */
function fakeKit(versionText = version()) {
  const kit = mkdtempSync(join(tmpdir(), 'kit-site-'));
  mkdirSync(join(kit, 'app/assets'), { recursive: true });
  writeFileSync(join(kit, 'app/index.html'), '<div id="app"></div>');
  writeFileSync(join(kit, 'app/assets/index-abc.js'), '');
  writeFileSync(join(kit, 'app/pme-kit.json'), '{"kit":true}\n');
  mkdirSync(join(kit, 'LICENSES'));
  writeFileSync(join(kit, 'LICENSES/MIT.txt'), 'MIT');
  writeFileSync(join(kit, 'NOTICES.md'), '# Notices');
  writeFileSync(join(kit, 'VERSION.txt'), versionText);
  mkdirSync(join(kit, 'server'));
  writeFileSync(join(kit, 'server/relay.mjs'), '');
  return kit;
}
const empty = () => join(mkdtempSync(join(tmpdir(), 'site-out-')), 'site');

describe('the site tree (scripts/showcase/site-tree.mjs)', () => {
  it('is the app plus LICENSE, LICENSES, NOTICES.md, VERSION.txt, .nojekyll and README.md; never pme-kit.json, never the kit\'s servers', () => {
    const out = empty();
    const top = site.siteTree(fakeKit(), out);
    expect(top).toEqual(['.nojekyll', 'LICENSE', 'LICENSES', 'NOTICES.md', 'README.md', 'VERSION.txt', 'assets', 'index.html']);
    expect(readdirSync(out)).not.toContain('pme-kit.json');
    expect(readFileSync(join(out, '.nojekyll'), 'utf8')).toBe('');
    expect(readFileSync(join(out, 'LICENSE'), 'utf8')).toBe(readFileSync(join(root, 'LICENSE'), 'utf8'));
    expect(readFileSync(join(out, 'VERSION.txt'), 'utf8')).toBe(version());
  });

  it('the README names the kit\'s commit (full and short) and leaves no placeholder', () => {
    const out = empty();
    site.siteTree(fakeKit(), out);
    const readme = readFileSync(join(out, 'README.md'), 'utf8');
    expect(readme).toContain(`/commit/${COMMIT}`);
    expect(readme).toContain(`\`main\` ${COMMIT.slice(0, 8)} (Merge pull request #1 from x/y)`);
    expect(readme).not.toMatch(/\{\{/);
    expect(readme).toMatch(/not a medical device/);
  });

  it('refuses a kit whose VERSION.txt names no commit or a tree with uncommitted changes, and an output folder that is not empty', () => {
    const t = readFileSync(join(showcase, 'site/README.md'), 'utf8');
    expect(() => site.siteReadme(t, version('Commit:   unknown'))).toThrow(/names no commit/);
    expect(() => site.siteReadme(t, version(`Commit:   ${COMMIT} (with uncommitted changes)`))).toThrow(/uncommitted/);
    const out = empty();
    mkdirSync(out);
    writeFileSync(join(out, 'old.html'), '');
    expect(() => site.siteTree(fakeKit(), out)).toThrow(/not empty/);
  });
});

/** The jobs of a workflow file: name → its text (the lines under `jobs:` indented by two spaces start a job). */
function jobs(text: string) {
  const body = text.slice(text.indexOf('\njobs:\n'));
  const parts = body.split(/\n(?=  [a-z][\w-]*:\n)/).slice(1);
  return Object.fromEntries(parts.map((p) => [/^ {2}([\w-]+):/.exec(p)![1], p]));
}
const read = (f: string) => readFileSync(join(workflows, f), 'utf8');

describe('the kit and site workflows', () => {
  it('nothing runs git worktree prune (the workflows and the kit scripts)', () => {
    const files = [...readdirSync(workflows).map((f) => join(workflows, f)), ...readdirSync(showcase).filter((f) => f.endsWith('.mjs')).map((f) => join(showcase, f))];
    for (const f of files) expect(readFileSync(f, 'utf8'), f).not.toMatch(/worktree\s+prune/);
  });

  it('kit-and-site.yml: write permission only in the pages and prerelease jobs, which publish only from main, never on a dry run', () => {
    const w = read('kit-and-site.yml');
    expect(w).toMatch(/\npermissions: \{\}\n/);
    const j = jobs(w);
    expect(Object.keys(j)).toEqual(['kit', 'pages', 'prerelease']);
    expect(j.kit).toMatch(/permissions:\n\s+contents: read/);
    expect(j.kit).not.toMatch(/write/);
    for (const name of ['pages', 'prerelease']) {
      expect(j[name]).toMatch(/permissions:\n\s+contents: write\n/);
      expect(j[name]).toContain("github.repository == 'samhv-dev/patient-monitor-engine' && github.ref == 'refs/heads/main' && (github.event_name == 'push' || !inputs.dry_run)");
    }
  });

  it('kit-and-site.yml: runs on push to main and by hand only (no pull_request), one run per ref at a time, none cancelled', () => {
    const w = read('kit-and-site.yml');
    const on = w.slice(w.indexOf('\non:\n'), w.indexOf('\npermissions:'));
    expect(on).toMatch(/push:\n\s+branches: \[main\]/);
    expect(on).toMatch(/workflow_dispatch:/);
    expect(on).not.toMatch(/pull_request/);
    expect(w).toMatch(/concurrency:\n\s+group: kit-and-site-\$\{\{ github\.ref \}\}\n\s+cancel-in-progress: false/);
  });

  it('gh-pages is pushed as a fast-forward with the built-in token; kit-latest is a pre-release that is never "latest"', () => {
    const j = jobs(read('kit-and-site.yml'));
    expect(j.pages).toContain('git push origin HEAD:gh-pages');
    expect(j.pages).not.toMatch(/--force|\s-f\s/);
    expect(j.pages).toContain('test ! -e pme-kit.json');
    expect(j.prerelease).toMatch(/T=kit-latest/);
    for (const cmd of ['gh release edit', 'gh release create']) expect(j.prerelease).toMatch(new RegExp(`${cmd} [^\\n]*--prerelease --latest=false`));
  });

  it('the kit workflows and release.yml: no secret but the built-in token, every action pinned by version and already used in ci.yml', () => {
    const ci = read('ci.yml');
    for (const f of ['kit-and-site.yml', 'kit-build.yml', 'release.yml']) {
      const w = read(f);
      expect(w, f).not.toMatch(/secrets\./);
      for (const [, action = ''] of w.matchAll(/uses: (\S+)/g)) {
        if (action.startsWith('./')) continue;
        expect(action, `${f}: ${action}`).toMatch(/@v\d+$/);
        expect(ci, `${f}: ${action} is not used in ci.yml`).toContain(`uses: ${action}`);
      }
    }
  });

  it('release.yml builds the kit through kit-build.yml with versioned names and attaches both zips; only its release job can write', () => {
    const w = read('release.yml');
    expect(w).toMatch(/\npermissions: \{\}\n/);
    const j = jobs(w);
    expect(j.kit).toMatch(/uses: \.\/\.github\/workflows\/kit-build\.yml/);
    expect(j.kit).toMatch(/naming: release/);
    expect(j.kit).not.toMatch(/write/);
    expect(j.release).toMatch(/needs: kit/);
    expect(j.release).toMatch(/permissions:\n\s+contents: write/);
    const sums = j.release.slice(j.release.indexOf('sha256sum '), j.release.indexOf('> SHA256SUMS.txt'));
    const create = j.release.slice(j.release.indexOf('gh release create'));
    for (const zip of ['pme-classroom-kit-$V.zip', 'pme-classroom-kit-windows-$V.zip']) {
      expect(create, `${zip} attached`).toContain(`"release/${zip}"`);
      expect(sums, `${zip} in SHA256SUMS.txt`).toContain(`"${zip}"`);
    }
  });

  it('kit-build.yml: the Windows Node.js is pinned (version and SHA-256) and checked before make-bundle.mjs gets it', () => {
    const w = read('kit-build.yml');
    expect(w).toMatch(/WIN_NODE_VERSION: v22\.\d+\.\d+\n/);
    expect(w).toMatch(/WIN_NODE_SHA256: [0-9a-f]{64}\n/);
    expect(w).toContain('sha256sum -c -');
    expect(w.indexOf('sha256sum -c -')).toBeLessThan(w.indexOf('--win-node'));
  });
});
