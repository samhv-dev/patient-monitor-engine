// Recorded-texture playback (brief §11 C1): Int16 templates (base64, 500 Hz, unit RMS × scale) are decoded once,
// then played with a phase accumulator whose speed is f_target / f_template (time-warp), with an equal-power
// crossfade into a randomly chosen next segment. State is JSON-safe.
import { sfc32Next, type Sfc32State } from '../../rng/sfc32.ts';

export interface TemplateSet {
  scale: number;
  items: ReadonlyArray<{ id: string; fdomHz: number; b64: string }>;
}
export interface DecodedTexture {
  id: string;
  fdomHz: number;
  x: Float32Array;
}

const cache = new WeakMap<TemplateSet, DecodedTexture[]>();

export function decodeTemplates(set: TemplateSet): DecodedTexture[] {
  let d = cache.get(set);
  if (!d) {
    d = set.items.map((t) => {
      const bin = atob(t.b64);
      const x = new Float32Array(bin.length / 2);
      for (let i = 0; i < x.length; i++) {
        let v = bin.charCodeAt(2 * i) | (bin.charCodeAt(2 * i + 1) << 8);
        if (v >= 32768) v -= 65536;
        x[i] = v / set.scale;
      }
      return { id: t.id, fdomHz: t.fdomHz, x };
    });
    cache.set(set, d);
  }
  return d;
}

export const XFADE_SAMPLES = 250; // 0.5 s equal-power crossfade [ENG]

export interface TexState {
  seg: number;
  pos: number;
  next: number;
  npos: number;
  fade: number;
  rng: Sfc32State;
}

export function createTex(n: number, rng: Sfc32State): TexState {
  return { seg: sfc32Next(rng) % n, pos: sfc32Next(rng) % 1000, next: -1, npos: 0, fade: 0, rng };
}

function at(x: Float32Array, p: number): number {
  const i = Math.floor(p);
  const f = p - i;
  const a = x[Math.min(i, x.length - 1)] as number;
  const b = x[Math.min(i + 1, x.length - 1)] as number;
  return a + (b - a) * f;
}

/** One 500 Hz output sample of unit-RMS texture whose dominant frequency is fHz. */
export function texSample(tex: readonly DecodedTexture[], s: TexState, fHz: number): number {
  const cur = tex[s.seg] as DecodedTexture;
  const speed = fHz / cur.fdomHz;
  let v = at(cur.x, s.pos);
  s.pos += speed;
  if (s.next < 0 && s.pos > cur.x.length - XFADE_SAMPLES * speed - 2) {
    let n = sfc32Next(s.rng) % tex.length;
    if (n === s.seg && tex.length > 1) n = (n + 1) % tex.length;
    s.next = n;
    s.npos = sfc32Next(s.rng) % 500;
    s.fade = 0;
  }
  if (s.next >= 0) {
    const nx = tex[s.next] as DecodedTexture;
    const w = s.fade / XFADE_SAMPLES;
    v = v * Math.cos((w * Math.PI) / 2) + at(nx.x, s.npos) * Math.sin((w * Math.PI) / 2);
    s.npos += fHz / nx.fdomHz;
    s.fade++;
    if (s.fade >= XFADE_SAMPLES) {
      s.seg = s.next;
      s.pos = s.npos;
      s.next = -1;
    }
  }
  return v;
}

// --- AR(2) resonator fallback (brief §4.1: four resonators at f_dom·{0.8, 1, 1.25, 1.6}, 1–2 Hz bandwidth) ---
export const AR_MULT = [0.8, 1, 1.25, 1.6] as const;
export const AR_WEIGHT = [0.4, 1, 0.5, 0.25] as const; // [ENG]
export const AR_BANDWIDTH_HZ = 1.5;

export interface ArState {
  y1: number[];
  y2: number[];
}

/** One 500 Hz sample of the AR fallback with unit RMS. e: four independent N(0,1) draws. */
export function arSample(s: ArState, fHz: number, e: readonly number[]): number {
  const r = Math.exp((-Math.PI * AR_BANDWIDTH_HZ) / 500);
  const a2 = -r * r;
  let out = 0;
  let wsum = 0;
  for (let k = 0; k < 4; k++) {
    const a1 = 2 * r * Math.cos((2 * Math.PI * fHz * (AR_MULT[k] as number)) / 500);
    // stationary variance of y = a1·y1 + a2·y2 + e (unit-variance e): (1 − a2) / ((1 + a2)((1 − a2)² − a1²))
    const varY = (1 - a2) / ((1 + a2) * ((1 - a2) ** 2 - a1 * a1));
    const y = a1 * (s.y1[k] as number) + a2 * (s.y2[k] as number) + (e[k] as number);
    s.y2[k] = s.y1[k] as number;
    s.y1[k] = y;
    out += ((AR_WEIGHT[k] as number) * y) / Math.sqrt(varY);
    wsum += (AR_WEIGHT[k] as number) ** 2;
  }
  return out / Math.sqrt(wsum);
}
