// The neuro model's NMT (train-of-four) and BFA (BIS-like depth index) tiles. Pure formatters (Node has no DOM) from
// the engine's `measurement` values: tofCount/tofRatio (every train), ptc (23 s after a PTC) and di/sr (1 Hz while the
// depth monitor is on) or an EEG device's own ids (sef/eegSr, 1 Hz while it is on; EEG plan E6), as the neuro demo
// draws them. Like a plug-in module, a tile is shown only while its device
// publishes (MODULE_TILES); the other tiles are always drawn.
import type { Measured, NumericId } from '@pme/engine-core';
import type { TileParam } from '@pme/skins';

type Values = Partial<Record<NumericId, Measured>>;
const ok = (x: Measured | undefined): x is Measured & { value: number } => !!x && x.value !== null && x.flag !== 'invalid';

/**
 * A module tile's readings and how long they stay current: the stimulator runs a train every 12–60 s (the neuro model's
 * tof-device), so NMT keeps its last train for 2 × 60 s; the depth monitor publishes at 1 Hz, so BFA goes after 5
 * missed seconds [ENG: display].
 */
export const MODULE_TILES: Partial<Record<TileParam, { numerics: NumericId[]; staleS: number }>> = {
  NMT: { numerics: ['tofCount', 'ptc'], staleS: 120 },
  BFA: { numerics: ['di', 'sr', 'sef', 'eegSr'], staleS: 5 }, // the present index or an EEG device (E6), both 1 Hz
  AGENTS: { numerics: ['etAa', 'mac'], staleS: 5 }, // The neuro model publishes both at 1 Hz while an agent is present
};

/** Whether the tile is drawn at sim time t: always for a non-module tile; for NMT/BFA while the device publishes. */
export function modulePresent(param: TileParam, v: Values, t: number): boolean {
  const mod = MODULE_TILES[param];
  if (!mod) return true;
  return mod.numerics.some((k) => {
    const x = v[k];
    return x !== undefined && t - x.at <= mod.staleS;
  });
}

/** TOF ratio in % when all four twitches are present, else the count "n/4"; the PTC only at count 0. */
export function formatNmt(v: Values, noValue: string): { main: string; sub: string } {
  const { tofCount: c, tofRatio: r, ptc: p } = v;
  if (ok(c) && c.value === 4 && ok(r)) return { main: `${Math.round(r.value)}%`, sub: 'TOF 4/4' };
  if (!ok(c)) return { main: noValue, sub: '' };
  return { main: `${c.value}/4`, sub: c.value === 0 && ok(p) ? `PTC ${p.value}` : '' };
}

/**
 * The anaesthetic-agent tile (research/11 §4) — end-tidal agent % (the neuro model's `etAa`, the dominant agent) and
 * the end-tidal MAC multiple (`mac`, Σ Fet/MAC-age). The engine does not publish WHICH agent, so the label is the
 * glossary's generic "EtAA" (glossary #30; Philips etSEV/etISO/etDES once the agent id is published).
 */
export function formatAgents(v: Values, noValue: string): { main: string; sub: string } {
  return { main: ok(v.etAa) ? v.etAa.value.toFixed(1) : noValue, sub: `MAC ${ok(v.mac) ? v.mac.value.toFixed(1) : noValue}` };
}

/**
 * What the BFA tile reads (EEG plan E6, Q3): the chosen EEG device's index and suppression ratio while it publishes —
 * the generic processed-EEG reader's SEF (Hz, labelled SEF) and its SR — and the present depth index's di/sr
 * otherwise. The EEG device wins unless the depth monitor's reading is a whole stale window (5 s) newer, i.e. the EEG
 * device has stopped. This mapping lives here, never in a skin's JSON; parts the reader does not compute (Saadat's
 * SQI%, EMG%) stay blank.
 */
export function bfaReading(v: Values): { index: Measured | undefined; sr: Measured | undefined; digits: number; label?: string } {
  const eeg = v.eegSr ?? v.sef;
  const depth = v.sr ?? v.di;
  if (eeg && (!depth || eeg.at >= depth.at - (MODULE_TILES.BFA?.staleS ?? 5))) return { index: v.sef, sr: v.eegSr, digits: 1, label: 'SEF' };
  return { index: v.di, sr: v.sr, digits: 0 };
}

/** The depth index (dashes while the EMG artefact makes it questionable, or the device reads an invalid epoch) and the
 * suppression ratio under `srLabel`; `label` when an EEG device's index replaces the tile's own label. */
export function formatBfa(v: Values, srLabel: string, noValue: string): { main: string; sub: string; label?: string } {
  const r = bfaReading(v);
  const main = ok(r.index) ? r.index.value.toFixed(r.digits) : noValue;
  const sub = `${srLabel} ${ok(r.sr) ? Math.round(r.sr.value) : noValue}`;
  return r.label ? { main, sub, label: r.label } : { main, sub };
}
