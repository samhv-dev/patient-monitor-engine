// An IndexedDB in memory for the tests (happy-dom and Node have none, and no fake-indexeddb is in the dependency tree):
// only what the archive uses — open with an upgrade, one transaction over one store, put/get/delete/clear — with the
// behaviour it relies on: requests and the commit arrive asynchronously, a transaction's writes land together at its
// commit or not at all, and past `limit` UTF-16 units in all a commit aborts with QuotaExceededError, as a full disk
// does. `refuseOpen`: the open fails (InvalidStateError), as an old private window's IndexedDB did.
type Handler = ((this: unknown, ev: Event) => unknown) | null;
type Rows = Map<IDBValidKey, unknown>;

class Req<T> {
  result = undefined as T;
  error: DOMException | null = null;
  onsuccess: Handler = null;
  onerror: Handler = null;
  onupgradeneeded: Handler = null;
  onblocked: Handler = null;
  succeed(v: T): void {
    this.result = v;
    this.onsuccess?.call(this, new Event('success'));
  }
  fail(e: DOMException): void {
    this.error = e;
    this.onerror?.call(this, new Event('error'));
  }
}

const size = (stores: Map<string, Rows>): number => {
  let n = 0;
  for (const rows of stores.values()) for (const v of rows.values()) n += typeof v === 'string' ? v.length : JSON.stringify(v).length;
  return n;
};

class Tx {
  error: DOMException | null = null;
  oncomplete: Handler = null;
  onerror: Handler = null;
  onabort: Handler = null;
  private readonly ops: Array<(stores: Map<string, Rows>) => void> = [];
  private readonly db: Db;
  private readonly names: string[];
  private readonly mode: IDBTransactionMode;
  constructor(db: Db, names: string[], mode: IDBTransactionMode) {
    this.db = db;
    this.names = names;
    this.mode = mode;
    queueMicrotask(() => queueMicrotask(() => this.commit()));
  }
  objectStore(name: string) {
    if (!this.names.includes(name) || !this.db.stores.has(name)) throw new DOMException(`No store ${name}`, 'NotFoundError');
    const op = <T>(f: (rows: Rows) => T, write: boolean): Req<T> => {
      if (write && this.mode === 'readonly') throw new DOMException('A read-only transaction', 'ReadOnlyError');
      const r = new Req<T>();
      // a write is staged and lands at the commit; a read sees the committed rows and this transaction's staged ones
      this.ops.push((stores) => {
        const v = f(stores.get(name) as Rows);
        queueMicrotask(() => r.succeed(v));
      });
      return r;
    };
    return {
      put: (v: unknown, k: IDBValidKey) => op((rows) => (rows.set(k, v), k), true),
      get: (k: IDBValidKey) => op((rows) => rows.get(k), false),
      delete: (k: IDBValidKey) => op((rows) => void rows.delete(k), true),
      clear: () => op((rows) => rows.clear(), true),
    };
  }
  private commit(): void {
    const staged = new Map([...this.db.stores].map(([k, rows]) => [k, new Map(rows)]));
    for (const o of this.ops) o(staged);
    queueMicrotask(() => {
      if (size(staged) > this.db.factory.limit) {
        this.error = new DOMException('The quota has been exceeded.', 'QuotaExceededError');
        this.onerror?.call(this, new Event('error'));
        this.onabort?.call(this, new Event('abort'));
        return;
      }
      this.db.stores = staged;
      this.oncomplete?.call(this, new Event('complete'));
    });
  }
}

class Db {
  stores = new Map<string, Rows>();
  readonly factory: MemoryIDB;
  constructor(factory: MemoryIDB) {
    this.factory = factory;
  }
  get objectStoreNames() {
    return { contains: (n: string) => this.stores.has(n) };
  }
  createObjectStore(name: string): void {
    this.stores.set(name, new Map());
  }
  transaction(names: string | string[], mode: IDBTransactionMode = 'readonly'): Tx {
    return new Tx(this, typeof names === 'string' ? [names] : names, mode);
  }
  close(): void {}
}

export class MemoryIDB {
  readonly dbs = new Map<string, { version: number; db: Db }>();
  readonly limit: number;
  readonly refuseOpen: boolean;
  constructor(limit = Infinity, refuseOpen = false) {
    this.limit = limit;
    this.refuseOpen = refuseOpen;
  }
  open(name: string, version = 1): Req<Db> {
    const r = new Req<Db>();
    queueMicrotask(() => {
      if (this.refuseOpen) return r.fail(new DOMException('A mutation operation was attempted on a database that did not allow mutations.', 'InvalidStateError'));
      let had = this.dbs.get(name);
      if (!had || had.version < version) {
        had = { version, db: had?.db ?? new Db(this) };
        this.dbs.set(name, had);
        r.result = had.db;
        r.onupgradeneeded?.call(r, new Event('upgradeneeded'));
      }
      r.succeed(had.db);
    });
    return r;
  }
  /** What a store holds now (committed rows only). */
  rows(name: string, store: string): Rows {
    return this.dbs.get(name)?.db.stores.get(store) ?? new Map();
  }
}

/** The double, as the archive's factory takes it. */
export const asFactory = (m: MemoryIDB): IDBFactory => m as unknown as IDBFactory;
