// Series recorded during a validation run, and the per-segment reductions of brief §9 / R40.
import type { EngineEvent } from '@pme/engine-core';
import type { Reduce } from './types.ts';

export type Point = [t: number, v: number];

export class SeriesStore {
  readonly series = new Map<string, Point[]>();
  /** Scenario state entries: [t, stateId]. */
  readonly states: Array<[number, string]> = [];

  push(name: string, t: number, v: number): void {
    let s = this.series.get(name);
    if (!s) this.series.set(name, (s = []));
    s.push([t, v]);
  }

  onEvent(e: EngineEvent): void {
    if (e.type === 'state') {
      for (const [k, v] of Object.entries(e.values)) if (typeof v === 'number') this.push(`state:${k}`, e.t, v);
      const { sbp, dbp } = e.values;
      if (sbp !== undefined && dbp !== undefined) {
        this.push('state:map', e.t, dbp + (sbp - dbp) / 3); // derived: brief §4.2 MAP ≈ DBP + PP/3
        this.push('state:pp', e.t, sbp - dbp);
      }
    }
    if (e.type === 'measurement') for (const [k, m] of Object.entries(e.values)) if (m && m.value !== null) this.push(`numeric:${k}`, e.t, m.value);
    if (e.type === 'alarm') this.push(`alarm:${e.id}`, e.t, e.state === 'raised' ? 1 : 0);
    if ('t' in e) this.push(`event:${e.type}`, e.t, 1);
  }

  onScenario(t: number, stateId: string): void {
    this.states.push([t, stateId]);
  }

  /** Reduce `name` over [from, to). firstT is seconds after `from`; count counts points. NaN when empty. */
  reduce(name: string, reduce: Reduce, from: number, to: number, stateId?: string, threshold?: number): number {
    if (name === 'scenario') {
      // firstT: time the scenario first ENTERS stateId inside the window
      const hit = this.states.find(([t, s]) => s === stateId && t >= from && t < to);
      return reduce === 'firstT' ? (hit ? hit[0] - from : Number.NaN) : hit ? 1 : 0;
    }
    const pts = (this.series.get(name) ?? []).filter(([t]) => t >= from && t < to);
    if (reduce === 'count') return pts.length;
    if (reduce === 'firstTBelow' || reduce === 'firstTAbove') {
      const thr = threshold ?? Number.NaN;
      const p = pts.find(([, v]) => (reduce === 'firstTBelow' ? v < thr : v > thr));
      return p ? p[0] - from : Number.NaN;
    }
    if (reduce === 'firstT') {
      const p = name.startsWith('alarm:') ? pts.find(([, v]) => v === 1) : pts[0];
      return p ? p[0] - from : Number.NaN;
    }
    if (pts.length === 0) return Number.NaN;
    const vs = pts.map(([, v]) => v);
    switch (reduce) {
      case 'mean': return vs.reduce((a, b) => a + b, 0) / vs.length;
      case 'min': return Math.min(...vs);
      case 'max': return Math.max(...vs);
      case 'first': return vs[0] as number;
      default: return vs[vs.length - 1] as number; // 'last'
    }
  }
}
