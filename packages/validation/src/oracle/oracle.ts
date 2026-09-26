// Pulse differential oracle (R34; docs/physiology/pulse-parameter-annex.md §C–§D). Identical scenarios run in Pulse
// (JSON actions) and in our engine (a pme-validation/1 document through the segment runner); truth values are
// compared within tolerances. Known Pulse errors are EXPECTED DISAGREEMENTS: the comparator asserts Pulse is still
// on the wrong side, so a future Pulse fix is noticed (annex §C "expect-differ").
// Patient: our adult set to Pulse's StandardMale (44 y, M, 77.1 kg, 180 cm, HR 72, BP 114/73.5; annex §D).
import type { DocCommand } from '@pme/controller/scenario';
import { runValidationDoc } from '../segments/run.ts';
import type { Grade, ValidationDoc } from '../segments/types.ts';
import type { PulseOracle, PulseRequest } from './pulse-node.ts';

export type Expect = { kind: 'agree' } | { kind: 'expect-differ'; id: string; op: '>' | '<'; value: number } | { kind: 'exclude'; id: string };
export interface Compare { id: string; ours: string; pulse: PulseRequest; pulseScale?: number; atS: number; metric: 'abs' | 'delta'; tolPct: number; expect: Expect }
export interface OracleScenario {
  id: string;
  title: string;
  durationS: number;
  pulseActions: Array<{ t: number; json: string }>;
  ours: { actions: Array<{ t: number; command: DocCommand }>; requires?: string[] };
  compare: Compare[];
}

const STANDARD_MALE = { ageY: 44, sex: 'M' as const, weightKg: 77.1, heightCm: 180, baseline: { hr: 72, sbp: 114, dbp: 74 }, sensors: { ecg: 'on', spo2: 'on', abp: 'connected', co2: 'on' } };
const ev = (event: Record<string, unknown>): DocCommand => ({ type: 'applyEvent', event } as DocCommand);
const agree: Expect = { kind: 'agree' };

export const ORACLE: OracleScenario[] = [
  {
    id: 'O1', title: 'Baseline, 10 min (StandardMale)', durationS: 600, pulseActions: [], ours: { actions: [] },
    compare: [
      { id: 'hr', ours: 'state:hr', pulse: 'HeartRate(1/min)', atS: 590, metric: 'abs', tolPct: 5, expect: agree },
      { id: 'map', ours: 'state:map', pulse: 'MeanArterialPressure(mmHg)', atS: 590, metric: 'abs', tolPct: 5, expect: agree },
      { id: 'sao2', ours: 'state:spo2', pulse: 'OxygenSaturation', pulseScale: 100, atS: 590, metric: 'abs', tolPct: 10, expect: agree },
      { id: 'etco2', ours: 'state:etco2', pulse: 'EndTidalCarbonDioxidePressure(mmHg)', atS: 590, metric: 'abs', tolPct: 10, expect: agree },
      { id: 'rr', ours: 'state:rr', pulse: 'RespirationRate(1/min)', atS: 590, metric: 'abs', tolPct: 10, expect: agree },
      { id: 'cvp', ours: 'state:cvp', pulse: 'MeanCentralVenousPressure(mmHg)', atS: 590, metric: 'abs', tolPct: 10, expect: agree },
    ],
  },
  {
    id: 'O2', title: 'Haemorrhage (Pulse RightLeg severity 0.8; ours 1100 mL over 10 min), observe 30 min', durationS: 1800,
    pulseActions: [{ t: 0, json: '{"AnyAction":[{"PatientAction":{"Hemorrhage":{"Compartment":"RightLeg","Severity":{"Scalar0To1":{"Value":0.8}}}}}]}' }],
    ours: { actions: [{ t: 0, command: ev({ kind: 'bleed', volumeMl: 1100, overS: 600 }) }], requires: ['7a', '7c'] },
    compare: [
      { id: 'hr-delta', ours: 'state:hr', pulse: 'HeartRate(1/min)', atS: 600, metric: 'delta', tolPct: 20, expect: agree },
      { id: 'map-delta', ours: 'state:map', pulse: 'MeanArterialPressure(mmHg)', atS: 600, metric: 'delta', tolPct: 20, expect: agree },
      { id: 'lactate', ours: 'state:lactate', pulse: 'Lactate-BloodConcentration(mg/dL)', atS: 1800, metric: 'abs', tolPct: 20, expect: { kind: 'expect-differ', id: 'D2', op: '<', value: 27 } },
    ],
  },
  {
    id: 'O4', title: 'Propofol bolus (Pulse 150 mg; ours 2 mg/kg)', durationS: 900,
    pulseActions: [{ t: 60, json: '{"AnyAction":[{"PatientAction":{"SubstanceBolus":{"AdministrationRoute":"Intravenous","Substance":"Propofol","Concentration":{"ScalarMassPerVolume":{"Value":10.0,"Unit":"mg/mL"}},"Dose":{"ScalarVolume":{"Value":15.0,"Unit":"mL"}}}}}]}' }],
    ours: { actions: [{ t: 60, command: ev({ kind: 'drug', drugId: 'propofol', dose: 2, unit: 'mg/kg' }) }], requires: ['7g'] },
    compare: [
      { id: 'map-delta', ours: 'state:map', pulse: 'MeanArterialPressure(mmHg)', atS: 180, metric: 'delta', tolPct: 15, expect: agree },
      { id: 'hr-150s', ours: 'state:hr', pulse: 'HeartRate(1/min)', atS: 210, metric: 'abs', tolPct: 10, expect: { kind: 'expect-differ', id: 'D8', op: '<', value: 58 } },
    ],
  },
  {
    id: 'O-VF', title: 'Untreated VF, 30 min (guard rail + D1)', durationS: 1800,
    pulseActions: [{ t: 0, json: '{"AnyAction":[{"PatientAction":{"Arrhythmia":{"Rhythm":"CoarseVentricularFibrillation"}}}]}' }],
    ours: { actions: [{ t: 0, command: { type: 'setRhythm', rhythm: 'vfCoarse', when: 'now' } as DocCommand }] },
    compare: [
      // MANUAL truth keeps the SBP/DBP targets through an arrest (flag 'override'); the displayed mean is what falls
      { id: 'map-60s', ours: 'numeric:abpMean', pulse: 'MeanArterialPressure(mmHg)', atS: 60, metric: 'abs', tolPct: 50, expect: agree },
      { id: 'ph-30min', ours: 'state:ph', pulse: 'BloodPH', atS: 1790, metric: 'abs', tolPct: 2, expect: { kind: 'expect-differ', id: 'D1', op: '>', value: 7.45 } },
    ],
  },
];

/** O3, O5–O12 (annex §D): added when our 7c–7g modules land and each Pulse action JSON is verified in this harness. */
export const ORACLE_BACKLOG = ['O3 crystalloid 1 L', 'O5 norepinephrine 0.1 µg/kg/min', 'O6 apnoea after FiO2 1.0', 'O7 PEEP 5 → 15 (PCV)', 'O8 FiO2 1.0 for 60 min', 'O9 hypothermia 33 °C', 'O10 glucose/insulin', 'O11 renal MAP 60', 'O12 hepatic clearance in haemorrhage'];

export interface OracleRow { scenario: string; id: string; ours: number; pulse: number; expected: string; grade: Grade; note: string }

/** agree: |ours − pulse| within tolPct of |pulse| → green, < 30 % → yellow, else red.
 *  expect-differ: green while Pulse is still on the wrong side (op value), yellow ("Pulse changed") otherwise. */
export function judge(c: Compare, ours: number, pulse: number): { grade: Grade; expected: string; note: string } {
  if (c.expect.kind === 'exclude') return { grade: 'green', expected: 'excluded', note: c.expect.id };
  if (c.expect.kind === 'expect-differ') {
    const still = c.expect.op === '>' ? pulse > c.expect.value : pulse < c.expect.value;
    return { grade: still ? 'green' : 'yellow', expected: `Pulse ${c.expect.op} ${c.expect.value} (${c.expect.id})`, note: still ? `known Pulse disagreement ${c.expect.id}` : `Pulse no longer shows ${c.expect.id}: re-check the annex row` };
  }
  if (!Number.isFinite(ours) || !Number.isFinite(pulse)) return { grade: 'red', expected: `±${c.tolPct} %`, note: 'missing value' };
  const err = (100 * Math.abs(ours - pulse)) / Math.max(Math.abs(pulse), 1e-9);
  return { grade: err <= c.tolPct ? 'green' : err < 30 ? 'yellow' : 'red', expected: `±${c.tolPct} % of Pulse`, note: `${err.toFixed(1)} %` };
}

export function oursDoc(s: OracleScenario): ValidationDoc {
  return {
    schema: 'pme-validation/1', id: `oracle-${s.id}`, title: s.title, seed: 1, durationS: s.durationS, ...(s.ours.requires ? { requires: s.ours.requires } : {}),
    scenario: { schema: 'pme-scenario/1', id: `oracle-${s.id}`, title: s.title, patient: STANDARD_MALE, initialState: 'run', states: [{ id: 'run' }] },
    actions: s.ours.actions, segments: [],
  };
}

/** Run one scenario on both engines. Our side not measurable → rows say so and grade green (not gating). */
export async function runOracle(s: OracleScenario, pulse: PulseOracle | null): Promise<{ rows: OracleRow[]; oursMeasurable: boolean }> {
  const r = await runValidationDoc(oursDoc(s));
  const at = (series: string, t: number) => {
    const pts = (r.store.series.get(series) ?? []).filter(([x]) => Math.abs(x - t) <= 5);
    return pts.length ? pts.reduce((a, [, v]) => a + v, 0) / pts.length : Number.NaN;
  };
  const pulseAt = new Map<number, Record<string, number>>();
  if (pulse) {
    const times = [...new Set([0, ...s.compare.map((c) => c.atS)])].sort((a, b) => a - b);
    const acts = [...s.pulseActions].sort((a, b) => a.t - b.t);
    let now = 0;
    let k = 0;
    for (const t of times) {
      while (k < acts.length && (acts[k] as { t: number }).t <= t) {
        const a = acts[k++] as { t: number; json: string };
        pulse.step(Math.round((a.t - now) / 0.02));
        now = a.t;
        if (!pulse.act(a.json)) throw new Error(`${s.id}: Pulse rejected ${a.json}`);
      }
      pulse.step(Math.round((t - now) / 0.02));
      now = t;
      pulseAt.set(t, pulse.pull());
    }
  }
  const rows: OracleRow[] = [];
  for (const c of s.compare) {
    const p0 = (pulseAt.get(0)?.[c.pulse] ?? Number.NaN) * (c.pulseScale ?? 1);
    const p1 = (pulseAt.get(c.atS)?.[c.pulse] ?? Number.NaN) * (c.pulseScale ?? 1);
    const ours = c.metric === 'delta' ? at(c.ours, c.atS) - at(c.ours, 5) : at(c.ours, c.atS);
    const pv = c.metric === 'delta' ? p1 - p0 : p1;
    if (!r.measurable) rows.push({ scenario: s.id, id: c.id, ours: Number.NaN, pulse: pv, expected: 'n/m', grade: 'green', note: `ours not measurable: ${r.unsupported[0]?.reason ?? ''}` });
    else if (!pulse) rows.push({ scenario: s.id, id: c.id, ours, pulse: Number.NaN, expected: 'skipped', grade: 'green', note: 'PME_PULSE_DIR not set' });
    else rows.push({ scenario: s.id, id: c.id, ours, pulse: pv, ...judge(c, ours, pv) });
  }
  return { rows, oursMeasurable: r.measurable };
}
