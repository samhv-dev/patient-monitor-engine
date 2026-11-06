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
// Yields once per sim-minute (CI rule).
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
