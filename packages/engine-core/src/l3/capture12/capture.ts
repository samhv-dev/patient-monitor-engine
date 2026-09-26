// 12-lead capture (brief §6.6): the last 10 s from the VCG ring buffer, projected to 12 leads with the DIAGNOSTIC
// 0.05–150 Hz filter whatever the monitor filter is (LIFEPAK prints this way, research/05 §2.6), laid out 3×4 with
// a lead II rhythm strip, 25 mm/s, 10 mm/mV, with calibration pulses. Uses only the public MonitorEngine API.
import { projectLeads } from '../../l2/ecg/vcg.ts';
import { createFilterState, designEcgFilter, filterSample, FILTER_BANDS } from '../ecg-filter.ts';
import { LEAD_IDS, type LeadId, type MonitorEngine } from '../../types.ts';

export const CAPTURE_S = 10;
export const CAPTURE_RATE = 500;
/** Filter pre-roll: up to this much older signal settles the 0.05 Hz high-pass before the window [ENG]. */
export const PREROLL_S = 20;
/** 3×4 layout (brief §6.6 default): columns of 2.5 s, rows I/II/III, aVR/aVL/aVF, V1–V3, V4–V6; lead II rhythm strip. */
export const LAYOUT_3X4: readonly (readonly LeadId[])[] = [
  ['ecgI', 'aVR', 'V1', 'V4'],
  ['ecgII', 'aVL', 'V2', 'V5'],
  ['ecgIII', 'aVF', 'V3', 'V6'],
];

export interface Capture12 {
  /** Sim time of the first sample. */
  t0: number;
  rate: 500;
  durationS: number;
  leads: Record<LeadId, Float32Array>;
  filter: readonly [number, number];
  layout: { kind: '3x4'; rows: readonly (readonly LeadId[])[]; columnS: number; rhythmLead: LeadId };
  paper: { mmPerS: 25; mmPerMv: 10 };
  cal: { mV: 1; ms: 200 };
  /** Heart rate from the rhythm strip's R peaks, and the frontal QRS axis from the net QRS area in I and aVF [ENG]. */
  measurements: { hr: number | null; axisDeg: number | null };
}

/** Capture the 10 s that end at the engine's current committed time (or at `endT`). Throws if < 10 s are held. */
export function capture12(e: MonitorEngine, endT: number = e.now().simT): Capture12 {
  const end = Math.floor(endT * CAPTURE_RATE); // exclusive
  const n = CAPTURE_S * CAPTURE_RATE;
  const start = end - n;
  if (start < 0) throw new RangeError('capture12 needs 10 s of ECG');
  const pre = Math.min(start, PREROLL_S * CAPTURE_RATE);
  const total = pre + n;
  const X = new Float32Array(total);
  const Y = new Float32Array(total);
  const Z = new Float32Array(total);
  if (e.readSamples('vcgX', start - pre, X) < total || e.readSamples('vcgY', start - pre, Y) < total || e.readSamples('vcgZ', start - pre, Z) < total) {
    throw new RangeError('capture12: the VCG buffer does not hold the window');
  }
  // Filter X, Y, Z, then project: the filter is linear, so the Einthoven/Goldberger identities hold exactly.
  const sec = designEcgFilter('diagnostic', CAPTURE_RATE);
  const fs = [createFilterState(sec), createFilterState(sec), createFilterState(sec)];
  const leads = Object.fromEntries(LEAD_IDS.map((l) => [l, new Float32Array(n)])) as Record<LeadId, Float32Array>;
  const tmp = new Float64Array(12);
  for (let i = 0; i < total; i++) {
    const x = filterSample(sec, fs[0] as number[], X[i] as number);
    const y = filterSample(sec, fs[1] as number[], Y[i] as number);
    const z = filterSample(sec, fs[2] as number[], Z[i] as number);
    if (i < pre) continue;
    projectLeads(x, y, z, tmp);
    for (let k = 0; k < 12; k++) (leads[LEAD_IDS[k] as LeadId] as Float32Array)[i - pre] = tmp[k] as number;
  }
  return {
    t0: start / CAPTURE_RATE,
    rate: CAPTURE_RATE,
    durationS: CAPTURE_S,
    leads,
    filter: FILTER_BANDS.diagnostic,
    layout: { kind: '3x4', rows: LAYOUT_3X4, columnS: CAPTURE_S / 4, rhythmLead: 'ecgII' },
    paper: { mmPerS: 25, mmPerMv: 10 },
    cal: { mV: 1, ms: 200 },
    measurements: measure(leads),
  };
}

/** R peaks on lead II: local maxima above 60 % of the strip's maximum, ≥ 250 ms apart [ENG]. */
function rPeaks(x: Float32Array): number[] {
  let mx = 0;
  for (const v of x) mx = Math.max(mx, v);
  const out: number[] = [];
  for (let i = 1; i < x.length - 1; i++) {
    const v = x[i] as number;
    if (v < 0.6 * mx || v < (x[i - 1] as number) || v < (x[i + 1] as number)) continue;
    if (out.length > 0 && i - (out[out.length - 1] as number) < 125) continue;
    out.push(i);
  }
  return out;
}

function measure(leads: Record<LeadId, Float32Array>): Capture12['measurements'] {
  const r = rPeaks(leads.ecgII);
  if (r.length < 2) return { hr: null, axisDeg: null };
  const hr = Math.round((60 * CAPTURE_RATE * (r.length - 1)) / ((r[r.length - 1] as number) - (r[0] as number)));
  let a1 = 0;
  let aF = 0;
  for (const p of r) {
    for (let i = Math.max(0, p - 40); i < Math.min(leads.ecgI.length, p + 40); i++) {
      a1 += leads.ecgI[i] as number; // ±80 ms around R: the QRS [ENG]
      aF += leads.aVF[i] as number;
    }
  }
  return { hr, axisDeg: Math.round((Math.atan2(aF, a1) * 180) / Math.PI) };
}
