// Test-only writer for the .vital layout the reader understands (so reader tests need no download).
import { gzipSync } from 'node:zlib';

const u8 = (v: number) => Buffer.from([v]);
const u16 = (v: number) => { const b = Buffer.alloc(2); b.writeUInt16LE(v); return b; };
const u32 = (v: number) => { const b = Buffer.alloc(4); b.writeUInt32LE(v); return b; };
const f32 = (v: number) => { const b = Buffer.alloc(4); b.writeFloatLE(v); return b; };
const f64 = (v: number) => { const b = Buffer.alloc(8); b.writeDoubleLE(v); return b; };
const str = (s: string) => Buffer.concat([u32(Buffer.byteLength(s)), Buffer.from(s, 'utf8')]);
const packet = (type: number, body: Buffer) => Buffer.concat([u8(type), u32(body.length), body]);

export interface WTrack { tid: number; name: string; unit: string; kind: 'wave' | 'number'; fmt: 1 | 5; srate: number; gain: number; offset: number; did: number }

export function writeVital(o: { devices: Array<{ did: number; name: string }>; tracks: WTrack[]; recs: Array<{ tid: number; t: number; values: number[] }> }): Uint8Array {
  const header = Buffer.concat([Buffer.from('VITA'), u32(3), u16(10), Buffer.alloc(10)]);
  const parts: Buffer[] = [header];
  for (const d of o.devices) parts.push(packet(9, Buffer.concat([u32(d.did), str('type'), str(d.name), str('port')])));
  for (const t of o.tracks) {
    parts.push(packet(0, Buffer.concat([u16(t.tid), u8(t.kind === 'wave' ? 1 : 2), u8(t.fmt), str(t.name), str(t.unit), f32(0), f32(100), u32(0), f32(t.srate), f64(t.gain), f64(t.offset), u8(0), u32(t.did)])));
  }
  for (const r of o.recs) {
    const tr = o.tracks.find((x) => x.tid === r.tid) as WTrack;
    const vals = tr.fmt === 1 ? Buffer.concat(r.values.map(f32)) : Buffer.concat(r.values.map((v) => { const b = Buffer.alloc(2); b.writeInt16LE(Math.round((v - tr.offset) / tr.gain)); return b; }));
    const body = tr.kind === 'wave' ? Buffer.concat([u16(10), f64(r.t), u16(r.tid), u32(r.values.length), vals]) : Buffer.concat([u16(10), f64(r.t), u16(r.tid), vals]);
    parts.push(packet(1, body));
  }
  return new Uint8Array(gzipSync(Buffer.concat(parts)));
}
