// The one door from the follower engine to the pump face (plan pump-rack-tci.md A1; §8 and the anti-goal "Truth on the
// pump"): the engine's channel row (E1, PumpPanelRow) carries the syringe's or bag's TRUE contents beside the PROGRAMMED
// drug, because the instructor's mirror (A3) shows both. The pump shows the programme only, so a resident who loads the
// wrong syringe is not told by the pump. `faceRow` copies the fields a face may show, one by one, never by spread, and
// brands the copy: a `FaceRow` can be made here only, so neither the rack nor the face can be handed an engine row, and
// the contents cannot reach the pump page's DOM through them. pump/page.ts calls it on every `drugs` event.
import type { PumpPanelRow } from '@pme/engine-core';

declare const programmeOnly: unique symbol;

/** A channel as the pump shows it: E1's row without `contents` (and without `wasteMl`, which no face line shows). */
export type FaceRow = Readonly<Omit<PumpPanelRow, 'contents' | 'wasteMl'>> & { readonly [programmeOnly]: true };

/** The channel's face fields of an engine row: the programme, never the contents. */
export function faceRow(r: PumpPanelRow): FaceRow {
  const out = {
    ch: r.ch,
    kind: r.kind,
    state: r.state,
    programmed: r.programmed ? { drugId: r.programmed.drugId, concentration: { ...r.programmed.concentration } } : null,
    syringeMl: r.syringeMl,
    set: r.set,
    mode: r.mode,
    rate: r.rate ? { ...r.rate } : null,
    rateMlH: r.rateMlH,
    limitMl: r.limitMl,
    volumeMl: r.volumeMl,
    infusedMl: r.infusedMl,
    timeToEmptyMin: r.timeToEmptyMin,
    alarms: [...r.alarms],
  };
  return out as unknown as FaceRow;
}
