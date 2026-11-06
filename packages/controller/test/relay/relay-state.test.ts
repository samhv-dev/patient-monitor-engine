// Room plan R1b (docs/plans/room-and-instruments.md §7; Q3 ruled 5 November = A): the room code survives the kit's port
// change. The kit opens http://127.0.0.1:<port> and moves to the next port when 8650 is busy; a new port is a new origin
// with an empty store, so the app alone would draw a new code. With `--state-dir DIR` the relay keeps the code of the last
// room a host opened in DIR/room.json and answers it as `lastRoom` in /pme-relay.json, across a restart on another port.
// room.json holds the room code only (never a PIN, a peer id, an address or a name); without `--state-dir` (`pnpm relay`,
// the developer's use) nothing is written anywhere.
import { spawn } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createStamper, type Role } from '../../src/protocol.ts';
import { startRelay, type RelayHandle, type RelayOptions } from '../../relay/server.ts';
import { sleep } from '../helpers.ts';

const relays: RelayHandle[] = [];
const procs: Array<ReturnType<typeof spawn>> = [];
afterEach(async () => {
  for (const r of relays.splice(0)) await r.close();
  for (const p of procs.splice(0)) if (p.exitCode === null) p.kill('SIGTERM');
});
const start = async (o: RelayOptions = {}) => {
  const r = await startRelay({ port: 0, host: '127.0.0.1', heartbeatMs: 60_000, ...o });
  relays.push(r);
  return r;
};
const info = async (port: number) => (await (await fetch(`http://127.0.0.1:${port}/pme-relay.json`)).json()) as Record<string, unknown>;
/** /pme-relay.json answers `lastRoom: code` within 2 s. */
async function lastRoomIs(port: number, code: string) {
  for (const end = Date.now() + 2000; Date.now() < end; await sleep(10)) if ((await info(port)).lastRoom === code) return;
  expect((await info(port)).lastRoom).toBe(code);
}

/** A socket that says hello to `code` as `role` with peer id `id`, and the PIN when given. */
async function hello(port: number, code: string, id: string, role: Role, pin?: string) {
  const ws = new WebSocket(`ws://127.0.0.1:${port}/`);
  await new Promise((ok) => (ws.onopen = ok));
  ws.send(JSON.stringify(createStamper(code, id)({ kind: 'hello', role, ...(pin ? { pin } : {}) })));
  await sleep(30);
  return ws;
}

/** `node relay/bin.ts ...` as a process of its own (the kit runs the bundled bin): resolves its port once ready. */
async function relayProcess(args: string[], o: { cwd?: string; env?: NodeJS.ProcessEnv } = {}) {
  const bin = resolve(import.meta.dirname, '../../relay/bin.ts');
  const p = spawn(process.execPath, ['--experimental-strip-types', '--no-warnings', bin, '--port', '0', '--host', '127.0.0.1', '--quiet', ...args], { cwd: o.cwd, env: o.env ?? process.env, stdio: ['ignore', 'pipe', 'pipe'] });
  procs.push(p);
  let out = '';
  return new Promise<{ port: number; stop: () => Promise<void> }>((ok, no) => {
    const onData = (d: Buffer) => {
      out += d;
      const m = /ready on ws:\/\/[^:]+:(\d+)\//.exec(out);
      if (m) ok({ port: Number(m[1]), stop: () => new Promise((r) => (p.once('exit', () => r()), p.kill('SIGTERM'))) });
    };
    p.stdout.on('data', onData);
    p.stderr.on('data', onData);
    p.once('exit', (c) => no(new Error(`relay exited (${c}): ${out}`)));
  });
}

describe('the relay keeps the last room code in its state directory', () => {
  it('with --state-dir: lastRoom after a host\'s hello, and a NEW relay process on another port with the same directory answers the same', async () => {
    const dir = join(mkdtempSync(join(tmpdir(), 'relay-state-')), 'PME Classroom'); // created on the first write
    const a = await start({ stateDir: dir });
    expect((await info(a.port)).lastRoom).toBeUndefined(); // nothing kept yet
    const host = await hello(a.port, 'QFBAWA', 'host-7f3a', 'host');
    await lastRoomIs(a.port, 'QFBAWA');
    host.close();
    await a.close();
    relays.length = 0;
    const b = await relayProcess(['--state-dir', dir]);
    expect(b.port).not.toBe(a.port);
    expect((await info(b.port)).lastRoom).toBe('QFBAWA');
    await b.stop();
  });

  it('a host that opens another room (R7 "New room code", or another session) replaces lastRoom; a viewer\'s or an instructor\'s hello does not', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'relay-state-'));
    const r = await start({ stateDir: dir });
    await hello(r.port, 'QFBAWA', 'host-1', 'host');
    await lastRoomIs(r.port, 'QFBAWA');
    await hello(r.port, 'KKQB2N', 'view-1', 'viewer');
    await hello(r.port, 'KKQB2N', 'inst-1', 'instructor', '4821');
    await sleep(50);
    expect((await info(r.port)).lastRoom).toBe('QFBAWA');
    await hello(r.port, 'KKQB2N', 'host-2', 'host');
    await lastRoomIs(r.port, 'KKQB2N');
    expect(JSON.parse(readFileSync(join(dir, 'room.json'), 'utf8'))).toEqual({ lastRoom: 'KKQB2N' });
  });

  it('room.json holds the room code only: never a PIN, a peer id, an address or a name', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'relay-state-'));
    const r = await start({ stateDir: dir });
    await hello(r.port, 'QFBAWA', 'host-pme-laptop-name', 'host');
    await hello(r.port, 'QFBAWA', 'inst-phone', 'instructor', '4821');
    await hello(r.port, 'QFBAWA', 'view-phone', 'viewer');
    await lastRoomIs(r.port, 'QFBAWA');
    expect(readdirSync(dir)).toEqual(['room.json']);
    const text = readFileSync(join(dir, 'room.json'), 'utf8');
    expect(Object.keys(JSON.parse(text) as object)).toEqual(['lastRoom']);
    for (const never of ['4821', 'host-pme', 'laptop', 'inst-phone', 'view-phone', '127.0.0.1', 'pin', 'address', 'name']) expect(text).not.toContain(never);
  });

  it('a room.json that is not ours (unreadable, another shape, not a code) is no lastRoom; the relay starts', async () => {
    for (const body of ['not json', '{"lastRoom":"IIIIII"}', '{"lastRoom":7}', '[]', 'null']) {
      const dir = mkdtempSync(join(tmpdir(), 'relay-state-'));
      writeFileSync(join(dir, 'room.json'), body);
      const r = await start({ stateDir: dir });
      expect((await info(r.port)).lastRoom, body).toBeUndefined();
    }
  });

  it('without --state-dir (pnpm relay): nothing is written, in the working folder or the home folder, and lastRoom is absent', async () => {
    const cwd = mkdtempSync(join(tmpdir(), 'relay-cwd-'));
    const home = mkdtempSync(join(tmpdir(), 'relay-home-'));
    const p = await relayProcess([], { cwd, env: { ...process.env, HOME: home, USERPROFILE: home, LOCALAPPDATA: home, XDG_STATE_HOME: home } });
    const host = await hello(p.port, 'QFBAWA', 'host-1', 'host');
    await sleep(200);
    expect((await info(p.port)).lastRoom).toBeUndefined();
    host.close();
    await p.stop();
    expect(readdirSync(cwd)).toEqual([]);
    expect(readdirSync(home)).toEqual([]);
  });
});
