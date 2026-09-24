// Minimal WFDB readers, written clean-room from PhysioNet's format documentation (header(5), signal(5),
// annot(5): https://physionet.org/physiotools/wag/). No WFDB library code consulted.

export interface WfdbSignal { file: string; format: number; gain: number; baseline: number; description: string }
export interface WfdbHeader { record: string; nSignals: number; fs: number; nSamples: number; signals: WfdbSignal[] }

/** Parse a .hea text (record line + one line per signal). Comment lines (#) are skipped. */
export function parseHeader(text: string): WfdbHeader {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '' && !l.startsWith('#'));
  const rec = (lines[0] ?? '').trim().split(/\s+/);
  const nSignals = Number(rec[1]);
  const fs = parseFloat((rec[2] ?? '250').split('/')[0] as string);
  const nSamples = Number(rec[3] ?? 0);
  const signals: WfdbSignal[] = [];
  for (let i = 1; i <= nSignals; i++) {
    const f = (lines[i] ?? '').trim().split(/\s+/);
    const fmt = parseInt(f[1] ?? '0', 10);
    // gain field: "400" or "1000.0(0)/mV" → gain, optional (baseline), optional /units
    const g = /^([\d.]+)(?:\(([-\d]+)\))?/.exec(f[2] ?? '200');
    const gain = g && Number(g[1]) > 0 ? Number(g[1]) : 200;
    const adcZero = Number(f[4] ?? 0);
    const baseline = g && g[2] !== undefined ? Number(g[2]) : adcZero;
    signals.push({ file: f[0] as string, format: fmt, gain, baseline, description: f.slice(8).join(' ') });
  }
  return { record: rec[0] as string, nSignals, fs, nSamples, signals };
}

/** Decode format 212 (two 12-bit two's-complement samples per 3 bytes), interleaved over nSignals. */
export function decode212(buf: Uint8Array, nSignals: number): Int16Array[] {
  const total = Math.floor((buf.length * 2) / 3);
  const flat = new Int16Array(total);
  let k = 0;
  for (let i = 0; i + 2 < buf.length; i += 3) {
    const b0 = buf[i] as number, b1 = buf[i + 1] as number, b2 = buf[i + 2] as number;
    let s0 = b0 | ((b1 & 0x0f) << 8);
    let s1 = b2 | ((b1 & 0xf0) << 4);
    if (s0 > 2047) s0 -= 4096;
    if (s1 > 2047) s1 -= 4096;
    flat[k++] = s0;
    flat[k++] = s1;
  }
  return deinterleave(flat.subarray(0, k), nSignals);
}

/** Decode format 16 (16-bit little-endian two's complement), interleaved over nSignals. */
export function decode16(buf: Uint8Array, nSignals: number): Int16Array[] {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const flat = new Int16Array(Math.floor(buf.length / 2));
  for (let i = 0; i < flat.length; i++) flat[i] = dv.getInt16(2 * i, true);
  return deinterleave(flat, nSignals);
}

function deinterleave(flat: Int16Array, n: number): Int16Array[] {
  const len = Math.floor(flat.length / n);
  const out = Array.from({ length: n }, () => new Int16Array(len));
  for (let i = 0; i < len; i++) for (let s = 0; s < n; s++) (out[s] as Int16Array)[i] = flat[i * n + s] as number;
  return out;
}

export interface Annotation { sample: number; code: number; aux: string }

/** Parse an MIT-format annotation file (annot(5)). */
export function parseAnnotations(buf: Uint8Array): Annotation[] {
  const out: Annotation[] = [];
  let t = 0;
  let i = 0;
  while (i + 1 < buf.length) {
    const w = (buf[i] as number) | ((buf[i + 1] as number) << 8);
    i += 2;
    const a = w >> 10;
    const n = w & 0x3ff;
    if (a === 0 && n === 0) break;
    if (a === 59) { // SKIP: PDP-11 long (high word first, each word little-endian)
      const hi = (buf[i] as number) | ((buf[i + 1] as number) << 8);
      const lo = (buf[i + 2] as number) | ((buf[i + 3] as number) << 8);
      t += ((hi << 16) | lo) | 0;
      i += 4;
      continue;
    }
    if (a === 60 || a === 61 || a === 62) continue; // NUM / SUB / CHN
    if (a === 63) { // AUX for the previous annotation
      const s = new TextDecoder('latin1').decode(buf.subarray(i, i + n)).replace(/\0+$/, '');
      const last = out[out.length - 1];
      if (last) last.aux = s;
      i += n + (n & 1);
      continue;
    }
    t += n;
    out.push({ sample: t, code: a, aux: '' });
  }
  return out;
}

/** Annotation codes used here (ecgcodes.h values as documented in annot(5)/ecgcodes). */
export const ANN = { RHYTHM: 28, VFON: 32, VFOFF: 33, NOISE: 14 } as const;
