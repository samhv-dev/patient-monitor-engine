// The Debrief archive and the kit's user-data folder (brief 139 PR 2; the owner's ruling of 10 November 2026): with the
// kit store on, every debrief the archive saves is also a file, `debriefs/<id>.json` (the entry as Download writes it),
// even when this browser refused it; a re-save of the run replaces it; another browser (or this one, cleared) reads back
// the debriefs it lacks; Clear deletes the files for good (no recycle bin: a file left there would come back at the next
// open). With the store off, nothing is sent. The server's side is packages/controller/test/relay/kit-store.test.ts.
import type { WireEvent } from '@pme/controller';
import { describe, expect, it } from 'vitest';
import { Archive } from './archive.ts';
import { KitStore } from './kit-store.ts';
import { asFactory, MemoryIDB } from './memory-idb.ts';
import { MemoryStorage } from './memory-storage.ts';
import { RunRecord } from './record.ts';
import induction from './showcase/showcase-induction.json';

const PAGE = 'http://127.0.0.1:8650/?relay#/debrief';
const BASE = 'http://127.0.0.1:8650/pme-store/';
const at = () => {
  const u = new URL(PAGE);
  return { href: PAGE, protocol: u.protocol, host: u.host, hostname: u.hostname, origin: u.origin, pathname: u.pathname, search: u.search };
};
/** The kit's server, in memory: the debriefs' files by id; `on` whether the store is there. */
function kitServer(on = true) {
  const files = new Map<string, string>();
  const calls: string[] = [];
  const f = (async (url: string | URL | Request, init?: RequestInit) => {
    const u = String(url);
    const method = init?.method ?? 'GET';
    calls.push(`${method} ${u.slice(BASE.length)}`);
    const json = (v: unknown, code = 200) => new Response(JSON.stringify(v), { status: code });
    if (!on) return new Response('', { status: 404 });
    if (u === BASE) return json({ store: 'pme', folder: 'user-data', writable: true });
    if (u === `${BASE}debriefs/`) return json({ debriefs: [...files].map(([id, t]) => ({ id, bytes: t.length, at: 0 })) });
    const id = decodeURIComponent(u.slice(`${BASE}debriefs/`.length));
    if (method === 'PUT') return (files.set(id, String(init!.body)), json({ id, bytes: 1, at: 0 }));
    if (method === 'DELETE') return files.delete(id) ? json({ deleted: id }) : json({}, 404);
    return files.has(id) ? new Response(files.get(id)!, { status: 200 }) : json({}, 404);
  }) as typeof fetch;
  return { files, calls, kit: () => new KitStore(at, () => f) };
}
const applied = (tick: number, command: Record<string, unknown>): WireEvent =>
  ({ type: 'commandApplied', commandId: `c${tick}`, tick, resolved: { command: { id: `c${tick}`, issuedBy: 'instructor', ...command } } }) as WireEvent;
function run(startedAt: number) {
  const r = new RunRecord(() => ({ patient: 'M 40 y 70 kg', weightKg: 70 }), () => startedAt);
  r.wire(applied(0, { type: 'scenario', action: 'load', doc: induction }));
  r.wire({ type: 'scenario', t: 0, stateId: induction.initialState } as WireEvent);
  r.note(90, 'Handed over');
  return r.data;
}
const browser = () => ({ ls: new MemoryStorage(), idb: new MemoryIDB() });
const archiveOf = (b: ReturnType<typeof browser>, kit: KitStore | null) => new Archive(() => b.ls, () => asFactory(b.idb), kit);

describe('the archive keeps each debrief in the kit’s user-data folder too', () => {
  it('a save writes the entry as a file; a re-save of the run replaces it; the file is what Download writes', async () => {
    const srv = kitServer();
    const a = archiveOf(browser(), srv.kit());
    const d = run(Date.UTC(2026, 10, 10, 9));
    const e = await a.save(d, 'Dr Rahimi', 'b', Date.UTC(2026, 10, 10, 9, 30));
    if ('refused' in e) throw new Error('refused');
    expect(await a.kitDone).toEqual({ ok: true });
    expect(a.lastKit).toEqual({ ok: true });
    expect([...srv.files.keys()]).toEqual([e.id]);
    expect(srv.files.get(e.id)).toBe(await a.entryJson(e.id));
    expect(JSON.parse(srv.files.get(e.id)!)).toMatchObject({ schema: 'pme-archive-entry/1', id: e.id, resident: 'Dr Rahimi', debrief: { schema: 'pme-debrief/2' } });
    await a.save(d, 'Dr Karimi', 'b');
    await a.kitDone;
    expect([...srv.files.keys()]).toEqual([e.id]);
    expect(JSON.parse(srv.files.get(e.id)!)).toMatchObject({ resident: 'Dr Karimi' });
    expect(a.whereLine()).toBe('kept in this browser and in this kit’s user-data folder');
  });

  it('this browser refuses it (a private window: no storage): the folder keeps it, and says so through lastKit', async () => {
    const srv = kitServer();
    const a = new Archive(() => null, () => null, srv.kit());
    const r = await a.save(run(Date.UTC(2026, 10, 10, 10)), 'Dr Rahimi', 'b');
    expect(r).toMatchObject({ refused: 'blocked' });
    expect(await a.kitDone).toEqual({ ok: true });
    expect(srv.files.size).toBe(1);
  });

  it('another browser of the laptop (or this one, cleared) reads back what it lacks, in the order they were saved', async () => {
    const srv = kitServer();
    const first = archiveOf(browser(), srv.kit());
    const e1 = await first.save(run(Date.UTC(2026, 10, 10, 9)), 'Dr One', 'b', 1000);
    const e2 = await first.save(run(Date.UTC(2026, 10, 10, 10)), 'Dr Two', 'b', 2000);
    if ('refused' in e1 || 'refused' in e2) throw new Error('refused');
    const other = archiveOf(browser(), srv.kit());
    expect(other.list()).toEqual([]);
    expect(await other.syncFromKit()).toBe(2);
    expect(other.list().map((m) => [m.id, m.resident])).toEqual([[e1.id, 'Dr One'], [e2.id, 'Dr Two']]);
    expect(await other.debrief(e1.id)).toBe(await first.debrief(e1.id));
    expect(await other.syncFromKit()).toBe(0); // nothing more to read
    expect(srv.calls.filter((c) => c.startsWith('PUT'))).toHaveLength(2); // reading back writes nothing
  });

  it('Clear deletes every file of the folder, for good: no copy is kept aside, and nothing comes back at the next open', async () => {
    const srv = kitServer();
    const b = browser();
    const a = archiveOf(b, srv.kit());
    await a.save(run(Date.UTC(2026, 10, 10, 9)), 'Dr One', 'b');
    srv.files.set('fromelsewhere', '{"schema":"pme-archive-entry/1","id":"fromelsewhere"}'); // not (yet) in this browser
    await a.clear();
    expect(srv.files.size).toBe(0);
    expect(a.list()).toEqual([]);
    expect(await archiveOf(b, srv.kit()).syncFromKit()).toBe(0);
  });

  it('the store off (not a kit, a kit without Node.js): nothing is sent past the probe, lastKit stays null', async () => {
    const srv = kitServer(false);
    const a = archiveOf(browser(), srv.kit());
    await a.save(run(Date.UTC(2026, 10, 10, 9)), 'Dr One', 'b');
    expect(await a.syncFromKit()).toBe(0);
    await a.clear();
    expect(await a.kitDone).toBeNull();
    expect(a.lastKit).toBeNull();
    expect(srv.calls).toHaveLength(2); // the probe alone: the store's status, then the kit's pme-kit.json
    expect(srv.calls.every((c) => c.startsWith('GET '))).toBe(true);
    expect(a.whereLine()).toBe('kept in this browser until you clear it');
  });
});
