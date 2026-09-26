// Reader for VitalRecorder `.vital` files (the PhysioNet VitalDB 1.0.0 copy, CC BY 4.0), written clean-room from the
// published file-format description (VitalRecorder "Vital File Format" document; the reader code of
// vitalutils/vitaldb was not opened). Layout: gzip → "VITA", u32 format version, u16 header length, header; then
// packets { u8 type, u32 length, payload }. Types used: 9 DEVINFO, 0 TRKINFO, 1 REC. All little-endian.
// TRKINFO: u16 tid, u8 rec_type (1 wave, 2 number, 5 string), u8 rec_fmt (1 f32, 2 f64, 3 i8, 4 u8, 5 i16, 6 u16,
// 7 i32, 8 u32), str name, str unit, f32 min, f32 max, u32 colour, f32 srate, f64 gain, f64 offset, u8 montype,
// u32 device id (str = u32 length + UTF-8). REC: u16 info length, f64 unix time, u16 tid, then (wave) u32 n + n
// samples, (number) one sample. Integer formats are scaled: value = raw·gain + offset.
import { gunzipSync } from 'node:zlib';

export interface VitalTrack {
  tid: number;
  name: string; // "<device>/<track>", e.g. "SNUADC/ECG_II"
  unit: string;
  kind: 'wave' | 'number' | 'string';
  fmt: number;
  srate: number;
  gain: number;
  offset: number;
  /** wave: one entry per REC packet (start time s, values); number: one entry per value */
  recs: Array<{ t: number; v: Float32Array }>;
}
export interface VitalFile {
  tracks: Map<string, VitalTrack>;
  /** Unix time (s) of the earliest record. */
  t0: number;
}

const FMT_BYTES: Record<number, number> = { 1: 4, 2: 8, 3: 1, 4: 1, 5: 2, 6: 2, 7: 4, 8: 4 };

export function parseVital(gz: Uint8Array, want?: ReadonlySet<string>): VitalFile {
  const b = gunzipSync(gz);
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  if (b.toString('latin1', 0, 4) !== 'VITA') throw new Error('not a vital file');
  let p = 10 + dv.getUint16(8, true);
  const devs = new Map<number, string>();
  const byTid = new Map<number, VitalTrack>();
  const str = (o: number): [string, number] => {
    const n = dv.getUint32(o, true);
    return [b.toString('utf8', o + 4, o + 4 + n), o + 4 + n];
  };
  let t0 = Infinity;
  while (p + 5 <= b.length) {
    const type = dv.getUint8(p);
    const len = dv.getUint32(p + 1, true);
    const s = p + 5;
    const end = s + len;
    p = end;
    if (end > b.length) break;
    if (type === 9) {
      const did = dv.getUint32(s, true);
      const [, o1] = str(s + 4); // device type
      const [name] = str(o1);
      devs.set(did, name);
    } else if (type === 0) {
      const tid = dv.getUint16(s, true);
      const recType = dv.getUint8(s + 2);
      const fmt = dv.getUint8(s + 3);
      let [name, o] = str(s + 4);
      const [unit, o2] = str(o);
      o = o2 + 4 + 4 + 4; // mindisp f32, maxdisp f32, colour u32
      const srate = o + 4 <= end ? dv.getFloat32(o, true) : 0;
      const gain = o + 12 <= end ? dv.getFloat64(o + 4, true) : 1;
      const offset = o + 20 <= end ? dv.getFloat64(o + 12, true) : 0;
      const did = o + 25 <= end ? dv.getUint32(o + 21, true) : 0;
      const dev = devs.get(did);
      if (dev) name = `${dev}/${name}`;
      const kind = recType === 1 ? 'wave' : recType === 2 ? 'number' : 'string';
      byTid.set(tid, { tid, name, unit, kind, fmt, srate, gain, offset, recs: [] });
    } else if (type === 1) {
      const infoLen = dv.getUint16(s, true);
      const t = dv.getFloat64(s + 2, true);
      const tid = dv.getUint16(s + 10, true);
      const tr = byTid.get(tid);
      if (!tr || tr.kind === 'string') continue;
      if (t < t0) t0 = t;
      if (want && !want.has(tr.name)) continue;
      let o = s + 2 + infoLen;
      const n = tr.kind === 'wave' ? dv.getUint32(o, true) : 1;
      if (tr.kind === 'wave') o += 4;
      const v = new Float32Array(n);
      const w = FMT_BYTES[tr.fmt] ?? 4;
      for (let i = 0; i < n; i++, o += w) {
        let x: number;
        switch (tr.fmt) {
          case 1: x = dv.getFloat32(o, true); break;
          case 2: x = dv.getFloat64(o, true); break;
          case 3: x = dv.getInt8(o); break;
          case 4: x = dv.getUint8(o); break;
          case 5: x = dv.getInt16(o, true); break;
          case 6: x = dv.getUint16(o, true); break;
          case 7: x = dv.getInt32(o, true); break;
          default: x = dv.getUint32(o, true);
        }
        v[i] = tr.fmt <= 2 ? x : x * tr.gain + tr.offset;
      }
      tr.recs.push({ t, v });
    }
  }
  const tracks = new Map<string, VitalTrack>();
  for (const tr of byTid.values()) tracks.set(tr.name, tr);
  return { tracks, t0 };
}

/** A wave track as one evenly sampled array from `fromS` to `toS` (seconds after t0); gaps are NaN. */
export function waveSlice(f: VitalFile, name: string, fromS: number, toS: number): { fs: number; x: Float64Array } {
  const tr = f.tracks.get(name);
  if (!tr || tr.kind !== 'wave') throw new Error(`no wave track ${name}`);
  const fs = tr.srate;
  const x = new Float64Array(Math.round((toS - fromS) * fs)).fill(Number.NaN);
  for (const r of tr.recs) {
    const i0 = Math.round((r.t - f.t0 - fromS) * fs);
    for (let i = 0; i < r.v.length; i++) {
      const k = i0 + i;
      if (k >= 0 && k < x.length) x[k] = r.v[i] as number;
    }
  }
  return { fs, x };
}

/** A numeric track as (time s after t0, value) pairs inside [fromS, toS). */
export function numbers(f: VitalFile, name: string, fromS = 0, toS = Infinity): Array<[number, number]> {
  const tr = f.tracks.get(name);
  if (!tr || tr.kind !== 'number') return [];
  const out: Array<[number, number]> = [];
  for (const r of tr.recs) {
    const t = r.t - f.t0;
    if (t >= fromS && t < toS) out.push([t, r.v[0] as number]);
  }
  return out;
}
