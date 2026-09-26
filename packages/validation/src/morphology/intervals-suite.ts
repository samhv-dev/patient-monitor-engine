// V5: ECG intervals of PTB-XL NORM records (CC BY 4.0) vs the engine's 12-lead capture, one method (intervalsOf).
// PTB-XL: the first `n` records with "'NORM': 100.0" in scp_codes (Stage 5's selection), lead II at 500 Hz.
// Engine: capture12() lead II after 40 s at HR 60/75/90/100, seeds 1–3.
import { createEngine, capture12 } from '@pme/engine-core';
import { fetchCached } from '../templates/fetch.ts';
import { csvCells } from '../templates/compare-ptbxl.ts';
import { decode16, parseHeader } from '../templates/wfdb.ts';
import { intervalsOf, type Intervals } from '../metrics/intervals.ts';
import { quantile } from '../stats.ts';

const PROJECT = 'ptb-xl/1.0.3';
export const ENGINE_HRS = [60, 75, 90, 100];

export async function ptbxlIntervals(cache: string, n = 100): Promise<Intervals[]> {
  const td = new TextDecoder();
  const csv = td.decode(await fetchCached(cache, PROJECT, 'ptbxl_database.csv')).split(/\r?\n/);
  const head = csvCells(csv[0] as string);
  const iScp = head.indexOf('scp_codes');
  const iHr = head.indexOf('filename_hr');
  const out: Intervals[] = [];
  for (const line of csv.slice(1)) {
    if (out.length >= n) break;
    const c = csvCells(line);
    if (!(c[iScp] ?? '').includes("'NORM': 100.0")) continue;
    const f = c[iHr] as string;
    const h = parseHeader(td.decode(await fetchCached(cache, PROJECT, `${f}.hea`)));
    const sig = decode16(await fetchCached(cache, PROJECT, `${f}.dat`), h.nSignals)[1];
    const s = h.signals[1];
    if (!sig || !s) continue;
    const r = intervalsOf(Float64Array.from(sig, (v) => (v - s.baseline) / s.gain), h.fs);
    if (r && Number.isFinite(r.qtMs) && Number.isFinite(r.prMs)) out.push(r);
  }
  return out;
}

export function engineIntervals(seeds = [1, 2, 3]): Intervals[] {
  const out: Intervals[] = [];
  for (const hr of ENGINE_HRS) {
    for (const seed of seeds) {
      const e = createEngine({ seed, patient: { baseline: { hr } } });
      e.advanceTo(40);
      const r = intervalsOf(Float64Array.from(capture12(e).leads.ecgII));
      if (r) out.push(r);
    }
  }
  return out;
}

/** p10–p90 of each interval in the reference: the V5 bands (bands.ts fills). */
export function intervalFills(ref: Intervals[]): Record<string, { min: number; max: number }> {
  const b = (k: keyof Intervals) => ({ min: quantile(ref.map((r) => r[k]), 0.1), max: quantile(ref.map((r) => r[k]), 0.9) });
  return { 'V5-QTc': b('qtcMs'), 'V5-PR': b('prMs'), 'V5-QRS': b('qrsMs') };
}
