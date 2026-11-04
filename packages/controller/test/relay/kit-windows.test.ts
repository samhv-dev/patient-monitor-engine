// The classroom kit on Windows (rc.3; UNTESTED ON WINDOWS until the owner runs the checklist in the kit's READ ME). Nobody
// here can run Windows, so these tests pin what can be checked elsewhere: the .cmd files the kit gets (CRLF, ASCII),
// the Windows branch of the browser opener (process.platform faked), the relay's and serve.mjs's "inside the app
// folder" test on Windows paths (path.win32), the Windows interface names for the QR code, server/launch.mjs (what
// the .cmd files run) on this OS, the .cmd files' Node.js lookup (the kit's runtime\node.exe first), and the bundler's
// --win-node check (win-node.mjs) on small fixture zips made here (nothing is downloaded).
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chmodSync, copyFileSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path, { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { crc32, deflateRawSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { isInside, lanAddresses } from '../../relay/http.ts';
import { waitFor } from '../helpers.ts';

const showcase = resolve(import.meta.dirname, '../../../../scripts/showcase');
// plain .mjs scripts outside the package: imported by URL (untyped), as make-bundle.mjs and the kit use them
const kitLaunchers = (await import(pathToFileURL(join(showcase, 'kit-launchers.mjs')).href)) as {
  WINDOWS_LAUNCHERS: Array<[string, string]>;
  writeWindowsLaunchers: (kitSrc: string, out: string) => void;
};
type WinNode = { version: string; zipName: string; zipSha: string; exe: Buffer; exeSha: string; license: Buffer };
const winNode = (await import(pathToFileURL(join(showcase, 'win-node.mjs')).href)) as {
  readWindowsNode: (zip: string, sums: string) => WinNode;
  listedSum: (sums: string, name: string) => string | null;
};
const launch = (await import(pathToFileURL(join(showcase, 'server/launch.mjs')).href)) as {
  openCommand: (url: string, platform?: string) => { cmd: string; args: string[]; opts: Record<string, unknown> };
};

describe('the kit gets the Windows launchers', () => {
  it('Start Classroom.cmd and Start Simulator.cmd: every line ends in CRLF, printable ASCII only, and they run server\\launch.mjs', () => {
    const out = mkdtempSync(join(tmpdir(), 'kit-win-'));
    kitLaunchers.writeWindowsLaunchers(join(showcase, 'kit'), out);
    expect(kitLaunchers.WINDOWS_LAUNCHERS.map(([, name]) => name)).toEqual(['Start Classroom.cmd', 'Start Simulator.cmd']);
    for (const [, name] of kitLaunchers.WINDOWS_LAUNCHERS) {
      const b = readFileSync(join(out, name));
      const text = b.toString('latin1');
      expect(text.endsWith('\r\n')).toBe(true);
      expect(/[^\r]\n/.test(text), `${name}: a line ends in LF alone`).toBe(false);
      expect(/\r(?!\n)/.test(text), `${name}: a lone CR`).toBe(false);
      expect([...b].filter((c) => c > 0x7e || (c < 0x20 && c !== 0x09 && c !== 0x0a && c !== 0x0d)), `${name}: non-ASCII bytes`).toEqual([]);
      expect(text).toContain('"%NODE%" "%~dp0server\\launch.mjs"');
      expect(text).toMatch(/^setlocal EnableExtensions DisableDelayedExpansion\r$/m);
      // review fixes: a launcher started from inside the .zip says so; a node.exe that crashes (negative exit code) is caught
      expect(text).toContain('if not exist "%~dp0server\\launch.mjs" goto nokit');
      expect(text).toContain('if not "%ERRORLEVEL%"=="0" goto oldnode');
      expect(text).not.toMatch(/^if errorlevel/m);
    }
  });

  it('both launchers look for the kit\'s runtime\\node.exe first, then PME_NODE, then PATH, then Program Files; one version check for all', () => {
    for (const [src] of kitLaunchers.WINDOWS_LAUNCHERS) {
      const text = readFileSync(join(showcase, 'kit', src), 'utf8');
      const at = (line: string) => {
        const i = text.split(/\r?\n/).indexOf(line);
        expect(i, `${src}: no line ${line}`).toBeGreaterThan(-1);
        return i;
      };
      const order = [
        at('set "NODE="'),
        at('if exist "%~dp0runtime\\node.exe" set "NODE=%~dp0runtime\\node.exe"'),
        at('if not defined NODE if defined PME_NODE set "NODE=%PME_NODE%"'),
        at('if not defined NODE for /f "delims=" %%n in (\'where node.exe 2^>nul\') do if not defined NODE set "NODE=%%n"'),
        at('if not defined NODE if exist "%ProgramFiles%\\nodejs\\node.exe" set "NODE=%ProgramFiles%\\nodejs\\node.exe"'),
        at('if not defined NODE goto nonode'),
        at('if not "%ERRORLEVEL%"=="0" goto oldnode'),
        at('"%NODE%" "%~dp0server\\launch.mjs" ' + (src.includes('classroom') ? 'classroom' : 'simulator')),
      ];
      expect(order, `${src}: lookup order`).toEqual([...order].sort((a, b) => a - b));
      expect(text.match(/set "NODE=/g)?.length, `${src}: no other place sets NODE`).toBe(5);
    }
  });

  it('a launcher source with a non-ASCII character is refused, not shipped', () => {
    const src = mkdtempSync(join(tmpdir(), 'kit-win-src-'));
    writeFileSync(join(src, 'start-classroom.cmd'), '@echo off\necho Node.js \u2265 22\n');
    writeFileSync(join(src, 'start-simulator.cmd'), '@echo off\n');
    expect(() => kitLaunchers.writeWindowsLaunchers(src, mkdtempSync(join(tmpdir(), 'kit-win-')))).toThrow(/printable ASCII; found U\+2265/);
  });
});

describe('opening the browser', () => {
  const url = 'http://127.0.0.1:8650/?relay#/';
  it('on Windows (process.platform faked to win32): cmd.exe /d /c start "" "<address>", verbatim', () => {
    const real = Object.getOwnPropertyDescriptor(process, 'platform')!;
    Object.defineProperty(process, 'platform', { value: 'win32' });
    try {
      const c = launch.openCommand(url);
      expect(c.cmd).toMatch(/cmd\.exe$/i);
      expect(c.args).toEqual(['/d', '/c', 'start', '""', `"${url}"`]);
      expect(c.opts).toEqual({ windowsVerbatimArguments: true });
    } finally {
      Object.defineProperty(process, 'platform', real);
    }
  });
  it('on macOS and Linux: open, xdg-open; an address with a shell character is refused', () => {
    expect(launch.openCommand(url, 'darwin')).toEqual({ cmd: '/usr/bin/open', args: [url], opts: {} });
    expect(launch.openCommand(url, 'linux').cmd).toBe('xdg-open');
    for (const bad of ['http://127.0.0.1:8650/?a&b', 'http://x/"', 'http://x/%PATH%', 'http://x/^', 'file:///C:/x']) expect(() => launch.openCommand(bad, 'win32')).toThrow(/not a plain http address/);
  });
});

describe('a file inside the app folder (the relay and serve.mjs)', () => {
  it('Windows paths (path.win32): the app\'s files are inside; a sibling folder, another drive, the parent are not', () => {
    const w = path.win32;
    const root = 'C:\\Users\\Ali\\Desktop\\PME kit (rc.3)\\app';
    expect(isInside(root, `${root}\\index.html`, w)).toBe(true);
    expect(isInside(root, `${root}\\assets\\index-abc.js`, w)).toBe(true);
    expect(isInside(root, 'c:\\users\\ali\\desktop\\pme kit (rc.3)\\APP\\index.html', w)).toBe(true); // Windows ignores case
    expect(isInside(root, `${root}\\..foo.js`, w)).toBe(true); // a name starting with '..' is still inside
    expect(isInside(root, root, w)).toBe(false);
    expect(isInside(root, 'C:\\Users\\Ali\\Desktop\\PME kit (rc.3)\\app2\\index.html', w)).toBe(false);
    expect(isInside(root, 'C:\\Users\\Ali\\Desktop\\PME kit (rc.3)\\server\\relay.mjs', w)).toBe(false);
    expect(isInside(root, 'D:\\Users\\Ali\\Desktop\\PME kit (rc.3)\\app\\index.html', w)).toBe(false);
    expect(isInside(root, '\\\\.\\CON', w)).toBe(false);
  });
  it('POSIX paths: unchanged', () => {
    expect(isInside('/kit/app', '/kit/app/index.html')).toBe(true);
    expect(isInside('/kit/app', '/kit/app2/index.html')).toBe(false);
    expect(isInside('/kit/app', '/kit/app')).toBe(false);
  });
});

describe('the addresses the QR code may use, on Windows', () => {
  it('the Mobile hotspot first, then Wi-Fi and Ethernet, then the rest, Hyper-V / WSL / VirtualBox / VMware / Bluetooth last', () => {
    const v4 = (address: string, internal = false) => ({ address, family: 'IPv4' as const, internal, netmask: '255.255.255.0', mac: '00:00:00:00:00:00', cidr: null });
    expect(lanAddresses({
      'vEthernet (WSL)': [v4('172.24.0.1')],
      'Loopback Pseudo-Interface 1': [v4('127.0.0.1', true)],
      'VirtualBox Host-Only Network': [v4('192.168.56.1')],
      'Bluetooth Network Connection': [v4('169.254.10.2')],
      Ethernet: [v4('10.0.0.5')],
      'Some VPN': [v4('10.8.0.2')],
      'Wi-Fi': [v4('192.168.1.20')],
      'Local Area Connection* 10': [v4('192.168.137.1')],
    } as never)).toEqual(['192.168.137.1', '10.0.0.5', '192.168.1.20', '10.8.0.2', '172.24.0.1', '192.168.56.1']);
  });
});

describe('server/launch.mjs, what the .cmd files run (here on this OS)', () => {
  /** A minimal kit: app/index.html and the server scripts the simulator mode needs (no relay bundle). */
  const miniKit = () => {
    const kit = mkdtempSync(join(tmpdir(), 'kit-launch-'));
    mkdirSync(join(kit, 'app/assets'), { recursive: true });
    mkdirSync(join(kit, 'server'));
    writeFileSync(join(kit, 'app/index.html'), '<!doctype html><title>mini kit</title>');
    writeFileSync(join(kit, 'app/assets/a.js'), 'export {}');
    for (const f of ['launch.mjs', 'serve.mjs']) copyFileSync(join(showcase, 'server', f), join(kit, 'server', f));
    return kit;
  };
  const run = (kit: string, mode: string, node = process.execPath) => {
    const p = spawn(node, [join(kit, 'server/launch.mjs'), mode], { env: { PATH: process.env.PATH ?? '', PME_NO_OPEN: '1', PME_PORT: String(20000 + Math.floor(Math.random() * 20000)) }, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    p.stdout.on('data', (d) => (out += d));
    p.stderr.on('data', (d) => (out += d));
    const exited = new Promise<number | null>((r) => p.once('exit', (c) => r(c)));
    return { p, exited, out: () => out };
  };

  it('simulator: serves the app on 127.0.0.1, prints ADDRESS and SERVER, and stops cleanly on a signal', async () => {
    const r = run(miniKit(), 'simulator');
    await waitFor(() => /ADDRESS: http:\/\/127\.0\.0\.1:\d+\//.test(r.out()), 15_000, 'ADDRESS');
    const port = Number(/ADDRESS: http:\/\/127\.0\.0\.1:(\d+)\//.exec(r.out())![1]);
    expect(r.out()).toContain('THE SIMULATOR IS RUNNING');
    expect(r.out()).toMatch(/SERVER: node v\d+/);
    expect(await (await fetch(`http://127.0.0.1:${port}/`)).text()).toContain('<title>mini kit</title>');
    expect((await fetch(`http://127.0.0.1:${port}/assets/a.js`)).status).toBe(200);
    expect((await fetch(`http://127.0.0.1:${port}/server/launch.mjs`)).status).toBe(404);
    r.p.kill('SIGTERM');
    expect(await r.exited).toBe(0);
    expect(r.out()).toContain('The simulator has stopped.');
    await expect(fetch(`http://127.0.0.1:${port}/`)).rejects.toThrow();
  }, 30_000);

  it('started by the kit\'s runtime/ node (as the .cmd does with runtime\\node.exe): SERVER names that node, which serves', async (ctx) => {
    const kit = miniKit();
    mkdirSync(join(kit, 'runtime'));
    const own = join(realpathSync(kit), 'runtime', process.platform === 'win32' ? 'node.exe' : 'node'); // execPath is a real path
    copyFileSync(process.execPath, own); // a copy, not a link: macOS may report a hard link by its other name
    chmodSync(own, 0o755);
    // An official Node.js build (CI's, the kit's) is one self-contained file; a shared-library build (Homebrew's) cannot
    // start from another folder, and then there is nothing to test here. Probed in run()'s environment.
    const probe = spawnSync(own, ['-p', 'process.execPath'], { encoding: 'utf8', env: { PATH: process.env.PATH ?? '' } });
    if (probe.status !== 0 || probe.stdout.trim() !== own) ctx.skip(`this machine's node cannot run from another folder (${process.execPath}: a shared-library build)`);
    const r = run(kit, 'simulator', own);
    await waitFor(() => /ADDRESS: http:\/\/127\.0\.0\.1:\d+\//.test(r.out()), 15_000, 'ADDRESS');
    expect(r.out()).toContain(`SERVER: node ${process.version} (${own}) serve.mjs`);
    const port = Number(/ADDRESS: http:\/\/127\.0\.0\.1:(\d+)\//.exec(r.out())![1]);
    expect(await (await fetch(`http://127.0.0.1:${port}/`)).text()).toContain('<title>mini kit</title>');
    r.p.kill('SIGTERM');
    expect(await r.exited).toBe(0);
  }, 30_000);

  it('classroom without the relay bundle: says the kit is incomplete (and how to unzip), exits 1', async () => {
    const r = run(miniKit(), 'classroom');
    expect(await r.exited).toBe(1);
    expect(r.out()).toContain('THE CLASSROOM COULD NOT START');
    expect(r.out()).toContain('The kit is incomplete');
    expect(r.out()).toContain('Extract All');
    expect([...Buffer.from(r.out())].every((c) => c < 0x80), 'ASCII output only').toBe(true);
  }, 30_000);
});

describe('make-bundle.mjs --win-node: the official Windows Node.js zip, verified (win-node.mjs; fixture zips)', () => {
  /** A zip as nodejs.org lays it out: one top folder; `deflate` per entry (an official zip deflates). */
  const makeZip = (files: Array<[string, Buffer]>, mangle?: (crc: number) => number) => {
    const locals: Buffer[] = [];
    const central: Buffer[] = [];
    let off = 0;
    for (const [name, data] of files) {
      const body = deflateRawSync(data);
      const n = Buffer.from(name);
      const crc = mangle ? mangle(crc32(data)) : crc32(data);
      const h = Buffer.alloc(30);
      h.writeUInt32LE(0x04034b50, 0); h.writeUInt16LE(20, 4); h.writeUInt16LE(8, 8); h.writeUInt32LE(crc, 14);
      h.writeUInt32LE(body.length, 18); h.writeUInt32LE(data.length, 22); h.writeUInt16LE(n.length, 26);
      const c = Buffer.alloc(46);
      c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(8, 10); c.writeUInt32LE(crc, 16);
      c.writeUInt32LE(body.length, 20); c.writeUInt32LE(data.length, 24); c.writeUInt16LE(n.length, 28); c.writeUInt32LE(off, 42);
      locals.push(h, n, body);
      central.push(c, n);
      off += h.length + n.length + body.length;
    }
    const cd = Buffer.concat(central);
    const e = Buffer.alloc(22);
    e.writeUInt32LE(0x06054b50, 0); e.writeUInt16LE(files.length, 8); e.writeUInt16LE(files.length, 10);
    e.writeUInt32LE(cd.length, 12); e.writeUInt32LE(off, 16);
    return Buffer.concat([...locals, cd, e]);
  };
  const exe = Buffer.concat([Buffer.from('MZ'), Buffer.alloc(4096, 7)]); // stands in for node.exe: a PE file starts "MZ"
  const license = Buffer.from('Node.js is licensed for use as follows: (fixture)\n');
  const sha = (b: Buffer) => createHash('sha256').update(b).digest('hex');
  /** A folder with the zip and a SHASUMS256.txt listing `listed` for it (the real sum unless a test says otherwise). */
  const fixture = (version = '22.23.4', opts: { listed?: string; files?: Array<[string, Buffer]>; mangle?: (crc: number) => number } = {}) => {
    const dir = mkdtempSync(join(tmpdir(), 'kit-win-node-'));
    const name = `node-v${version}-win-x64.zip`;
    const top = `node-v${version}-win-x64/`;
    const zip = makeZip(opts.files ?? [[`${top}README.md`, Buffer.from('readme')], [`${top}node.exe`, exe], [`${top}LICENSE`, license], [`${top}npm.cmd`, Buffer.from('@echo off')]], opts.mangle);
    writeFileSync(join(dir, name), zip);
    writeFileSync(join(dir, 'SHASUMS256.txt'), `${'0'.repeat(64)}  node-v${version}-x64.msi\n${opts.listed ?? sha(zip)}  ${name}\n`);
    return { zip: join(dir, name), sums: join(dir, 'SHASUMS256.txt'), zipSha: sha(zip) };
  };

  it('the right SHA-256: node.exe and LICENSE only come out, byte for byte, with both checksums and the version', () => {
    const f = fixture();
    const w = winNode.readWindowsNode(f.zip, f.sums);
    expect(w.version).toBe('v22.23.4');
    expect(w.zipName).toBe('node-v22.23.4-win-x64.zip');
    expect(w.zipSha).toBe(f.zipSha);
    expect(w.exe.equals(exe)).toBe(true);
    expect(w.exeSha).toBe(sha(exe));
    expect(w.license.equals(license)).toBe(true);
  });

  it('a wrong SHA-256 is refused, naming both sums', () => {
    const f = fixture('22.23.4', { listed: 'ab'.repeat(32) });
    expect(() => winNode.readWindowsNode(f.zip, f.sums)).toThrow(new RegExp(`SHA-256 MISMATCH.*${f.zipSha}.*${'ab'.repeat(32)}.*Refused`));
  });

  it('a zip changed after its sum was listed (one byte) is refused', () => {
    const f = fixture();
    const b = readFileSync(f.zip);
    b[40] = b[40]! ^ 1;
    writeFileSync(f.zip, b);
    expect(() => winNode.readWindowsNode(f.zip, f.sums)).toThrow(/SHA-256 MISMATCH/);
  });

  it('refused: a SHASUMS256.txt that does not list the zip, a zip not named like an official build, Node.js older than 22', () => {
    const f = fixture();
    writeFileSync(f.sums, `${f.zipSha}  node-v22.23.4-linux-x64.tar.xz\n`);
    expect(() => winNode.readWindowsNode(f.zip, f.sums)).toThrow(/lists no node-v22\.23\.4-win-x64\.zip/);
    const renamed = join(mkdtempSync(join(tmpdir(), 'kit-win-node-')), 'node.zip');
    copyFileSync(f.zip, renamed);
    expect(() => winNode.readWindowsNode(renamed, f.sums)).toThrow(/not named like an official build/);
    const old = fixture('20.18.0');
    expect(() => winNode.readWindowsNode(old.zip, old.sums)).toThrow(/Node\.js 20\.18\.0; the kit needs 22 or later/);
  });

  it('refused even with a matching sum: no node.exe in the zip, a node.exe that is not a Windows executable, a CRC-32 mismatch', () => {
    const top = 'node-v22.23.4-win-x64/';
    const noExe = fixture('22.23.4', { files: [[`${top}LICENSE`, license]] });
    expect(() => winNode.readWindowsNode(noExe.zip, noExe.sums)).toThrow(/the zip has no node-v22\.23\.4-win-x64\/node\.exe/);
    const notPe = fixture('22.23.4', { files: [[`${top}node.exe`, Buffer.from('#!/bin/sh')], [`${top}LICENSE`, license]] });
    expect(() => winNode.readWindowsNode(notPe.zip, notPe.sums)).toThrow(/not a Windows executable/);
    const badCrc = fixture('22.23.4', { mangle: (c) => (c ^ 1) >>> 0 });
    expect(() => winNode.readWindowsNode(badCrc.zip, badCrc.sums)).toThrow(/CRC-32 or size does not match/);
  });

  it('SHASUMS256.txt lines: "<sum>  <name>" (and the binary-mode "*<name>"); the name must match exactly', () => {
    const sum = 'C0FFEE'.repeat(10) + 'C0FE';
    expect(winNode.listedSum(`${sum}  node-v22.23.4-win-x64.zip\r\n`, 'node-v22.23.4-win-x64.zip')).toBe(sum.toLowerCase());
    expect(winNode.listedSum(`${sum} *node-v22.23.4-win-x64.zip`, 'node-v22.23.4-win-x64.zip')).toBe(sum.toLowerCase());
    expect(winNode.listedSum(`${sum}  node-v22.23.4-win-x64.zip.asc`, 'node-v22.23.4-win-x64.zip')).toBeNull();
  });
});
