// Trends (brief §6.7; §3.5 "Trends are stored at 1 Hz for 8 h"): one Float32 ring per numeric, one slot per sim
// second, NaN where nothing was measured. 22 numerics × 28,800 s × 4 B = 2.53 MB (≤ the brief's 2.8 MB budget).
// Fed with `measurement` events wherever they arrive (the renderer keeps one on the main thread).
import type { EngineEvent, NumericId } from '../../types.ts';

export const TREND_NUMERICS: readonly NumericId[] = [
  'hr', 'pr', 'spo2', 'pi', 'abpSys', 'abpDia', 'abpMean', 'cvpMean', 'papSys', 'papDia', 'papMean',
  'nibpSys', 'nibpDia', 'nibpMean', 'etco2', 'imco2', 'awrr', 'rr', 'tempCore', 'tempSite', 'stII', 'qtc',
];
export const TREND_HOURS = 8;
export const TREND_SLOTS = TREND_HOURS * 3600;

export class TrendStore {
  private readonly data = new Map<NumericId, Float32Array>();
  /** Highest second index written (-1: none). */
  private last = -1;

  constructor() {
    for (const k of TREND_NUMERICS) this.data.set(k, new Float32Array(TREND_SLOTS).fill(Number.NaN));
  }

  /** Bytes held by the rings. */
  get bytes(): number {
    let b = 0;
    for (const a of this.data.values()) b += a.byteLength;
    return b;
  }

  /** Newest second held, or -1. */
  get latestS(): number {
    return this.last;
  }

  /** Oldest second still held. */
  get oldestS(): number {
    return Math.max(0, this.last - TREND_SLOTS + 1);
  }

  /** Record the valid values of a measurement event in the slot of its second. */
  record(e: EngineEvent): void {
    if (e.type !== 'measurement') return;
    const s = Math.floor(e.t + 1e-6);
    if (s < this.oldestS) return;
    if (s > this.last) {
      // seconds skipped since the last write hold nothing (clear what the ring still has from 8 h ago)
      for (let k = Math.max(this.last + 1, s - TREND_SLOTS + 1); k <= s; k++) for (const a of this.data.values()) a[k % TREND_SLOTS] = Number.NaN;
      this.last = s;
    }
    for (const [id, m] of Object.entries(e.values)) {
      const a = this.data.get(id as NumericId);
      if (a && m && m.value !== null && m.flag !== 'invalid') a[s % TREND_SLOTS] = m.value;
    }
  }

  /** Values of one numeric for seconds [fromS, toS] (NaN where missing or no longer held). */
  series(id: NumericId, fromS: number, toS: number): Float32Array {
    const out = new Float32Array(Math.max(0, toS - fromS + 1)).fill(Number.NaN);
    const a = this.data.get(id);
    if (!a) return out;
    for (let s = Math.max(fromS, this.oldestS); s <= Math.min(toS, this.last); s++) out[s - fromS] = a[s % TREND_SLOTS] as number;
    return out;
  }

  /** Tabular trend (brief §6.7): one row every stepS seconds, newest last; each value is the latest in its step. */
  table(ids: readonly NumericId[], stepS: number, fromS: number, toS: number): Array<{ t: number; values: Partial<Record<NumericId, number>> }> {
    const rows: Array<{ t: number; values: Partial<Record<NumericId, number>> }> = [];
    for (let t = fromS; t <= toS; t += stepS) {
      const values: Partial<Record<NumericId, number>> = {};
      for (const id of ids) {
        const s = this.series(id, t, Math.min(toS, t + stepS - 1));
        for (let i = s.length - 1; i >= 0; i--) {
          if (!Number.isNaN(s[i] as number)) {
            values[id] = s[i] as number;
            break;
          }
        }
      }
      rows.push({ t, values });
    }
    return rows;
  }
}
