// Rhythm stand-ins: scenarios name the brief §5 rhythm ids (vfCoarse, vfFine, pacedVVI, pWaveAsystole …) that
// Stage 5 adds. Until the host engine has an id, the driver sends the closest rhythm this engine HAS, decided at
// run time from the engine's own RHYTHM_IDS — so the real rhythm appears by itself once Stage 5 is merged, and no
// scenario file changes. Every substitution is recorded in the run log and shown in the panel.
import type { RhythmId, RhythmOpts } from '@pme/engine-core';

export interface StandIn {
  rhythm: RhythmId;
  opts?: RhythmOpts;
  note: string;
}

export const RHYTHM_STAND_INS: Record<string, StandIn> = {
  vfCoarse: { rhythm: 'vtMono', opts: { rateBpm: 240 }, note: 'coarse VF shown as VT 240 until Stage 5' },
  vfFine: { rhythm: 'asystole', note: 'fine VF shown as a flat line until Stage 5 (the scenario still treats it as shockable)' },
  pacedVVI: { rhythm: 'avb3Wide', opts: { rateBpm: 70 }, note: 'paced rhythm shown as a wide escape at 70/min until Stage 5' },
  pWaveAsystole: { rhythm: 'avb3Narrow', opts: { rateBpm: 20 }, note: 'P-wave asystole shown as CHB with a 20/min escape until Stage 5' },
  junctionalEscape: { rhythm: 'avb3Narrow', opts: { rateBpm: 45 }, note: 'junctional escape shown as a narrow escape until Stage 5' },
};

/** The rhythm to send for `id` on an engine that knows `known`: itself, a stand-in, or null (send as is; the engine rejects it). */
export function resolveRhythm(id: string, opts: Record<string, unknown> | undefined, known: ReadonlySet<string>): { rhythm: string; opts?: Record<string, unknown>; note?: string } {
  if (known.has(id)) return { rhythm: id, ...(opts ? { opts } : {}) };
  const s = RHYTHM_STAND_INS[id];
  if (!s || !known.has(s.rhythm)) return { rhythm: id, ...(opts ? { opts } : {}) };
  const merged = { ...(opts ?? {}), ...(s.opts ?? {}) };
  return { rhythm: s.rhythm, ...(Object.keys(merged).length ? { opts: merged } : {}), note: `${id}: ${s.note}` };
}
