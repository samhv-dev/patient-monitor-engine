// Report-only comparison of the engine's normal beat with PTB-XL normal median beats (CC BY 4.0). Ruling R17
// fixes the lead ratios "as implemented", so nothing is refitted: the per-lead correlations are written to
// docs/gates/stage-5/ptbxl-normal-comparison.json for the gate review and for Stage 8's validation harness.
// Usage: node --experimental-strip-types packages/validation/src/templates/compare-ptbxl.ts [cacheDir] [outJson] [n]
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fetchCached } from './fetch.ts';
import { decode16, parseHeader } from './wfdb.ts';
import { bandpassZeroPhase } from './dsp.ts';
import { narrowKernels } from '../../../engine-core/src/l2/ecg/templates.ts';
import { projectLeads } from '../../../engine-core/src/l2/ecg/vcg.ts';
import { K_STRIDE } from '../../../engine-core/src/l2/ecg/kernels.ts';

const PROJECT = 'ptb-xl/1.0.3';
const LEADS = ['I', 'II', 'III', 'AVR', 'AVL', 'AVF', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6'];
const PRE = 125; // 250 ms before R at 500 Hz
const POST = 225; // 450 ms after R

/** Split one CSV line, honouring double quotes. */
export function csvCells(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let q = false;
  for (const ch of line) {
    if (ch === '"') q = !q;
    else if (ch === ',' && !q) {
      out.push(cur);
      cur = '';
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

/** R peaks on lead II: 5–15 Hz band-pass, 50% of the record's maximum, 250 ms refractory [ENG]. */
export function rPeaks(x: Float64Array, fs: number): number[] {
  const f = bandpassZeroPhase(x, fs, 5, 15);
  let mx = 0;
  for (const v of f) mx = Math.max(mx, Math.abs(v));
  const out: number[] = [];
  for (let i = 1; i < f.length - 1; i++) {
    const v = Math.abs(f[i] as number);
    if (v > 0.5 * mx && v >= Math.abs(f[i - 1] as number) && v >= Math.abs(f[i + 1] as number) && (out.length === 0 || i - (out.at(-1) as number) > 0.25 * fs)) out.push(i);
  }
  return out;
}

export function medianBeat(x: Float64Array, peaks: number[]): Float64Array {
  const ok = peaks.filter((p) => p - PRE >= 0 && p + POST < x.length);
  const out = new Float64Array(PRE + POST);
  for (let i = 0; i < out.length; i++) {
    const v = ok.map((p) => x[p - PRE + i] as number).sort((a, b) => a - b);
    out[i] = v[Math.floor(v.length / 2)] as number;
  }
  return out;
}

function corr(a: ArrayLike<number>, b: ArrayLike<number>): number {
  let ma = 0;
  let mb = 0;
  for (let i = 0; i < a.length; i++) {
    ma += a[i] as number;
    mb += b[i] as number;
  }
  ma /= a.length;
  mb /= b.length;
  let n = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < a.length; i++) {
    n += ((a[i] as number) - ma) * ((b[i] as number) - mb);
    da += ((a[i] as number) - ma) ** 2;
    db += ((b[i] as number) - mb) ** 2;
  }
  return n / Math.sqrt(da * db);
}

/** The engine's 12-lead normal beat around R (R = kernel τ 40 ms), for a given QT. */
export function engineBeat(qtMs: number): Float64Array[] {
  const k = narrowKernels(qtMs);
  const leads = Array.from({ length: 12 }, () => new Float64Array(PRE + POST));
  const out = new Float64Array(12);
  for (let i = 0; i < PRE + POST; i++) {
    const s = 0.04 + (i - PRE) / 500;
    let x = 0;
    let y = 0;
    let z = 0;
    for (let j = 0; j < k.length; j += K_STRIDE) {
      const d = s - (k[j] as number);
      const sg = d < 0 ? (k[j + 1] as number) : (k[j + 2] as number);
      const g = Math.exp((-d * d) / (2 * sg * sg));
      x += (k[j + 3] as number) * g;
      y += (k[j + 4] as number) * g;
      z += (k[j + 5] as number) * g;
    }
    projectLeads(x, y, z, out);
    for (let l = 0; l < 12; l++) (leads[l] as Float64Array)[i] = out[l] as number;
  }
  return leads;
}

export async function comparePtbxl(cache: string, n: number): Promise<{ records: string[]; meanR: Record<string, number> }> {
  const csv = new TextDecoder().decode(await fetchCached(cache, PROJECT, 'ptbxl_database.csv')).split(/\r?\n/);
  const head = csvCells(csv[0] as string);
  const iScp = head.indexOf('scp_codes');
  const iHr = head.indexOf('filename_hr');
  const files: string[] = [];
  for (const line of csv.slice(1)) {
    const c = csvCells(line);
    if ((c[iScp] ?? '').includes("'NORM': 100.0")) files.push(c[iHr] as string);
    if (files.length >= n) break;
  }
  const sums: Record<string, number[]> = Object.fromEntries(LEADS.map((l) => [l, []]));
  for (const f of files) {
    const h = parseHeader(new TextDecoder().decode(await fetchCached(cache, PROJECT, `${f}.hea`)));
    const sig = decode16(await fetchCached(cache, PROJECT, `${f}.dat`), h.nSignals);
    const mv = sig.map((s, i) => Float64Array.from(s, (v) => (v - h.signals[i]!.baseline) / h.signals[i]!.gain));
    const ii = mv[1] as Float64Array;
    const peaks = rPeaks(ii, h.fs);
    const rr = (peaks.at(-1)! - peaks[0]!) / (peaks.length - 1) / h.fs;
    const ours = engineBeat(400 * Math.cbrt(rr));
    LEADS.forEach((l, i) => sums[l]!.push(corr(medianBeat(bandpassZeroPhase(mv[i] as Float64Array, h.fs, 0.5, 40), peaks), ours[i] as Float64Array)));
  }
  const meanR = Object.fromEntries(LEADS.map((l) => [l, Number((sums[l]!.reduce((a, b) => a + b, 0) / sums[l]!.length).toFixed(3))]));
  return { records: files, meanR };
}

const invokedDirectly = process.argv[1] !== undefined && import.meta.filename === (await import('node:path')).resolve(process.argv[1]);
if (invokedDirectly) {
  const cache = process.argv[2] ?? 'packages/validation/datasets/cache';
  const out = process.argv[3] ?? 'docs/gates/stage-5/ptbxl-normal-comparison.json';
  const r = await comparePtbxl(cache, Number(process.argv[4] ?? 20));
  console.log(JSON.stringify(r.meanR));
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify({ source: 'PTB-XL 1.0.3 (CC BY 4.0), NORM 100', ruling: 'R17: report only, no refit', ...r }, null, 2) + '\n');
}
