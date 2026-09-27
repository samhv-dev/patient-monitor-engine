import { describe, expect, it } from 'vitest';
import { createL1State } from '../../../src/l1/state.ts';
import { createBloodCore, stepBloodCore, type BloodCore } from '../../../src/l2/blood/core.ts';
import { bloodMl } from '../../../src/l2/blood/fluids.ts';
import { createHemoState } from '../../../src/l2/hemo/pipeline.ts';
import { advanceOrgans, applyOrgansCommand, createOrgansState, rebaselineOrgans, validateOrgansCommand } from '../../../src/l2/organs/pipeline.ts';
import { createRespState } from '../../../src/l2/resp/pipeline.ts';
import type { Command, EngineEvent } from '../../../src/types.ts';

function setup() {
  const l1 = createL1State();
  const hemo = createHemoState(undefined, l1, 75);
  const resp = createRespState(undefined, l1, 1);
  const os = createOrgansState({ weightKg: 70 }, l1);
  let hr = 75;
  const ctx = { l1, hemo, resp, rhythm: { id: 'sinus', records: [] as EngineEvent[] }, hrNow: () => hr, setHr: (x: number) => { hr = x; } };
  rebaselineOrgans(os, ctx);
  return { os, ctx };
}
const cmd = (body: Record<string, unknown>) => ({ id: 'x', issuedBy: 't', ...body }) as Command;

describe('organ pipeline', () => {
  it('steps at 10 Hz / 1 Hz, writes icp only while the sensor is on, emits organs + measurement each second', () => {
    const { os, ctx } = setup();
    const icp: number[] = [];
    advanceOrgans(os, ctx, 125 * 3, (_ch, _m, v) => icp.push(v));
    expect(icp).toHaveLength(0);
    applyOrgansCommand(os, cmd({ type: 'attachSensor', sensor: 'icp', state: 'on' }), 3);
    advanceOrgans(os, ctx, 125 * 6, (_ch, _m, v) => icp.push(v));
    expect(icp.length).toBe(375);
    const organs = os.out.filter((e) => e.type === 'organs');
    expect(organs.length).toBe(6);
    const last = organs[organs.length - 1] as Extract<EngineEvent, { type: 'organs' }>;
    expect(last.brain.icp).toBeCloseTo(10, 0);
    expect(last.kidney.gfr).toBeGreaterThan(100);
    expect(last.liver.lactate).toBeCloseTo(1, 0);
    expect(os.kidney.gfrRel).toBeCloseTo(1, 2); // published for 7g
    expect(os.liver.glucoseF).toBe(1); // published for 7e
    const meas = os.out.filter((e) => e.type === 'measurement') as Extract<EngineEvent, { type: 'measurement' }>[];
    expect(meas[meas.length - 1]?.values.icpMean?.value).toBeCloseTo(10, 0);
  });
  it('commands: ownership (null for other stages), validation, and effects', () => {
    const { os } = setup();
    expect(validateOrgansCommand(cmd({ type: 'applyEvent', event: { kind: 'airway', state: 'apnoea' } }))).toBeNull();
    for (const drugId of ['propofol', 'mannitol', 'hypertonicSaline', 'furosemide']) {
      expect(validateOrgansCommand(cmd({ type: 'applyEvent', event: { kind: 'drug', drugId, dose: 1, unit: 'mg', route: 'iv' } }))).toBeNull(); // 7g's (R51 §3)
    }
    expect(validateOrgansCommand(cmd({ type: 'applyEvent', event: { kind: 'condition', id: 'mh', severity: 1 } }))).toBeNull();
    expect(validateOrgansCommand(cmd({ type: 'attachSensor', sensor: 'abp', state: 'connected' }))).toBeNull();
    expect(validateOrgansCommand(cmd({ type: 'applyEvent', event: { kind: 'position', headUpDeg: 120 } }))).toMatch(/0–90/);
    expect(validateOrgansCommand(cmd({ type: 'applyEvent', event: { kind: 'renal', timeScale: 50 } }))).toMatch(/1–24/);
    expect(validateOrgansCommand(cmd({ type: 'applyEvent', event: { kind: 'brain', massRateMlPerMin: 1 } }))).toBeUndefined();
    applyOrgansCommand(os, cmd({ type: 'applyEvent', event: { kind: 'brain', massRateMlPerMin: 1, oedemaMl: 5 } }), 1);
    expect(os.brain.massRate).toBe(1);
    expect(os.brain.oedema).toBe(5);
    applyOrgansCommand(os, cmd({ type: 'applyEvent', event: { kind: 'condition', id: 'tbi', severity: 1 } }), 1);
    expect(os.brain.p.pvi).toBe(20);
    applyOrgansCommand(os, cmd({ type: 'applyEvent', event: { kind: 'condition', id: 'hepaticFailure', severity: 1 } }), 1);
    expect(os.liver.failure).toBe(1);
  });
  it('observes 7g\'s bus.doses once per pass: mannitol (mg) → brain + kidney; HTS (mL, concentrationPct) → brain; others ignored', () => {
    const { os, ctx } = setup();
    const doses = [
      { agent: 'mannitol', mgPerKg: 1000, amount: 70_000, amountUnit: 'mg', t: 0.5 },
      { agent: 'hypertonicSaline', mgPerKg: null, amount: 30, amountUnit: 'mL', concentrationPct: 23.4, t: 0.5 },
      { agent: 'propofol', mgPerKg: 2, amount: 140, amountUnit: 'mg', t: 0.5 },
    ];
    const pk = { bus: { doses, cns: { cmro2Mult: 1, cbfVaso: 1 } } };
    advanceOrgans(os, { ...ctx, pk }, 125 * 1, () => {});
    expect(os.brain.osm.map((d) => Math.round(d.mosm))).toEqual([384, 240]); // 70 g × 5.49; 7.02 g NaCl × 34.2
    expect(os.renal.mannitolG).toBeCloseTo(70, 1); // minus 1 s of renal elimination
    pk.bus.doses = []; // 7g clears the log for the next pass
    advanceOrgans(os, { ...ctx, pk }, 125 * 2, () => {});
    expect(os.brain.osm).toHaveLength(2);
  });
  it('furosemide acts through 7g\'s effect-site level (no 7d depot): 1.5 × the 20 mg reference → UOP ×≈7', () => {
    const { os, ctx } = setup();
    const u0 = os.renal.uopMlMin;
    advanceOrgans(os, { ...ctx, pk: { bus: { agents: { furosemide: { brain: 1.5 } } } } }, 125 * 3, () => {});
    expect(os.renal.furoE).toBeCloseTo(0.6, 6);
    expect(os.renal.uopMlMin / u0).toBeGreaterThan(5);
  });
  // Re-specified on the real 7c (gate §10): 7c's balance has no intake term (its fallback eliminates only volume above
  // BV0), so the seam carries the urine ABOVE the basal turnover UOP0 = 1 mL/kg/h; the whole urine drained a resting
  // patient by 70 mL/h with nothing replacing it. The property is still "7d's urine is what leaves 7c's body water".
  it('7c present: writes liver function × temperature and the renal seam (urine above the basal 1 mL/kg/h, excretion mmol/h); reports 7c\'s lactate', () => {
    const { os, ctx } = setup();
    const blood = { core: { liver: 1 } as Record<string, unknown>, out: { hb: 14, albuminGL: 42, bvRel: 1, hbfRel: 1, lactate: 2.5, gluconate: 1 } };
    advanceOrgans(os, { ...ctx, blood }, 125 * 2, () => {});
    expect(blood.core.liver).toBeCloseTo(os.liver.liverFn * os.liver.tempF, 9);
    const seam = blood.core.renal as { uopAboveBasalMlH: number; excretion: { k: number; na: number; cl: number; gluconate: number } };
    expect(os.renal.uopMlMin * 60).toBeCloseTo(70, -1); // the kidney makes 1 mL/kg/h × 70 kg at rest …
    expect(seam.uopAboveBasalMlH).toBeCloseTo(Math.max(0, os.renal.uopMlMin * 60 - 70), 9); // … and only the excess leaves 7c's water
    expect(seam.uopAboveBasalMlH).toBeLessThan(10);
    expect(seam.excretion.na).toBeCloseTo((seam.uopAboveBasalMlH / 1000) * 100, 6);
    expect(seam.excretion.gluconate).toBeGreaterThan(5); // GFR 7.5 L/h × 1 mmol/L × 0.9 (exogenous: no basal intake)
    const pk = { bus: { agents: { furosemide: { brain: 1.5 } } } }; // a diuresis: the urine above basal is lost
    advanceOrgans(os, { ...ctx, blood, pk }, 125 * 4, () => {});
    const d = blood.core.renal as { uopAboveBasalMlH: number; excretion: { na: number } };
    expect(d.uopAboveBasalMlH).toBeCloseTo(os.renal.uopMlMin * 60 - 70, 9);
    expect(d.uopAboveBasalMlH).toBeGreaterThan(200);
    expect(d.excretion.na).toBeCloseTo((d.uopAboveBasalMlH / 1000) * 100 * (1 + 0.5 * os.renal.furoE), 6);
    const ev = os.out.filter((e) => e.type === 'organs').pop() as Extract<EngineEvent, { type: 'organs' }>;
    expect(ev.liver.lactate).toBe(2.5);
  });
  // FU-3 item 8 (G7d follow-through 2): the seam's field names its meaning — urine ABOVE the basal turnover. Pinned on
  // the REAL 7c core: at rest the seam is ≈ 0 and 7c's body water keeps its basal urine exactly as its own fallback
  // does (the basal 1 mL/kg/h is neither removed by the seam nor removed a second time by the fallback elimination).
  it('seam uopAboveBasalMlH on the real 7c: ≈ 0 at resting UOP, body water after 10 min = 7c\'s fallback (basal urine not removed)', () => {
    const { os, ctx } = setup();
    const man = { ageY: 40, sex: 'M' as const, weightKg: 70, heightCm: 175 };
    const seamed = createBloodCore(man, 5.25, 40);
    const fallback = createBloodCore(man, 5.25, 40);
    const water = (b: BloodCore): number => bloodMl(b.fl) + b.fl.visf;
    const step = (b: BloodCore, t: number): void => stepBloodCore(b, { t, coLpm: 5.25, paco2: 40, pao2: 95, tempC: 37, vo2Demand: 208 }, 0.1);
    step(seamed, 0);
    step(fallback, 0);
    const blood = { core: seamed, out: seamed.out };
    rebaselineOrgans(os, { ...ctx, blood }); // the engine baselines the organs on 7c's stepped `out` (gate §10 F2)
    advanceOrgans(os, { ...ctx, blood }, 125 * 2, () => {});
    expect(os.renal.uopMlMin * 60).toBeCloseTo(70, -1); // the kidney makes its basal 1 mL/kg/h …
    const seam = seamed.renal as { uopAboveBasalMlH: number };
    expect(seam.uopAboveBasalMlH).toBeGreaterThanOrEqual(0);
    expect(seam.uopAboveBasalMlH).toBeLessThan(10); // … and the seam carries only what is above it
    const w0 = water(seamed);
    for (let k = 1; k <= 6000; k++) {
      step(seamed, k / 10);
      step(fallback, k / 10);
    }
    expect(w0 - water(seamed)).toBeCloseTo(seam.uopAboveBasalMlH / 6, 0); // 10 min of the above-basal urine only
    expect(Math.abs(water(seamed) - water(fallback))).toBeLessThan(2); // a whole-urine seam: 10.55 mL short (measured)
  });
});
