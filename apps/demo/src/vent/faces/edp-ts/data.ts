// The EDP-TS face's data (face.json): every word, colour, layout number, range and step, each leaf with its provenance
// (plan docs/plans/vent-skin-edp-ts.md §5; checked by provenance.test.ts). This file only types it and reads leaves.
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
/** The simulator's reason under an unavailable control (English only, plan §6). */
export const reason = (id: ReasonId): string => (FACE.reasons[id] as Leaf<string>).v;
export const colour = (id: ColourId): string => (FACE.colours[id] as Leaf<string>).v;
export const num = (l: unknown): number => (l as Leaf<number>).v;
export const dec = (id: keyof typeof FACE.layout.dec): number => num(FACE.layout.dec[id]);
export const S = FACE.settings;
export const L = FACE.limits;
export const LAYOUT = FACE.layout;
