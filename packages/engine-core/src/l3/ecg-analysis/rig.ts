// The recorded-ECG rig (defibrillator plan §3.4.2, piece E4a): human recordings cut into labelled 3-s segments, on
// which every consumer of the analysis core (E4b's AED rule and Check Patient, B1's bedside VF detector) is tested.
// Test support: pure, no file access — packages/validation (src/ecg-analysis/rig-sets.ts) reads the recordings from
// the dataset cache and hands them here. E4a measures and reports; it decides nothing and asserts no rate.
//
// Sets:
//   CUDB, the Creighton University Ventricular Tachyarrhythmia Database v1.0.0 (DOI 10.13026/C2X59M, ODC-By 1.0;
//     Nolle et al., Computers in Cardiology 1986;13:515-518): VF from its episode marks ('[' … ']') and VT from its
//     rhythm annotations ('(VT' to the next rhythm mark). The records the engine's VF texture templates were taken
//     from are HELD OUT (packages/validation/src/templates/extract-vf.ts → templates/vf-cudb.ts), so the engine is never
//     tested on the recordings its own VF is made of.
//   PTB-XL v1.0.3 (DOI 10.13026/kfzx-aw45, CC BY 4.0; Wagner et al., Sci Data 2020): the non-shockable rhythms, one
//     class per rhythm statement, lead II of the 500 Hz records, 10 s each.
import { VF_TEMPLATES } from '../../../templates/vf-cudb.ts';
import { measureSegment, SEGMENT_S, type SegmentFeatures } from './features.ts';

/** The CUDB records the engine's VF templates were cut from ('cu07@200.0s' → 'cu07'). */
export const CUDB_HELD_OUT: ReadonlySet<string> = new Set(VF_TEMPLATES.map((t) => t.id.split('@')[0] as string));

/** WFDB annotation codes the rig reads (ecgcodes.h, as packages/validation/src/templates/wfdb.ts). */
export const WFDB = { NOISE: 14, ARFCT: 16, RHYTHM: 28, VFON: 32, VFOFF: 33 } as const;

/** Shockable classes from CUDB; non-shockable from PTB-XL (their rhythm statements, lower case; `avBlock` = SR with 2AVB/3AVB). */
export type RigClass = 'vf' | 'vt' | 'nsr' | 'afib' | 'aflt' | 'sbrad' | 'stach' | 'sarrh' | 'svarr' | 'svtac' | 'psvt' | 'bigu' | 'trigu' | 'pace' | 'avBlock';

export interface RigSegment {
  record: string;
  startS: number;
  cls: RigClass;
}

export interface RigRecording {
  set: 'cudb' | 'ptbxl';
  id: string;
  fs: number;
  /** The lead in mV. */
  mv: Float64Array;
  segments: RigSegment[];
}

export interface RigAnnotation {
  sample: number;
  code: number;
  aux: string;
}

/**
 * Non-overlapping 3-s segments of a CUDB record, each wholly inside a VF episode ('[' to ']', or to the record's end
 * when the episode is left open) or a VT interval ('(VT' to the next rhythm mark). Dropped, by the rules of
 * extract-vf.ts: a segment with a noise mark from 1 s before it to its end (here also the isolated-artefact mark '|'),
 * and a segment that touches the ADC limit (`saturated(a, b)`, sample indices [a, b)).
 */
export function cudbSegments(record: string, fs: number, nSamples: number, ann: readonly RigAnnotation[], saturated: (a: number, b: number) => boolean): RigSegment[] {
  const spans: Array<[number, number, RigClass]> = [];
  let vfOn = -1;
  let vtOn = -1;
  for (const a of ann) {
    if (a.code === WFDB.VFON) vfOn = a.sample;
    if (a.code === WFDB.VFOFF && vfOn >= 0) {
      spans.push([vfOn, a.sample, 'vf']);
      vfOn = -1;
    }
    if (a.code === WFDB.RHYTHM) {
      if (vtOn >= 0) spans.push([vtOn, a.sample, 'vt']);
      vtOn = a.aux.startsWith('(VT') ? a.sample : -1;
    }
  }
  if (vfOn >= 0) spans.push([vfOn, nSamples, 'vf']);
  if (vtOn >= 0) spans.push([vtOn, nSamples, 'vt']);
  const marks = ann.filter((a) => a.code === WFDB.NOISE || a.code === WFDB.ARFCT).map((a) => a.sample);
  const len = Math.round(SEGMENT_S * fs);
  const out: RigSegment[] = [];
  for (const [a, b, cls] of spans) {
    for (let s = a; s + len <= b; s += len) {
      const e = s + len;
      if (marks.some((t) => t >= s - fs && t <= e)) continue;
      if (saturated(s, e)) continue;
      out.push({ record, startS: s / fs, cls });
    }
  }
  return out.sort((p, q) => p.startS - q.startS);
}

const PTBXL_RHYTHMS: Record<string, RigClass> = {
  SR: 'nsr', AFIB: 'afib', AFLT: 'aflt', SBRAD: 'sbrad', STACH: 'stach', SARRH: 'sarrh', SVARR: 'svarr', SVTAC: 'svtac', PSVT: 'psvt',
  BIGU: 'bigu', TRIGU: 'trigu', PACE: 'pace',
};

/**
 * A PTB-XL record's class from its SCP statements: exactly one rhythm statement, else none. Sinus rhythm counts as
 * NSR only on a normal ECG (NORM at 100 %, the selection the validation package already uses for PTB-XL), and as
 * `avBlock` with a second- or third-degree AV block (the guide's "Heart block" class [G A-34]); otherwise it is left out.
 */
export function ptbxlClass(scp: Readonly<Record<string, number>>): RigClass | null {
  const rh = Object.keys(scp).filter((k) => k in PTBXL_RHYTHMS);
  if (rh.length !== 1) return null;
  const r = rh[0] as string;
  if (r !== 'SR') return PTBXL_RHYTHMS[r] as RigClass;
  if ('2AVB' in scp || '3AVB' in scp) return 'avBlock';
  return scp.NORM === 100 ? 'nsr' : null;
}

/** The whole 3-s segments of a PTB-XL record (10 s → from 0, 3 and 6 s). */
export function ptbxlSegments(record: string, cls: RigClass, fs: number, nSamples: number): RigSegment[] {
  const len = Math.round(SEGMENT_S * fs);
  const out: RigSegment[] = [];
  for (let s = 0; s + len <= nSamples; s += len) out.push({ record, startS: s / fs, cls });
  return out;
}

export interface RigRow {
  set: RigRecording['set'];
  record: string;
  startS: number;
  cls: RigClass;
  n: number;
  features: SegmentFeatures;
}

export interface RigResult {
  rows: RigRow[];
  classes: Partial<Record<RigClass, { segments: number; records: string[] }>>;
}

/** Measure every segment of every recording; a held-out CUDB record is refused. */
export function runRig(recs: readonly RigRecording[], measure: (x: Float64Array, fs: number) => SegmentFeatures = measureSegment): RigResult {
  const rows: RigRow[] = [];
  const classes: RigResult['classes'] = {};
  for (const r of recs) {
    if (r.set === 'cudb' && CUDB_HELD_OUT.has(r.id)) throw new Error(`${r.id} is held out: the engine's VF templates were taken from it`);
    const len = Math.round(SEGMENT_S * r.fs);
    for (const s of r.segments) {
      const a = Math.round(s.startS * r.fs);
      const x = r.mv.subarray(a, a + len);
      if (x.length !== len) continue;
      rows.push({ set: r.set, record: r.id, startS: s.startS, cls: s.cls, n: len, features: measure(x, r.fs) });
      const c = (classes[s.cls] ??= { segments: 0, records: [] });
      c.segments++;
      if (!c.records.includes(r.id)) c.records.push(r.id);
    }
  }
  return { rows, classes };
}
