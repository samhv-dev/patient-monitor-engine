// Stage 7c Pulse oracle scenarios (annex §D O2, O3, O10 + a bicarbonate bolus), blood-chemistry channels only.
// Expected disagreements are ENCODED (annex §C): a Pulse fix then shows up as a failing `expect-differ` row.
// Compare TRUTH (our `labs` event) with Pulse data requests (pulse-node.ts PULSE_REQUESTS); K in mg/L (D14).
// Adopted from 7c's uncommitted copy (FU-3 item 10): loads Pulse through pulse-node.ts (7c's Node shim is the same
// three globals + local fetch), compares with compare.ts, and runs our engine MODELED like O2/O4/O11.
import { createEngine, type EngineEvent } from '@pme/engine-core';
import { compareRow } from './compare.ts';
import type { PulseOracle, PulseRequest } from './pulse-node.ts';

export type BloodChannel = 'ph' | 'be' | 'lactate' | 'hb' | 'k' | 'na' | 'bv';
export interface BloodOracleRow {
  channel: BloodChannel;
  metric: 'abs' | 'delta';
  tol: number; // relative, of max(1, |pulse|)
  expect: 'agree' | 'expect-differ' | 'exclude';
  note: string;
}
export interface BloodOracleScenario {
  id: 'O2b' | 'O3b' | 'O10b' | 'O13b';
  baselineS: number;
  compareAtS: number;
  pulse: { tS: number; json: string }[];
  ours: { tS: number; event: Record<string, unknown> }[];
  rows: BloodOracleRow[];
}

/** Pulse data-request names for each channel, and the conversion to our units. */
export const PULSE_BLOOD: Record<BloodChannel, { key: PulseRequest; toOurs: (v: number) => number }> = {
  ph: { key: 'BloodPH', toOurs: (v) => v },
  be: { key: 'BaseExcess(mmol/L)', toOurs: (v) => v },
  lactate: { key: 'Lactate-BloodConcentration(mg/dL)', toOurs: (v) => (v * 10) / 89.07 },
  hb: { key: 'Hemoglobin-BloodConcentration(g/dL)', toOurs: (v) => v },
  k: { key: 'Potassium-BloodConcentration(mg/dL)', toOurs: (v) => (v * 10) / 39.098 }, // TRUE mmol/L (D14: never Pulse's 31.1)
  na: { key: 'Sodium-BloodConcentration(mg/dL)', toOurs: (v) => (v * 10) / 22.99 },
  bv: { key: 'BloodVolume(mL)', toOurs: (v) => v },
};

const act = (a: Record<string, unknown>) => JSON.stringify({ AnyAction: [{ PatientAction: a }] });
// Pulse's CDM field is `FlowRate` (the spike used `Severity`); an unknown field makes ProcessActions return false, which
// the harness throws on — Stage 7a's O2 draft used `Flow` (request to 7a).
const bleed = (mlPerMin: number) => act({ Hemorrhage: { Compartment: 'RightLeg', FlowRate: { ScalarVolumePerTime: { Value: mlPerMin, Unit: 'mL/min' } } } });
const saline = act({ SubstanceCompoundInfusion: { SubstanceCompound: 'Saline', BagVolume: { ScalarVolume: { Value: 1000, Unit: 'mL' } }, Rate: { ScalarVolumePerTime: { Value: 33.3, Unit: 'mL/min' } } } });
const bolus = (sub: string, conc: number, unit: string, ml: number) =>
  act({ SubstanceBolus: { AdministrationRoute: 'Intravenous', Substance: sub, Concentration: { ScalarMassPerVolume: { Value: conc, Unit: unit } }, Dose: { ScalarVolume: { Value: ml, Unit: 'mL' } } } });

export const BLOOD_ORACLE: BloodOracleScenario[] = [
  {
    id: 'O2b', baselineS: 60, compareAtS: 60 + 1800,
    pulse: [{ tS: 60, json: bleed(110) }, { tS: 660, json: bleed(0) }],
    ours: [{ tS: 60, event: { kind: 'bleed', volumeMl: 1100, overS: 600 } }],
    rows: [
      { channel: 'bv', metric: 'delta', tol: 0.25, expect: 'agree', note: '−1100 mL less refill' },
      { channel: 'hb', metric: 'delta', tol: 0.5, expect: 'agree', note: 'refill dilution; small numbers' },
      { channel: 'lactate', metric: 'delta', tol: 0.5, expect: 'expect-differ', note: 'D2: Pulse flat (anaerobic only below tissue PO2 40, renal-only clearance)' },
      { channel: 'ph', metric: 'delta', tol: 0.5, expect: 'exclude', note: 'D1/D3 root cause: fixed SID; reported only' },
    ],
  },
  {
    id: 'O3b', baselineS: 60, compareAtS: 60 + 3600,
    pulse: [{ tS: 60, json: saline }],
    ours: [{ tS: 60, event: { kind: 'fluid', fluid: 'saline', volumeMl: 1000, overS: 1800 } }],
    rows: [
      { channel: 'hb', metric: 'delta', tol: 0.5, expect: 'expect-differ', note: 'D10: Pulse retains ≥ 0.6 of the litre (no oncotic source, no lymph) → larger dilution' },
      { channel: 'be', metric: 'delta', tol: 0.5, expect: 'expect-differ', note: 'D3: Cl is not in Pulse’s SID → ΔBE ≈ 0; ours negative' },
      { channel: 'na', metric: 'delta', tol: 1, expect: 'agree', note: 'both near 0 (saline Na 154)' },
    ],
  },
  {
    id: 'O10b', baselineS: 60, compareAtS: 60 + 3600,
    pulse: [{ tS: 60, json: bolus('Insulin', 100, 'ug/mL', 1) }],
    ours: [{ tS: 60, event: { kind: 'drug', drugId: 'insulinDextrose', dose: 10, unit: 'units' } }],
    rows: [
      { channel: 'k', metric: 'delta', tol: 0.5, expect: 'expect-differ', note: 'Pulse has no transcellular K shift (annex §5b.2): ours −0.6 to −1.0; glucose is 7e’s (stub)' },
    ],
  },
  {
    id: 'O13b', baselineS: 60, compareAtS: 60 + 600,
    pulse: [{ tS: 60, json: bolus('Bicarbonate', 84, 'mg/mL', 50) }],
    ours: [{ tS: 60, event: { kind: 'drug', drugId: 'sodiumBicarbonate', dose: 50, unit: 'mmol' } }],
    rows: [
      { channel: 'ph', metric: 'delta', tol: 0.5, expect: 'exclude', note: 'Pulse bolus of the Bicarbonate substance only (no Na): not comparable; reported' },
      { channel: 'na', metric: 'delta', tol: 0.5, expect: 'exclude', note: 'as above' },
    ],
  },
];

export interface BloodOracleResult { channel: BloodChannel; metric: 'abs' | 'delta'; ours: number; pulse: number; verdict: ReturnType<typeof compareRow>; note: string }

/** One scenario on both engines (StandardMale, our engine MODELED). Returns every row (a `fail` is a gate-note finding,
 *  never a tuning target, audit §4) and our baseline panel. Local-only: 60 s simulated ≈ 2–20 s wall. */
export async function runBloodOracle(sc: BloodOracleScenario, pulse: Pick<PulseOracle, 'step' | 'pull' | 'act'>): Promise<{ rows: BloodOracleResult[]; oursBaseline: Record<BloodChannel, number> }> {
  const e = createEngine({ seed: 1, mode: 'modeled', patient: { ageY: 44, sex: 'M', weightKg: 77.1, heightCm: 180, baseline: { hr: 72 } } });
  const ev: Extract<EngineEvent, { type: 'labs' }>[] = [];
  e.on((x) => { if (x.type === 'labs') ev.push(x); }, ['labs']);
  const pulseAt = new Map<number, Record<string, number>>();
  const bvAt = new Map<number, number>();
  const bvOurs = () => {
    const s = e.snapshot().state as { st: { blood: { core: { fl: { vp: number; hbG: number } } } } };
    return s.st.blood.core.fl.vp + 3 * s.st.blood.core.fl.hbG; // plasma + RBC (MCHC 0.33 g/mL)
  };
  // Both engines take their actions when the loop reaches them, AFTER the baseline read at `baselineS` (FU-3 item 10:
  // 7c's copy dispatched ours up front with atTick = tS × 50, so tick 3000 applied the dose before our 60 s panel —
  // O13b baseline Na 143 post-dose vs 140 — while Pulse's baseline was pre-dose).
  const acts = [...sc.pulse].sort((a, b) => a.tS - b.tS);
  const mine = [...sc.ours].sort((a, b) => a.tS - b.tS);
  let t = 0;
  for (const at of [sc.baselineS, sc.compareAtS]) {
    while (t < at) {
      while (acts.length && acts[0]!.tS <= t) {
        const a = acts.shift()!;
        if (!pulse.act(a.json)) throw new Error(`${sc.id}: Pulse rejected ${a.json}`);
      }
      while (mine.length && mine[0]!.tS <= t) {
        const o = mine.shift()!; // atTick is clamped to the next tick when our engine already stands at tS
        e.dispatch({ id: `o${o.tS}`, issuedBy: 'oracle', type: 'applyEvent', event: o.event as never, atTick: o.tS * 50 });
      }
      pulse.step(50);
      t += 1;
      if (t % 60 === 0) {
        e.advanceTo(t);
        await new Promise((r) => setImmediate(r));
      }
    }
    pulseAt.set(at, pulse.pull());
    e.advanceTo(at);
    bvAt.set(at, bvOurs());
  }
  const ours = (at: number, ch: BloodChannel): number => {
    const l = ev.filter((x) => x.t <= at).pop();
    if (!l) return Number.NaN;
    return ch === 'bv' ? (bvAt.get(at) as number) : l.values[ch]; // BV is not in the panel: from the snapshot
  };
  const rows = sc.rows.map((row): BloodOracleResult => {
    const pk = PULSE_BLOOD[row.channel];
    const pv = (at: number) => pk.toOurs(pulseAt.get(at)?.[pk.key] ?? Number.NaN);
    const o = row.metric === 'abs' ? ours(sc.compareAtS, row.channel) : ours(sc.compareAtS, row.channel) - ours(sc.baselineS, row.channel);
    const q = row.metric === 'abs' ? pv(sc.compareAtS) : pv(sc.compareAtS) - pv(sc.baselineS);
    return { channel: row.channel, metric: row.metric, ours: o, pulse: q, verdict: compareRow(o, q, row), note: row.note };
  });
  const oursBaseline = Object.fromEntries((Object.keys(PULSE_BLOOD) as BloodChannel[]).map((ch) => [ch, ours(sc.baselineS, ch)])) as Record<BloodChannel, number>;
  return { rows, oursBaseline };
}
