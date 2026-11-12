#!/usr/bin/env node
// The GitHub Pages tree, made from a BUILT kit (make-bundle.mjs). Run from the repo root:
//   node scripts/showcase/site-tree.mjs KIT_DIR OUT_DIR
// .github/workflows/kit-build.yml runs it; the `pages` job of kit-and-site.yml pushes OUT_DIR to the gh-pages branch. OUT_DIR gets: the kit's app/ (the relative-base build) WITHOUT app/pme-kit.json, the kit's
// LICENSES/, NOTICES.md and VERSION.txt, the repository's LICENSE, an empty .nojekyll and README.md from
// scripts/showcase/site/README.md with the kit's commit filled in. Rules learned while the site was published by hand:
//  - pme-kit.json is NEVER on the site: the app reads it to tell a kit from the site (apps/demo/src/app/kit-store.ts),
//    so with it the site would claim a kit store it does not have. Refused if it is still there after the copy.
//  - the README names the commit the site was built from (the kit's VERSION.txt `Commit:` line).
// OUT_DIR must not exist or be empty: the tree is the whole site, nothing of an older one is kept.
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '../..');

/** The site's README from the template: {{COMMIT}} (40 hex), {{SHORT}} (8), {{SUBJECT}}, {{VERSION}}, {{BUILT}}. */
export function siteReadme(template, version) {
  const commit = /^Commit:\s+([0-9a-f]{40})/m.exec(version)?.[1];
  if (!commit) throw new Error('the kit\'s VERSION.txt names no commit (a "Commit: <40 hex>" line)');
  if (/^Commit:.*uncommitted/m.test(version)) throw new Error('the kit was built from a tree with uncommitted changes: the site must name one commit');
  const subject = /^Subject:\s+(.*)$/m.exec(version)?.[1] ?? '';
  const built = /^Built:\s+(\S+)/m.exec(version)?.[1] ?? '';
  const pkg = JSON.parse(readFileSync(join(repo, 'packages/renderer/package.json'), 'utf8')).version;
  const out = template.replaceAll('{{COMMIT}}', commit).replaceAll('{{SHORT}}', commit.slice(0, 8)).replaceAll('{{SUBJECT}}', subject)
    .replaceAll('{{VERSION}}', pkg).replaceAll('{{BUILT}}', built);
  const left = /\{\{[A-Z]+\}\}/.exec(out);
  if (left) throw new Error(`site README template: unknown placeholder ${left[0]}`);
  return out;
}

export function siteTree(kit, out) {
  for (const f of ['app/index.html', 'VERSION.txt', 'NOTICES.md', 'LICENSES']) if (!existsSync(join(kit, f))) throw new Error(`not a built kit: no ${join(kit, f)}`);
  if (existsSync(out) && readdirSync(out).length) throw new Error(`${out} is not empty: the site tree is built into an empty folder`);
  mkdirSync(out, { recursive: true });
  cpSync(join(kit, 'app'), out, { recursive: true });
  rmSync(join(out, 'pme-kit.json'), { force: true });
  cpSync(join(kit, 'LICENSES'), join(out, 'LICENSES'), { recursive: true });
  for (const f of ['NOTICES.md', 'VERSION.txt']) cpSync(join(kit, f), join(out, f));
  cpSync(join(repo, 'LICENSE'), join(out, 'LICENSE'));
  writeFileSync(join(out, '.nojekyll'), '');
  const version = readFileSync(join(kit, 'VERSION.txt'), 'utf8');
  writeFileSync(join(out, 'README.md'), siteReadme(readFileSync(join(here, 'site/README.md'), 'utf8'), version));
  if (existsSync(join(out, 'pme-kit.json'))) throw new Error('pme-kit.json is in the site tree: the app would take the site for a kit');
  return readdirSync(out).sort();
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [kit, out] = process.argv.slice(2);
  if (!kit || !out) throw new Error('usage: node scripts/showcase/site-tree.mjs KIT_DIR OUT_DIR');
  const top = siteTree(resolve(kit), resolve(out));
  console.log(`site tree ready: ${resolve(out)}`);
  for (const f of top) console.log(`  ${f}`);
}
