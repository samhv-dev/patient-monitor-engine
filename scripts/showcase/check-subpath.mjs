#!/usr/bin/env node
// Static half of the sub-path proof: the built app must not contain root-absolute URLs (src="/…", href="/…",
// url(/…), "/assets/…"), which would break when the site is served below a path prefix such as /<repo>/.
// The runtime half is the rehearsal run with SHOWCASE_PREFIX=/patient-monitor-engine/ (see docs/showcase/KIT-GATE.md).
//   node scripts/showcase/check-subpath.mjs [KIT_OR_APP_DIR]
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

let src = resolve(process.argv[2] ?? 'pme-showcase');
if (existsSync(join(src, 'app/index.html'))) src = join(src, 'app');
if (!existsSync(join(src, 'index.html'))) throw new Error(`no built app at ${src}`);
const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
const files = walk(src).filter((f) => /\.(html|css|js)$/.test(f));
const bad = [];
for (const f of files) {
  const t = readFileSync(f, 'utf8');
  for (const re of [/\b(?:src|href)\s*=\s*["']\/(?!\/)[^"']*/g, /url\(\s*["']?\/(?!\/)[^)"']*/g, /["'`]\/assets\/[^"'`]*/g]) {
    for (const m of t.matchAll(re)) bad.push(`${relative(src, f)}: ${m[0].slice(0, 80)}`);
  }
}
const html = files.filter((f) => f.endsWith('.html'));
const relRefs = html.reduce((n, f) => n + [...readFileSync(f, 'utf8').matchAll(/(?:src|href)="\.\//g)].length, 0);
console.log(`${files.length} html/css/js files; ${html.length} pages with ${relRefs} "./" references; root-absolute URLs: ${bad.length}`);
for (const b of bad.slice(0, 30)) console.log(`  ${b}`);
process.exit(bad.length ? 1 : 0);
