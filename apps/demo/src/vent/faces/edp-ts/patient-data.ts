// Patient's Data (research/57 N-02 to N-16; plan GD16, GD17, GD19): the two pages of rows as the manual's figure lists
// them, each value from the cockpit's breath record and the holds by the manual's formulas (core/mechanics.ts), "---"
// where the device shows a value not active in the mode (N-03) or the simulator does not model it (the reason).
import type { Cockpit } from '../../core/cockpit.ts';
import { breathRate, dynamicCompliance, minuteVolume } from '../../core/mechanics.ts';
import { faceMode } from './controls.ts';
import { DATA, dec, num, word, type Leaf, type ReasonId, type WordId } from './data.ts';
import type { Manoeuvres } from './manoeuvres.ts';

export interface DataRow { word: WordId; value: string; unit: WordId | null; unsim: ReasonId | null }
type Row = (c: Cockpit, m: Manoeuvres) => DataRow;

const n = num(DATA.mechanics.breathsAveraged);
const fx = (v: number, d: keyof typeof DATA.layout.dec) => (Number.isFinite(v) ? v.toFixed(dec(d)) : word('dashes'));
const row = (w: WordId, unit: WordId | null, f: (c: Cockpit, m: Manoeuvres) => string): Row => (c, m) => ({ word: w, value: f(c, m), unit, unsim: null });
const off = (w: WordId, r: ReasonId): Row => () => ({ word: w, value: word('dashes'), unit: null, unsim: r });
const SPONT_MODES = (DATA.mechanics.spontModes as Leaf<string[]>).v;
/**
 * The last `n` breaths of a kind, or none until there are that many (N-07 to N-09: "the last 3"); the spontaneous ones
 * only in a mode that gives them (a value not active in the mode shows ---, N-03).
 */
const full = (c: Cockpit, spont: boolean) => {
  const b = c.breaths(spont);
  return b.length >= n && (!spont || SPONT_MODES.includes(c.cfg.mode)) ? b : [];
};
const psvCpap = (c: Cockpit) => faceMode(c.cfg) === 'PSV/CPAP';

const COMMON: Row[] = [
  row('veMandat', 'uLmin', (c) => fx(minuteVolume(full(c, false)), 'pdVe')),
  row('veSpont', 'uLmin', (c) => fx(minuteVolume(full(c, true)), 'pdVe')),
  row('fSpont', 'uBpm', (c) => fx(breathRate(full(c, true)), 'pdF')),
  row('tcexp', 'uS', (c) => fx(c.record()?.tcexp ?? Number.NaN, 'pdTc')),
  // the rapid shallow breathing index, PSV/CPAP only (N-11)
  row('fvt', 'uBpmL', (c) => fx(psvCpap(c) ? c.measured().RR / (c.measured().VTE / 1000) : Number.NaN, 'pdFvt')),
  row('cdyn', 'uMlCm', (c) => { const r = c.record(); return fx(r ? dynamicCompliance(r) : Number.NaN, 'pdC'); }),
  off('wobi', 'wobi'),
  off('etco2', 'etco2'),
  off('vco2', 'etco2'),
];

/** The two pages (N-05, N-06). */
export const PAGES: Row[][] = [
  [...COMMON,
    row('cst', 'uMlCm', (_c, m) => fx(m.values().cst, 'pdC')),
    // the manual's Ri reads the resistance of a constant-flow breath only: for another, "---" and why (mechanics.riFlow)
    (_c, m) => { const v = m.values(); return { word: 'ri', value: fx(v.ri, 'pdR'), unit: 'uCmLs', unsim: v.riFlow ? 'riFlow' : null }; },
    row('re', 'uCmLs', (_c, m) => fx(m.values().re, 'pdR')),
    row('autoPeep', 'uCmH2O', (_c, m) => fx(m.values().autoPeep, 'pdAutoPeep'))],
  [...COMMON,
    off('leakL', 'leak'),
    off('leakPct', 'leak'),
    row('tiTtot', null, (c) => fx(c.record()?.tiTtot ?? Number.NaN, 'pdTiTtot')),
    off('ptracheal', 'tube')],
];

export const dataPage = (c: Cockpit, m: Manoeuvres, page: number): DataRow[] => PAGES[page]!.map((r) => r(c, m));
