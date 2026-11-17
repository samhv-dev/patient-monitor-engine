// What a return to a bookmark (or a reload's return to its position) restored, read from the snapshot the engine was
// restored from. The engine publishes its drug panel only from inside a step, so after a return it says nothing until it
// runs again, and nothing at all while the case stays paused (a pause survives a return and a reload). The amounts given
// and the pump channels are in the snapshot's drug state (engine-core `PkState`: each drug's `total`, and `pumps`); the
// patient's concentrations and a pump's TCI prediction are not read here and wait for the engine's next panel.
import { DRUGS, TICK_S, type PatientSnapshot, type PkState, type PumpChannel, type PumpPanelRow } from '@pme/engine-core';

export interface RestoredReading {
  /** The sim time the engine was restored to. */
  t: number;
  /** Each drug's amount given in the restored state, in its `amountUnit`. */
  amounts: Record<string, { amount: number; unit: string }>;
  /** The restored pump channels, as the panel would show them (no TCI prediction, no time to empty until it runs). */
  pumps: PumpPanelRow[];
}

/** A channel's panel state, as the engine's `pumpPanel` gives it. */
const stateOf = (c: PumpChannel): PumpPanelRow['state'] => (!c.contents ? 'notLoaded' : c.alarms.length ? 'alarm' : !c.paused ? 'running' : c.infusedMl > 0 ? 'paused' : 'loaded');

/** The reading of a snapshot, or null when its state holds no drug state (an older or foreign snapshot). */
export function restoredReading(s: PatientSnapshot): RestoredReading | null {
  const pk = (s.state as { st?: { pk?: PkState } } | null)?.st?.pk;
  if (!pk?.drugs) return null;
  const amounts: RestoredReading['amounts'] = {};
  for (const d of Object.values(pk.drugs)) if (d.total > 0 && DRUGS[d.id]) amounts[d.id] = { amount: d.total, unit: (DRUGS[d.id] as { amountUnit: string }).amountUnit };
  const pumps = (pk.pumps ?? []).map((c): PumpPanelRow => ({
    ch: c.ch, kind: c.kind, state: stateOf(c),
    programmed: c.programmed ? { drugId: c.programmed.drugId, concentration: { ...c.programmed.concentration } } : null,
    contents: c.contents ? { drugId: c.contents.drugId, concentration: { ...c.contents.concentration } } : null,
    syringeMl: c.syringeMl, set: c.set, mode: c.mode, rate: c.rate ? { ...c.rate } : null, rateMlH: c.rateMlH, limitMl: c.limitMl,
    volumeMl: c.volumeMl, infusedMl: c.infusedMl, wasteMl: c.wasteMl, timeToEmptyMin: null, alarms: [...c.alarms], tci: null,
  }));
  return { t: s.tick * TICK_S, amounts, pumps };
}
