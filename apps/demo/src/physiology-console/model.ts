// Stage 7x: the console's data model — current leaves (truth tree + folded events + monitor numerics), the baseline,
// 60 s histories, rows grouped by organ, and the JSON/CSV export. No DOM.
import type { EngineEvent } from '@pme/engine-core';
import { flatten, foldEvent, type Leaf, type Leaves } from './flatten.ts';
import { changeDir, fmtDelta, fmtValue, type Dir } from './format.ts';
import { metaOf, siblingUnit, type Meta } from './meta.ts';
import { GROUPS, groupOf, isInternal, isPhase, type GroupId } from './organs.ts';
import { pushHist } from './sparkline.ts';

export interface Row {
  path: string;
  group: GroupId;
  meta: Meta;
  value: Leaf;
  base: Leaf | undefined;
  /** current − baseline, raw units (numbers only). */
  delta: number | null;
  dir: Dir;
  internal: boolean;
  /** A within-beat/within-breath value (organs.ts `isPhase`): shown, never highlighted. */
  phase: boolean;
  hist: readonly number[];
}

export interface ConsoleExport {
  schema: 'pme-console/1';
  t: number;
  baselineT: number | null;
  /** Raw engine values; `unit` is the display unit and display = raw × scale. */
  values: Record<string, { group: GroupId; label: string; unit: string; scale: number; value: Leaf; baseline: Leaf | null; delta: number | null }>;
}

const GROUP_ORDER = new Map(GROUPS.map((g, i) => [g.id as GroupId, i]));
const EMPTY: readonly number[] = [];

export class ConsoleModel {
  readonly cur: Leaves = new Map();
  base: Leaves | null = null;
  baseT: number | null = null;
  /** Sim time of the latest truth event. */
  t = 0;
  /** The latest truth event's counts and its JSON size (the structured clone that crossed the worker is similar). */
  truth = { leaves: 0, dropped: 0, truncated: false, bytes: 0 };
  private truthKeys = new Set<string>();
  private readonly hist = new Map<string, number[]>();

  /** Fold an engine event in. Returns true for a truth event: the once-per-second refresh point. */
  ingest(e: EngineEvent): boolean {
    if (e.type !== 'truth') {
      foldEvent(e, this.cur);
      return false;
    }
    const next: Leaves = new Map();
    flatten(e.tree, '', next);
    for (const k of this.truthKeys) if (!next.has(k)) this.cur.delete(k); // a device switched off, a drug cleared
    this.truthKeys = new Set(next.keys());
    for (const [k, v] of next) this.cur.set(k, v);
    this.t = e.t;
    this.truth = { leaves: e.leaves, dropped: e.dropped, truncated: e.truncated, bytes: JSON.stringify(e.tree).length };
    for (const [k, v] of this.cur) {
      if (typeof v !== 'number') continue;
      let h = this.hist.get(k);
      if (!h) this.hist.set(k, (h = []));
      pushHist(h, v);
    }
    return true;
  }

  setBaseline(): void {
    this.base = new Map(this.cur);
    this.baseT = this.t;
  }

  /** After a reset to baseline (time goes back) the histories restart. */
  clearHistory(): void {
    this.hist.clear();
  }

  /** After a patient restart: forget everything. */
  clear(): void {
    this.cur.clear();
    this.truthKeys.clear();
    this.hist.clear();
    this.base = null;
    this.baseT = null;
    this.t = 0;
  }

  row(path: string): Row {
    const value = this.cur.get(path) ?? null;
    const base = this.base?.get(path);
    let meta = metaOf(path);
    if (meta.unit === '' && meta.rank === Number.POSITIVE_INFINITY && typeof value === 'number') {
      const unit = siblingUnit(path, (p) => this.cur.get(p));
      if (unit) meta = { ...meta, unit };
    }
    const delta = typeof value === 'number' && typeof base === 'number' ? value - base : null;
    const phase = isPhase(path);
    return { path, group: groupOf(path), meta, value, base, delta, dir: phase ? null : changeDir(value, base, meta), internal: isInternal(path), phase, hist: this.hist.get(path) ?? EMPTY };
  }

  /** Every current path as a row: by organ group, curated rows first, then by path. */
  rows(): Row[] {
    return [...this.cur.keys()]
      .map((p) => this.row(p))
      .sort((a, b) => (GROUP_ORDER.get(a.group) as number) - (GROUP_ORDER.get(b.group) as number) || a.meta.rank - b.meta.rank || (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  }

  toJSON(): ConsoleExport {
    const values: ConsoleExport['values'] = {};
    for (const r of this.rows()) {
      values[r.path] = { group: r.group, label: r.meta.label, unit: r.meta.unit, scale: r.meta.scale, value: r.value, baseline: r.base ?? null, delta: r.delta };
    }
    return { schema: 'pme-console/1', t: this.t, baselineT: this.baseT, values };
  }

  /** Displayed values (scaled, rounded) for spreadsheets and calibration notes. */
  toCSV(): string {
    const q = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
    const lines = ['group,path,label,value,unit,baseline,delta'];
    for (const r of this.rows()) {
      const ref = typeof r.base === 'number' ? r.base : typeof r.value === 'number' ? r.value : 0;
      lines.push([r.group, r.path, r.meta.label, fmtValue(r.value, r.meta), r.meta.unit, fmtValue(r.base, r.meta), fmtDelta(r.delta, r.meta, ref)].map(q).join(','));
    }
    return `${lines.join('\n')}\n`;
  }
}
