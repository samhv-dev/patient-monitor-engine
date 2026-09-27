import { describe, expect, it } from 'vitest';
import { autoregIntact, co2Factor } from '../../src/l2/brain/flow.ts';
import type { OrgansState } from '../../src/l2/organs/pipeline.ts';
import { ANURIA_ML_KG_H } from '../../src/l2/renal/params.ts';
import { organsRig, type OrgansRig } from '../helpers/organs.ts';

const organsOf = (r: OrgansRig) => (r.e as unknown as { st: { organs: OrgansState } }).st.organs;
async function holdMap(r: OrgansRig, sbp: number, dbp: number, s: number) {
  r.send({ type: 'setTarget', variable: 'sbp', value: sbp, ramp: { durationS: 20 } });
  r.send({ type: 'setTarget', variable: 'dbp', value: dbp, ramp: { durationS: 20 } });
  await r.run(s);
}
/** Tables §5.2 U(RPP): 0 at ≤ 40, linear to 1 at 100 (then 3× at 150). */
const uTables = (rpp: number) => Math.max(0, Math.min(1, (rpp - 40) / 60));

describe('Stage 7d curves through the engine (MANUAL, awake adult)', { timeout: 300_000 }, () => {
  it('autoregulation (tables A): CBF = A(CPP)·C(PaCO2) at the measured inputs; plateau 1 ± 0.05 over CPP 60–150', async () => {
    const r = organsRig({ seed: 21, patient: { weightKg: 70 } });
    await r.run(120);
    const pts: { cpp: number; a: number }[] = [];
    for (const [s, d] of [[70, 40], [85, 50], [100, 62], [120, 80], [150, 100], [185, 125]] as const) {
      await holdMap(r, s, d, 180);
      const b = r.last().brain;
      pts.push({ cpp: b.cpp, a: b.cbf / co2Factor(b.paco2) });
    }
    console.log(pts); // gate-note numbers
    for (const p of pts) expect(Math.abs(p.a - autoregIntact(p.cpp, 60, 150))).toBeLessThan(0.05);
    const plateau = pts.filter((p) => p.cpp >= 60 && p.cpp <= 150);
    expect(plateau.length).toBeGreaterThanOrEqual(3);
    for (const p of plateau) expect(Math.abs(p.a - 1)).toBeLessThanOrEqual(0.05);
    expect(pts.some((p) => p.cpp < 55)).toBe(true); // the curve's lower limb was visited
  });
  it('CO2 reactivity (tables kCO2 0.03/mmHg ±15 %): regression of CBF on PaCO2 across ventilator steps', async () => {
    const r = organsRig({ seed: 22, patient: { weightKg: 70 } });
    const xs: number[] = [];
    const ys: number[] = [];
    for (const rr of [10, 18, 30]) {
      r.send({ type: 'applyEvent', event: { kind: 'ventilation', source: 'ventilator', rr, vtMl: 500, fio2: 0.3, peep: 5 } });
      await r.run(300, () => {
        xs.push(r.last().brain.paco2);
        ys.push(r.last().brain.cbf);
      });
    }
    const mx = xs.reduce((a, x) => a + x, 0) / xs.length;
    const my = ys.reduce((a, y) => a + y, 0) / ys.length;
    const slope = xs.reduce((a, x, i) => a + (x - mx) * ((ys[i] as number) - my), 0) / xs.reduce((a, x) => a + (x - mx) ** 2, 0);
    console.log({ slope, paco2: [Math.min(...xs), Math.max(...xs)] });
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(10);
    expect(slope).toBeGreaterThanOrEqual(0.03 * 0.85);
    expect(slope).toBeLessThanOrEqual(0.03 * 1.15);
  });
  it('PVI (tables pvi 25): +1 mL at rest raises ICP by 9.65 % (±15 %) within 1 s, before CSF moves', async () => {
    const r = organsRig({ seed: 23, patient: { weightKg: 70 } });
    await r.run(60);
    const icp0 = organsOf(r).brain.icp;
    r.send({ type: 'applyEvent', event: { kind: 'brain', massMl: 1 } });
    await r.run(1);
    const rise = organsOf(r).brain.icp / icp0 - 1;
    console.log({ icp0, rise });
    expect(rise).toBeGreaterThanOrEqual(0.0965 * 0.85);
    expect(rise).toBeLessThanOrEqual(0.0965 * 1.15);
  });
  it('UOP vs RPP (tables §5.2 U): UOP0 1.0 ± 15 % at rest, U(150)/U(100) = 3 ± 15 %, RBF flat over RPP 80–180, 0 at RPP ≤ 40', async () => {
    const r = organsRig({ seed: 24, patient: { weightKg: 70 } });
    await r.run(1800);
    const rest = { uop: r.last().kidney.uopMlKgH, rbf: r.last().kidney.rbf };
    const step = async (sbp: number, dbp: number) => {
      await holdMap(r, sbp, dbp, 1800);
      const o = organsOf(r);
      return { uop: r.last().kidney.uopMlKgH, rbf: r.last().kidney.rbf, rpp: o.lp.map - Math.max(o.lp.cvp, o.iap) };
    };
    const lo = await step(128, 86); // RPP ≈ 100
    const hi = await step(180, 122); // RPP ≈ 150
    r.send({ type: 'applyEvent', event: { kind: 'renal', iapMmHg: 25 } }); // abdominal compartment: RPP = MAP − IAP
    const zero = await step(40, 22);
    console.log({ rest, lo, hi, zero }); // gate-note numbers
    expect(rest.uop).toBeGreaterThanOrEqual(0.85);
    expect(rest.uop).toBeLessThanOrEqual(1.15);
    expect(Math.abs(lo.rpp - 100)).toBeLessThan(10); // premises
    expect(Math.abs(hi.rpp - 150)).toBeLessThan(10);
    expect(hi.uop / lo.uop).toBeGreaterThanOrEqual(3 * 0.85);
    expect(hi.uop / lo.uop).toBeLessThanOrEqual(3 * 1.15);
    for (const x of [lo, hi]) expect(Math.abs(x.rbf / rest.rbf - 1)).toBeLessThan(0.05);
    expect(zero.rpp).toBeLessThanOrEqual(40);
    expect(zero.uop).toBeLessThan(ANURIA_ML_KG_H); // anuria (prototype 0.010 at RPP 37.9)
  });
  // Decision 8 deviation (Pulse's reabsorption quadratic, not the tables' linear U): the mid-curve sits above the line.
  it.fails('UOP mid-curve (tables U linear 40 → 100): U(RPP 75) = 0.58 ± 15 % (prototype 0.76, decision 8)', async () => {
    const r = organsRig({ seed: 25, patient: { weightKg: 70 } });
    await holdMap(r, 104, 66, 1800);
    const o = organsOf(r);
    const rpp = o.lp.map - o.lp.cvp;
    console.log({ rpp, uop: r.last().kidney.uopMlKgH, uTables: uTables(rpp) });
    expect(r.last().kidney.uopMlKgH / uTables(rpp)).toBeLessThanOrEqual(1.15);
  });
  // Rig re-specified on the real 7c (gate §10), band unchanged: with 7c present the AUTHORITATIVE lactate is 7c's pool
  // (R51 addendum 14: the organs event reports `blood.out.lactate`), cleared by 7c at kLac × 7c's hbfRel × the liver
  // function 7d writes into `blood.core.liver`. The rig used to load only 7d's fallback pool, which 7c's report then
  // hid (1.008 at 30 min: nothing had been loaded into the pool being reported). It now loads 7c's pool — the
  // property (the whole-body clearance half-life through 7d's liver) is the same — and still checks the fallback pool.
  it('lactate clearance (tables kLac t½ 20–60 min): 7c\'s pool (reported) and 7d\'s fallback pool from 5 mmol/L are 2.4–3.8 after 30 min (t½ 30 → 3.0)', async () => {
    const r = organsRig({ seed: 26, patient: { weightKg: 70 } });
    await r.run(60);
    const bc = (r.e as unknown as { st: { blood: { core: { so: { lac: number }; out: { lactate: number } } } } }).st.blood.core;
    bc.so.lac *= 5 / bc.out.lactate;
    organsOf(r).liver.lactate = 5;
    await r.run(1800);
    const fallback = organsOf(r).liver.lactate;
    console.log({ lactate30: r.last().liver.lactate, fallback30: fallback, liver: organsOf(r).liver.liverFn * organsOf(r).liver.tempF });
    for (const l of [r.last().liver.lactate, fallback]) {
      expect(l).toBeGreaterThanOrEqual(2.4);
      expect(l).toBeLessThanOrEqual(3.8);
    }
  });
});
