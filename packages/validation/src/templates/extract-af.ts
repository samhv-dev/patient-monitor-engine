// AF f-wave textures from the MIT-BIH Arrhythmia Database (ODC-By 1.0). In '(AFIB' rhythm intervals of records
// 201, 202, 203, 210, 219, 221, 222 (MLII, 360 Hz): band-pass 0.5–40 Hz, subtract an amplitude-matched mean
// beat (R − 250 ms … R + 450 ms, 50 ms tapers) at every normal beat (QRST cancellation), band-pass the residual
// 3–15 Hz, then keep 8 s windows with only normal beats, no noise annotation, dominant 4–9 Hz, RMS 0.015–0.2 mV
// and peak < 5 × RMS (no QRS residue). The cleanest window (lowest peak/RMS) per record, first 4 records;
// resampled 360 → 500 Hz, unit RMS, Int16 (× 4096).
// Usage: node --experimental-strip-types packages/validation/src/templates/extract-af.ts [cacheDir] [outFile]
import { fetchCached, fetchVerified, parseSums } from './fetch.ts';
import { ANN, decode212, parseAnnotations, parseHeader } from './wfdb.ts';
import { bandpassZeroPhase, dominantHz, resample, rms, toInt16Base64 } from './dsp.ts';
import { writeTemplateModule, type TemplateItem } from './template-module.ts';

export const AF_ATTRIBUTION = [
  'Source: MIT-BIH Arrhythmia Database v1.0.0, https://physionet.org/content/mitdb/1.0.0/ (DOI 10.13026/C2F305).',
  'Licence: Open Data Commons Attribution License v1.0 (https://opendatacommons.org/licenses/by/1-0/).',
  'Cite: Moody GB, Mark RG. The impact of the MIT-BIH Arrhythmia Database. IEEE Eng in Med and Biol 20(3):45-50 (May-June 2001). (PMID: 11446209)',
  'Changes: 8 s AF windows, QRST cancelled by mean-beat subtraction, band-passed 3-15 Hz, resampled 360 -> 500 Hz, unit RMS, Int16.',
];

const PROJECT = 'mitdb/1.0.0';
const RECORDS = ['201', '202', '203', '210', '219', '221', '222'];
const WIN_S = 8;
const PRE_S = 0.25;
const POST_S = 0.45;
const SCALE = 4096;

export async function extractAf(cache: string): Promise<TemplateItem[]> {
  const td = new TextDecoder();
  const sums = parseSums(td.decode(await fetchCached(cache, PROJECT, 'SHA256SUMS.txt')));
  const cands: Array<{ rec: string; startS: number; fdom: number; x: Float64Array; resid: number }> = [];
  for (const rec of RECORDS) {
    const h = parseHeader(td.decode(await fetchVerified(cache, PROJECT, `${rec}.hea`, sums)));
    const ann = parseAnnotations(await fetchVerified(cache, PROJECT, `${rec}.atr`, sums));
    const sig = decode212(await fetchVerified(cache, PROJECT, `${rec}.dat`, sums), h.nSignals)[0] as Int16Array;
    const s0 = h.signals[0]!;
    const fs = h.fs;
    const x = bandpassZeroPhase(Float64Array.from(sig, (v) => (v - s0.baseline) / s0.gain), fs, 0.5, 40);
    const af: Array<[number, number]> = [];
    let cur = '';
    let start = 0;
    for (const a of ann) {
      if (a.code !== ANN.RHYTHM) continue;
      if (cur === '(AFIB') af.push([start, a.sample]);
      cur = a.aux;
      start = a.sample;
    }
    if (cur === '(AFIB') af.push([start, x.length]);
    const beats = ann.filter((a) => a.code >= 1 && a.code <= 13);
    const pre = Math.round(PRE_S * fs);
    const post = Math.round(POST_S * fs);
    for (const [a, b] of af) {
      const inAf = beats.filter((q) => q.sample - pre >= a && q.sample + post < b);
      const normal = inAf.filter((q) => q.code === 1);
      if (normal.length < 20) continue;
      const tpl = new Float64Array(pre + post);
      for (const q of normal) for (let i = 0; i < tpl.length; i++) tpl[i] = (tpl[i] as number) + (x[q.sample - pre + i] as number) / normal.length;
      const res = Float64Array.from(x);
      const taper = 0.05 * fs;
      for (const q of normal) {
        let num = 0;
        let den = 0;
        for (let i = 0; i < tpl.length; i++) {
          num += (x[q.sample - pre + i] as number) * (tpl[i] as number);
          den += (tpl[i] as number) ** 2;
        }
        const g = num / den;
        for (let i = 0; i < tpl.length; i++) {
          const e = Math.min(1, i / taper, (tpl.length - 1 - i) / taper);
          res[q.sample - pre + i] = (res[q.sample - pre + i] as number) - g * (tpl[i] as number) * e;
        }
      }
      const f = bandpassZeroPhase(res, fs, 3, 15);
      for (let s = a + fs; s + WIN_S * fs <= b; s += WIN_S * fs) {
        const e = s + WIN_S * fs;
        if (inAf.filter((q) => q.sample >= s - post && q.sample <= e + pre).some((q) => q.code !== 1)) continue;
        if (ann.some((q) => q.code === ANN.NOISE && q.sample >= s && q.sample <= e)) continue;
        const w = Float64Array.from(f.subarray(s, e));
        const fd = dominantHz(resample(w, fs, 500), 500, 3, 12);
        const r = rms(w);
        let pk = 0;
        for (const v of w) pk = Math.max(pk, Math.abs(v));
        if (fd < 4 || fd > 9 || r < 0.015 || r > 0.2 || pk > 5 * r) continue;
        cands.push({ rec, startS: s / fs, fdom: fd, x: w, resid: pk / r });
      }
    }
  }
  const best = new Map<string, (typeof cands)[number]>();
  for (const c of cands) {
    const b = best.get(c.rec);
    if (!b || c.resid < b.resid) best.set(c.rec, c);
  }
  return [...best.values()].slice(0, 4).map((c) => {
    const up = resample(c.x, 360, 500);
    const k = 1 / rms(up);
    return { id: `${c.rec}@${c.startS.toFixed(1)}s`, fdomHz: c.fdom, b64: toInt16Base64(up.map((v) => v * k), SCALE) };
  });
}

const invokedDirectly = process.argv[1] !== undefined && import.meta.filename === (await import('node:path')).resolve(process.argv[1]);
if (invokedDirectly) {
  const cache = process.argv[2] ?? 'packages/validation/datasets/cache';
  const out = process.argv[3] ?? 'packages/engine-core/templates/af-mitdb.ts';
  const items = await extractAf(cache);
  for (const i of items) console.log(`af ${i.id} fdom ${i.fdomHz.toFixed(2)} Hz`);
  writeTemplateModule(out, { noticeId: 'N-051', attribution: AF_ATTRIBUTION, generator: 'packages/validation/src/templates/extract-af.ts', constName: 'AF_TEMPLATES', scaleName: 'AF_SCALE', scale: SCALE, items });
}
