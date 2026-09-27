// Pulse oracle O11 (annex §D; tables §5.2): the kidney's response to haemorrhage. Pulse and our engine bleed the same
// 1100 mL over 10 min (O2's action, which runs in the Node shim) and are observed for 2 h. Pulse's data requests carry
// `UrineProductionRate(mL/min)` (no GFR/RBF), so O11 compares urine output and MAP. Annex §D's O11 drives MAP ≈ 60
// with `CardiovascularMechanicsModification` (SVR × 0.55): 7a has no such event and the action is unverified in the
// shim, so that premise (and Pulse's measured `rppZero`) stays open — gate note. Prototype (7a + 7b + 7g, Pulse
// 4.3.2): resting UOP ours 1.16 vs Pulse 0.38 mL/min (D12); MAP Δ at 1 h −3.7 vs −1.0 (both compensate class II);
// UOP Δ −0.63 vs +0.33 at 1 h, −0.63 vs +0.12 at 2 h: Pulse's urine RISES after a bleed (no ADH/RAAS/volume term,
// annex B2 stated limits) — new expected difference D-R1.
import type { OracleRow } from './scenarios.ts';

export interface RenalOracleRow extends Omit<OracleRow, 'channel'> {
  channel: 'uop' | 'map'; // uop in mL/min (ours: organs event uopMlKgH × kg / 60)
  atS: number;
}
export interface RenalOracleScenario {
  id: 'O11';
  durationS: number;
  baselineS: number;
  pulse: { tS: number; json: string }[];
  ours: { tS: number; event: Record<string, unknown> }[];
  rows: RenalOracleRow[];
}
const bleed = (mlPerMin: number) => JSON.stringify({ AnyAction: [{ PatientAction: { Hemorrhage: { Compartment: 'RightLeg', FlowRate: { ScalarVolumePerTime: { Value: mlPerMin, Unit: 'mL/min' } } } } }] });

export const RENAL_ORACLE: RenalOracleScenario = {
  id: 'O11', durationS: 7200, baselineS: 60,
  pulse: [{ tS: 60, json: bleed(110) }, { tS: 660, json: bleed(0) }],
  ours: [{ tS: 60, event: { kind: 'bleed', volumeMl: 1100, overS: 600 } }],
  rows: [
    { channel: 'uop', metric: 'abs', atS: 60, tol: 0.3, expect: 'expect-differ', note: 'D12: Pulse resting UOP 0.38 mL/min vs ours 1.16' },
    { channel: 'map', metric: 'delta', atS: 3600, tol: 3, expect: 'agree', note: 'both compensate class II (±3 mmHg: Pulse Δ ≈ 1)' },
    { channel: 'uop', metric: 'delta', atS: 3600, tol: 0.5, expect: 'expect-differ', note: 'D-R1: Pulse UOP rises after a bleed (no ADH/RAAS/volume term); ours falls (ATLS class II)' },
    { channel: 'uop', metric: 'delta', atS: 7200, tol: 0.5, expect: 'expect-differ', note: 'D-R1' },
  ],
};
