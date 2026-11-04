// A Storage in memory for the tests (happy-dom here has no localStorage): `limit` characters in all, past which setItem
// throws as a full localStorage does.
export class MemoryStorage implements Storage {
  readonly m = new Map<string, string>();
  readonly limit: number;
  constructor(limit = Infinity) {
    this.limit = limit;
  }
  get length(): number {
    return this.m.size;
  }
  clear(): void {
    this.m.clear();
  }
  getItem(k: string): string | null {
    return this.m.get(k) ?? null;
  }
  key(i: number): string | null {
    return [...this.m.keys()][i] ?? null;
  }
  removeItem(k: string): void {
    this.m.delete(k);
  }
  setItem(k: string, v: string): void {
    const used = [...this.m].reduce((n, [a, b]) => n + (a === k ? 0 : a.length + b.length), 0);
    if (used + k.length + v.length > this.limit) throw new Error('QuotaExceededError');
    this.m.set(k, String(v));
  }
}
