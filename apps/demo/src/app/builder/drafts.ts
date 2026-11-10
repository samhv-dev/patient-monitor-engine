// The builder's layer 1 (docs/plans/scenario-builder.md §8; piece B2): every draft card kept in THIS browser, with its
// local snapshots, in the pattern the Debrief archive uses since #370 (archive.ts): each body (the card's JSON, as
// `docOf` wrote it) is one record of an IndexedDB object store, and one localStorage key holds the index (what a list
// shows: the card's id and title, where the draft came from, when it was saved, the body's size and its snapshots), so
// a list never parses a card. Writes run one after another through one queue, each reading the index the one before it
// wrote. A body is written before the index names it, and taken back if the index cannot be written. A refusal (a full
// disk, a private window) writes nothing and says so in words the author can act on; the draft is then as it was. Where
// IndexedDB cannot be opened the bodies go to localStorage (about 5 MB in all), and the store says so.
//
// Snapshots: the draft as it was at a moment, kept beside it and never overwritten: at its creation, after every 2 min
// of editing, at every Export, and before a Restore (so a restore never loses the draft it replaces). Layer 1 survives a
// reload and a crash; not a cleared browser or another browser (§8): an exported file is the way out. No DOM.
import { refusalOf, sizeText, type Refusal } from '../archive.ts';

export type { Refusal };

/** One snapshot of a draft. `why`: 'opened' (the draft's first body), 'editing' (every 2 min of editing), 'export', or
 *  'before restoring <n>' (the draft a restore replaced). */
export interface SnapshotMeta {
  n: number;
  /** Wall ms (Date.now) of the snapshot. */
  at: number;
  why: string;
  /** UTF-8 bytes of the body. */
  bytes: number;
}

/** One draft, as a list shows it. */
export interface DraftMeta {
  /** The draft's own id (the address `#/scenarios/builder/<id>`), not the card's. */
  id: string;
  /** The card's id and title as last saved. */
  cardId: string;
  title: string;
  /** Where it came from: "a copy of the library card …", "imported from …". */
  from: string;
  createdAt: number;
  /** Wall ms of the last save. */
  savedAt: number;
  /** UTF-8 bytes of the current body. */
  bytes: number;
  /** Oldest first. */
  snapshots: SnapshotMeta[];
}

/** A card body as the builder keeps it: a JSON object (the document `docOf` writes). */
export type Body = Record<string, unknown>;

/** The time between two editing snapshots: the plan's "a local snapshot every 2 min of editing" (§8). [ENG: ui] */
export const SNAPSHOT_EVERY_MS = 120_000;

const INDEX = 'pme.builder.drafts';
const RESCUE = 'pme.builder.rescue';
const lsKey = (key: string): string => `pme.builder.${key}`;
const snapKey = (id: string, n: number): string => `${id}@${n}`;
const DB = 'pme-builder';
const STORE = 'bodies';
const BLOCKED: Refusal = { refused: 'blocked', detail: 'no localStorage' };
const utf8Bytes = (s: string): number => new TextEncoder().encode(s).length;

/** What the author reads when a write was refused (the draft is then as it was before that write). */
export function draftRefusalText(r: Refusal): string {
  if (r.refused === 'full') return 'Not saved: this browser’s storage for this site is full. Export the card as a file to keep this work, then delete drafts you no longer need.';
  if (r.refused === 'blocked') return 'Not saved: this browser keeps no data for this site (a private window, or site data turned off in its settings). Export the card as a file to keep this work.';
  return `Not saved: the browser refused the write (${r.detail}). Export the card as a file to keep this work, then try again.`;
}

const localStore = (): Storage | null => {
  try {
    return localStorage;
  } catch {
    return null;
  }
};
const idbFactory = (): IDBFactory | null => {
  try {
    return globalThis.indexedDB ?? null;
  } catch {
    return null; // a sandboxed frame or blocked site data throws on the getter
  }
};
const ask = <T>(r: IDBRequest<T>): Promise<T> =>
  new Promise((ok, no) => {
    r.onsuccess = () => ok(r.result);
    r.onerror = () => no(r.error);
  });
/** A transaction's end: resolved when it committed, rejected with its error when it aborted (a full disk aborts it). */
const committed = (tx: IDBTransaction): Promise<void> =>
  new Promise((ok, no) => {
    tx.oncomplete = () => ok();
    tx.onerror = tx.onabort = () => no(tx.error ?? new DOMException('The transaction was aborted', 'AbortError'));
  });
function openDb(f: IDBFactory): Promise<IDBDatabase> {
  const r = f.open(DB, 1);
  r.onupgradeneeded = () => r.result.createObjectStore(STORE);
  return ask(r);
}

export class Drafts {
  /** Bumped by every write (a list redraws only then). */
  version = 0;
  /** Where the bodies are: 'indexeddb', or 'localStorage' where IndexedDB could not be opened; null until `ready()`. */
  backend: 'indexeddb' | 'localStorage' | null = null;
  private readonly storage: () => Storage | null;
  private readonly idb: () => IDBFactory | null;
  private opened: { f: IDBFactory | null; db: Promise<IDBDatabase | null> } | null = null;
  private queue: Promise<unknown> = Promise.resolve();

  constructor(storage: () => Storage | null = localStore, idb: () => IDBFactory | null = idbFactory) {
    this.storage = storage;
    this.idb = idb;
  }

  /** The database, opened once, or null: the localStorage path. */
  ready(): Promise<IDBDatabase | null> {
    const f = this.idb();
    if (this.opened?.f === f) return this.opened.db;
    const db = (async () => {
      if (!f) return null;
      try {
        return await openDb(f);
      } catch {
        return null; // IndexedDB refused to open (an old private window, a blocked origin): the localStorage path
      }
    })().then((db) => ((this.backend = db ? 'indexeddb' : 'localStorage'), db));
    this.opened = { f, db };
    return db;
  }

  /** Every draft, the most recently saved first. */
  list(): DraftMeta[] {
    return [...this.index()].sort((a, b) => b.savedAt - a.savedAt);
  }

  get(id: string): DraftMeta | null {
    return this.index().find((m) => m.id === id) ?? null;
  }

  /** "2 drafts · 5 snapshots · 310 kB": what this browser holds for the builder. */
  holdsLine(): string {
    const xs = this.index();
    if (!xs.length) return 'no drafts';
    const snaps = xs.reduce((n, m) => n + m.snapshots.length, 0);
    const bytes = xs.reduce((n, m) => n + m.bytes + m.snapshots.reduce((k, s) => k + s.bytes, 0), 0);
    return `${xs.length} ${xs.length === 1 ? 'draft' : 'drafts'} · ${snaps} ${snaps === 1 ? 'snapshot' : 'snapshots'} · ${sizeText(bytes)}`;
  }

  /** Where the drafts are kept, for the page's store line. */
  whereLine(): string {
    return this.backend === 'localStorage'
      ? 'kept in this browser’s localStorage (IndexedDB is unavailable here, so about 5 MB in all)'
      : 'kept in this browser (not in another browser, and not after this site’s data is cleared): export a card to keep it elsewhere';
  }

  /** A new draft of `doc`, with snapshot 1. */
  create(doc: Body, from: string, now = Date.now()): Promise<DraftMeta | Refusal> {
    const body = JSON.stringify(doc);
    return this.inTurn(async () => {
      const s = this.storage();
      if (!s) return BLOCKED;
      const db = await this.ready();
      const bytes = utf8Bytes(body);
      const meta: DraftMeta = {
        id: `d${now.toString(36)}${Math.random().toString(36).slice(2, 6)}`, ...this.card(doc), from, createdAt: now, savedAt: now, bytes,
        snapshots: [{ n: 1, at: now, why: 'opened', bytes }],
      };
      const keys = [meta.id, snapKey(meta.id, 1)];
      try {
        await this.put(db, s, keys.map((k) => [k, body]));
      } catch (e) {
        await this.drop(db, s, keys);
        return refusalOf(e);
      }
      return this.writeIndex(db, s, [...this.index(), meta], meta, keys);
    });
  }

  /** The draft's body replaced by `doc` (its autosave); a snapshot too when the newest is `SNAPSHOT_EVERY_MS` old. */
  save(id: string, doc: Body, now = Date.now()): Promise<DraftMeta | Refusal> {
    const body = JSON.stringify(doc);
    return this.inTurn(async () => {
      const s = this.storage();
      if (!s) return BLOCKED;
      const db = await this.ready();
      const was = this.get(id);
      if (!was) return { refused: 'failed', detail: 'no such draft' };
      const last = was.snapshots.at(-1);
      const snap = !last || now - last.at >= SNAPSHOT_EVERY_MS ? { n: (last?.n ?? 0) + 1, at: now, why: 'editing', bytes: utf8Bytes(body) } : null;
      return this.write(db, s, was, body, { ...was, ...this.card(doc), savedAt: now, bytes: utf8Bytes(body), snapshots: snap ? [...was.snapshots, snap] : was.snapshots }, snap ? [[snapKey(id, snap.n), body]] : []);
    });
  }

  /** A snapshot of `doc` (an Export's), the draft's body left as it is. */
  snapshot(id: string, doc: Body, why: string, now = Date.now()): Promise<DraftMeta | Refusal> {
    const body = JSON.stringify(doc);
    return this.inTurn(async () => {
      const s = this.storage();
      if (!s) return BLOCKED;
      const db = await this.ready();
      const was = this.get(id);
      if (!was) return { refused: 'failed', detail: 'no such draft' };
      const n = (was.snapshots.at(-1)?.n ?? 0) + 1;
      const key = snapKey(id, n);
      try {
        await this.put(db, s, [[key, body]]);
      } catch (e) {
        await this.drop(db, s, [key]);
        return refusalOf(e);
      }
      const meta = { ...was, snapshots: [...was.snapshots, { n, at: now, why, bytes: utf8Bytes(body) }] };
      return this.writeIndex(db, s, this.index().map((m) => (m.id === id ? meta : m)), meta, [key]);
    });
  }

  /** Snapshot `n` back as the draft; the draft it replaces is kept first as the newest snapshot. */
  restore(id: string, n: number, now = Date.now()): Promise<{ meta: DraftMeta; doc: Body } | Refusal> {
    return this.inTurn(async () => {
      const s = this.storage();
      if (!s) return BLOCKED;
      const db = await this.ready();
      const was = this.get(id);
      const back = was?.snapshots.some((x) => x.n === n) ? await this.read(db, snapKey(id, n)) : null;
      const current = was ? await this.read(db, id) : null;
      if (!was || back === null || current === null) return { refused: 'failed', detail: 'no such snapshot' };
      const k = (was.snapshots.at(-1)?.n ?? 0) + 1;
      const doc = JSON.parse(back) as Body;
      const r = await this.write(db, s, was, back, {
        ...was, ...this.card(doc), savedAt: now, bytes: utf8Bytes(back),
        snapshots: [...was.snapshots, { n: k, at: now, why: `before restoring ${n}`, bytes: utf8Bytes(current) }],
      }, [[snapKey(id, k), current]]);
      return 'refused' in r ? r : { meta: r, doc };
    });
  }

  /** The draft's body, or null. */
  async body(id: string): Promise<Body | null> {
    const t = await this.read(await this.ready(), id);
    return t === null ? null : (JSON.parse(t) as Body);
  }

  /** Snapshot `n`'s body, or null. */
  async snapshotBody(id: string, n: number): Promise<Body | null> {
    const t = await this.read(await this.ready(), snapKey(id, n));
    return t === null ? null : (JSON.parse(t) as Body);
  }

  /**
   * The page is going away (a reload, a closed tab) with a change not yet written: an IndexedDB write started now may
   * never land, so the draft's body goes to localStorage at once, synchronously, in one rescue slot (one draft is open
   * at a time). `rescued(id)` hands it back at the next open when it is newer than the last save; a save of that draft
   * clears it. False when localStorage refused it too.
   */
  rescue(id: string, doc: Body, now = Date.now()): boolean {
    try {
      this.storage()?.setItem(RESCUE, JSON.stringify({ id, at: now, body: doc }));
      return !!this.storage();
    } catch {
      return false;
    }
  }

  /** The rescued body of draft `id` when it is newer than its last save, else null. */
  rescued(id: string): Body | null {
    try {
      const r = JSON.parse(this.storage()?.getItem(RESCUE) ?? 'null') as { id: string; at: number; body: Body } | null;
      return r && r.id === id && r.at > (this.get(id)?.savedAt ?? Infinity) ? r.body : null;
    } catch {
      return null;
    }
  }

  /** The draft and every snapshot of it deleted from this browser (the page asks first). */
  remove(id: string): Promise<void> {
    return this.inTurn(async () => {
      const s = this.storage();
      const db = await this.ready();
      const was = this.get(id);
      if (!s || !was) return;
      try {
        s.setItem(INDEX, JSON.stringify(this.index().filter((m) => m.id !== id)));
      } catch {
        return; // the index could not be written: the draft stays listed, and kept
      }
      await this.drop(db, s, [id, ...was.snapshots.map((x) => snapKey(id, x.n))]);
      this.version++;
    });
  }

  private clearRescue(id: string): void {
    try {
      if ((JSON.parse(this.storage()?.getItem(RESCUE) ?? 'null') as { id?: string } | null)?.id === id) this.storage()?.removeItem(RESCUE);
    } catch {
      /* nothing kept */
    }
  }

  private card(doc: Body): { cardId: string; title: string } {
    return { cardId: typeof doc.id === 'string' ? doc.id : '', title: typeof doc.title === 'string' ? doc.title : '' };
  }

  private index(): DraftMeta[] {
    try {
      const xs = JSON.parse(this.storage()?.getItem(INDEX) ?? '[]') as unknown;
      return Array.isArray(xs) ? (xs as DraftMeta[]) : [];
    } catch {
      return [];
    }
  }

  private inTurn<T>(job: () => Promise<T>): Promise<T> {
    const next = this.queue.then(job, job);
    this.queue = next.catch(() => undefined);
    return next;
  }

  /** The draft's body replaced by `body` with `extra` records beside it, then the index; on a refusal, both put back. */
  private async write(db: IDBDatabase | null, s: Storage, was: DraftMeta, body: string, meta: DraftMeta, extra: Array<[string, string]>): Promise<DraftMeta | Refusal> {
    const prev = await this.read(db, was.id);
    try {
      await this.put(db, s, [[was.id, body], ...extra]);
    } catch (e) {
      // IndexedDB: one transaction, nothing landed. localStorage: the body may have landed before a later row refused
      if (!db && prev !== null) await this.put(db, s, [[was.id, prev]]).catch(() => undefined);
      await this.drop(db, s, extra.map(([k]) => k));
      return refusalOf(e);
    }
    const r = await this.writeIndex(db, s, this.index().map((m) => (m.id === was.id ? meta : m)), meta, extra.map(([k]) => k));
    if ('refused' in r && prev !== null) await this.put(db, s, [[was.id, prev]]).catch(() => undefined);
    if (!('refused' in r) && this.rescued(was.id) === null) this.clearRescue(was.id);
    return r;
  }

  /** The index written; if it cannot be, the records `added` are taken back (the store is then as it was). */
  private async writeIndex(db: IDBDatabase | null, s: Storage, list: DraftMeta[], meta: DraftMeta, added: string[]): Promise<DraftMeta | Refusal> {
    try {
      s.setItem(INDEX, JSON.stringify(list));
    } catch (e) {
      await this.drop(db, s, added);
      return refusalOf(e);
    }
    this.version++;
    return meta;
  }

  private async read(db: IDBDatabase | null, key: string): Promise<string | null> {
    try {
      if (db) {
        const v = await ask(db.transaction(STORE, 'readonly').objectStore(STORE).get(key));
        return typeof v === 'string' ? v : null;
      }
      return this.storage()?.getItem(lsKey(key)) ?? null;
    } catch {
      return null;
    }
  }

  /** Records written in one transaction (all or none); on the localStorage path one after another. */
  private async put(db: IDBDatabase | null, s: Storage, rows: Array<[string, string]>): Promise<void> {
    if (!db) {
      for (const [k, v] of rows) s.setItem(lsKey(k), v);
      return;
    }
    const tx = db.transaction(STORE, 'readwrite');
    for (const [k, v] of rows) tx.objectStore(STORE).put(v, k);
    await committed(tx);
  }

  private async drop(db: IDBDatabase | null, s: Storage, keys: string[]): Promise<void> {
    try {
      if (!db) {
        for (const k of keys) s.removeItem(lsKey(k));
        return;
      }
      const tx = db.transaction(STORE, 'readwrite');
      for (const k of keys) tx.objectStore(STORE).delete(k);
      await committed(tx);
    } catch {
      /* nothing more to undo */
    }
  }
}

/** The app's one draft store (this browser's IndexedDB, the index in its localStorage). */
export const drafts = new Drafts();
