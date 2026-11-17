// What the EDP-TS screen shows of the curves, apart from the ventilator (research/57 K-07 to K-13; plan GD12 to GD15):
// the chosen screen of the Graphics window, each quantity's scale and the position of its zero, autoscale, and the
// saved loops with the one drawn as the reference. Pure face state, never written to cfg (which travels over the link).
import type { SampleBuffers } from '../../core/cockpit.ts';
import { DATA, num, type Leaf, type WordId } from './data.ts';

/** A drawn quantity: airway pressure, volume, flow. */
export type Q = 'p' | 'v' | 'f';
export type Panel =
  | { kind: 'lane'; key: Q; box: [number, number, number, number] }
  | { kind: 'loop'; x: Q; y: Q; box: [number, number, number, number] }
  | { kind: 'data'; box: [number, number, number, number] };
export interface Layout { word: WordId; panels: Panel[] }

const GR = DATA.graphics;
export const LAYOUTS = Object.fromEntries(Object.entries(GR.layouts).map(([k, l]) => [k, (l as Leaf<Layout>).v])) as Record<string, Layout>;
export type LayoutId = keyof typeof GR.layouts;
const SCALES = { p: GR.scales.paw.v, v: GR.scales.vol.v, f: GR.scales.flow.v } as Record<Q, Array<[number, number]>>;
const LABELS = num(GR.scaleLabels);

/** One saved loop: the samples of one complete breath and the time it was saved (research/57 K-09). */
export interface SavedLoop { p: number[]; v: number[]; f: number[]; insp: boolean[]; at: Date }

export interface Scale { idx: number; shift: number }
export interface Screen {
  layout: LayoutId;
  scale: Record<Q, Scale>;
  autoscale: boolean;
  saved: SavedLoop[];
  /** The newest saved loop is drawn as the reference (Ctrl + Graphics takes it off the screen, K-09). */
  refShown: boolean;
}

export const createScreen = (): Screen => ({
  layout: 'curves5',
  scale: { p: { idx: GR.scaleInit.v.paw, shift: 0 }, v: { idx: GR.scaleInit.v.vol, shift: 0 }, f: { idx: GR.scaleInit.v.flow, shift: 0 } },
  autoscale: GR.autoscaleInit.v,
  saved: [],
  refShown: false,
});

/** The number of scales of a quantity. */
export const scaleCount = (q: Q): number => SCALES[q].length;
/** The distance between two labels of a scale. */
const step = (q: Q, s: Scale) => { const [lo, hi] = SCALES[q][s.idx]!; return (hi - lo) / (LABELS - 1); };
/** The quantity's axis [lo, hi] now: its scale moved by `shift` labels (the axis position, K-13). */
export const rangeOf = (q: Q, s: Scale): [number, number] => {
  const [lo, hi] = SCALES[q][s.idx]!;
  return [lo + s.shift * step(q, s), hi + s.shift * step(q, s)];
};
/** Its labels, top to bottom (seven, as photographed: P-11, P-12). */
export const labelsOf = (q: Q, s: Scale): number[] => {
  const [lo] = rangeOf(q, s);
  const d = step(q, s);
  return Array.from({ length: LABELS }, (_, i) => Math.round((lo + (LABELS - 1 - i) * d) * 1e6) / 1e6 || 0); // no −0
};

const valueOf = (B: SampleBuffers, q: Q, i: number) => (q === 'p' ? B.p[i]! : q === 'f' ? B.f[i]! : B.vb[i]! / 1000);
/** Autoscale (K-12): for each quantity the smallest scale, at its own position, that holds the sweep's samples. */
export function autoscaled(B: SampleBuffers, sweepS: number): Record<Q, Scale> {
  const n = B.t.length;
  const out = {} as Record<Q, Scale>;
  for (const q of ['p', 'v', 'f'] as const) {
    let lo = Infinity, hi = -Infinity;
    for (let i = 0; i < n; i++) {
      if (B.t[i]! <= B.t[n - 1]! - sweepS) continue;
      const x = valueOf(B, q, i);
      if (x < lo) lo = x;
      if (x > hi) hi = x;
    }
    const fit = SCALES[q].findIndex(([a, b]) => a <= lo && b >= hi);
    out[q] = { idx: fit >= 0 ? fit : SCALES[q].length - 1, shift: 0 };
  }
  return out;
}

/** The last complete breath of the buffers (from one inspiration's start to the next), or null. */
export function lastBreath(B: SampleBuffers): Omit<SavedLoop, 'at'> | null {
  const starts: number[] = [];
  for (let i = 1; i < B.t.length; i++) if (B.ph[i] !== 'exp' && B.ph[i - 1] === 'exp') starts.push(i);
  if (starts.length < 2) return null;
  const a = starts[starts.length - 2]!, b = starts[starts.length - 1]!;
  const sl = <T,>(x: readonly T[]) => x.slice(a, b);
  return { p: sl(B.p), v: sl(B.vb).map((x) => x / 1000), f: sl(B.f), insp: sl(B.ph).map((x) => x !== 'exp') };
}

/** The reference loop drawn now: the newest saved one, unless Ctrl + Graphics took it off the screen. */
export const refLoop = (s: Screen): SavedLoop | null => (s.refShown ? s.saved[s.saved.length - 1] ?? null : null);

/** Save the last breath's loops (K-09): at most the device's number kept, the oldest dropped; it is shown at once. */
export function saveLoop(s: Screen, B: SampleBuffers, at: Date): boolean {
  const b = lastBreath(B);
  if (!b) return false;
  s.saved.push({ ...b, at });
  while (s.saved.length > num(DATA.mechanics.savedLoops)) s.saved.shift();
  s.refShown = true;
  return true;
}
