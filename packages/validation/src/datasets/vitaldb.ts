// VitalDB (PhysioNet copy, CC BY 4.0): candidate selection from clinical metadata (decision 2), case loading with
// SHA-256 verification, and the analysis-window finder that turns a case into matched-engine targets.
import { fetchCached, fetchVerified, parseSums } from '../templates/fetch.ts';
import { readCsv } from './csv.ts';
import { fillGaps, type AnalysisWindow, type Signals } from './signals.ts';
import { numbers, parseVital, waveSlice, type VitalFile } from './vital.ts';

export const VITALDB = 'vitaldb/1.0.0';
export const WAVES = { ecg: 'SNUADC/ECG_II', abp: 'SNUADC/ART', pleth: 'SNUADC/PLETH', co2: 'Primus/CO2', awp: 'Primus/AWP' } as const;
export const NUMS = {
  hr: 'Solar8000/HR', sbp: 'Solar8000/ART_SBP', dbp: 'Solar8000/ART_DBP', abpMean: 'Solar8000/ART_MBP', nibpMean: 'Solar8000/NIBP_MBP',
  etco2: 'Primus/ETCO2', rr: 'Primus/SET_RR_IPPV', vt: 'Primus/SET_TV_L', peep: 'Primus/SET_INTER_PEEP',
} as const;
export const WANT = new Set<string>([...Object.values(WAVES), ...Object.values(NUMS)]);

export interface Candidate {
  caseid: string; // zero-padded, e.g. "0001"
  ageY: number;
  sex: 'M' | 'F';
  site: 'radial' | 'femoral';
  preopEcg: string;
  emergency: boolean;
  department: string;
  opstartS: number;
  opendS: number;
}

const band = (a: number) => (a < 40 ? 'A18-39' : a < 65 ? 'A40-64' : 'A65+');

/**
 * Deterministic stratified pick (decision 2): general anaesthesia, adult, arterial line at a radial or femoral site,
 * surgery ≥ 60 min. Strata = site × age band × sex × (pre-op ECG not sinus); round-robin over strata
 * (sorted keys), lowest case id first, until `n`.
 */
export function selectCandidates(clinicalCsv: string, n = 64): Candidate[] {
  const eligible: Candidate[] = [];
  for (const r of readCsv(clinicalCsv)) {
    const line = (r.aline1 ?? '').toLowerCase();
    const site = line.includes('radial') ? 'radial' : line.includes('femoral') ? 'femoral' : null;
    const age = Number(r.age);
    const opstart = Number(r.opstart);
    const opend = Number(r.opend);
    if (!site || r.ane_type !== 'General' || !(age >= 18) || !(opend - opstart >= 3600)) continue;
    if (r.sex !== 'M' && r.sex !== 'F') continue;
    eligible.push({
      caseid: String(r.caseid).padStart(4, '0'), ageY: age, sex: r.sex, site, preopEcg: r.preop_ecg ?? '', emergency: r.emop === '1',
      department: r.department ?? '', opstartS: opstart, opendS: opend,
    });
  }
  const strata = new Map<string, Candidate[]>();
  for (const c of eligible.sort((a, b) => a.caseid.localeCompare(b.caseid))) {
    const k = [c.site, band(c.ageY), c.sex, c.preopEcg === 'Normal Sinus Rhythm' ? 'nsr' : 'ecg'].join('|');
    if (!strata.has(k)) strata.set(k, []);
    strata.get(k)?.push(c);
  }
  const keys = [...strata.keys()].sort();
  const out: Candidate[] = [];
  for (let round = 0; out.length < n; round++) {
    let took = false;
    for (const k of keys) {
      const c = strata.get(k)?.[round];
      if (c && out.length < n) {
        out.push(c);
        took = true;
      }
    }
    if (!took) break;
  }
  return out;
}

export async function vitaldbSums(cache: string): Promise<Map<string, string>> {
  return parseSums(new TextDecoder().decode(await fetchCached(cache, VITALDB, 'SHA256SUMS.txt')));
}

export async function loadCase(cache: string, caseid: string, sums: Map<string, string>): Promise<VitalFile> {
  return parseVital(await fetchVerified(cache, VITALDB, `vital_files/${caseid}.vital`, sums), WANT);
}

const median = (xs: number[]): number => {
  const v = xs.filter(Number.isFinite).sort((a, b) => a - b);
  return v.length ? (v[Math.floor((v.length - 1) / 2)] as number + (v[Math.ceil((v.length - 1) / 2)] as number)) / 2 : Number.NaN;
};
const vals = (p: Array<[number, number]>) => p.map(([, v]) => v);

/** Minimum seconds of ART_MBP < 65 that tag a window `hypotension` [ENG; the usual IOH definition is MAP < 65]. */
export const HYPO_MAP = 65;
export const HYPO_MIN_S = 60;

/**
 * Up to `max` 300 s windows inside [opstart + 600 s, opend − 300 s] where all four waves are ≥ 99 % present, the
 * arterial trace is plausible (MAP 40–150, no flush > 250), the ventilator is in IPPV (SET_RR_IPPV present) and the
 * device HR is stable (IQR ≤ 10). Stepped by 60 s; windows do not overlap; a hypotensive window is preferred once.
 */
export function findWindows(f: VitalFile, c: Candidate, max = 2, lenS = 300): AnalysisWindow[] {
  const out: AnalysisWindow[] = [];
  const endS = c.opendS - lenS;
  const hypoFirst: AnalysisWindow[] = [];
  const plain: AnalysisWindow[] = [];
  for (let a = c.opstartS + 600; a <= endS; a += 60) {
    const b = a + lenS;
    const w: Record<string, Float64Array> = {};
    let ok = true;
    for (const [k, name] of Object.entries({ ecg: WAVES.ecg, abp: WAVES.abp, pleth: WAVES.pleth, co2: WAVES.co2 })) {
      if (!f.tracks.get(name)?.recs.length) return [];
      const x = waveSlice(f, name, a, b).x;
      const nan = x.reduce((s, v) => s + (Number.isFinite(v) ? 0 : 1), 0) / x.length;
      if (nan > 0.01) { ok = false; break; }
      w[k] = x;
    }
    if (!ok) continue;
    const abp = w.abp as Float64Array;
    let mx = -Infinity;
    let sum = 0;
    let n = 0;
    for (const v of abp) if (Number.isFinite(v)) { mx = Math.max(mx, v); sum += v; n++; }
    const map = sum / n;
    if (!(map >= 40 && map <= 150) || mx > 250) continue;
    const rr = median(vals(numbers(f, NUMS.rr, a, b)));
    if (!Number.isFinite(rr)) continue;
    const hr = vals(numbers(f, NUMS.hr, a, b)).sort((x, y) => x - y);
    if (hr.length < 10 || (hr[Math.floor(hr.length * 0.75)] as number) - (hr[Math.floor(hr.length * 0.25)] as number) > 10) continue;
    const mbp = numbers(f, NUMS.abpMean, a, b);
    let run = 0;
    let longest = 0;
    for (let i = 1; i < mbp.length; i++) {
      const [t0, v0] = mbp[i - 1] as [number, number];
      const [t1] = mbp[i] as [number, number];
      run = v0 < HYPO_MAP ? run + (t1 - t0) : 0;
      longest = Math.max(longest, run);
    }
    const hypo = longest >= HYPO_MIN_S;
    const etco2 = median(vals(numbers(f, NUMS.etco2, a, b)));
    const win: AnalysisWindow = {
      source: 'vitaldb', record: c.caseid, fromS: a, toS: b, site: c.site,
      hr: median(hr), sbp: median(vals(numbers(f, NUMS.sbp, a, b))), dbp: median(vals(numbers(f, NUMS.dbp, a, b))),
      etco2: Number.isFinite(etco2) ? etco2 : null,
      vent: { rr, vtMl: 1000 * median(vals(numbers(f, NUMS.vt, a, b))), peep: median(vals(numbers(f, NUMS.peep, a, b))) || 0 },
      ageY: c.ageY, sex: c.sex,
      tags: [hypo ? 'hypotension' : 'stable', ...(c.preopEcg !== 'Normal Sinus Rhythm' ? [`preop:${c.preopEcg}`] : []), c.site],
    };
    if (!Number.isFinite(win.sbp) || !Number.isFinite(win.vent?.vtMl ?? Number.NaN)) continue;
    (hypo ? hypoFirst : plain).push(win);
  }
  const pick = [...hypoFirst.slice(0, 1), ...plain];
  for (const w of pick) {
    if (out.length >= max) break;
    if (out.every((o) => w.fromS >= o.toS || w.toS <= o.fromS)) out.push(w);
  }
  return out.sort((x, y) => x.fromS - y.fromS);
}

/** Inspiration onsets from airway pressure: upward crossings of (min + 30 % of the range) per 20 s block [ENG]. */
export function inspirationsFromAwp(p: Float64Array, fs: number): number[] {
  const out: number[] = [];
  const blk = Math.round(20 * fs);
  for (let b0 = 0; b0 < p.length; b0 += blk) {
    let lo = Infinity;
    let hi = -Infinity;
    for (let i = b0; i < Math.min(p.length, b0 + blk); i++) {
      lo = Math.min(lo, p[i] as number);
      hi = Math.max(hi, p[i] as number);
    }
    const thr = lo + 0.3 * (hi - lo);
    if (hi - lo < 3) continue; // < 3 hPa swing: not ventilated
    for (let i = Math.max(1, b0); i < Math.min(p.length, b0 + blk); i++) {
      if ((p[i - 1] as number) < thr && (p[i] as number) >= thr && (out.length === 0 || i / fs - (out.at(-1) as number) > 1)) out.push(i / fs);
    }
  }
  return out;
}

/** Solar8000 repeats the last NIBP reading every 2 s: keep only the points where the value changes (a new cuff cycle). */
export function newReadings(p: Array<[number, number]>): Array<[number, number]> {
  return p.filter(([, v], i) => i === 0 || v !== (p[i - 1] as [number, number])[1]);
}

/** The recorded Signals of one window (times re-based to the window start). */
export function vitaldbSignals(f: VitalFile, w: AnalysisWindow): Signals {
  const wave = (name: string) => {
    const s = waveSlice(f, name, w.fromS, w.toS);
    fillGaps(s.x);
    return s;
  };
  const rebase = (p: Array<[number, number]>): Array<[number, number]> => p.map(([t, v]) => [t - w.fromS, v]);
  const awp = f.tracks.get(WAVES.awp)?.recs.length ? wave(WAVES.awp) : null;
  return {
    ecg: wave(WAVES.ecg), abp: wave(WAVES.abp), site: w.site, pleth: wave(WAVES.pleth), co2: wave(WAVES.co2), co2Calibrated: true,
    ...(awp ? { inspirations: inspirationsFromAwp(awp.x, awp.fs) } : {}),
    numerics: {
      hr: rebase(numbers(f, NUMS.hr, w.fromS, w.toS)),
      abpMean: rebase(numbers(f, NUMS.abpMean, w.fromS, w.toS)),
      nibpMean: rebase(newReadings(numbers(f, NUMS.nibpMean, w.fromS - 600, w.toS))).filter(([t]) => t >= 0),
      etco2: rebase(numbers(f, NUMS.etco2, w.fromS, w.toS)),
    },
  };
}
