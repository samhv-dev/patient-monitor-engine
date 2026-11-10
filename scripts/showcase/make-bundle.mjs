#!/usr/bin/env node
// Offline showcase kit builder. Run from the repo root:
//   node scripts/showcase/make-bundle.mjs [OUTPUT_DIR]        (default ./pme-showcase)
//       [--win-node node-v22.x.y-win-x64.zip [--win-node-sums SHASUMS256.txt]]   (or PME_WIN_NODE_ZIP=...)
// Builds apps/demo with a relative base (works from any folder and any port) and assembles OUTPUT_DIR:
//   app/                      the built site (the whole dist: the one-page app plus the pages it frames)
//   Start Simulator.command   double-click launcher (macOS)
//   Start Classroom.command   Stage 12: the relay on the network address, for learners' phones (needs Node.js ≥ 22)
//   Start Simulator.cmd, Start Classroom.cmd   the same on Windows (Node.js ≥ 22 on the PC; they run server/launch.mjs;
//                             CRLF, ASCII: kit-launchers.mjs). UNTESTED ON WINDOWS until the owner's checklist is run
//   server/                   serve.mjs (bundled node), serve.rb (ruby/WEBrick), serve.pl (core perl), serve.py;
//                             launch.mjs (what the Windows launchers run);
//                             relay.mjs (Stage 12: pme-relay in one file, its `ws` dependency inside);
//                             store.mjs (the kit store's paths for serve.mjs: packages/controller/relay/store.ts)
//   app/pme-kit.json          {"kit": true}: the app is running from a kit (the builder says why the kit store is off
//                             when a fallback server answers no /pme-store/)
//   NOT user-data/            the clinicians' data folder is made by the kit's servers at the first save, never shipped:
//                             a rebuild into a used kit folder leaves it as it is, and the build fails if it made one
//   runtime/                  node-<arch> ONLY if this machine's node is an official signed Node.js build; else empty
//                             node.exe, NODE-LICENSE.txt, NODE-VERSION.txt ONLY with --win-node: the official Windows
//                             build's node.exe, taken from a zip whose SHA-256 matches its SHASUMS256.txt (default: the
//                             one beside the zip); the .cmd launchers use it before an installed one (win-node.mjs).
//                             Never downloaded here.
//   READ ME FIRST.txt, VERSION.txt
//   NOTICES.md, LICENSES/     Stage 12 (R50 I1): the notices of what the kit's app and relay carry (MIT/BSD texts)
// Rerunnable: it replaces only the kit's own entries, so a videos/ folder (or anything else) beside them is kept.
// Nothing is downloaded except the workspace's npm dependencies when node_modules is missing (pnpm install).
import { execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, copyFileSync, cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { WINDOWS_LAUNCHERS, writeWindowsLaunchers } from './kit-launchers.mjs';
import { readWindowsNode } from './win-node.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '../..');
const { values: opt, positionals } = parseArgs({ allowPositionals: true, options: { 'win-node': { type: 'string' }, 'win-node-sums': { type: 'string' } } });
const out = resolve(positionals[0] ?? 'pme-showcase');
const winZip = opt['win-node'] ?? process.env.PME_WIN_NODE_ZIP;
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
if (opt['win-node-sums'] && !winZip) throw new Error('--win-node-sums needs --win-node (or PME_WIN_NODE_ZIP)');

// Checked before the build, so a wrong checksum stops the bundler before it touches the kit
let winNode = null;
if (winZip) {
  step('Windows Node.js (verify the official zip against its SHASUMS256.txt)');
  const sums = resolve(opt['win-node-sums'] ?? join(dirname(resolve(winZip)), 'SHASUMS256.txt'));
  winNode = readWindowsNode(resolve(winZip), sums);
  console.log(`${winNode.zipName}: SHA-256 ${winNode.zipSha} matches ${sums}`);
}

step('dependencies');
const vite = join(repo, 'node_modules/.bin/vite'); // a root devDependency
if (!existsSync(vite)) run('npx', ['-y', 'pnpm@9.15.9', 'install', '--frozen-lockfile']);
else console.log('node_modules present');

step(`clean the kit's entries in ${out}`);
mkdirSync(out, { recursive: true });
const KIT = ['app', 'server', 'runtime', 'Start Simulator.command', 'Start Classroom.command', ...WINDOWS_LAUNCHERS.map(([, name]) => name), 'READ ME FIRST.txt', 'VERSION.txt', 'NOTICES.md', 'LICENSES'];
for (const k of KIT) rmSync(join(out, k), { recursive: true, force: true });

step('build apps/demo (vite build --base ./)');
run(vite, ['build', '--base', './', '--outDir', join(out, 'app'), '--emptyOutDir'], join(repo, 'apps/demo'));
if (!existsSync(join(out, 'app/index.html'))) throw new Error('build produced no index.html');
writeFileSync(join(out, 'app/pme-kit.json'), `${JSON.stringify({ kit: true })}\n`);
const hadUserData = existsSync(join(out, 'user-data'));

step('launcher, servers, read-me');
const kit = join(here, 'kit');
copyFileSync(join(kit, 'start-simulator.command'), join(out, 'Start Simulator.command'));
chmodSync(join(out, 'Start Simulator.command'), 0o755);
copyFileSync(join(kit, 'read-me-first.txt'), join(out, 'READ ME FIRST.txt'));
copyFileSync(join(repo, 'NOTICES.md'), join(out, 'NOTICES.md')); // Stage 12 (R50 I1): the app carries MIT code (qr.ts, ajv)
cpSync(join(repo, 'LICENSES'), join(out, 'LICENSES'), { recursive: true });
cpSync(join(here, 'server'), join(out, 'server'), { recursive: true });
for (const f of readdirSync(join(out, 'server'))) chmodSync(join(out, 'server', f), 0o755);
copyFileSync(join(kit, 'start-classroom.command'), join(out, 'Start Classroom.command')); // Stage 12
chmodSync(join(out, 'Start Classroom.command'), 0o755);
writeWindowsLaunchers(kit, out); // Windows: Start Simulator.cmd, Start Classroom.cmd (CRLF, ASCII only)

step('classroom relay (Stage 12: one file, ws inside; runs on any Node.js >= 22)');
const { build } = await import('vite');
await build({
  configFile: false, root: repo, logLevel: 'warn',
  ssr: { noExternal: true, target: 'node' },
  build: {
    ssr: join(repo, 'packages/controller/relay/bin.ts'), outDir: join(out, 'server'), emptyOutDir: false, minify: false, target: 'node22',
    // KR-A1: ws require()s its optional native helpers (bufferutil, utf-8-validate) inside try/catch and takes its
    // pure-JS path when that require throws. Bundled, Vite replaced each missing optional peer dependency with an empty
    // module, so the require returned {} and the first client frame of 32 bytes or more called an undefined unmask().
    // External, they stay a plain require() inside ws's try/catch: in this ES module it throws, and ws uses its JS code.
    rollupOptions: { external: ['bufferutil', 'utf-8-validate'], output: { entryFileNames: 'relay.mjs', inlineDynamicImports: true } },
  },
});
if (!existsSync(join(out, 'server/relay.mjs'))) throw new Error('the relay bundle was not written');
if (/__viteOptionalPeerDep/.test(readFileSync(join(out, 'server/relay.mjs'), 'utf8'))) throw new Error('KR-A1: the relay bundle stubs an optional peer dependency (ws would call an empty bufferutil)');
copyFileSync(join(repo, 'packages/controller/node_modules/ws/LICENSE'), join(out, 'server/relay.mjs.LICENSE-ws.txt')); // NOTICES N-007 (MIT)
// the kit store for serve.mjs (Start Simulator on Node.js): the relay's own store.ts, node: built-ins only
await build({
  configFile: false, root: repo, logLevel: 'warn',
  ssr: { noExternal: true, target: 'node' },
  build: { ssr: join(repo, 'packages/controller/relay/store.ts'), outDir: join(out, 'server'), emptyOutDir: false, minify: false, target: 'node22', rollupOptions: { output: { entryFileNames: 'store.mjs' } } },
});
if (!existsSync(join(out, 'server/store.mjs'))) throw new Error('the store bundle was not written');

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
  runtimeNote = `runtime/ has no macOS node: ${nodePath} (${process.version}) is not an official signed Node.js build (${why}). The launcher uses ruby, then perl.`;
}
console.log(runtimeNote);
let winNote = 'none (built without --win-node): Start Simulator.cmd / Start Classroom.cmd need an installed Node.js >= 22.';
if (winNode) {
  writeFileSync(join(out, 'runtime/node.exe'), winNode.exe);
  writeFileSync(join(out, 'runtime/NODE-LICENSE.txt'), winNode.license);
  const built = new Date().toISOString();
  writeFileSync(join(out, 'runtime/NODE-VERSION.txt'), [
    'runtime/node.exe: the official Node.js build for Windows x64, as published at nodejs.org',
    `Version:          ${winNode.version}`,
    `From:             ${winNode.zipName} (node.exe and LICENSE only; LICENSE is NODE-LICENSE.txt here)`,
    `Zip SHA-256:      ${winNode.zipSha} (matched SHASUMS256.txt)`,
    `node.exe SHA-256: ${winNode.exeSha}`,
    `Added:            ${built}`,
    'Check node.exe on Windows: certutil -hashfile node.exe SHA256',
    '',
  ].join('\r\n'));
  winNote = `runtime/node.exe = Node.js ${winNode.version} for Windows x64 from ${winNode.zipName} (zip SHA-256 ${winNode.zipSha}; node.exe SHA-256 ${winNode.exeSha}); the .cmd launchers use it before an installed Node.js.`;
  console.log(winNote);
}

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
  'Classroom: server/relay.mjs (pme-relay + ws 8.21.3, MIT) on runtime/node-* or an installed Node.js >= 22.',
  'Windows: Start Simulator.cmd / Start Classroom.cmd run server/launch.mjs on runtime\\node.exe if the kit has it, else an installed Node.js >= 22 (untested on Windows at this release).',
  `Windows runtime: ${winNote}`,
  '',
].join('\n'));

if (!hadUserData && existsSync(join(out, 'user-data'))) throw new Error('the build made a user-data folder: the kit must ship without one');
if (hadUserData) console.log(`\nNote: ${join(out, 'user-data')} was there before this build and is kept as it was (the clinicians' data; leave it out of a copy you hand on).`);
console.log(`\nKit ready: ${out}`);
for (const f of readdirSync(out)) console.log(`  ${f}`);
