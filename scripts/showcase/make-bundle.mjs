#!/usr/bin/env node
// Offline showcase kit builder. Run from the repo root:
//   node scripts/showcase/make-bundle.mjs [OUTPUT_DIR]        (default ./pme-showcase)
// Builds apps/demo with a relative base (works from any folder and any port) and assembles OUTPUT_DIR:
//   app/                      the built site (the whole dist: the one-page app plus the pages it frames)
//   Start Simulator.command   double-click launcher (macOS)
//   server/                   serve.mjs (bundled node), serve.rb (ruby/WEBrick), serve.pl (core perl), serve.py
//   runtime/                  node-<arch> ONLY if this machine's node is an official signed Node.js build; else empty
//   READ ME FIRST.txt, VERSION.txt
// Rerunnable: it replaces only the kit's own entries, so a videos/ folder (or anything else) beside them is kept.
// Nothing is downloaded except the workspace's npm dependencies when node_modules is missing (pnpm install).
import { execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, copyFileSync, cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '../..');
const out = resolve(process.argv[2] ?? 'pme-showcase');
const step = (s) => console.log(`\n== ${s}`);
const run = (cmd, args, cwd = repo) => {
  const r = spawnSync(cmd, args, { cwd, stdio: 'inherit' });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(' ')} failed (${r.error?.message ?? r.status ?? r.signal})`);
};
const git = (...a) => {
  try {
    return execFileSync('git', ['-C', repo, ...a], { encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
};

if (!existsSync(join(repo, 'apps/demo/vite.config.ts'))) throw new Error(`not the patient-monitor-engine repo: ${repo}`);
if (out === repo || repo.startsWith(out + '/')) throw new Error(`refusing to build into ${out}`);

step('dependencies');
const vite = join(repo, 'node_modules/.bin/vite'); // a root devDependency
if (!existsSync(vite)) run('npx', ['-y', 'pnpm@9.15.9', 'install', '--frozen-lockfile']);
else console.log('node_modules present');

step(`clean the kit's entries in ${out}`);
mkdirSync(out, { recursive: true });
const KIT = ['app', 'server', 'runtime', 'Start Simulator.command', 'READ ME FIRST.txt', 'VERSION.txt'];
for (const k of KIT) rmSync(join(out, k), { recursive: true, force: true });

step('build apps/demo (vite build --base ./)');
run(vite, ['build', '--base', './', '--outDir', join(out, 'app'), '--emptyOutDir'], join(repo, 'apps/demo'));
if (!existsSync(join(out, 'app/index.html'))) throw new Error('build produced no index.html');

step('launcher, servers, read-me');
const kit = join(here, 'kit');
copyFileSync(join(kit, 'start-simulator.command'), join(out, 'Start Simulator.command'));
chmodSync(join(out, 'Start Simulator.command'), 0o755);
copyFileSync(join(kit, 'read-me-first.txt'), join(out, 'READ ME FIRST.txt'));
cpSync(join(here, 'server'), join(out, 'server'), { recursive: true });
for (const f of readdirSync(join(out, 'server'))) chmodSync(join(out, 'server', f), 0o755);

step('runtime (bundled node only if it is an official signed build)');
mkdirSync(join(out, 'runtime'));
let runtimeNote;
const nodePath = process.execPath;
const sig = spawnSync('codesign', ['-dv', '--verbose=2', nodePath], { encoding: 'utf8' });
const sigText = `${sig.stdout ?? ''}${sig.stderr ?? ''}`;
const authority = /Authority=Developer ID Application: (Node\.js Foundation|OpenJS Foundation)[^\n]*/.exec(sigText);
if (authority) {
  const arch = process.arch === 'arm64' ? 'arm64' : process.arch === 'x64' ? 'x86_64' : process.arch;
  copyFileSync(nodePath, join(out, 'runtime', `node-${arch}`));
  chmodSync(join(out, 'runtime', `node-${arch}`), 0o755);
  runtimeNote = `runtime/node-${arch} = ${nodePath} (${process.version}; ${authority[0]})`;
} else {
  const why = /Signature=adhoc/.test(sigText) ? 'ad-hoc signature (not an official Node.js build)' : (/TeamIdentifier=\S+/.exec(sigText)?.[0] ?? 'no Node.js Foundation / OpenJS Developer ID');
  runtimeNote = `runtime/ left EMPTY: ${nodePath} (${process.version}) is not an official signed Node.js build (${why}). The launcher uses ruby, then perl.`;
}
console.log(runtimeNote);

step('VERSION.txt');
const dirty = git('status', '--porcelain', '--untracked-files=no') ? ' (with uncommitted changes)' : '';
const size = (p) => {
  const st = statSync(p);
  return st.isDirectory() ? readdirSync(p).reduce((n, f) => n + size(join(p, f)), 0) : st.size;
};
writeFileSync(join(out, 'VERSION.txt'), [
  'Patient monitor simulator - offline showcase kit',
  `Commit:   ${git('rev-parse', 'HEAD')}${dirty}`,
  `Branch:   ${git('rev-parse', '--abbrev-ref', 'HEAD')}`,
  `Subject:  ${git('log', '-1', '--format=%s')}`,
  `Built:    ${new Date().toISOString()}`,
  `Built by: node scripts/showcase/make-bundle.mjs "${out}" (node ${process.version}, vite build --base ./ in apps/demo)`,
  `App size: ${(size(join(out, 'app')) / 1e6).toFixed(1)} MB`,
  `Runtime:  ${runtimeNote}`,
  'Servers tried in order: bundled node, /usr/bin/ruby (WEBrick), /usr/bin/perl (core modules), python3 (only a real one).',
  '',
].join('\n'));

console.log(`\nKit ready: ${out}`);
for (const f of readdirSync(out)) console.log(`  ${f}`);
