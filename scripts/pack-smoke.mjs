// Stage 8b: prove the published shape of the six library packages without publishing. Packs each one with
// `pnpm pack` (publishConfig applied: exports → dist, types → dist/types), checks every tarball carries LICENSE,
// NOTICES.md and the LICENSES/ texts (and the renderer no orphan dist/assets map), installs the tarballs into a fresh
// consumer project with npm, type-checks a consumer file under moduleResolution Bundler AND NodeNext with
// skipLibCheck off, imports and runs the packed engine in Node, and bundles the consumer with Vite. Needs
// `pnpm build` first and network access to the npm registry (the consumer installs typescript and vite).
// Usage: pnpm pack-smoke [workDir]
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const work = process.argv[2] ? resolve(process.argv[2]) : mkdtempSync(join(tmpdir(), 'pme-pack-smoke-'));
const PKGS = ['engine-core', 'renderer', 'audio', 'controller', 'skins', 'ventilator'];
const pnpm = process.env.npm_execpath ? [process.execPath, process.env.npm_execpath] : ['pnpm'];
const run = (cmd, args, cwd) => execFileSync(cmd, args, { cwd, stdio: ['ignore', 'pipe', 'inherit'], encoding: 'utf8' });

rmSync(work, { recursive: true, force: true });
const tarballs = join(work, 'tarballs');
const app = join(work, 'consumer');
mkdirSync(tarballs, { recursive: true });
mkdirSync(join(app, 'src'), { recursive: true });
for (const p of PKGS) run(pnpm[0], [...pnpm.slice(1), 'pack', '--pack-destination', tarballs], join(root, 'packages', p));
const tgz = Object.fromEntries(readdirSync(tarballs).map((f) => [`@pme/${f.replace(/^pme-/, '').replace(/-\d+\.\d+\.\d+(?:-[0-9A-Za-z.]+)?\.tgz$/, '')}`, `file:${join(tarballs, f)}`]));
if (Object.keys(tgz).length !== PKGS.length) throw new Error(`pack-smoke: expected ${PKGS.length} tarballs, got ${Object.keys(tgz).join(', ')}`);
for (const [name, spec] of Object.entries(tgz)) { // licence texts travel with every copy (8b review ruling 1)
  const list = run('tar', ['-tzf', spec.slice('file:'.length)], work).split('\n');
  for (const f of ['package/dist/LICENSE', 'package/dist/NOTICES.md', 'package/dist/LICENSES/Apache-2.0.txt', 'package/dist/LICENSES/fast-uri-3.1.8.txt']) {
    if (!list.includes(f)) throw new Error(`pack-smoke: ${name} tarball lacks ${f}`);
  }
  if (list.some((f) => f.startsWith('package/dist/assets/'))) throw new Error(`pack-smoke: ${name} tarball ships dist/assets (orphan worker map)`);
}
writeFileSync(join(app, 'package.json'), JSON.stringify({
  name: 'pme-pack-smoke', private: true, type: 'module',
  dependencies: tgz, overrides: tgz, // sibling @pme deps resolve to the local tarballs, never the registry
  devDependencies: { typescript: '5.9.3', vite: '6.4.3' },
}, null, 2));
writeFileSync(join(app, 'src', 'main.ts'), `import { mountMonitor, version, type MonitorHandle } from '@pme/renderer';
import { createEngine, type EngineEvent } from '@pme/engine-core';
import { ScenarioRunner, validateScenario } from '@pme/controller/scenario';
import { transports } from '@pme/controller';
import { resolveSkin } from '@pme/skins';
import { validate } from '@pme/skins/validate';
import { createVentDriver } from '@pme/ventilator';
const e = createEngine({ seed: 1 });
e.on((ev: EngineEvent) => void ev);
e.advanceTo(1);
const h: MonitorHandle = mountMonitor(document.getElementById('pm')!, { skin: 'philips-like', engine: { seed: 1 } });
console.log(version, typeof ScenarioRunner, typeof validateScenario, typeof transports, resolveSkin('philips-like').skin.id, typeof validate, typeof createVentDriver, typeof h.dispatch);
`);
const tsconfig = (resolution, module) => JSON.stringify({ compilerOptions: { target: 'ES2022', module, moduleResolution: resolution, strict: true, noEmit: true, skipLibCheck: false, lib: ['ES2022', 'DOM', 'DOM.Iterable'], types: [] }, include: ['src'] });
writeFileSync(join(app, 'tsconfig.json'), tsconfig('Bundler', 'ESNext'));
writeFileSync(join(app, 'tsconfig.nodenext.json'), tsconfig('NodeNext', 'NodeNext'));
writeFileSync(join(app, 'index.html'), '<!doctype html><div id="pm" style="height:300px"></div><script type="module" src="/src/main.ts"></script>\n');
run('npm', ['install', '--no-audit', '--no-fund', '--loglevel=error'], app);
run('npx', ['tsc', '-p', 'tsconfig.json'], app);
run('npx', ['tsc', '-p', 'tsconfig.nodenext.json'], app);
run('node', ['--input-type=module', '-e', "const m = await import('@pme/engine-core'); m.createEngine({ seed: 1 }).advanceTo(1);"], app); // the packed ESM runs in Node
run('npx', ['vite', 'build', '--logLevel', 'error'], app);
console.log(`pack-smoke: OK — ${PKGS.length} tarballs carry the licence texts and install; tsc (Bundler, NodeNext, skipLibCheck off), a Node import and vite build pass (${work})`);
