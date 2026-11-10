// The Debrief archive (the owner's board "Finish 2", approved 30 October): every debrief "Finish the case" saves, kept
// in THIS browser (the debriefs in IndexedDB, their index in localStorage) until the instructor clears it on the Debrief
// page. One localStorage key holds the index (what a list
// shows: the resident, the card, when it was saved, the run's simulated duration, its objective counts and the body's
// size), and each debrief's JSON as the Debrief view builds it (`debriefJson`, `pme-debrief/2`) is one record of an
// IndexedDB object store keyed by the entry's id, so a list never parses a debrief. A second save of one run (its
// record's `startedAt`) replaces that run's entry. "Export all" is one JSON file (no zip library is in the dependency
// tree). Also the counts the Finish pane shows. No DOM.
//
// Why IndexedDB (defect N39, 9 November): a body is the whole run record, one sample per second (≈ 10 k UTF-16 units
// per simulated minute), and holds characters past U+00FF (the ₂ of SpO₂), so WebKit counts it at 2 bytes a character
// against its 5 MiB localStorage quota per origin: ≈ 260 simulated minutes in all, five debriefs of a week. IndexedDB's
// quota is a share of the disk (WebKit and Chromium ≈ 60 %, Firefox 10 % up to 10 GiB). The index stays in localStorage
// (≈ 300 bytes an entry, so it would take > 10 000 debriefs to fill it): the lists stay synchronous and a second tab
// reads it fresh. A body is written before the index names it, and taken back if the index cannot be written. Bodies a
// build before this one left in localStorage move to IndexedDB once, on first use (written, then removed). Where
// IndexedDB cannot be opened the bodies stay in localStorage, as before, and the archive says so.
//
// The kit's user-data folder (docs/plans/scenario-builder.md §8; the owner's ruling of 10 November 2026; brief 139 PR 2):
// when the app runs from a kit on Node.js, every debrief the archive saves is also written as one file,
// `user-data/debriefs/<entry id>.json` (the entry as "Download" writes it, `pme-archive-entry/1`: the list's fields and
// the debrief), even when this browser refused it (a full storage: the file is then the only copy, and the instructor
// is told so). A re-save of the same run replaces its file, as it replaces the entry here. `syncFromKit` reads back
// every file whose entry this browser lacks (another browser of the laptop, or this one after its data was cleared).
// Clear takes the files out of the archive too: the kit's server MOVES each into `user-data/debriefs/removed/` (the
// owner's ruling of 10 November 2026, "B for now": work is never lost; nothing is destroyed, a person empties that folder
// by hand), where the app never reads it back; a file left in debriefs/ would come back at the next open. The kit's server answers the debriefs' paths to this computer only (a debrief names a resident).
import { endOf, marks, objectives } from './debrief.ts';
import { debriefJson } from './debrief-export.ts';
import type { RunData } from './record.ts';
import { KitDebriefs, kitStore, kitWhere, type KitStore, type KitWrite } from './kit-store.ts';
import { cardOf } from './scenarios.ts';

export interface ObjectiveCounts {
  /** Met by its rule, or (a rule-less objective) ticked by the instructor. */
  met: number;
  total: number;
  notMet: number;
  notAssessable: number;
}
export interface MarkCounts {
  good: number;
  bad: number;
  discuss: number;
  /** The instructor's notes (not an objective's tick) and the marks that carry a note. */
  notes: number;
}

/** One saved debrief, as a list shows it. */
export interface ArchiveMeta {
  id: string;
  /** The run's record start (RunData.startedAt): the run this entry is of. */
  runStartedAt: number;
  resident: string;
  /** The card's id, or null for a free run. */
  cardId: string | null;
  title: string;
  /** Wall ms (Date.now) of the save. */
  savedAt: number;
  /** The run's simulated length (s), on the kept course. */
  durationS: number;
  objectives: ObjectiveCounts;
  /** The stored debrief's size, UTF-8 bytes (what its JSON file weighs). Absent on an entry of an earlier build until
   *  its body moves to IndexedDB. */
  bytes?: number;
}

/** Why a save wrote nothing: the storage is full, the browser keeps no data for this site (a private window, site data
 *  turned off), or it refused for another reason (`detail`: the browser's error name). */
export interface Refusal {
  refused: 'full' | 'blocked' | 'failed';
  detail: string;
}

const INDEX = 'pme.archive';
const bodyKey = (id: string): string => `${INDEX}.${id}`;

/** The objectives of the run by verdict, as the report marks them (a ticked rule-less objective reads Observed). */
export function objectiveCounts(d: RunData): ObjectiveCounts {
  const os = objectives(d);
  const met = os.filter((o) => o.verdict.status === 'met' || o.verdict.tickedT !== undefined).length;
  const notMet = os.filter((o) => o.verdict.status === 'not met').length;
  return { met, total: os.length, notMet, notAssessable: os.length - met - notMet };
}

/** "4 of 6 met · 1 not met · 1 not assessable" (the parts that are zero left out, but the first). */
export function objectivesLine(c: ObjectiveCounts): string {
  if (!c.total) return 'no objectives on this card';
  return [`${c.met} of ${c.total} met`, c.notMet ? `${c.notMet} not met` : '', c.notAssessable ? `${c.notAssessable} not assessable` : ''].filter(Boolean).join(' · ');
}

/** The marks of the run by kind (an undone one left out), and its notes. */
export function markCounts(d: RunData): MarkCounts {
  const ms = marks(d).filter((m) => m.undone === undefined);
  const n = (k: string) => ms.filter((m) => m.kind === k).length;
  const notes = d.rows.filter((r) => r.kind === 'note' && r.undone === undefined && !r.text.startsWith('Objective met: ')).length + ms.filter((m) => m.note).length;
  return { good: n('good'), bad: n('bad'), discuss: n('discuss'), notes };
}

export const marksLine = (c: MarkCounts): string => `${c.good} good · ${c.bad} bad · ${c.discuss} discuss · ${c.notes} ${c.notes === 1 ? 'note' : 'notes'}`;

/** "12:31": the wall-clock time of a save, in the browser's own zone. */
export const hhmm = (ms: number): string => {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

/** The file name of one entry's JSON: the card, the run's date and the resident. */
export const entryFileName = (e: ArchiveMeta): string =>
  `debrief-${e.cardId ?? 'free-run'}-${new Date(e.runStartedAt).toISOString().slice(0, 10)}${e.resident ? `-${e.resident.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '')}` : ''}.json`;

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

const DB = 'pme-archive';
const STORE = 'bodies';
const utf8Bytes = (s: string): number => new TextEncoder().encode(s).length;
const ask = <T>(r: IDBRequest<T>): Promise<T> =>
  new Promise((ok, no) => {
    r.onsuccess = () => ok(r.result);
    r.onerror = () => no(r.error);
  });
/** A transaction's end: resolved when it committed, rejected with its error when it aborted (a full disk aborts it
 *  with QuotaExceededError). */
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

/** What a browser's refusal means. A full storage: QuotaExceededError (Firefox's older NS_ERROR_DOM_QUOTA_REACHED,
 *  legacy code 22 or 1014); blocked: SecurityError (site data turned off) or InvalidStateError (a private window of a
 *  browser whose IndexedDB refuses writes there). */
export function refusalOf(e: unknown): Refusal {
  const x = e as { name?: string; code?: number } | null;
  const detail = x?.name ?? String(e);
  if (detail === 'QuotaExceededError' || detail === 'NS_ERROR_DOM_QUOTA_REACHED' || x?.code === 22 || x?.code === 1014) return { refused: 'full', detail };
  if (detail === 'SecurityError' || detail === 'InvalidStateError') return { refused: 'blocked', detail };
  return { refused: 'failed', detail };
}
const BLOCKED: Refusal = { refused: 'blocked', detail: 'no localStorage' };

/** What the instructor reads when a save wrote nothing (the archive is then as it was). */
export function refusalText(r: Refusal): string {
  if (r.refused === 'full') return 'The debrief could not be saved: this browser’s storage for this site is full. Export the archive and clear it on the Debrief page, then try again.';
  if (r.refused === 'blocked') return 'The debrief could not be saved: this browser keeps no data for this site (a private window, or site data turned off in its settings). Download the record from the Debrief page to keep it.';
  return `The debrief could not be saved: the browser refused the write (${r.detail}). Download the record from the Debrief page to keep it, then try again.`;
}

/** "241 kB", "1.7 MB" (decimal units, as a file's size reads in Finder and Explorer's details). */
export const sizeText = (bytes: number): string => (bytes < 1e6 ? `${Math.round(bytes / 1e3)} kB` : `${(bytes / 1e6).toFixed(1)} MB`);

export class Archive {
  /** Bumped by every save and clear (a list redraws only then). */
  version = 0;
  /** Where the bodies are: 'indexeddb', or 'localStorage' where IndexedDB could not be opened (about 5 MB in all);
   *  null until `ready()` first settled. */
  backend: 'indexeddb' | 'localStorage' | null = null;
  private readonly storage: () => Storage | null;
  private readonly idb: () => IDBFactory | null;
  private opened: { f: IDBFactory | null; db: Promise<IDBDatabase | null> } | null = null;
  /** Saves and clears one after another: each reads the index the one before it wrote. */
  private queue: Promise<unknown> = Promise.resolve();
  /** The kit's folder (null: none, as in a unit test of this browser's side alone). */
  readonly kit: KitStore | null;
  private readonly files: KitDebriefs | null;
  /** What the last save did in the kit's folder: null when the store is off (or nothing was saved yet). */
  lastKit: KitWrite | null = null;
  /** The last save's file in the kit's folder, written right after this browser's save (in the archive's own queue, so
   *  a Clear or a read-back comes after it): resolves with `lastKit`. A save does not wait for it. */
  kitDone: Promise<KitWrite | null> = Promise.resolve(null);

  constructor(storage: () => Storage | null = localStore, idb: () => IDBFactory | null = idbFactory, kit: KitStore | null = null) {
    this.storage = storage;
    this.idb = idb;
    this.kit = kit;
    this.files = kit ? new KitDebriefs(kit) : null;
  }

  /** Whether the debriefs are also kept in the kit's folder (known once the store was asked). */
  get inKit(): boolean {
    return !!this.kit?.state?.on;
  }

  /** The entry's file queued for the kit's folder (when the store is on); `kitDone` and then `lastKit` say how it went. */
  private toKit(meta: ArchiveMeta, body: string): void {
    if (!this.files) return;
    this.kitDone = this.inTurn(async () => {
      this.lastKit = (await this.kit!.ready()).on ? await this.files!.write(meta.id, JSON.stringify(this.entryOf(meta, body), null, 1)) : null;
      return this.lastKit;
    });
  }

  /**
   * The debriefs the kit's folder holds that this browser lacks, read back into the archive (their bodies, then the
   * index, sorted by when each was saved). Returns how many came back; 0 when the store is off.
   */
  syncFromKit(): Promise<number> {
    return this.inTurn(async () => {
      if (!this.files || !(await this.kit!.ready()).on) return 0;
      const there = await this.files.list();
      const s = this.storage();
      if (!there || !s) return 0;
      const db = await this.ready();
      const have = new Set(this.list().map((e) => e.id));
      const runs = new Set(this.list().map((e) => e.runStartedAt));
      const back: ArchiveMeta[] = [];
      for (const f of there) {
        if (have.has(f.id)) continue;
        const text = await this.files.read(f.id);
        let entry: (ArchiveMeta & { schema?: unknown; debrief?: unknown }) | null = null;
        try {
          entry = text === null ? null : (JSON.parse(text) as ArchiveMeta & { schema?: unknown; debrief?: unknown });
        } catch {
          /* not an entry: left where it is */
        }
        if (!entry || entry.schema !== 'pme-archive-entry/1' || entry.id !== f.id || typeof entry.runStartedAt !== 'number' || runs.has(entry.runStartedAt) || entry.debrief === undefined) continue;
        const { schema: _s, debrief, ...meta } = entry;
        const body = JSON.stringify(debrief);
        try {
          await this.put(db, s, meta.id, body);
        } catch {
          continue; // this browser refused it: it stays in the folder, and the next open tries again
        }
        back.push({ ...meta, bytes: utf8Bytes(body) });
        runs.add(meta.runStartedAt);
      }
      if (!back.length) return 0;
      try {
        s.setItem(INDEX, JSON.stringify([...this.list(), ...back].sort((a, b) => a.savedAt - b.savedAt)));
      } catch {
        await this.remove(db, s, back.map((e) => e.id)).catch(() => undefined);
        return 0;
      }
      this.version++;
      return back.length;
    });
  }

  /** The database, opened once (and the move of an earlier build's bodies done), or null: the localStorage path. A
   *  different factory (a test's fresh browser) opens again. */
  ready(): Promise<IDBDatabase | null> {
    const f = this.idb();
    if (this.opened?.f === f) return this.opened.db;
    const db = (async () => {
      if (!f) return null;
      try {
        const db = await openDb(f);
        await this.migrate(db);
        return db;
      } catch {
        return null; // IndexedDB refused to open (an old private window, a blocked origin): the localStorage path
      }
    })().then((db) => ((this.backend = db ? 'indexeddb' : 'localStorage'), db));
    this.opened = { f, db };
    return db;
  }

  /** Every saved debrief, oldest first. */
  list(): ArchiveMeta[] {
    try {
      const xs = JSON.parse(this.storage()?.getItem(INDEX) ?? '[]') as unknown;
      return Array.isArray(xs) ? (xs as ArchiveMeta[]) : [];
    } catch {
      return [];
    }
  }

  /** The entry saved for the run whose record started at `runStartedAt`, or null. */
  forRun(runStartedAt: number): ArchiveMeta | null {
    return this.list().find((e) => e.runStartedAt === runStartedAt) ?? null;
  }

  /** How many debriefs were saved on the day of `now` (the browser's own zone). */
  savedToday(now = Date.now()): number {
    const day = new Date(now).toDateString();
    return this.list().filter((e) => new Date(e.savedAt).toDateString() === day).length;
  }

  /** "5 saved · 1.7 MB": how much the archive holds ("5 saved" alone while an earlier build's entry has no size yet). */
  holdsLine(): string {
    const list = this.list();
    return list.some((e) => e.bytes === undefined) ? `${list.length} saved` : `${list.length} saved · ${sizeText(list.reduce((n, e) => n + (e.bytes ?? 0), 0))}`;
  }

  /** Where it is kept, for the archive's summary line (the builder's words when the kit's folder keeps it too). */
  whereLine(): string {
    if (this.inKit) return `kept ${kitWhere(this.kit!.state)}`;
    return this.backend === 'localStorage'
      ? 'kept in this browser’s localStorage (IndexedDB is unavailable here, so about 5 MB in all)'
      : 'kept in this browser until you clear it';
  }

  /**
   * Save the debrief of the run `d` under `resident` (the run's earlier entry replaced, in its place). A refusal when
   * the storage wrote nothing, and the archive is then as it was.
   */
  save(d: RunData, resident: string, build: string, now = Date.now()): Promise<ArchiveMeta | Refusal> {
    // the debrief as it stands at the press, before anything is awaited
    const body = JSON.stringify(JSON.parse(debriefJson(d, build))); // stored compact
    const card = d.doc ? cardOf(d.doc) : null;
    const fields = {
      runStartedAt: d.startedAt, resident: resident.trim(), cardId: d.doc?.id ?? null, title: card ? card.title : 'Free run',
      savedAt: now, durationS: endOf(d), objectives: objectiveCounts(d), bytes: utf8Bytes(body),
    };
    return this.inTurn(async () => {
      const s = this.storage();
      if (!s) {
        this.toKit({ id: `${now.toString(36)}${Math.random().toString(36).slice(2, 6)}`, ...fields }, body);
        return BLOCKED;
      }
      const db = await this.ready();
      const list = this.list();
      const was = list.find((e) => e.runStartedAt === d.startedAt);
      const meta: ArchiveMeta = { id: was?.id ?? `${now.toString(36)}${Math.random().toString(36).slice(2, 6)}`, ...fields };
      const prevBody = was ? await this.body(db, meta.id) : null;
      try {
        await this.put(db, s, meta.id, body);
      } catch (e) {
        this.toKit(meta, body); // this browser refused it: the kit's file is then its only copy
        return refusalOf(e);
      }
      try {
        s.setItem(INDEX, JSON.stringify(was ? list.map((e) => (e.id === meta.id ? meta : e)) : [...list, meta]));
      } catch (e) {
        // leave the archive as it was: the new body out (or the old one back)
        try {
          if (prevBody !== null) await this.put(db, s, meta.id, prevBody);
          else await this.remove(db, s, [meta.id]);
        } catch {
          /* nothing more to undo */
        }
        this.toKit(meta, body);
        return refusalOf(e);
      }
      this.version++;
      this.toKit(meta, body);
      return meta;
    });
  }

  /** The saved debrief's JSON (`pme-debrief/2`), or null. */
  async debrief(id: string): Promise<string | null> {
    return this.body(await this.ready(), id);
  }

  /** One entry as a file: its list fields and the debrief (`pme-archive-entry/1`), or null. */
  async entryJson(id: string): Promise<string | null> {
    const e = this.list().find((x) => x.id === id);
    const body = e ? await this.debrief(id) : null;
    return e && body ? JSON.stringify(this.entryOf(e, body), null, 1) : null;
  }

  /** Every entry in one file (`pme-archive/1`): "Export all". */
  async bundleJson(now = Date.now()): Promise<string> {
    const db = await this.ready();
    const entries = [];
    for (const e of this.list()) {
      const body = await this.body(db, e.id);
      if (body) entries.push(this.entryOf(e, body));
    }
    return JSON.stringify({ schema: 'pme-archive/1', exportedAt: now, entries }, null, 1);
  }

  /** Every saved debrief deleted from this browser; its file in the kit's folder moved into debriefs/removed/ (what the
   *  server's `setAsideDebrief` decides). */
  clear(): Promise<void> {
    return this.inTurn(async () => {
      const s = this.storage();
      const db = await this.ready();
      if (this.files && (await this.kit!.ready()).on) {
        // every file the folder holds, and every entry listed here: a file left in debriefs/ would come back at the next open
        const ids = new Set([...this.list().map((e) => e.id), ...((await this.files.list()) ?? []).map((f) => f.id)]);
        for (const id of ids) await this.files.setAside(id);
      }
      try {
        if (db) {
          const tx = db.transaction(STORE, 'readwrite');
          tx.objectStore(STORE).clear();
          await committed(tx);
        }
      } catch {
        /* the database refused: the index goes all the same, so nothing is listed */
      }
      try {
        for (const e of this.list()) s?.removeItem(bodyKey(e.id));
        s?.removeItem(INDEX);
      } catch {
        /* blocked storage: nothing was kept */
      }
      this.version++;
    });
  }

  private inTurn<T>(job: () => Promise<T>): Promise<T> {
    const next = this.queue.then(job, job);
    this.queue = next.catch(() => undefined);
    return next;
  }

  /** A body from the database, else from localStorage (the localStorage path, or a body an earlier build left there
   *  that has not moved yet). */
  private async body(db: IDBDatabase | null, id: string): Promise<string | null> {
    try {
      if (db) {
        const v = await ask(db.transaction(STORE, 'readonly').objectStore(STORE).get(id));
        if (typeof v === 'string') return v;
      }
    } catch {
      /* read the old place */
    }
    try {
      return this.storage()?.getItem(bodyKey(id)) ?? null;
    } catch {
      return null;
    }
  }

  private async put(db: IDBDatabase | null, s: Storage, id: string, body: string): Promise<void> {
    if (!db) return s.setItem(bodyKey(id), body);
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(body, id);
    await committed(tx);
    s.removeItem(bodyKey(id)); // an earlier build's copy of this entry, if any
  }

  private async remove(db: IDBDatabase | null, s: Storage, ids: string[]): Promise<void> {
    for (const id of ids) s.removeItem(bodyKey(id));
    if (!db) return;
    const tx = db.transaction(STORE, 'readwrite');
    for (const id of ids) tx.objectStore(STORE).delete(id);
    await committed(tx);
  }

  /** The bodies an earlier build kept in localStorage, into the database in one transaction; once it committed, out of
   *  localStorage, and their sizes into the index. A refusal leaves them where they were (still read from there). */
  private async migrate(db: IDBDatabase): Promise<void> {
    const s = this.storage();
    if (!s) return;
    const list = this.list();
    const moved = new Map<string, string>();
    for (const e of list) {
      const b = s.getItem(bodyKey(e.id));
      if (b !== null) moved.set(e.id, b);
    }
    if (!moved.size) return;
    try {
      const tx = db.transaction(STORE, 'readwrite');
      for (const [id, b] of moved) tx.objectStore(STORE).put(b, id);
      await committed(tx);
    } catch {
      return;
    }
    for (const id of moved.keys()) s.removeItem(bodyKey(id)); // first: a full localStorage has room for the sizes then
    try {
      s.setItem(INDEX, JSON.stringify(list.map((e) => { const b = moved.get(e.id); return b === undefined ? e : { ...e, bytes: utf8Bytes(b) }; })));
    } catch {
      /* the sizes stay unknown; the bodies are in the database all the same */
    }
    this.version++;
  }

  private entryOf(e: ArchiveMeta, body: string) {
    return { schema: 'pme-archive-entry/1' as const, ...e, debrief: JSON.parse(body) as unknown };
  }
}

/** The app's one archive (this browser's IndexedDB, the index in its localStorage; the kit's folder when there is one). */
export const archive = new Archive(localStore, idbFactory, kitStore);
