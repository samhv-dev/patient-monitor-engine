// The recorded-vs-engine morphology suite (brief §9 V1–V5): every manifest window is measured twice with the SAME
// code — once on the recording, once on a matched engine run — then per metric and HR bin the two distributions are
// compared (median, IQR, KS D, Wasserstein-1) and the engine's statistic is graded against the band (R40 grading).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseHeader } from '../templates/wfdb.ts';
import { matchedRun } from '../engine/match.ts';
import { readManifest } from '../datasets/manifest.ts';
import { MGHDB, mghMeta, mghSignals } from '../datasets/mghdb.ts';
import type { AnalysisWindow, Signals } from '../datasets/signals.ts';
import { loadCase, vitaldbSignals, vitaldbSums } from '../datasets/vitaldb.ts';
import type { VitalFile } from '../datasets/vital.ts';
import { computeWindowMetrics, type WindowMetrics } from '../metrics/window-metrics.ts';
import { gradeTarget } from '../segments/grade.ts';
import type { Grade } from '../segments/types.ts';
import { ksD, median, quantile, wasserstein1 } from '../stats.ts';
import { BANDS, hrBin, type MetricBand } from './bands.ts';

export interface Dist { n: number; median: number; p25: number; p75: number }
export interface MorphRow {
  band: string;
  metric: string;
  group: string;
  recorded: Dist | null;
  engine: Dist;
  ks: number;
  w1: number;
  engineStat: number;
  expected: string;
  grade: Grade;
  errPct: number;
  source: string;
}
export interface WindowPair { window: AnalysisWindow; recorded: WindowMetrics; engine: WindowMetrics; wallMs: number }

const dist = (xs: number[]): Dist => ({ n: xs.filter(Number.isFinite).length, median: median(xs), p25: quantile(xs, 0.25), p75: quantile(xs, 0.75) });

/** Per-window scalar or per-beat series of a metric (per-window scalars become one-element arrays). */
export function series(m: WindowMetrics, metric: string): number[] {
  switch (metric) {
    case 'ppvPct': return m.resp ? [m.resp.ppvPct] : [];
    case 'spvMmHg': return m.resp ? [m.resp.spvMmHg] : [];
    case 'ppgShapeR': return [m.ppgShapeR];
    case 'ppgCountRatio': return [m.ppgCountRatio];
    case 'notchMinimumFrac': return [m.notchMinimumFrac];
    case 'hrErrAbs': return m.hrErr.map(Math.abs);
    case 'alpha': return m.co2Calibrated ? m.alpha : [];
    default: return ((m as unknown as Record<string, number[]>)[metric] ?? []).slice();
  }
}

/**
 * Grade one band over a group of window pairs. absolute: the engine median must lie in [min, max]; deltaToRecorded:
 * in [recorded median + min, recorded median + max]; ratioToRecorded: engine/recorded in [min, max]. errPct and the
 * green/yellow/red grade come from the segment grader (R40), so both suites grade identically.
 */
export function gradeBand(band: MetricBand, pairs: WindowPair[], group: string): MorphRow | null {
  const rec = pairs.flatMap((p) => series(p.recorded, band.metric));
  const eng = pairs.flatMap((p) => series(p.engine, band.metric));
  if (!eng.some(Number.isFinite) || !Number.isFinite(band.min) || !Number.isFinite(band.max)) return null;
  const e = median(eng);
  const r = median(rec);
  if (band.kind !== 'absolute' && !Number.isFinite(r)) return null;
  const stat = band.kind === 'ratioToRecorded' ? e / r : e;
  const [min, max] = band.kind === 'deltaToRecorded' ? [r + band.min, r + band.max] : [band.min, band.max];
  const g = gradeTarget({ id: band.id, series: band.metric, reduce: 'mean', source: band.source, type: 'Range', min, max }, stat, { segValue: () => Number.NaN });
  return {
    band: band.id, metric: band.metric, group, recorded: rec.length ? dist(rec) : null, engine: dist(eng), ks: ksD(rec, eng), w1: wasserstein1(rec, eng),
    engineStat: stat, expected: g.expected, grade: g.grade, errPct: g.errPct, source: band.source,
  };
}

export interface SuiteOptions {
  cache: string;
  seeds?: number[];
  maxWindows?: number;
  onProgress?: (msg: string) => void;
  /** Extra per-band limits filled at run time (PWDB rise times, PTB-XL intervals). */
  fills?: Record<string, { min: number; max: number }>;
}

export async function measurePairs(o: SuiteOptions): Promise<WindowPair[]> {
  const pairs: WindowPair[] = [];
  const seeds = o.seeds ?? [11];
  const vit = readManifest('vitaldb');
  const mgh = readManifest('mghdb');
  const windows = [...(vit?.windows ?? []), ...(mgh?.windows ?? [])].slice(0, o.maxWindows ?? Infinity);
  const sums = vit ? await vitaldbSums(o.cache) : new Map<string, string>();
  let caseId = '';
  let caseFile: VitalFile | null = null;
  for (const w of windows) {
    const t0 = performance.now();
    let rec: Signals;
    if (w.source === 'vitaldb') {
      if (caseId !== w.record || !caseFile) {
        caseFile = await loadCase(o.cache, w.record, sums);
        caseId = w.record;
      }
      rec = vitaldbSignals(caseFile, w);
    } else {
      const hea = readFileSync(join(o.cache, MGHDB, `${w.record}.hea`), 'latin1');
      rec = mghSignals(parseHeader(hea), mghMeta(hea), new Uint8Array(readFileSync(join(o.cache, MGHDB, `${w.record}.dat`))), w.fromS, w.toS);
    }
    const recorded = computeWindowMetrics(rec);
    // MGH windows carry the header's HR; the recorded ECG's is better for matching
    const target: AnalysisWindow = w.source === 'mghdb' ? { ...w, hr: Math.round(recorded.hr), sbp: Math.round(median(recorded.sys)), dbp: Math.round(median(recorded.dia)) } : w;
    for (const seed of seeds) {
      const engine = computeWindowMetrics((await matchedRun(target, seed)).signals);
      pairs.push({ window: target, recorded, engine, wallMs: performance.now() - t0 });
    }
    o.onProgress?.(`${w.source} ${w.record} ${w.fromS}–${w.toS}: ${(performance.now() - t0).toFixed(0)} ms`);
  }
  return pairs;
}

export function gradePairs(pairs: WindowPair[], fills: SuiteOptions['fills'] = {}): MorphRow[] {
  const rows: MorphRow[] = [];
  const groups = new Map<string, WindowPair[]>();
  for (const p of pairs) {
    for (const g of ['all', `${p.window.source}`, hrBin(p.recorded.hr)]) {
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g)?.push(p);
    }
  }
  for (const b0 of BANDS) {
    const b = fills[b0.id] ? { ...b0, ...fills[b0.id] } : b0;
    // V1/V2 are graded per HR bin (brief §9); the rest over all windows, with per-source rows for information
    const gs = b.id === 'V1' || b.id === 'V2' ? [...groups.keys()].filter((g) => g.startsWith('HR ')) : ['all', 'vitaldb', 'mghdb'];
    for (const g of gs) {
      const r = gradeBand(b, groups.get(g) ?? [], g);
      if (r) rows.push(r);
    }
  }
  return rows;
}
