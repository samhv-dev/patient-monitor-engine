// The kit store (docs/plans/scenario-builder.md §8 layer 2, piece B8; the owner's ruling of 10 November 2026): the
// clinicians' scenario cards kept as plain files in the kit's own user-data folder, through the relay's /pme-store/
// paths (relay/store.ts). Versions are never overwritten; writes come from this computer only (tested from this
// machine's own network address, which is not loopback, through the real relay); card reads are open to the room, as the
// plan rules; a name is a safe file name on every system (no path leaves the folder); a card file is at most 512 KiB
// (the owner's BQ13); nothing is written before the first save; a read-only folder says so.
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { lanAddresses } from '../../relay/http.ts';
import { startRelay, type RelayHandle } from '../../relay/server.ts';
import type { IncomingMessage } from 'node:http';
import { CARD_MAX_BYTES, fromThisComputer, keepCard, listCards, parseVersionFile, readCard, safeName, versionFile, writeRefusal } from '../../relay/store.ts';

const relays: RelayHandle[] = [];
afterEach(async () => {
  for (const r of relays.splice(0)) await r.close();
});
const tmp = (p = 'kit-store-') => mkdtempSync(join(tmpdir(), p));
const card = (id: string, extra: Record<string, unknown> = {}) => `${JSON.stringify({ schema: 'pme-scenario/2', id, title: `Card ${id}`, ...extra }, null, 2)}\n`;
/**
 * This machine's own network address (not loopback): what a phone on the room's network looks like to the relay. Null
 * when it has none, or when this machine refuses connections to it (a sandbox, a firewall in stealth mode: the CI
 * runner reaches it; `fromThisComputer`'s own test below covers the rule either way).
 */
const LAN = await (async () => {
  const a = lanAddresses()[0];
  if (!a) return null;
  const r = await startRelay({ port: 0, host: '0.0.0.0', heartbeatMs: 60_000 });
  try {
    return (await fetch(`http://${a}:${r.port}/pme-relay.json`, { signal: AbortSignal.timeout(2000) })).ok ? a : null;
  } catch {
    return null;
  } finally {
    await r.close();
  }
})();

describe('names the store may use', () => {
  it('a card id of letters, digits, "_", "." and "-" is its own file name; anything that could leave the folder is refused', () => {
    for (const ok of ['showcase-mh-v2-copy', 'a', 'A.b_c-9', 'x'.repeat(64), '9lives']) expect(safeName(ok), ok).toBe(ok);
    for (const bad of ['', '..', '.', '../x', 'a/b', 'a\\b', '/etc', 'C:', 'a:b', '.hidden', '-x', '_x', 'a b', 'a\0b', 'café', 'x'.repeat(65), 'end.', 7, null, undefined]) {
      expect(safeName(bad), String(bad)).toBeNull();
    }
  });
  it('Windows device names are refused, with or without an extension, in any case', () => {
    for (const bad of ['CON', 'con', 'Prn', 'AUX', 'NUL', 'nul.json', 'COM1', 'com9.txt', 'LPT1', 'lpt3.x', 'COM¹']) expect(safeName(bad), bad).toBeNull();
    for (const ok of ['console', 'conx', 'com10', 'lpt', 'nully']) expect(safeName(ok), ok).toBe(ok);
  });
  it('a version file is named by its number and its time (UTC), and read back', () => {
    const at = Date.UTC(2026, 10, 10, 18, 22, 5, 700);
    expect(versionFile(3, at)).toBe('v0003-2026-11-10T18-22-05Z.json');
    expect(parseVersionFile('v0003-2026-11-10T18-22-05Z.json')).toEqual({ v: 3, at: Date.UTC(2026, 10, 10, 18, 22, 5) });
    expect(parseVersionFile('v12345-2026-11-10T18-22-05Z.json')?.v).toBe(12345);
    for (const no of ['v3.json', 'v0003.json', '.incoming-1-2.tmp', 'v0003-2026-11-10T18:22:05Z.json', 'notes.txt']) expect(parseVersionFile(no), no).toBeNull();
  });
});

describe('who may write: this computer only', () => {
  const req = (remoteAddress: string, host: string, origin?: string) => ({ socket: { remoteAddress }, headers: { host, ...(origin ? { origin } : {}) } }) as unknown as IncomingMessage;
  it('the loopback peer, a loopback Host, and a loopback Origin or none', () => {
    for (const [a, h, o] of [['127.0.0.1', '127.0.0.1:8650'], ['::1', '[::1]:8650'], ['::ffff:127.0.0.1', 'localhost:8650'], ['127.0.0.1', '127.0.0.1:8650', 'http://127.0.0.1:8650'], ['127.0.0.1', '127.0.0.1:9811', 'http://localhost:5173']] as const) {
      expect(fromThisComputer(req(a, h, o)), `${a} ${h} ${o}`).toBe(true);
    }
  });
  it('never a phone on the room network, a rebound name, or a page of another site', () => {
    for (const [a, h, o] of [
      ['192.168.1.20', '192.168.1.10:8650'], // a phone
      ['192.168.1.10', '192.168.1.10:8650'], // this laptop by its own network address: not loopback
      ['::ffff:10.0.0.7', '127.0.0.1:8650'],
      ['127.0.0.1', 'evil.example:8650'], // DNS rebinding: the Host is the other site's
      ['127.0.0.1', '127.0.0.1:8650', 'https://example.org'], // a site open in the laptop's browser
      ['127.0.0.1', '127.0.0.1:8650', 'http://192.168.1.10:8650'],
      ['127.0.0.1', '127.0.0.1:8650', 'null'],
      ['', '127.0.0.1:8650'],
    ] as const) expect(fromThisComputer(req(a, h, o)), `${a} ${h} ${o}`).toBe(false);
  });
});

describe('versions, never overwrites', () => {
  it('each save is a new file; the same bytes as the newest write nothing; earlier versions stay byte for byte', () => {
    const dir = join(tmp(), 'user-data');
    expect(existsSync(dir)).toBe(false);
    const t0 = Date.UTC(2026, 10, 10, 9, 0, 0);
    const a = keepCard(dir, 'mh-copy', card('mh-copy'), t0);
    expect(a).toEqual({ ok: true, same: false, version: { v: 1, at: t0, bytes: Buffer.byteLength(card('mh-copy')) } });
    expect(keepCard(dir, 'mh-copy', card('mh-copy'), t0 + 60_000)).toMatchObject({ ok: true, same: true, version: { v: 1 } });
    const b = keepCard(dir, 'mh-copy', card('mh-copy', { title: 'edited' }), t0 + 120_000);
    expect(b).toMatchObject({ ok: true, same: false, version: { v: 2 } });
    // the same moment again (two saves in one second): a third file, not a replaced second
    expect(keepCard(dir, 'mh-copy', card('mh-copy', { title: 'again' }), t0 + 120_000)).toMatchObject({ ok: true, version: { v: 3 } });
    const files = readdirSync(join(dir, 'scenarios', 'mh-copy')).sort();
    expect(files).toEqual(['v0001-2026-11-10T09-00-00Z.json', 'v0002-2026-11-10T09-02-00Z.json', 'v0003-2026-11-10T09-02-00Z.json']);
    expect(readFileSync(join(dir, 'scenarios', 'mh-copy', files[0]!), 'utf8')).toBe(card('mh-copy'));
    expect(readCard(dir, 'mh-copy', 2)).toBe(card('mh-copy', { title: 'edited' }));
    expect(listCards(dir)).toEqual([{ id: 'mh-copy', title: 'again', versions: [1, 2, 3].map((v) => expect.objectContaining({ v })) }]);
  });
  it('a version number already on disk (another writer) is never reused, whatever its time', () => {
    const dir = tmp();
    mkdirSync(join(dir, 'scenarios', 'c'), { recursive: true });
    writeFileSync(join(dir, 'scenarios', 'c', 'v0001-2020-01-01T00-00-00Z.json'), card('c', { title: 'theirs' }));
    expect(keepCard(dir, 'c', card('c'), Date.UTC(2026, 0, 1))).toMatchObject({ ok: true, version: { v: 2 } });
    expect(readCard(dir, 'c', 1)).toBe(card('c', { title: 'theirs' }));
  });
  it('refused: an unsafe id, a body that is not a card with that id, one over 512 KiB; nothing is written', () => {
    const dir = join(tmp(), 'user-data');
    expect(keepCard(dir, '../x', card('../x'))).toMatchObject({ ok: false, status: 400 });
    expect(keepCard(dir, 'CON', card('CON'))).toMatchObject({ ok: false, status: 400 });
    expect(keepCard(dir, 'a', card('b'))).toMatchObject({ ok: false, status: 400 });
    expect(keepCard(dir, 'a', '[1]')).toMatchObject({ ok: false, status: 400 });
    expect(keepCard(dir, 'a', 'not json')).toMatchObject({ ok: false, status: 400 });
    const big = card('a', { pad: 'x'.repeat(CARD_MAX_BYTES) });
    expect(keepCard(dir, 'a', big)).toMatchObject({ ok: false, status: 413 });
    expect(existsSync(dir)).toBe(false);
    expect(CARD_MAX_BYTES).toBe(524_288);
  });
  it('a read names an existing version of a safe id only', () => {
    const dir = tmp();
    keepCard(dir, 'a', card('a'));
    expect(readCard(dir, 'a', 1)).toBe(card('a'));
    for (const [id, v] of [['a', 2], ['a', 0], ['a', 1.5], ['../a', 1], ['b', 1]] as const) expect(readCard(dir, id, v), `${id} ${v}`).toBeNull();
  });
  it('a folder that cannot be written says why (a read-only folder; the nearest existing folder is asked)', () => {
    const parent = tmp();
    chmodSync(parent, 0o555);
    try {
      expect(writeRefusal(join(parent, 'user-data'))).toBe('this computer does not allow writing there');
      expect(keepCard(join(parent, 'user-data'), 'a', card('a'))).toMatchObject({ ok: false, status: 507, why: 'this computer does not allow writing there' });
    } finally {
      chmodSync(parent, 0o755);
    }
    expect(writeRefusal(join(parent, 'user-data'))).toBeNull();
  });
});

describe('through the relay: /pme-store/', () => {
  const start = async (dir: string) => {
    const r = await startRelay({ port: 0, host: '0.0.0.0', heartbeatMs: 60_000, stateDir: dir });
    relays.push(r);
    return r;
  };
  const post = (url: string, body: string, headers: Record<string, string> = {}) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body });

  it('from this computer: the status, a write, the list and the version read back', async () => {
    const dir = join(tmp(), 'user-data');
    const r = await start(dir);
    const at = `http://127.0.0.1:${r.port}/pme-store/`;
    expect(await (await fetch(at)).json()).toEqual({ store: 'pme', folder: 'user-data', writable: true });
    expect(existsSync(dir)).toBe(false); // created at the first write, not before
    const w = await post(`${at}scenarios/mh-copy`, card('mh-copy'));
    expect(w.status).toBe(201);
    expect(await w.json()).toMatchObject({ v: 1, same: false });
    expect((await post(`${at}scenarios/mh-copy`, card('mh-copy'))).status).toBe(200); // the same bytes: nothing new
    expect(await (await fetch(`${at}scenarios/`)).json()).toMatchObject({ cards: [{ id: 'mh-copy', title: 'Card mh-copy', versions: [{ v: 1 }] }] });
    expect(await (await fetch(`${at}scenarios/mh-copy/1`)).text()).toBe(card('mh-copy'));
    expect((await fetch(`${at}scenarios/mh-copy/2`)).status).toBe(404);
  });

  it('traversal through the address is refused, and nothing outside the folder is read or written', async () => {
    const root = tmp();
    const dir = join(root, 'user-data');
    writeFileSync(join(root, 'secret.json'), '{"id":"secret"}');
    const r = await start(dir);
    const at = `http://127.0.0.1:${r.port}/pme-store/scenarios/`;
    // (a literal "..", or "%2e%2e", is resolved by the URL itself before it is sent: an encoded separator is not)
    for (const id of ['..%2F..%2Fsecret', '..%2Fsecret', 'a%2Fb', 'a%5Cb', '%2Fetc', 'CON', 'nul.json', 'x'.repeat(65)]) {
      const res = await post(`${at}${id}`, JSON.stringify({ id: decodeURIComponent(id) }));
      expect(res.status, id).toBe(400);
    }
    for (const p of ['..%2F..%2Fsecret.json/1', '..%2Fsecret/1', '%2E%2E%2F%2E%2E%2Fsecret/1']) expect((await fetch(`${at}${p}`)).status, p).toBe(404);
    expect(existsSync(dir)).toBe(false);
    expect(readdirSync(root)).toEqual(['secret.json']);
  });

  it('a card over 512 KiB is refused (413) before it is read whole; a body that is not JSON (415) too', async () => {
    const r = await start(join(tmp(), 'user-data'));
    const at = `http://127.0.0.1:${r.port}/pme-store/scenarios/a`;
    expect((await post(at, card('a', { pad: 'x'.repeat(CARD_MAX_BYTES) }))).status).toBe(413);
    expect((await fetch(at, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: card('a') })).status).toBe(415);
  });

  it('a page from another site open in this computer’s browser cannot write (its Origin), nor a rebound name (its Host)', async () => {
    const dir = join(tmp(), 'user-data');
    const r = await start(dir);
    const at = `http://127.0.0.1:${r.port}/pme-store/scenarios/a`;
    expect((await post(at, card('a'), { Origin: 'https://example.org' })).status).toBe(403);
    expect((await fetch(at, { method: 'OPTIONS', headers: { Origin: 'https://example.org', 'Access-Control-Request-Method': 'POST' } })).status).toBe(403);
    // a page of this computer on another port (a dev server) may: its preflight is answered
    const pre = await fetch(at, { method: 'OPTIONS', headers: { Origin: 'http://127.0.0.1:5173', 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type' } });
    expect(pre.status).toBe(204);
    expect(pre.headers.get('access-control-allow-origin')).toBe('http://127.0.0.1:5173');
    expect(existsSync(dir)).toBe(false);
    expect((await post(at, card('a'), { Origin: 'http://localhost:5173' })).status).toBe(201);
  });

  it.skipIf(!LAN)('from another device (this machine’s network address, not loopback): no write, the status says so, card reads are open', async () => {
    const dir = join(tmp(), 'user-data');
    const r = await start(dir);
    const mine = `http://127.0.0.1:${r.port}/pme-store/`;
    const room = `http://${LAN}:${r.port}/pme-store/`;
    expect((await post(`${mine}scenarios/kept`, card('kept'))).status).toBe(201);
    const w = await post(`${room}scenarios/phone`, card('phone'));
    expect(w.status).toBe(403);
    expect(await w.json()).toMatchObject({ refused: 'not-this-computer' });
    expect(await (await fetch(room)).json()).toMatchObject({ store: 'pme', writable: false, refused: 'not-this-computer' });
    // the plan's rule: card reads are open to the room, so another window of the room lists the drafts
    expect(await (await fetch(`${room}scenarios/`)).json()).toMatchObject({ cards: [{ id: 'kept' }] });
    expect(await (await fetch(`${room}scenarios/kept/1`)).text()).toBe(card('kept'));
    expect(readdirSync(join(dir, 'scenarios'))).toEqual(['kept']);
  });

  it('without --state-dir the store’s paths are not answered (pnpm relay writes nothing)', async () => {
    const r = await startRelay({ port: 0, host: '127.0.0.1', heartbeatMs: 60_000 });
    relays.push(r);
    expect((await fetch(`http://127.0.0.1:${r.port}/pme-store/`)).status).toBe(404);
    expect((await post(`http://127.0.0.1:${r.port}/pme-store/scenarios/a`, card('a'))).status).toBe(405);
  });
});
