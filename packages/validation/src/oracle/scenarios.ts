// Oracle scenarios O1–O5 (annex §D) as {Pulse actions, our commands, compared channels, tolerance, expectation}.
export interface OracleRow {
  channel: 'hr' | 'map' | 'co' | 'cvp' | 'pcwp';
  metric: 'abs' | 'delta';
  tol: number; // relative
  expect: 'agree' | 'expect-differ' | 'exclude';
  note?: string;
}
export interface OracleScenario {
  id: 'O1' | 'O2' | 'O3' | 'O4' | 'O5';
  durationS: number;
  baselineS: number; // compare deltas from each engine's own value at this time
  pulse: { tS: number; json: string }[];
  ours: { tS: number; event: Record<string, unknown> }[];
  compareAtS: number;
  rows: OracleRow[];
}
const bolus = (sub: string, mgPerMl: number, ml: number) =>
  JSON.stringify({ AnyAction: [{ PatientAction: { SubstanceBolus: { AdministrationRoute: 'Intravenous', Substance: sub, Concentration: { ScalarMassPerVolume: { Value: mgPerMl, Unit: 'mg/mL' } }, Dose: { ScalarVolume: { Value: ml, Unit: 'mL' } } } } }] });
const bleed = (mlPerMin: number) => JSON.stringify({ AnyAction: [{ PatientAction: { Hemorrhage: { Compartment: 'RightLeg', FlowRate: { ScalarVolumePerTime: { Value: mlPerMin, Unit: 'mL/min' } } } } }] });

export const ORACLE_SCENARIOS: OracleScenario[] = [
  { id: 'O1', durationS: 600, baselineS: 0, pulse: [], ours: [], compareAtS: 600, rows: [
    { channel: 'hr', metric: 'abs', tol: 0.05, expect: 'agree' }, { channel: 'map', metric: 'abs', tol: 0.05, expect: 'agree' },
    { channel: 'co', metric: 'abs', tol: 0.05, expect: 'agree' }, { channel: 'cvp', metric: 'abs', tol: 0.5, expect: 'agree', note: 'CVP 4.7 vs 5; ±0.5 relative on a small number' },
    { channel: 'pcwp', metric: 'abs', tol: 0.3, expect: 'agree' } ] },
  { id: 'O2', durationS: 1200, baselineS: 60, pulse: [{ tS: 60, json: bleed(110) }, { tS: 660, json: bleed(0) }], ours: [{ tS: 60, event: { kind: 'bleed', volumeMl: 1100, overS: 600 } }], compareAtS: 1200, rows: [
    { channel: 'hr', metric: 'delta', tol: 0.2, expect: 'agree' }, { channel: 'map', metric: 'delta', tol: 0.2, expect: 'agree' }, { channel: 'co', metric: 'delta', tol: 0.2, expect: 'agree' } ] },
  { id: 'O3', durationS: 1800, baselineS: 60, pulse: [{ tS: 60, json: JSON.stringify({ AnyAction: [{ PatientAction: { SubstanceCompoundInfusion: { SubstanceCompound: 'Saline', BagVolume: { ScalarVolume: { Value: 1000, Unit: 'mL' } }, Rate: { ScalarVolumePerTime: { Value: 33.3, Unit: 'mL/min' } } } } }] }) }], ours: [{ tS: 60, event: { kind: 'fluid', fluid: 'crystalloid', volumeMl: 1000, overS: 1800 } }], compareAtS: 1800, rows: [
    { channel: 'cvp', metric: 'delta', tol: 0.5, expect: 'agree', note: 'D10: 7a has no redistribution (brief §4.9), Pulse retains ≥ 0.6 — direction must agree' } ] },
  { id: 'O4', durationS: 600, baselineS: 60, pulse: [{ tS: 60, json: bolus('Propofol', 10, 15.4) }], ours: [{ tS: 60, event: { kind: 'drug', drugId: 'propofol', dose: 2, unit: 'mg/kg', route: 'iv' } }], compareAtS: 180, rows: [
    { channel: 'map', metric: 'delta', tol: 0.15, expect: 'agree' }, { channel: 'hr', metric: 'delta', tol: 0.1, expect: 'expect-differ', note: 'D8: Pulse HR 72 → 49 (direct HR modifier); ours 65–75' } ] },
  { id: 'O5', durationS: 1800, baselineS: 60, pulse: [], ours: [], compareAtS: 1200, rows: [
    { channel: 'map', metric: 'delta', tol: 0.2, expect: 'exclude', note: 'norepinephrine arrives in 7g; D24 plasma level excluded' } ] },
];
