// The EDP-TS face's data (face.json): every word, colour, layout number, range and step, each leaf with its provenance
// (plan docs/plans/vent-skin-edp-ts.md §5; checked by provenance.test.ts). This file only types it and reads leaves.
import type { VentMode } from '@pme/ventilator';
import FACE from './face.json';

/** One sourced value: `p` documented, measured, inferred, eng (a gap the face must fill) or sim (the simulator's words). */
export interface Leaf<T = unknown> {
  v: T;
  p: 'documented' | 'measured' | 'inferred' | 'eng' | 'sim';
  src: string;
  why?: string;
}

export const DATA = FACE;
export type WordId = keyof typeof FACE.words;
export type ReasonId = keyof typeof FACE.reasons;
export type ColourId = keyof typeof FACE.colours;
export type AlarmId = keyof typeof FACE.alarms;

/** A device word as the device prints it. */
export const word = (id: WordId): string => (FACE.words[id] as Leaf<string>).v;
/** The device's name of each model mode the face runs (research/57 O-09). */
export const MODE_WORD: Partial<Record<VentMode, WordId>> = { VC: 'VCV', PC: 'PCV', PRVC: 'PRVC', PSV: 'PSV/CPAP' };
const listed = (xs: string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}` : (xs[0] ?? ''));
/** A face.json value by its path ("mechanics.lockHoldS"); a list of modes by the device's names. */
const valueAt = (path: string): string => {
  const leaf = path.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], FACE) as Leaf | undefined;
  if (leaf?.v === undefined) throw new Error(`face.json has no value ${path}`);
  if (!Array.isArray(leaf.v)) return String(leaf.v);
  return listed(leaf.v.map((m: VentMode) => {
    const w = MODE_WORD[m];
    if (!w) throw new Error(`${path}: no device name for the mode ${m}`);
    return word(w);
  }));
};
/** A text with its {path} values filled from face.json: a text names the face's numbers so, never repeats them. */
export const filled = (text: string): string => text.replace(/\{([\w.]+)\}/g, (_, p: string) => valueAt(p));
/** The simulator's reason under an unavailable control (English only, plan §6). */
export const reason = (id: ReasonId): string => filled((FACE.reasons[id] as Leaf<string>).v);
export const colour = (id: ColourId): string => (FACE.colours[id] as Leaf<string>).v;
export const num = (l: unknown): number => (l as Leaf<number>).v;
export const dec = (id: keyof typeof FACE.layout.dec): number => num(FACE.layout.dec[id]);
export const S = FACE.settings;
export const L = FACE.limits;
export const LAYOUT = FACE.layout;
