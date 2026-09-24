// sfc32 ("Small Fast Counting", Chris Doty-Humphrey, PractRand) — a public-domain 128-bit-state PRNG.
// Written from the algorithm description; no code copied. Brief §3.3: one stream per subsystem,
// each seeded from hash(seed, name), so drawing from one stream never shifts another.
// hash53 is bryc's cyrb53 (public domain, MIT fallback), vendored with NOTICES row N-006.
import { hash53 } from '../vendor/cyrb53.ts';

export { hash53 };

/** The subsystem streams named in brief §3.3. */
export type StreamName =
  | 'hrv'
  | 'ectopy'
  | 'conduction'
  | 'artefact'
  | 'noise'
  | 'measurement'
  | 'scenario'
  | 'outcome';

export const STREAM_NAMES: readonly StreamName[] = [
  'hrv',
  'ectopy',
  'conduction',
  'artefact',
  'noise',
  'measurement',
  'scenario',
  'outcome',
];

/** Four uint32 words. Plain data so engine snapshots stay JSON-serialisable. */
export type Sfc32State = [number, number, number, number];

/** Advance the state in place and return the next uint32. */
export function sfc32Next(s: Sfc32State): number {
  const a = s[0];
  const b = s[1];
  const c = s[2];
  const d = s[3];
  const t = (((a + b) | 0) + d) | 0;
  s[3] = (d + 1) | 0;
  s[0] = b ^ (b >>> 9);
  s[1] = (c + (c << 3)) | 0;
  s[2] = (((c << 21) | (c >>> 11)) + t) | 0;
  return t >>> 0;
}

/** Seed one named stream from hash(seed, name), then discard 15 outputs to mix the state. */
export function seedStream(seed: number, name: string): Sfc32State {
  const [h1, h2] = hash53(`${seed >>> 0}:${name}`);
  const [h3, h4] = hash53(`${name}:${seed >>> 0}`, 0x9e3779b9);
  const s: Sfc32State = [h1, h2, h3, h4];
  for (let i = 0; i < 15; i++) sfc32Next(s);
  return s;
}

/** Uniform in [0, 1) with 32 bits of resolution. */
export function uniform(s: Sfc32State): number {
  return sfc32Next(s) / 4294967296;
}

/** Standard normal via Box–Muller (one value per call; the pair's second value is discarded). */
export function normal(s: Sfc32State): number {
  const u1 = (sfc32Next(s) + 1) / 4294967297; // (0, 1], never 0, so log() is finite
  const u2 = uniform(s);
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/** Convenience wrapper over one stream's state. */
export class RandomStream {
  readonly state: Sfc32State;
  constructor(state: Sfc32State) {
    this.state = state;
  }
  nextU32(): number {
    return sfc32Next(this.state);
  }
  next(): number {
    return uniform(this.state);
  }
  normal(): number {
    return normal(this.state);
  }
}

export interface Rng {
  readonly seed: number;
  stream(name: StreamName): RandomStream;
  /** Plain-data copy of every stream's state (for snapshots). */
  getState(): Record<StreamName, Sfc32State>;
}

export function createRng(seed: number): Rng {
  const s = seed >>> 0;
  const streams = new Map<StreamName, RandomStream>();
  for (const name of STREAM_NAMES) streams.set(name, new RandomStream(seedStream(s, name)));
  return {
    seed: s,
    stream(name) {
      const st = streams.get(name);
      if (!st) throw new Error(`unknown RNG stream: ${String(name)}`);
      return st;
    },
    getState() {
      const out = {} as Record<StreamName, Sfc32State>;
      for (const [name, st] of streams) out[name] = [...st.state] as Sfc32State;
      return out;
    },
  };
}

/** Fresh plain-data states for every stream (what the engine keeps in its snapshot-able state). */
export function createRngState(seed: number): Record<StreamName, Sfc32State> {
  const out = {} as Record<StreamName, Sfc32State>;
  for (const name of STREAM_NAMES) out[name] = seedStream(seed >>> 0, name);
  return out;
}
