// The classroom kit on Windows (rc.3; UNTESTED ON WINDOWS until the owner runs the checklist in the kit's READ ME). Nobody
// here can run Windows, so these tests pin what can be checked elsewhere: the .cmd files the kit gets (CRLF, ASCII),
// the Windows branch of the browser opener (process.platform faked), the relay's and serve.mjs's "inside the app
// folder" test on Windows paths (path.win32), the Windows interface names for the QR code, and server/launch.mjs (what
// the .cmd files run) on this OS.
import { spawn } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path, { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import { isInside, lanAddresses } from '../../relay/http.ts';
import { waitFor } from '../helpers.ts';

const showcase = resolve(import.meta.dirname, '../../../../scripts/showcase');
// plain .mjs scripts outside the package: imported by URL (untyped), as make-bundle.mjs and the kit use them
const kitLaunchers = (await import(pathToFileURL(join(showcase, 'kit-launchers.mjs')).href)) as {
  WINDOWS_LAUNCHERS: Array<[string, string]>;
  writeWindowsLaunchers: (kitSrc: string, out: string) => void;
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
  const run = (kit: string, mode: string) => {
    const p = spawn(process.execPath, [join(kit, 'server/launch.mjs'), mode], { env: { PATH: process.env.PATH ?? '', PME_NO_OPEN: '1', PME_PORT: String(20000 + Math.floor(Math.random() * 20000)) }, stdio: ['ignore', 'pipe', 'pipe'] });
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

  it('classroom without the relay bundle: says the kit is incomplete (and how to unzip), exits 1', async () => {
    const r = run(miniKit(), 'classroom');
    expect(await r.exited).toBe(1);
    expect(r.out()).toContain('THE CLASSROOM COULD NOT START');
    expect(r.out()).toContain('The kit is incomplete');
    expect(r.out()).toContain('Extract All');
    expect([...Buffer.from(r.out())].every((c) => c < 0x80), 'ASCII output only').toBe(true);
  }, 30_000);
});
