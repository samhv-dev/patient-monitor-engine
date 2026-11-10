// The builder's layer 1 (docs/plans/scenario-builder.md §8; piece B2): every draft and its snapshots kept in this
// browser, the bodies in IndexedDB and the index in localStorage, as the Debrief archive keeps debriefs (#370). Here on
// the in-memory doubles the archive's tests use: a draft's body and its snapshots land, a reload (a new store over the
// same browser) finds them, a restore keeps the draft it replaces as a snapshot, writes run one after another, a full
// or blocked storage refuses honestly and leaves the store as it was, and where IndexedDB cannot open the bodies fall
// back to localStorage and the store says so.
import { describe, expect, it } from 'vitest';
import { asFactory, MemoryIDB } from '../memory-idb.ts';
import { MemoryStorage } from '../memory-storage.ts';
import mh from '../showcase/showcase-mh-v2.json';
import { Drafts, draftRefusalText, SNAPSHOT_EVERY_MS, type DraftMeta, type Refusal } from './drafts.ts';

const T0 = Date.UTC(2026, 10, 10, 9, 0, 0);
const doc = (title: string) => ({ ...mh, id: 'mh-copy', title });
const browser = (limit = Infinity, ls = Infinity, refuseOpen = false) => ({ idb: new MemoryIDB(limit, refuseOpen), ls: new MemoryStorage(ls) });
const storeOf = (b: { idb: MemoryIDB; ls: MemoryStorage }) => new Drafts(() => b.ls, () => asFactory(b.idb));
const ok = (r: DraftMeta | Refusal): DraftMeta => {
  if ('refused' in r) throw new Error(`refused: ${r.refused} ${r.detail}`);
  return r;
};

describe('layer 1: drafts in this browser', () => {
  it('a new draft: its body in IndexedDB, snapshot 1 beside it, the index in localStorage; a new store over the same browser finds it', async () => {
    const b = browser();
    const d = storeOf(b);
    const m = ok(await d.create(doc('A'), 'a copy of the library card showcase-mh-v2', T0));
    expect(d.backend).toBe('indexeddb');
    expect(m).toMatchObject({ cardId: 'mh-copy', title: 'A', from: 'a copy of the library card showcase-mh-v2', createdAt: T0, savedAt: T0 });
    expect(m.snapshots).toEqual([{ n: 1, at: T0, why: 'opened', bytes: m.bytes }]);
    expect([...b.idb.rows('pme-builder', 'bodies').keys()].sort()).toEqual([m.id, `${m.id}@1`].sort());
    expect(JSON.parse(b.ls.getItem('pme.builder.drafts')!)).toEqual([m]);
    expect(Object.keys(Object.fromEntries(b.ls.m)).filter((k) => k !== 'pme.builder.drafts')).toEqual([]); // no body in localStorage
    const again = storeOf(b); // a reload
    expect(again.list()).toEqual([m]);
    expect(await again.body(m.id)).toEqual(doc('A'));
    expect(await again.snapshotBody(m.id, 1)).toEqual(doc('A'));
  });

  it('a save replaces the draft\'s body, keeps its key order, and takes a snapshot once 2 min of editing have passed since the last', async () => {
    const b = browser();
    const d = storeOf(b);
    const m = ok(await d.create(doc('A'), 'imported', T0));
    const s1 = ok(await d.save(m.id, doc('B'), T0 + 30_000));
    expect(s1.snapshots).toHaveLength(1);
    expect(s1).toMatchObject({ title: 'B', savedAt: T0 + 30_000 });
    expect(JSON.stringify(await storeOf(b).body(m.id))).toBe(JSON.stringify(doc('B')));
    const s2 = ok(await d.save(m.id, doc('C'), T0 + SNAPSHOT_EVERY_MS));
    expect(s2.snapshots.map((s) => [s.n, s.why])).toEqual([[1, 'opened'], [2, 'editing']]);
    expect(await d.snapshotBody(m.id, 2)).toEqual(doc('C'));
    expect(SNAPSHOT_EVERY_MS).toBe(120_000);
  });

  it('a restore brings a snapshot back and keeps the draft it replaces as the newest snapshot: nothing is lost', async () => {
    const d = storeOf(browser());
    const m = ok(await d.create(doc('A'), 'imported', T0));
    ok(await d.save(m.id, doc('B'), T0 + 1000));
    const r = await d.restore(m.id, 1, T0 + 2000);
    if ('refused' in r) throw new Error('refused');
    expect(r.doc).toEqual(doc('A'));
    expect(r.meta.snapshots.map((s) => [s.n, s.why])).toEqual([[1, 'opened'], [2, 'before restoring 1']]);
    expect(await d.body(m.id)).toEqual(doc('A'));
    expect(await d.snapshotBody(m.id, 2)).toEqual(doc('B'));
  });

  it('writes run one after another: saves started together land in order, the last one wins', async () => {
    const d = storeOf(browser());
    const m = ok(await d.create(doc('A'), 'imported', T0));
    const all = await Promise.all(['B', 'C', 'D', 'E'].map((t, i) => d.save(m.id, doc(t), T0 + i)));
    expect(all.map((x) => ok(x).title)).toEqual(['B', 'C', 'D', 'E']);
    expect((await d.body(m.id))?.title).toBe('E');
    expect(d.list()[0]?.title).toBe('E');
  });

  it('a full disk refuses: the refusal says so, and the draft is as it was', async () => {
    const b = browser(Infinity);
    const d = storeOf(b);
    const m = ok(await d.create(doc('A'), 'imported', T0));
    const used = [...b.idb.rows('pme-builder', 'bodies').values()].reduce((n: number, v) => n + String(v).length, 0);
    const full = { idb: Object.assign(b.idb, { limit: used + 10 }), ls: b.ls };
    const r = await storeOf(full).save(m.id, { ...doc('A'), story: 'x'.repeat(1000) }, T0 + 1);
    expect(r).toEqual({ refused: 'full', detail: 'QuotaExceededError' });
    expect(draftRefusalText(r as Refusal)).toBe('Not saved: this browser’s storage for this site is full. Export the card as a file to keep this work, then delete drafts you no longer need.');
    expect((await storeOf(full).body(m.id))?.title).toBe('A');
    expect(storeOf(full).list()).toEqual([m]);
  });

  it('blocked storage (no localStorage, a private window) refuses with its own words; nothing is written', async () => {
    const d = new Drafts(() => null, () => asFactory(new MemoryIDB()));
    const r = await d.create(doc('A'), 'imported', T0);
    expect(r).toEqual({ refused: 'blocked', detail: 'no localStorage' });
    expect(draftRefusalText(r as Refusal)).toBe('Not saved: this browser keeps no data for this site (a private window, or site data turned off in its settings). Export the card as a file to keep this work.');
  });

  it('where IndexedDB cannot open, the bodies go to localStorage and the store says so; a full localStorage refuses and takes the index entry back', async () => {
    const b = browser(Infinity, Infinity, true);
    const d = storeOf(b);
    const m = ok(await d.create(doc('A'), 'imported', T0));
    expect(d.backend).toBe('localStorage');
    expect(d.whereLine()).toBe('kept in this browser’s localStorage (IndexedDB is unavailable here, so about 5 MB in all)');
    expect(JSON.parse(b.ls.getItem(`pme.builder.${m.id}`)!)).toEqual(doc('A'));
    const tight = browser(Infinity, b.ls.getItem('pme.builder.drafts')!.length + 50, true);
    const r = await storeOf(tight).create(doc('B'), 'imported', T0);
    expect(r).toMatchObject({ refused: 'full' });
    expect(storeOf(tight).list()).toEqual([]);
    expect([...tight.ls.m.keys()]).toEqual([]);
  });

  it('the rescue slot: a change caught as the page goes away is handed back at the next open, until a save clears it', async () => {
    const b = browser();
    const d = storeOf(b);
    const m = ok(await d.create(doc('A'), 'imported', T0));
    expect(d.rescue(m.id, doc('typed just before the reload'), T0 + 100)).toBe(true);
    const again = storeOf(b); // the reload
    expect(again.rescued(m.id)).toEqual(doc('typed just before the reload'));
    expect(again.rescued('another')).toBeNull();
    ok(await again.save(m.id, doc('typed just before the reload'), T0 + 200));
    expect(again.rescued(m.id)).toBeNull();
    expect(b.ls.getItem('pme.builder.rescue')).toBeNull();
    // an old rescue (the draft was saved after it) is not handed back
    d.rescue(m.id, doc('stale'), T0 + 150);
    expect(storeOf(b).rescued(m.id)).toBeNull();
  });

  it('the size line, and a delete takes the draft and every snapshot', async () => {
    const b = browser();
    const d = storeOf(b);
    const m = ok(await d.create(doc('A'), 'imported', T0));
    ok(await d.snapshot(m.id, doc('A'), 'export', T0 + 5));
    const bytes = new TextEncoder().encode(JSON.stringify(doc('A'))).length;
    expect(d.holdsLine()).toBe(`1 draft · 2 snapshots · ${Math.round((3 * bytes) / 1e3)} kB`);
    await d.remove(m.id);
    expect(d.list()).toEqual([]);
    expect(b.idb.rows('pme-builder', 'bodies').size).toBe(0);
    expect(d.holdsLine()).toBe('no drafts');
  });
});
