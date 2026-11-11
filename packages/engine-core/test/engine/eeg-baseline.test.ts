// EEG stage E0 (docs/plans/stage-eeg-depth-of-anaesthesia.md §7 E0, D7): the baseline the EEG stage must not move.
// Six MODELED engine runs record, every simulated second, the present depth index and the physiology that reads it
// (l2/neuro/outputs.ts, the drive's sedation arm in l2/neuro/drive.ts, the awareness flag in l2/neuro/pipeline.ts):
//   diRaw, sr                 — the index (l2/neuro/depth.ts), read from the committed neuro state, full precision;
//   cmro2Mult, mapSetShiftMmHg — `outputs` (CMRO2 multiplier; the published MAP set-shift);
//   awarenessRisk              — the anaesthesia event's flag (diRaw > 60 && TOF ≤ 2), 0/1;
//   obstruction                — the drive's sedation input is `di: d.diRaw` (pipeline.ts), i.e. diRaw itself, so it is
//                                not stored twice; the sedation value is not kept in state, so its observable output is
//                                recorded: the drive's upper-airway obstruction, max(residual block, sedation) on a
//                                natural airway (it is 0 behind the tube);
//   map, hr, spo2              — the public `state` event (signals.map, values.hr, values.spo2);
//   paco2                      — resp.co2.pf, the arterial PCO2 the resp tests read.
// Values are rounded to 3 decimals (fixture size; a last-ULP libm difference between runners cannot flip a 3rd
// decimal except at a rounding edge). sevoKetamine and emergence share sevo1Mac's first 600 s (same seed, same
// events): those rows are asserted against sevo1Mac's and the fixture stores each run from 601 s only. The fixture pins TODAY's engine, so this test is green on the commit that adds
// it; a later EEG PR that moves any of these numbers fails it. Regenerate ONLY when a ruled physiology change says so:
//   PME_EEG_BASELINE_WRITE=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/eeg-baseline.test.ts
// Regenerated once (8 Nov, brief 93, the owner's ruling on mechanism G: the respiratory drive is built and exists on the
// ventilator). Attributed run by run, from the diff of the old fixture against the new: the four VENTILATED runs move and
// the two that never see a ventilator do not. sevo1Mac, sevoKetamine and emergence connect the tube and the ventilator at
// 0 s while the sevoflurane is only starting, so for their first minutes the patient is awake and unparalysed on the
// machine and his drive now makes efforts there: MAP and HR move from the first second (the effort's pleural swing, at
// most 2.4 / 0.9), PaCO2 from the second (the trigger; at most 0.03 mmHg), and diRaw from 25 s through the volatile's
// uptake (at most 0.038). propofolRocIncision connects the ventilator at 180 s and moves from there (diRaw at most 0.65;
// awarenessRisk flips on 11 of 1200 samples where diRaw crosses its 60 threshold a few seconds apart). awake and
// propofolTci (no ventilator) are bit-identical. No number was fitted; nothing else in the EEG chain changed.
// Yields once per sim-minute (CI rule).
// Re-recorded (research/44 L2-26, PR fix-bowman-pressure): Bowman's capsule pressure 17.1 → 18 mmHg (Miller 10e Fig. 15.8)
// is the only cause. With 17.1 restored on the same tree the six runs equal the old fixture exactly. The chain at the
// awake rig's 120 s: GFR 124.15 → 116.14 mL/min; urine +5 µL cumulative; bvRel −1e-6; Hb +2e-5 g/dL; MAP
// 96.29612 → 96.29605; cbfRel equal to 5 decimals; diRaw unchanged (awake.map moves in 7 of 120 samples by 0.001).
// Anaesthetised runs: the same haemodynamic drift reaches diRaw (|Δ| ≤ 0.002) through what neuro reads from the
// circulation: cbfRel in the metabolic row, and the drugs' flow and clearance coupling. The sampled MAP/HR move more
// (≤ 1.44 mmHg, 0.2 bpm) because the 1 Hz sample lands at a slightly different beat phase. One discrete change: in
// propofolRocIncision, awarenessRisk is 1 at 956 s where it was 0 (diRaw sits at the 60 edge under full block).
// Re-recorded (research/44 L2-27, PR fix-hypothermic-clearance): only sevoKetamine moves, only from 676 s (ketamine
// starts at 600 s; 1–675 s equal). Cause: ketamine's hepatic share is CYP450 (elim.cyp) and now takes Hostler's
// −11.1 %/°C below 36.5 °C on the liver function, where it took the organ model's tempF (−10 %/°C below 37 °C). The
// rig cools 36.42 °C (600 s) → 36.03 °C (1500 s); ketamine's clearance factor goes 0.95 → 0.99 at 601 s and 0.91 → 0.95
// at 1500 s, so ketamine clears slightly FASTER: Ce 0.3898 → 0.3895 at 900 s, 0.2313 → 0.2307 at 1500 s; diRaw
// 46.709 → 46.707 and 42.799 → 42.792 (max |Δ| 0.008). Control: with ketamine's cyp flag removed on the same tree
// the six runs equal the old fixture exactly. Sampled MAP/HR move ≤ 1.11 mmHg / 0.2 bpm (beat phase).
// Re-recorded on the re-merge of 9 Nov (brief 112: main into PR #352): both causes above together, nothing new. Against
// main's fixture the two runs without a ventilator (awake, propofolTci) are bit-identical and only the four ventilated runs
// move, by the mechanism-G sizes stated above (diRaw ≤ 0.647, MAP ≤ 4.02, awarenessRisk on 10 samples, all in
// propofolRocIncision's case); against the branch's fixture every run moves only by Bowman-18 sizes (diRaw ≤ 0.004, MAP
// ≤ 1.43 at the 1 Hz beat phase, HR ≤ 0.24). No number fitted.
// Re-recorded on the second re-merge of 9 Nov (brief 117: main e90c25f3, which carries PR #352 mechanism G, into
// PR fix-hypothermic-clearance): the CYP450 term and mechanism G together, nothing new. Against main's fixture only
// sevoKetamine moves (from 686 s; diRaw ≤ 0.007, MAP ≤ 1.47 / HR ≤ 0.21 at the beat phase) and the five other runs are
// bit-identical; control: with ketamine's cyp flag removed on the merge, all six runs equal main's fixture exactly.
// Against the branch's fixture awake and propofolTci are bit-identical and only the four ventilated runs move, by the
// mechanism-G sizes above (diRaw ≤ 0.647, MAP ≤ 4.02, awarenessRisk on 10 samples in propofolRocIncision); control:
// with main's five mechanism-G sources (l2/neuro/drive, nmb, spont; l2/resp/driver, pipeline) at the merge base, all
// six runs equal the branch's fixture exactly. No number fitted.
// Re-recorded (pump rack E2, PR #408; decision D3, the owner's PQ5 = A): only the two TCI runs move, propofolTci and
// propofolRocIncision; the four runs without a TCI (awake, sevo1Mac, sevoKetamine, emergence) are bit-identical. Cause: the
// TCI pump now predicts with its own model (Eleveld on the case patient, typed "without opioids", as neither rig gives an
// opioid) and no longer sees the patient's clearance and distribution, which in these rigs move with the induction
// (propofol clearance factor 0.84–1.04, cardiac-output ratio 0.75–1.05 in the old runs). The patient therefore receives
// what the pump's model asks for, not what keeps the patient's own Ce on the target. Size, old → new:
//   propofolTci          Ce 1.761 → 1.761 (120 s), 6.066 → 6.563 (300 s), 4.635 → 4.978 (600 s), 2.995 → 3.238 (900 s);
//                        diRaw 67.934 → 67.934, 24.235 → 22.218, 31.949 → 29.789, 46.371 → 43.709; largest |ΔCe| 0.578
//                        at 327 s, largest |ΔdiRaw| 2.778 at 888 s; MAP ≤ 1.51 mmHg, HR ≤ 0.28, SR ≤ 9.5 (326 s).
//   propofolRocIncision  Ce 1.721 → 1.732 (120 s), 4.133 → 4.165 (300 s), 3.605 → 3.830 (600 s), 2.322 → 2.471 (900 s),
//                        1.554 → 1.650 (1200 s); diRaw 68.709 → 68.505, 35.572 → 35.325, 40.074 → 38.060, 57.332 → 54.713,
//                        72.050 → 70.154; largest |ΔCe| 0.227 at 564 s, |ΔdiRaw| 2.754 at 774 s; MAP ≤ 2.67, HR ≤ 0.57;
//                        awarenessRisk 1 → 0 on 44 samples from 946 s (the deeper patient sits under the 60 edge).
// Control: with the clearance and distribution factors pinned at 1 (`pinClFactor`, `pinDistQ`) the oracle (the merge base
// 218c7d5b, with the same one-line test seam) and the blind pump (this tree) give bit-identical runs, every field and the
// propofol Ce every second, so D3 is the only cause. The pinned runs do not reproduce the old fixture itself, because
// pinning the factors also changes the patient; the old fixture was recorded with the factors live. No number fitted.
import { readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createEngine, type Command, type EngineEvent, type MonitorEngine } from '../../src/index.ts';

const FIXTURE = new URL('./fixtures/eeg-baseline.json', import.meta.url);
const WRITE = process.env.PME_EEG_BASELINE_WRITE === '1';
const FIELDS = ['diRaw', 'sr', 'cmro2Mult', 'mapSetShiftMmHg', 'awarenessRisk', 'obstruction', 'map', 'hr', 'spo2', 'paco2'] as const;
type Field = (typeof FIELDS)[number];
type Run = Record<Field, number[]>;

const ADULT = { weightKg: 70, heightCm: 170, ageY: 40, sex: 'M' as const };
const SEED = 65;
const VENT = { kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, fio2: 0.5, peep: 5 };
const SEVO_1MAC = { kind: 'vaporiser', agent: 'sevoflurane', dialPct: 2.5, fgfLpm: 6 }; // neuro-acceptance's ≈ 1 MAC dial at 40 y
const PROP_TCI = (target: number) => ({ kind: 'tci', drugId: 'propofol', mode: 'effect', target });
const ETT = { kind: 'airwayDevice', device: 'ett' };
const drug = (drugId: string, dose: number, unit: string, extra: Record<string, unknown> = {}) => ({ kind: 'drug', drugId, dose, unit, route: 'iv', ...extra });

/** Each run: its length in s and its events at their times (dispatched before the second that follows them). */
const RUNS: Record<string, { s: number; at: [number, Record<string, unknown>][]; prefix?: { of: string; s: number } }> = {
  awake: { s: 120, at: [] },
  // induction at Ce 6 µg/mL (past DI 30: SR and the CMRO2 burst-suppression branch), maintenance at 3
  propofolTci: { s: 900, at: [[60, PROP_TCI(6)], [120, ETT], [120, VENT], [360, PROP_TCI(3)]] },
  sevo1Mac: { s: 1200, at: [[0, ETT], [0, VENT], [0, SEVO_1MAC]] },
  sevoKetamine: { s: 1500, at: [[0, ETT], [0, VENT], [0, SEVO_1MAC], [600, drug('ketamine', 50, 'mg', { overS: 600 })]], prefix: { of: 'sevo1Mac', s: 600 } },
  // the hypnotic lightened under full block, then incision: the awareness flag (diRaw > 60 && TOF ≤ 2)
  propofolRocIncision: { s: 1200, at: [[60, PROP_TCI(4)], [120, drug('rocuronium', 0.6, 'mg/kg')], [180, ETT], [180, VENT], [480, PROP_TCI(1.2)], [600, { kind: 'stimulus', intensity: 1 }]] },
  emergence: { s: 1500, at: [[0, ETT], [0, VENT], [0, SEVO_1MAC], [600, { ...SEVO_1MAC, dialPct: 0 }]], prefix: { of: 'sevo1Mac', s: 600 } },
};

let n = 0;
const ev = (event: Record<string, unknown>) => ({ id: `eeg0-${++n}`, issuedBy: 'test', type: 'applyEvent', event }) as unknown as Command;
const r3 = (v: number) => Math.round(v * 1e3) / 1e3 + 0; // + 0: JSON writes -0 as 0
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const st = (e: MonitorEngine): any => (e as unknown as { st: unknown }).st;

async function record(spec: (typeof RUNS)[string]): Promise<Run> {
  const e = createEngine({ seed: SEED, mode: 'modeled', patient: ADULT });
  let an: Extract<EngineEvent, { type: 'anaesthesia' }> | null = null;
  let state: Extract<EngineEvent, { type: 'state' }> | null = null;
  e.on((x) => {
    if (x.type === 'anaesthesia') an = x;
    if (x.type === 'state') state = x;
  }, ['anaesthesia', 'state']);
  const out = Object.fromEntries(FIELDS.map((f) => [f, [] as number[]])) as Run;
  for (let t = 1; t <= spec.s; t++) {
    for (const [at, event] of spec.at) if (at === t - 1) expect(e.dispatch(ev(event)).accepted, JSON.stringify(event)).toBe(true);
    e.advanceTo(t);
    if (t % 60 === 0) await new Promise((r) => setImmediate(r));
    const s = st(e);
    const a = an as Extract<EngineEvent, { type: 'anaesthesia' }> | null;
    const v = state as Extract<EngineEvent, { type: 'state' }> | null;
    expect(a?.t, `anaesthesia event at ${t} s`).toBe(t);
    expect(v?.t, `state event at ${t} s`).toBe(t);
    const row: Record<Field, number> = {
      diRaw: s.neuro.last.d.diRaw, sr: s.neuro.last.d.sr,
      cmro2Mult: s.neuro.outputs.cmro2Mult, mapSetShiftMmHg: s.neuro.outputs.mapSetShiftMmHg,
      awarenessRisk: a!.awarenessRisk ? 1 : 0, obstruction: s.neuro.resp.obstruction,
      map: v!.signals?.map ?? Number.NaN, hr: v!.values.hr ?? Number.NaN, spo2: v!.values.spo2 ?? Number.NaN, paco2: s.resp.co2.pf,
    };
    for (const f of FIELDS) out[f].push(r3(row[f]));
  }
  return out;
}

describe('EEG stage E0 baseline: the present depth index and the physiology that reads it', { timeout: 900_000 }, () => {
  const fixture: Record<string, Run> = WRITE ? {} : JSON.parse(readFileSync(FIXTURE, 'utf8'));
  for (const [name, spec] of Object.entries(RUNS)) {
    it(`${name} (${spec.s} s, every second) equals the committed fixture`, async () => {
      const got = await record(spec);
      for (const f of FIELDS) expect(got[f].every(Number.isFinite), `${name}.${f} finite`).toBe(true);
      const from = spec.prefix?.s ?? 0;
      if (spec.prefix) for (const f of FIELDS) expect(got[f].slice(0, from), `${name}.${f} 1–${from} s = ${spec.prefix.of}`).toEqual(fixture[spec.prefix.of]?.[f].slice(0, from));
      const own = Object.fromEntries(FIELDS.map((f) => [f, got[f].slice(from)])) as Run;
      if (WRITE) { fixture[name] = own; return; }
      for (const f of FIELDS) expect(own[f], `${name}.${f} ${from + 1}–${spec.s} s`).toEqual(fixture[name]?.[f]);
    });
  }
  // One line per run and field, so a diff names the run and the quantity that moved
  const text = () => `{\n${Object.entries(fixture).map(([r, v]) => `  ${JSON.stringify(r)}: {\n${FIELDS.map((f) => `    ${JSON.stringify(f)}: ${JSON.stringify(v[f])}`).join(',\n')}\n  }`).join(',\n')}\n}\n`;
  if (WRITE) it('writes the fixture', () => { writeFileSync(FIXTURE, text()); });
});
