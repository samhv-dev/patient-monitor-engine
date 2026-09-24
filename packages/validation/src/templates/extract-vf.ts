// VF texture templates from the Creighton University Ventricular Tachyarrhythmia Database (CUDB, ODC-By 1.0).
// For every '[' … ']' episode (annotation codes VFON/VFOFF), non-overlapping 8 s windows starting 2 s after onset
// are kept when they carry no noise annotation, never touch the ±2000-unit ADC limit, have a dominant frequency of
// 3.5–7 Hz, an organisation index (power within ±1 Hz of the peak) of 0.45–0.72 and < 12% of power below 2.5 Hz.
// The most organised window per record is kept, then the 6 most organised records. Each window is high-passed at
// 0.7 Hz (zero phase), resampled 250 → 500 Hz, scaled to unit RMS and quantised to Int16 (× 4096).
// Usage: node --experimental-strip-types packages/validation/src/templates/extract-vf.ts [cacheDir] [outFile]
import { fetchCached, fetchVerified, parseSums } from './fetch.ts';
import { ANN, decode212, parseAnnotations, parseHeader } from './wfdb.ts';
import { dominantHz, highpassZeroPhase, lowFraction, organisation, resample, rms, toInt16Base64 } from './dsp.ts';
import { writeTemplateModule, type TemplateItem } from './template-module.ts';

export const VF_ATTRIBUTION = [
  'Source: Creighton University Ventricular Tachyarrhythmia Database v1.0.0 (CUDB), https://physionet.org/content/cudb/1.0.0/ (DOI 10.13026/C2X59M).',
  'Licence: Open Data Commons Attribution License v1.0 (https://opendatacommons.org/licenses/by/1-0/).',
  'Cite: Nolle FM, Badura FK, Catlett JM, Bowser RW, Sketch MH. CREI-GARD, a new concept in computerized arrhythmia monitoring systems. Computers in Cardiology 13:515-518 (1986).',
  'Changes: 8 s VF windows high-passed (0.7 Hz), resampled 250 -> 500 Hz, normalised to unit RMS, quantised to Int16.',
];

const PROJECT = 'cudb/1.0.0';
const WIN_S = 8;
const SCALE = 4096;

export async function extractVf(cache: string): Promise<TemplateItem[]> {
  const td = new TextDecoder();
  const sums = parseSums(td.decode(await fetchCached(cache, PROJECT, 'SHA256SUMS.txt')));
  const cands: Array<{ rec: string; startS: number; fdom: number; org: number; x: Float64Array }> = [];
  for (let r = 1; r <= 35; r++) {
    const rec = `cu${String(r).padStart(2, '0')}`;
    const h = parseHeader(td.decode(await fetchVerified(cache, PROJECT, `${rec}.hea`, sums)));
    const ann = parseAnnotations(await fetchVerified(cache, PROJECT, `${rec}.atr`, sums));
    const sig = decode212(await fetchVerified(cache, PROJECT, `${rec}.dat`, sums), h.nSignals)[0] as Int16Array;
    const s0 = h.signals[0]!;
    const noise = ann.filter((a) => a.code === ANN.NOISE).map((a) => a.sample);
    const eps: Array<[number, number]> = [];
    let on = -1;
    for (const a of ann) {
      if (a.code === ANN.VFON) on = a.sample;
      if (a.code === ANN.VFOFF && on >= 0) {
        eps.push([on, a.sample]);
        on = -1;
      }
    }
    if (on >= 0) eps.push([on, sig.length]);
    for (const [a, b] of eps) {
      for (let s = a + 2 * h.fs; s + WIN_S * h.fs <= b; s += WIN_S * h.fs) {
        const e = s + WIN_S * h.fs;
        if (noise.some((t) => t >= s - h.fs && t <= e)) continue;
        const raw = sig.subarray(s, e);
        if (raw.some((v) => Math.abs(v) >= 2000)) continue;
        const mv = Float64Array.from(raw, (v) => (v - s0.baseline) / s0.gain);
        const x = resample(highpassZeroPhase(mv, h.fs, 0.7), h.fs, 500);
        const fd = dominantHz(x, 500);
        const org = organisation(x, 500);
        if (fd < 3.5 || fd > 7 || org < 0.45 || org > 0.72 || lowFraction(x, 500) > 0.12 || rms(x) < 0.05) continue;
        cands.push({ rec, startS: s / h.fs, fdom: fd, org, x });
      }
    }
  }
  const best = new Map<string, (typeof cands)[number]>();
  for (const c of cands) {
    const b = best.get(c.rec);
    if (!b || c.org > b.org) best.set(c.rec, c);
  }
  return [...best.values()]
    .sort((p, q) => q.org - p.org)
    .slice(0, 6)
    .map((c) => {
      const k = 1 / rms(c.x);
      return { id: `${c.rec}@${c.startS.toFixed(1)}s`, fdomHz: c.fdom, b64: toInt16Base64(c.x.map((v) => v * k), SCALE) };
    });
}

const invokedDirectly = process.argv[1] !== undefined && import.meta.filename === (await import('node:path')).resolve(process.argv[1]);
if (invokedDirectly) {
  const cache = process.argv[2] ?? 'packages/validation/datasets/cache';
  const out = process.argv[3] ?? 'packages/engine-core/templates/vf-cudb.ts';
  const items = await extractVf(cache);
  for (const i of items) console.log(`vf ${i.id} fdom ${i.fdomHz.toFixed(2)} Hz`);
  writeTemplateModule(out, { noticeId: 'N-050', attribution: VF_ATTRIBUTION, generator: 'packages/validation/src/templates/extract-vf.ts', constName: 'VF_TEMPLATES', scaleName: 'VF_SCALE', scale: SCALE, items });
}
