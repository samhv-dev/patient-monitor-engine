// FU-3 item 11 (R-7f-6): Stage 7f's NMT (train-of-four) and BFA (BIS-like depth index) tiles. Pure formatters (Node
// has no DOM) from the engine's `measurement` values: tofCount/tofRatio (every train), ptc (23 s after a PTC) and
// di/sr (1 Hz while the depth monitor is on), as the 7f demo draws them. Like a plug-in module, a tile is shown only
// while its device publishes (MODULE_TILES); the other tiles are always drawn.
import type { Measured, NumericId } from '@pme/engine-core';
import type { TileParam } from '@pme/skins';

type Values = Partial<Record<NumericId, Measured>>;
const ok = (x: Measured | undefined): x is Measured & { value: number } => !!x && x.value !== null && x.flag !== 'invalid';

/**
 * A module tile's readings and how long they stay current: the stimulator runs a train every 12–60 s (7f tof-device),
 * so NMT keeps its last train for 2 × 60 s; the depth monitor publishes at 1 Hz, so BFA goes after 5 missed seconds [ENG].
 */
export const MODULE_TILES: Partial<Record<TileParam, { numerics: NumericId[]; staleS: number }>> = {
  NMT: { numerics: ['tofCount', 'ptc'], staleS: 120 },
  BFA: { numerics: ['di', 'sr'], staleS: 5 },
  AGENTS: { numerics: ['etAa', 'mac'], staleS: 5 }, // FU-8 (A10-E5): 7f publishes both at 1 Hz while an agent is present
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
 * FU-8 (A10-E5, research/11 §4 item 8): the anaesthetic-agent tile — end-tidal agent % (7f `etAa`, the dominant agent) and
 * the end-tidal MAC multiple (`mac`, Σ Fet/MAC-age). The engine does not publish WHICH agent, so the label is the
 * glossary's generic "EtAA" (glossary #30; Philips etSEV/etISO/etDES once the agent id is published).
 */
export function formatAgents(v: Values, noValue: string): { main: string; sub: string } {
  return { main: ok(v.etAa) ? v.etAa.value.toFixed(1) : noValue, sub: `MAC ${ok(v.mac) ? v.mac.value.toFixed(1) : noValue}` };
}

/** The depth index (dashes while the EMG artefact makes it questionable) and the suppression ratio under `srLabel`. */
export function formatBfa(v: Values, srLabel: string, noValue: string): { main: string; sub: string } {
  return { main: ok(v.di) ? String(Math.round(v.di.value)) : noValue, sub: `${srLabel} ${ok(v.sr) ? Math.round(v.sr.value) : noValue}` };
}
