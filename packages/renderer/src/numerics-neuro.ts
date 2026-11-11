// The neuro model's NMT (train-of-four) and BFA (BIS-like depth index) tiles. Pure formatters (Node has no DOM) from
// the engine's `measurement` values: tofCount/tofRatio (every train), ptc (23 s after a PTC) and di/sr (1 Hz while the
// depth monitor is on) or an EEG device's own ids (sef/eegSr at 1 Hz, bis/bisSr at 2 Hz, se/re every 0.64 s while it is on;
// EEG plan E6, E7, E8), as the neuro demo
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
  BFA: { numerics: ['di', 'sr', 'sef', 'eegSr', 'bis', 'bisSr', 'se', 're'], staleS: 5 }, // the present index or an EEG device (E6, E7, E8): 1 Hz, 2 Hz, 0.64 s
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
 * The EEG readers the BFA tile can show, one row each (EEG plan E6, E7, E8; the next readers add a row): the numeric ids of
 * the reader's index and suppression ratio, the digits and the label the tile wears for it. The BIS-type and Entropy
 * labels carry Q8's point in their wording: a type, not the maker's monitor. The Entropy reader computes no suppression
 * ratio (its source does not publish the detector's threshold): no `sr`, and its sub-line is its second number, RE
 * (`second`), so a skin's BS% part stays blank for it.
 */
export const BFA_READERS: ReadonlyArray<{ index: NumericId; sr?: NumericId; second?: { id: NumericId; label: string }; digits: number; label: string }> = [
  { index: 'bis', sr: 'bisSr', digits: 0, label: 'BIS-type' },
  { index: 'se', second: { id: 're', label: 'RE' }, digits: 0, label: 'Entropy-type SE' },
  { index: 'sef', sr: 'eegSr', digits: 1, label: 'SEF' },
];

/**
 * What the BFA tile reads (EEG plan E6, Q3): the chosen EEG reader's index and suppression ratio while it publishes —
 * the reader whose values are newest (after a change of reader the old one's last values stay in the map and must not
 * win) — and the present depth index's di/sr otherwise. The EEG reader wins unless the depth monitor's reading is a
 * whole stale window (5 s) newer, i.e. the EEG device has stopped. This mapping lives here, never in a skin's JSON;
 * parts the reader does not compute (Saadat's SQI%, EMG%) stay blank.
 */
export function bfaReading(v: Values): { index: Measured | undefined; sr: Measured | undefined; second?: { value: Measured | undefined; label: string }; digits: number; label?: string } {
  let best: { r: (typeof BFA_READERS)[number]; at: number } | null = null;
  for (const r of BFA_READERS) {
    const x = (r.sr ? v[r.sr] : undefined) ?? v[r.index];
    if (x && (!best || x.at > best.at)) best = { r, at: x.at };
  }
  const depth = v.sr ?? v.di;
  if (best && (!depth || best.at >= depth.at - (MODULE_TILES.BFA?.staleS ?? 5))) {
    const { r } = best;
    return { index: v[r.index], sr: r.sr ? v[r.sr] : undefined, ...(r.second ? { second: { value: v[r.second.id], label: r.second.label } } : {}), digits: r.digits, label: r.label };
  }
  return { index: v.di, sr: v.sr, digits: 0 };
}

/** The depth index (dashes while the EMG artefact makes it questionable, or the device reads an invalid epoch) and the
 * suppression ratio under `srLabel`; `label` when an EEG device's index replaces the tile's own label. */
export function formatBfa(v: Values, srLabel: string, noValue: string): { main: string; sub: string; label?: string } {
  const r = bfaReading(v);
  const main = ok(r.index) ? r.index.value.toFixed(r.digits) : noValue;
  const sub = r.second
    ? `${r.second.label} ${ok(r.second.value) ? Math.round(r.second.value.value) : noValue}` // E8: the reader's second number in place of an SR it does not compute
    : `${srLabel} ${ok(r.sr) ? Math.round(r.sr.value) : noValue}`;
  return r.label ? { main, sub, label: r.label } : { main, sub };
}
