// Float32 ring buffer indexed by ABSOLUTE sample index (brief §3.3): sample n belongs to time n / rate.
// Only the most recent `capacity` samples are retained (brief §3.5: 120 s for freeze and scroll-back).

export class RingBuffer {
  readonly rate: number;
  readonly capacity: number;
  private readonly data: Float32Array;
  private _latest = -1;
  /** First absolute index written since construction or clear() (-1 when empty). */
  private _first = -1;

  constructor(rate: number, seconds: number) {
    this.rate = rate;
    this.capacity = Math.ceil(rate * seconds);
    this.data = new Float32Array(this.capacity);
  }

  /** Absolute index of the newest sample written, or -1 when empty. */
  get latest(): number {
    return this._latest;
  }

  /** Oldest absolute index still held (never before the first index written: review M4). */
  get oldest(): number {
    return Math.max(0, this._first, this._latest - this.capacity + 1);
  }

  /**
   * Write sample `index`. Re-writing an index inside the retained window overwrites it
   * (look-ahead regeneration); `latest` never moves backwards.
   */
  write(index: number, value: number): void {
    if (index < 0 || index <= this._latest - this.capacity) return; // too old: silently dropped
    this.data[index % this.capacity] = value;
    if (index > this._latest) this._latest = index;
    if (this._first < 0 || index < this._first) this._first = index;
  }

  /** Read one sample; NaN when not held. */
  at(index: number): number {
    if (index < this.oldest || index > this._latest) return Number.NaN;
    return this.data[index % this.capacity] as number;
  }

  /**
   * Copy up to out.length samples starting at absolute index max(from, oldest) into `out`.
   * Returns the number copied (0 when nothing at or after `from` is held). out[0] is sample max(from, oldest).
   */
  read(from: number, out: Float32Array): number {
    const start = Math.max(from, this.oldest);
    const end = Math.min(start + out.length - 1, this._latest);
    if (end < start) return 0;
    const n = end - start + 1;
    let src = start % this.capacity;
    for (let i = 0; i < n; i++) {
      out[i] = this.data[src] as number;
      src++;
      if (src === this.capacity) src = 0;
    }
    return n;
  }

  clear(): void {
    this._latest = -1;
    this._first = -1;
    this.data.fill(0);
  }
}
