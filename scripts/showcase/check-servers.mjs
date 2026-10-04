#!/usr/bin/env node
// Proof (a) for the offline showcase kit: every server variant, started through the launcher's OWN selection logic
// (`Start Simulator.command` with PME_ONLY=<variant>) in a stripped environment (env -i PATH=/usr/bin:/bin), serving
// the bundle. Per variant: index.html, the entry JS chunk, the engine worker chunk and the CSS with their content
// types; HEAD; 404; two traversal attempts; bound to 127.0.0.1 only; the launcher stops the server when it is
// stopped; nothing is written into the bundle. Also run from a READ-ONLY disk image mounted at a path with spaces.
//   node scripts/showcase/check-servers.mjs [BUNDLE_DIR] [--json OUT.json]
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { cpSync, existsSync, lstatSync, mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { connect } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const args = process.argv.slice(2);
const jsonAt = args.indexOf('--json');
const jsonOut = jsonAt >= 0 ? resolve(args[jsonAt + 1]) : null;
const bundle = resolve(args.find((a, i) => !a.startsWith('--') && (jsonAt < 0 || i !== jsonAt + 1)) ?? 'pme-showcase');
const LAUNCHER = 'Start Simulator.command';
if (!existsSync(join(bundle, LAUNCHER))) throw new Error(`no kit at ${bundle}`);
const work = mkdtempSync(join(tmpdir(), 'pme-kit-check-'));

const snapshot = (dir) => {
  const out = [];
  const walk = (d) => {
    for (const f of readdirSync(d)) {
      const p = join(d, f);
      const st = lstatSync(p);
      if (st.isDirectory()) walk(p);
      else out.push(`${p.slice(dir.length)} ${st.size} ${st.mtimeMs}`);
    }
  };
  walk(dir);
  return out.sort().join('\n');
};

/** Start the launcher; resolve with {proc, port, server, out} once it prints ADDRESS, or reject after 25 s. */
function launch(kit, only) {
  return new Promise((ok, no) => {
    const proc = spawn('/usr/bin/env', ['-i', 'PATH=/usr/bin:/bin', `PME_ONLY=${only}`, 'PME_NO_OPEN=1', join(kit, LAUNCHER)], { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    const timer = setTimeout(() => {
      proc.kill('SIGTERM');
      no(new Error(`no ADDRESS within 25 s; output:\n${out}`));
    }, 25_000);
    const onData = (b) => {
      out += b;
      const a = /ADDRESS: http:\/\/127\.0\.0\.1:(\d+)\//.exec(out);
      const s = /SERVER: (.*)/.exec(out);
      if (a && s) {
        clearTimeout(timer);
        ok({ proc, port: Number(a[1]), server: s[1].trim(), out });
      }
    };
    proc.stdout.on('data', onData);
    proc.stderr.on('data', onData);
    proc.on('exit', (code) => {
      clearTimeout(timer);
      no(new Error(`launcher exited ${code}; output:\n${out}`));
    });
  });
}

/** One raw request (fetch normalises '..' away, so traversal must be tested on the socket). */
const raw = (port, line) => new Promise((ok) => {
  const s = connect(port, '127.0.0.1', () => s.write(`${line}\r\nHost: 127.0.0.1\r\nConnection: close\r\n\r\n`));
  let buf = '';
  s.on('data', (d) => (buf += d));
  s.on('close', () => ok(/^HTTP\/1\.\d (\d{3})/.exec(buf)?.[1] ?? 'none')); // after 'end', an error or the timeout
  s.setTimeout(5000, () => s.destroy());
});

async function check(kit, only, label) {
  const row = { label, only, ok: false, checks: [] };
  const add = (name, pass, detail) => row.checks.push({ name, pass, detail });
  const before = snapshot(kit);
  let l;
  try {
    l = await launch(kit, only);
  } catch (e) {
    row.error = String(e.message).slice(0, 600);
    return row;
  }
  row.server = l.server;
  row.port = l.port;
  const base = `http://127.0.0.1:${l.port}`;
  const get = async (p, method = 'GET') => {
    const r = await fetch(base + p, { method });
    const body = method === 'HEAD' ? '' : await r.text();
    return { status: r.status, type: r.headers.get('content-type') ?? '', len: r.headers.get('content-length'), body };
  };
  const index = await get('/index.html');
  add('GET /index.html', index.status === 200 && index.type.startsWith('text/html') && index.body.includes('<div id="app">'), `${index.status} ${index.type}`);
  const root = await get('/');
  add('GET / (folder index)', root.status === 200 && root.type.startsWith('text/html'), `${root.status} ${root.type}`);
  const entry = /src="\.\/(assets\/index-[^"]+\.js)"/.exec(index.body)?.[1];
  const js = entry ? await get(`/${entry}`) : { status: 0, type: 'no entry chunk in index.html' };
  add(`GET entry chunk ${entry}`, js.status === 200 && /^(text|application)\/javascript/.test(js.type), `${js.status} ${js.type}`);
  const workerFile = readdirSync(join(kit, 'app/assets')).find((f) => f.startsWith('engine.worker-') && f.endsWith('.js'));
  const wk = await get(`/assets/${workerFile}`);
  add(`GET worker chunk ${workerFile}`, wk.status === 200 && /^(text|application)\/javascript/.test(wk.type) && wk.body.length > 100_000, `${wk.status} ${wk.type} ${wk.body.length} B`);
  const cssFile = readdirSync(join(kit, 'app/assets')).find((f) => f.endsWith('.css'));
  const css = await get(`/assets/${cssFile}`);
  add('GET stylesheet', css.status === 200 && css.type.startsWith('text/css'), `${css.status} ${css.type}`);
  const vent = await get('/vent-hamilton.html?link=vabc&profile=normal');
  add('GET framed page with a query string', vent.status === 200 && vent.type.startsWith('text/html'), `${vent.status} ${vent.type}`);
  const head = await get('/index.html', 'HEAD');
  add('HEAD /index.html', head.status === 200 && head.type.startsWith('text/html') && Number(head.len) === Buffer.byteLength(index.body), `${head.status} length ${head.len}`);
  const missing = await get('/no-such-file.js');
  add('GET missing file → 404', missing.status === 404, `${missing.status}`);
  const t1 = await raw(l.port, 'GET /../VERSION.txt HTTP/1.1');
  const t2 = await raw(l.port, 'GET /%2e%2e/%2e%2e/VERSION.txt HTTP/1.1');
  const t3 = await raw(l.port, 'GET /assets/../../server/serve.pl HTTP/1.1');
  add('traversal refused (/.., %2e%2e, assets/../..)', ![t1, t2, t3].includes('200'), `${t1} ${t2} ${t3}`);
  const post = await raw(l.port, 'POST /index.html HTTP/1.1');
  add('POST refused', post !== '200', post);
  const lsof = spawnSync('/usr/sbin/lsof', ['-nP', `-iTCP:${l.port}`, '-sTCP:LISTEN'], { encoding: 'utf8' }).stdout;
  const listens = [...lsof.matchAll(/TCP (\S+):\d+ \(LISTEN\)/g)].map((m) => m[1]);
  add('listens on 127.0.0.1 only', listens.length > 0 && listens.every((a) => a === '127.0.0.1'), listens.join(', ') || 'lsof gave nothing');
  // stop the launcher as closing the Terminal window does (SIGHUP), and the server must go with it
  l.proc.kill('SIGHUP');
  await new Promise((r) => setTimeout(r, 1500));
  const after = await fetch(`${base}/index.html`).then(() => 'still answering', () => 'stopped');
  add('server stops when the launcher window closes (SIGHUP)', after === 'stopped', after);
  add('nothing written into the bundle', snapshot(kit) === before, '');
  row.ok = row.checks.every((c) => c.pass);
  return row;
}

const rows = [];
const variants = [['ruby', 'ruby'], ['perl', 'perl'], ['python', 'python3 (if a real one is installed)']];
const bundled = existsSync(join(bundle, 'runtime')) && readdirSync(join(bundle, 'runtime')).some((f) => f.startsWith('node-'));
if (bundled) variants.unshift(['node', 'node (bundled runtime)']);
for (const [only, label] of variants) rows.push(await check(bundle, only, label));

// the node path of the launcher when runtime/ is empty in the real kit: a temp copy whose runtime/node-<arch> is a
// symlink to THIS machine's node, so the launcher's node selection and serve.mjs are exercised all the same
if (!bundled) {
  const copy = join(work, 'kit copy with node');
  cpSync(bundle, copy, { recursive: true, filter: (p) => !p.includes('/videos') });
  const arch = process.arch === 'arm64' ? 'arm64' : 'x86_64';
  symlinkSync(process.execPath, join(copy, 'runtime', `node-${arch}`));
  rows.push(await check(copy, 'node', `node (stand-in: this machine's ${process.version} linked as runtime/node-${arch} in a temp copy)`));
}

// read-only volume at a path with spaces: a UDRO disk image, mounted read-only
const mount = join(work, 'USB stick (read only)');
let attached = false;
try {
  const dmg = join(work, 'kit.dmg');
  const src = join(work, 'dmg-src', 'pme showcase');
  cpSync(bundle, src, { recursive: true, filter: (p) => !p.includes('/videos') && !p.includes('/runtime/node-') });
  execFileSync('hdiutil', ['create', '-quiet', '-volname', 'PME Showcase', '-srcfolder', join(work, 'dmg-src'), '-format', 'UDRO', '-ov', dmg]);
  execFileSync('hdiutil', ['attach', '-quiet', '-nobrowse', '-readonly', '-mountpoint', mount, dmg]);
  attached = true;
  const kitOnRo = join(mount, 'pme showcase');
  for (const only of ['ruby', 'perl']) rows.push(await check(kitOnRo, only, `${only} from a READ-ONLY disk image at "${kitOnRo}"`));
} catch (e) {
  rows.push({ label: 'read-only disk image', ok: false, error: String(e.message).slice(0, 400), checks: [] });
} finally {
  if (attached) spawnSync('hdiutil', ['detach', '-quiet', mount]);
  rmSync(work, { recursive: true, force: true });
}

for (const r of rows) {
  console.log(`\n${r.ok ? 'PASS' : 'FAIL'}  ${r.label}${r.server ? `  [launcher chose: ${r.server}, port ${r.port}]` : ''}`);
  if (r.error) console.log(`   ${r.error.replace(/\n/g, '\n   ')}`);
  for (const c of r.checks) console.log(`   ${c.pass ? 'ok  ' : 'FAIL'} ${c.name}  ${c.detail}`);
}
if (jsonOut) writeFileSync(jsonOut, JSON.stringify({ at: new Date().toISOString(), bundle, version: readFileSync(join(bundle, 'VERSION.txt'), 'utf8'), rows }, null, 2));
const python = rows.find((r) => r.only === 'python');
const required = rows.filter((r) => r !== python);
process.exit(required.every((r) => r.ok) ? 0 : 1);
