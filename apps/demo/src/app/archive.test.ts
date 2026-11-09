// The Debrief archive (board "Finish 2", approved 30 October): every debrief "Finish the case" saves is kept in this
// browser until the instructor clears it: the debrief's JSON as the Debrief view builds it (in IndexedDB since N39),
// beside the resident, the card, when it was saved, the run's duration, the objective counts and the size (the index,
// in localStorage). A second save of one run replaces its entry; a storage that refuses (full, blocked) saves nothing
// and says which; "Export all" is one JSON file. N39: a WebKit-sized localStorage refused the 11th debrief of a 25-minute
// card; the bodies now go to IndexedDB, and an earlier build's bodies move there once.
import type { WireEvent } from '@pme/controller';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { Archive, markCounts, marksLine, objectiveCounts, objectivesLine, refusalText, type ArchiveMeta, type Refusal } from './archive.ts';
import { asFactory, MemoryIDB } from './memory-idb.ts';
import { MemoryStorage as Mem } from './memory-storage.ts';
import { RunRecord, type RunData } from './record.ts';
import induction from './showcase/showcase-induction.json';

const applied = (tick: number, command: Record<string, unknown>): WireEvent =>
  ({ type: 'commandApplied', commandId: `c${tick}`, tick, resolved: { command: { id: `c${tick}`, issuedBy: 'instructor', ...command } } }) as WireEvent;
const state = (t: number, stateId: string, transitionId?: string): WireEvent => ({ type: 'scenario', t, stateId, ...(transitionId ? { transitionId } : {}) }) as WireEvent;

/** A run of the induction card with four objectives (one met by its rule, one ticked, one not met, one not
 *  assessable), three marks (one with a note) and one instructor note, 01:40 long. */
function run(startedAt = Date.UTC(2026, 9, 30, 9, 0)) {
  const record = new RunRecord(() => ({ patient: 'M 40 y 70 kg', weightKg: 70 }), () => startedAt);
  const doc = {
    ...induction,
    objectives: [
      { text: 'Induce', rule: { kind: 'occurred', event: 'state:induced' } },
      'Call for help',
      { text: 'Never desaturate', rule: { kind: 'never', event: 'state:induced' } },
      'Speak to the family',
    ],
  };
  record.wire(applied(0, { type: 'scenario', action: 'load', doc }));
  record.wire(state(0, 'awake'));
  record.wire(applied(500, { type: 'scenario', action: 'trigger', target: 'induce' }));
  record.wire(state(10, 'induced', 'induce'));
  record.wire(applied(1000, { type: 'scenario', action: 'bookmark', target: 'Mark 1 at 00:20', kind: 'good', note: 'calm' }));
  record.wire(applied(1500, { type: 'scenario', action: 'bookmark', target: 'Mark 2 at 00:30', kind: 'good' }));
  record.wire(applied(2000, { type: 'scenario', action: 'bookmark', target: 'Mark 3 at 00:40', kind: 'discuss' }));
  record.note(50, 'Objective met: Call for help');
  record.note(60, 'Asked for the difficult airway trolley');
  record.note(100, 'Handed over to recovery');
  return record;
}

describe('the counts the Finish pane and the archive show', () => {
  it('objectives: met (by its rule or ticked), not met, not assessable; marks by kind and the notes', () => {
    const d = run().data;
    const o = objectiveCounts(d);
    expect(o).toEqual({ met: 2, total: 4, notMet: 1, notAssessable: 1 });
    expect(objectivesLine(o)).toBe('2 of 4 met · 1 not met · 1 not assessable');
    const m = markCounts(d);
    // a note: the instructor's own lines (not an objective's tick) and a mark's note
    expect(m).toEqual({ good: 2, bad: 0, discuss: 1, notes: 3 });
    expect(marksLine(m)).toBe('2 good · 0 bad · 1 discuss · 3 notes');
  });

  it('a run without objectives or marks says so', () => {
    const d = new RunRecord(() => ({ patient: 'M 40 y 70 kg', weightKg: 70 }), () => 1).data;
    expect(objectivesLine(objectiveCounts(d))).toBe('no objectives on this card');
    expect(marksLine(markCounts(d))).toBe('0 good · 0 bad · 0 discuss · 0 notes');
  });
});

const at = Date.UTC(2026, 9, 30, 9, 25);
const saved = (x: ArchiveMeta | Refusal): ArchiveMeta => {
  if ('refused' in x) throw new Error(`refused: ${x.refused} (${x.detail})`);
  return x;
};
/** A browser: its localStorage and its IndexedDB, both in memory. */
function browser(o: { lsLimit?: number; idbLimit?: number; noIdb?: boolean } = {}) {
  const mem = new Mem(o.lsLimit);
  const idb = new MemoryIDB(o.idbLimit);
  const a = new Archive(() => mem, () => (o.noIdb ? null : asFactory(idb)));
  return { mem, idb, a, bodies: () => idb.rows('pme-archive', 'bodies') };
}

describe('the archive store', () => {
  it('saves the debrief JSON as the Debrief view builds it, beside the resident, card, time, duration, counts and size', async () => {
    const { mem, a, bodies } = browser();
    const d = run().data;
    const e = saved(await a.save(d, ' Dr Rahimi ', 'build-x', at));
    expect(e).toMatchObject({ resident: 'Dr Rahimi', cardId: 'showcase-induction', title: 'Healthy induction', savedAt: at, runStartedAt: d.startedAt, durationS: 100, objectives: { met: 2, total: 4, notMet: 1, notAssessable: 1 } });
    expect(a.list()).toEqual([e]);
    expect(a.backend).toBe('indexeddb');
    const body = (await a.debrief(e.id)) as string;
    const json = JSON.parse(body);
    expect(json.schema).toBe('pme-debrief/2');
    expect(json.build).toBe('build-x');
    expect(json.record.startedAt).toBe(d.startedAt);
    expect(json.objectives).toHaveLength(4);
    expect(json.marks).toHaveLength(3);
    expect(e.bytes).toBe(new TextEncoder().encode(body).length);
    // the index in localStorage, the body in IndexedDB under the entry's id: the list never parses a debrief
    expect([...mem.m.keys()]).toEqual(['pme.archive']);
    expect([...bodies().keys()]).toEqual([e.id]);
    expect(a.holdsLine()).toBe(`1 saved · ${Math.round((e.bytes as number) / 1e3)} kB`);
    expect(a.whereLine()).toBe('kept in this browser until you clear it');
  });

  it('a second save of the same run replaces its entry (the resident as typed last); another run is a new entry', async () => {
    const { a, bodies } = browser();
    const r = run();
    const one = saved(await a.save(r.data, 'Dr A', 'b', at));
    const again = saved(await a.save(r.data, 'Dr B', 'b', at + 60_000));
    expect(again.id).toBe(one.id);
    expect(a.list().map((x) => x.resident)).toEqual(['Dr B']);
    expect(a.forRun(r.data.startedAt)?.id).toBe(one.id);
    const other = saved(await a.save(run(Date.UTC(2026, 9, 30, 10, 0)).data, 'Dr C', 'b', at + 120_000));
    expect(a.list().map((x) => x.resident)).toEqual(['Dr B', 'Dr C']);
    expect(a.forRun(Date.UTC(2026, 9, 30, 10, 0))?.id).toBe(other.id);
    expect(a.forRun(12345)).toBeNull();
    expect(bodies().size).toBe(2);
  });

  it('saves pressed together land one after another: none is lost from the index', async () => {
    const { a } = browser();
    const xs = await Promise.all([0, 1, 2].map((i) => a.save(run(Date.UTC(2026, 9, 30, 10, i)).data, `Dr ${i}`, 'b', at + i)));
    expect(xs.every((x) => !('refused' in x))).toBe(true);
    expect(a.list().map((x) => x.resident)).toEqual(['Dr 0', 'Dr 1', 'Dr 2']);
  });

  it('a full storage saves nothing and says it is full; a blocked one says it is blocked; the archive is as it was', async () => {
    const full = browser({ idbLimit: 4000 });
    expect(await full.a.save(run().data, 'Dr A', 'b', at)).toEqual({ refused: 'full', detail: 'QuotaExceededError' });
    expect(full.a.list()).toEqual([]);
    expect(full.bodies().size).toBe(0);
    expect([...full.mem.m.keys()]).toEqual([]);
    expect(refusalText({ refused: 'full', detail: 'QuotaExceededError' })).toBe('The debrief could not be saved: this browser’s storage for this site is full. Export the archive and clear it on the Debrief page, then try again.');
    const blocked = new Archive(() => null, () => null);
    const r = await blocked.save(run().data, 'Dr A', 'b', at);
    expect(r).toMatchObject({ refused: 'blocked' });
    expect(refusalText(r as Refusal)).toBe('The debrief could not be saved: this browser keeps no data for this site (a private window, or site data turned off in its settings). Download the record from the Debrief page to keep it.');
    expect(blocked.list()).toEqual([]);
  });

  it('an index that cannot be written takes the new body back out (and puts a replaced one back)', async () => {
    const { mem, a, bodies } = browser();
    const one = saved(await a.save(run().data, 'Dr A', 'b', at));
    const before = await a.debrief(one.id);
    const setItem = mem.setItem.bind(mem);
    mem.setItem = () => {
      throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
    };
    expect(await a.save(run().data, 'Dr B', 'b', at + 1)).toMatchObject({ refused: 'full' }); // a replace
    expect(await a.save(run(Date.UTC(2026, 9, 30, 11, 0)).data, 'Dr C', 'b', at + 2)).toMatchObject({ refused: 'full' }); // a new one
    mem.setItem = setItem;
    expect(a.list().map((x) => x.resident)).toEqual(['Dr A']);
    expect(await a.debrief(one.id)).toBe(before);
    expect([...bodies().keys()]).toEqual([one.id]);
  });

  it('counts the debriefs saved today; one entry and all of them export as JSON; clear empties it', async () => {
    const { mem, a, bodies } = browser();
    const yesterday = saved(await a.save(run(Date.UTC(2026, 9, 29, 9, 0)).data, 'Dr Y', 'b', at - 86_400_000));
    const today = saved(await a.save(run().data, 'Dr T', 'b', at));
    expect(a.savedToday(at)).toBe(1);
    const one = JSON.parse((await a.entryJson(today.id)) as string);
    expect(one).toMatchObject({ schema: 'pme-archive-entry/1', resident: 'Dr T', title: 'Healthy induction', savedAt: at });
    expect(one.debrief.schema).toBe('pme-debrief/2');
    const all = JSON.parse(await a.bundleJson(at + 1));
    expect(all.schema).toBe('pme-archive/1');
    expect(all.exportedAt).toBe(at + 1);
    expect(all.entries.map((x: { resident: string }) => x.resident)).toEqual(['Dr Y', 'Dr T']);
    expect(all.entries[0].debrief.schema).toBe('pme-debrief/2');
    expect(await a.entryJson(yesterday.id)).not.toBeNull();
    const v = a.version;
    await a.clear();
    expect(a.version).toBeGreaterThan(v);
    expect(a.list()).toEqual([]);
    expect([...mem.m.keys()]).toEqual([]);
    expect(bodies().size).toBe(0);
    expect(await a.entryJson(today.id)).toBeNull();
    expect(a.holdsLine()).toBe('0 saved · 0 kB');
  });

  it('an unreadable index reads as empty', () => {
    const mem = new Mem();
    mem.setItem('pme.archive', '{not json');
    expect(new Archive(() => mem, () => null).list()).toEqual([]);
  });

  it('where IndexedDB cannot be opened the bodies stay in localStorage, as before, and the archive says so', async () => {
    for (const idb of [() => null, () => asFactory(new MemoryIDB(Infinity, true))]) {
      const mem = new Mem();
      const a = new Archive(() => mem, idb);
      const e = saved(await a.save(run().data, 'Dr A', 'b', at));
      expect(a.backend).toBe('localStorage');
      expect([...mem.m.keys()].sort()).toEqual(['pme.archive', `pme.archive.${e.id}`]);
      expect(JSON.parse((await a.debrief(e.id)) as string).schema).toBe('pme-debrief/2');
      expect(a.whereLine()).toBe('kept in this browser’s localStorage (IndexedDB is unavailable here, so about 5 MB in all)');
      await a.clear();
      expect([...mem.m.keys()]).toEqual([]);
    }
  });
});

/** WebKit's localStorage accounting (Source/WebCore/storage/StorageMap.cpp `setItem`, against
 *  LocalStorageManager.cpp's `localStorageQuotaInBytes = 5 * MB`, MB = 1024 × 1024): key and value at
 *  String::sizeInBytes, one byte a character for a string all in Latin-1, two for any other. */
class WebKitStorage extends Mem {
  constructor() {
    super(5 * 1024 * 1024);
  }
  override setItem(k: string, v: string): void {
    const bytes = (x: string) => x.length * ([...x].some((c) => c.charCodeAt(0) > 0xff) ? 2 : 1);
    const used = [...this.m].reduce((n, [a, b]) => n + (a === k ? 0 : bytes(a) + bytes(b)), 0);
    if (used + bytes(k) + bytes(v) > this.limit) throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
    this.m.set(k, String(v));
  }
}

describe('N39: the debrief of a real run no longer outgrows a 5 MiB localStorage', () => {
  // the 25-minute mh-early-call run (a committed kit-round export, __fixtures__/debrief-2): 1507 samples
  const mh = (JSON.parse(readFileSync(join(import.meta.dirname, '__fixtures__', 'debrief-2', 'mh-early-call-a4-v2.json'), 'utf8')) as { record: RunData }).record;
  const nth = (i: number): RunData => ({ ...mh, startedAt: mh.startedAt + i * 3_600_000 });

  it('before: with the bodies in localStorage, WebKit refuses the 11th save (each body counts 2 bytes a character)', async () => {
    const mem = new WebKitStorage();
    const a = new Archive(() => mem, () => null); // the localStorage path: today's build before this change
    let n = 0;
    for (;;) {
      const r = await a.save(nth(n), `Dr ${n}`, 'build-0123456789ab', at + n);
      if ('refused' in r) {
        expect(r).toEqual({ refused: 'full', detail: 'QuotaExceededError' });
        break;
      }
      n++;
    }
    expect(n).toBe(10); // 10 × ≈ 481.6 kB (240 805 units × 2) fit in 5 MiB, the 11th does not
    expect(a.list()).toHaveLength(10);
  });

  it('after: the same WebKit localStorage holds 40 debriefs of that run (≈ 9.6 MB of JSON) and the index only', async () => {
    const mem = new WebKitStorage();
    const idb = new MemoryIDB();
    const a = new Archive(() => mem, () => asFactory(idb));
    for (let n = 0; n < 40; n++) saved(await a.save(nth(n), `Dr ${n}`, 'build-0123456789ab', at + n));
    expect(a.list()).toHaveLength(40);
    expect(idb.rows('pme-archive', 'bodies').size).toBe(40);
    expect([...mem.m.keys()]).toEqual(['pme.archive']);
    expect((mem.getItem('pme.archive') as string).length).toBeLessThan(40 * 400); // ≈ 300 units an entry
    expect(a.holdsLine()).toMatch(/^40 saved · 9\.\d MB$/);
    expect(JSON.parse((await a.debrief(a.list()[0]?.id as string)) as string).record.samples).toHaveLength(mh.samples.length); // nothing dropped
  });

  it('the bodies an earlier build kept in localStorage move to IndexedDB once, then leave localStorage', async () => {
    // an earlier build's archive: the index without sizes, the bodies under their own keys
    const old = new Mem();
    const before = new Archive(() => old, () => null);
    const ids = [];
    for (let n = 0; n < 5; n++) ids.push(saved(await before.save(nth(n), `Dr ${n}`, 'b', at + n)).id);
    const bodiesThen = await Promise.all(ids.map((id) => before.debrief(id)));
    old.setItem('pme.archive', JSON.stringify(before.list().map(({ bytes: _, ...e }) => e)));
    old.setItem('pme.instructorPin', '1234'); // another key of the app: untouched
    const idb = new MemoryIDB();
    const a = new Archive(() => old, () => asFactory(idb));
    expect(a.holdsLine()).toBe('5 saved'); // sizes not known until the move
    await a.ready();
    expect([...old.m.keys()].sort()).toEqual(['pme.archive', 'pme.instructorPin']);
    expect([...idb.rows('pme-archive', 'bodies').keys()]).toEqual(ids);
    expect(await Promise.all(ids.map((id) => a.debrief(id)))).toEqual(bodiesThen);
    expect(a.list().map((e) => e.bytes)).toEqual(bodiesThen.map((b) => new TextEncoder().encode(b as string).length));
    expect(a.holdsLine()).toMatch(/^5 saved · 1\.2 MB$/);
    // a second start moves nothing more
    const again = new Archive(() => old, () => asFactory(idb));
    await again.ready();
    expect(idb.rows('pme-archive', 'bodies').size).toBe(5);
  });

  it('a move the disk refuses leaves the bodies in localStorage, still read from there', async () => {
    const old = new Mem();
    const before = new Archive(() => old, () => null);
    const e = saved(await before.save(run().data, 'Dr A', 'b', at));
    const idb = new MemoryIDB(10);
    const a = new Archive(() => old, () => asFactory(idb));
    await a.ready();
    expect(a.backend).toBe('indexeddb');
    expect(old.getItem(`pme.archive.${e.id}`)).not.toBeNull();
    expect(await a.debrief(e.id)).toBe(old.getItem(`pme.archive.${e.id}`));
  });
});
