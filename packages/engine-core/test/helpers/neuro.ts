// Stage 7f test rig over Stage 7g's REAL PK (R51 §1: 7f has none). Drives 7g's pipeline without the engine on its
// 10 Hz grid, one simulated second per call, and hands the DrugBus to the caller. Times in minutes for the NMB tests.
import { advancePk, applyPkCommand, createPkState, NEUTRAL_PK_CTX, type PkState } from '../../src/l2/pk/pipeline.ts';
import type { PkPatient } from '../../src/l2/pk/covariates.ts';
import type { Command } from '../../src/types.ts';
import type { DrugBus } from '../../src/types-pk.ts';

export const ADULT: PkPatient = { ageY: 40, weightKg: 70, heightCm: 170, sex: 'm' };

export interface Rig {
  pk: PkState;
  tS: number;
  tempC: number;
}

export function rig(p: Partial<PkPatient> = {}): Rig {
  return { pk: createPkState({ ...ADULT, ...p }), tS: 0, tempC: 37 };
}

let n = 0;
const ev = (event: Record<string, unknown>) => ({ id: `rig-${++n}`, issuedBy: 'test', type: 'applyEvent', event }) as unknown as Command;

/** A `drug` event through 7g (bolus; `infusion` with a rate unit). Returns what 7g's apply returned. */
export function give(r: Rig, drugId: string, dose: number, unit = 'mg/kg', infusion = false): boolean {
  return applyPkCommand(r.pk, ev({ kind: 'drug', drugId, dose, unit, route: 'iv', ...(infusion ? { infusion: true } : {}) }), r.tS);
}

/** 7g's vaporiser event (R51 §4), optionally with N2O as a fraction of the fresh gas. */
export function vaporiser(r: Rig, agent: 'sevoflurane' | 'isoflurane' | 'desflurane', dialPct: number, fgfLpm = 6, n2oFrac?: number): boolean {
  return applyPkCommand(r.pk, ev({ kind: 'vaporiser', agent, dialPct, fgfLpm, ...(n2oFrac !== undefined ? { n2oFrac } : {}) }), r.tS);
}

export const tMin = (r: Rig): number => r.tS / 60;

/** Advance 7g's PK by one simulated second (ten 0.1 s steps) at the rig's temperature. */
function second(r: Rig): void {
  r.tS = Math.round(r.tS + 1);
  advancePk(r.pk, { ...NEUTRAL_PK_CTX, tempC: r.tempC }, r.tS);
}

/** Step to `untilMin`, calling `each` every simulated second with the bus. */
export function runTo(r: Rig, untilMin: number, each?: (bus: DrugBus, tMin: number) => void): void {
  while (r.tS < untilMin * 60 - 1e-9) {
    second(r);
    each?.(r.pk.bus, r.tS / 60);
  }
}

/** Minutes from now until `pred` first holds (checked every second), up to `maxMin`; NaN if never. */
export function until(r: Rig, pred: (bus: DrugBus, tMin: number) => boolean, maxMin: number): number {
  const t0 = r.tS;
  while (r.tS < t0 + maxMin * 60 - 1e-9) {
    second(r);
    if (pred(r.pk.bus, r.tS / 60)) return (r.tS - t0) / 60;
  }
  return Number.NaN;
}
