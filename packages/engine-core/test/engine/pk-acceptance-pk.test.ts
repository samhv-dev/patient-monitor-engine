import { describe, expect, it } from 'vitest';
import { cp, pkStep, pkSystem, zeroState } from '../../src/l2/pk/compartment.ts';
import { eleveldPropofol, mintoRemifentanil, schniderPropofol } from '../../src/l2/pk/models.ts';
import type { MonitorEngine } from '../../src/types.ts';
import { runPk } from '../helpers/pk.ts';

describe('drug acceptance — PK through the engine', () => {
  // Stage 7c (R51 addendum 15, ruling 4): with the blood on main 7g's high-extraction clearance follows 7c's live hepatic
  // flow (blood.out.hbfRel), which is correct behaviour. The equality is asserted with hbfRel pinned to 1 through 7c's
  // test-only seam (`blood.pinHbfRel`); the second assertion documents the flow-scaled value.
  it('Eleveld 2 mg/kg in the engine equals the standalone model to 1e-9 (the engine adds no PK error)', async () => {
    const pat = { ageY: 35, weightKg: 70, heightCm: 170, sex: 'M' as const };
    const dose: [number, Record<string, unknown>][] = [[60, { kind: 'drug', drugId: 'propofol', dose: 2, unit: 'mg/kg', route: 'iv' }]];
    const pinHbf = (e: MonitorEngine) => {
      const b = (e as unknown as { st: { blood?: { pinHbfRel?: number } } }).st.blood;
      if (b) b.pinHbfRel = 1;
      // FU-4 G10 (E-FU4-10, precedent E-7e-6): propofol's distribution now follows cardiac output (distFactor), and
      // propofol lowers its own CO — the equality is a property under PINNED conditions, so the output ratio is pinned
      // at 1 through 7g's test-only seam; the live run below documents the unpinned value.
      (e as unknown as { st: { pk: { pinDistQ?: number } } }).st.pk.pinDistQ = 1;
    };
    // R51 addendum 18: with 7e + 7f the anaesthetised core cools by redistribution and 7g's −5 %/°C clearance acts;
    // the equality holds at pinned conditions, so the core is pinned at normothermia too (7e's test seam pinCoreTemp)
    const pin = (e: MonitorEngine) => {
      pinHbf(e);
      (e as unknown as { st: { resp: { temp: { pinCoreTemp?: number } } } }).st.resp.temp.pinCoreTemp = 36.8;
    };
    const r = await runPk(pat, dose, 300, 11, { setup: pin });
    const row = r.drugs.find((d) => Math.abs(d.t - 240) < 1e-6)!.drugs.find((x) => x.id === 'propofol')!;
    const p = eleveldPropofol({ ageY: 35, weightKg: 70, heightCm: 170, sex: 'm' });
    const s = pkSystem(p, 0.1);
    let x = zeroState(p);
    x[0] = 140;
    for (let k = 0; k < 1800; k++) x = pkStep(s, x, 0);
    expect(row.ce).toBeCloseTo(x[3]!, 6);
    expect(row.cp).toBeCloseTo(cp(p, x), 6);
    // temperature-scaled (hbfRel pinned, core free): the core is 36.65 °C at 240 s and the hypothermic clearance
    // (−5 %/°C) leaves Ce 2.996568 (2.996590 after FU-10), 0.02 % above the standalone model (addendum 18: documents the live temperature term)
    const cool = await runPk(pat, dose, 300, 11, { setup: pinHbf });
    const coolCe = cool.drugs.find((d) => Math.abs(d.t - 240) < 1e-6)!.drugs.find((x) => x.id === 'propofol')!.ce;
    const tc = (cool.e.snapshot().state as { st: { resp: { temp: { tc: number } } } }).st.resp.temp.tc;
    console.log(`Eleveld Ce at 3 min with the core free: ${coolCe.toFixed(6)} (core ${tc.toFixed(2)} °C at 300 s; standalone ${x[3]!.toFixed(6)})`);
    // FU-10 Gate (E-FU10-13): the tables' GA vasoconstriction threshold (34.5 °C, ruling R-4) and the depth cap leave the
    // anaesthetised patient vasodilated a little longer, so the free core cools slightly faster in these 4 min and the
    // documented Ce moves 2.996568 → 2.996590 (core 36.61 °C at 300 s either way, to 2 decimals); precision unchanged
    expect(coolCe).toBeCloseTo(2.996590, 5);
    expect(coolCe).toBeGreaterThan(x[3]!);
    // flow-scaled (hbfRel live): propofol lowers CO, so hepatic flow and clearance fall and Ce runs above the standalone value
    const live = (await runPk(pat, dose, 300)).drugs.find((d) => Math.abs(d.t - 240) < 1e-6)!.drugs.find((x) => x.id === 'propofol')!;
    console.log(`Eleveld Ce at 3 min: standalone ${x[3]!.toFixed(4)}, engine hbfRel pinned ${row.ce.toFixed(4)}, live ${live.ce.toFixed(4)}`);
    expect(live.ce).toBeGreaterThan(x[3]!);
    expect(live.ce).toBeLessThan(1.1 * x[3]!);
  }, 300_000);
  // Pump-rack E2 (decision D3, PQ5 = A): the targets are the PUMPS' — each predicts with its own set and the typed data
  // (the propofol pump typed "with opioids", as remifentanil runs from t = 10) and never sees the patient. Before E2 this
  // row asserted the patient's Ce at 4 and 3 under the oracle controller. Measured at 900 s: the pumps 4.0000 / 3.00,
  // the patient's propofol 4.32 (its clearance and cardiac-output factors under the induction, which the pump does not
  // see; with the pump typed "without opioids" the patient reaches 5.17 — the flag is the learner's to type). The control
  // below (both factors pinned at 1) returns the patient to 4.0000.
  const induction = (pin: boolean) => runPk({ ageY: 45, weightKg: 80, heightCm: 178, sex: 'M' }, [
    [10, { kind: 'tci', drugId: 'propofol', mode: 'effect', target: 4, opioids: true }],
    [10, { kind: 'tci', drugId: 'remifentanil', mode: 'effect', target: 3 }],
  ], 900, 11, pin ? { setup: (e) => Object.assign((e as unknown as { st: { pk: object } }).st.pk, { pinClFactor: 1, pinDistQ: 1 }) } : {});
  type Run = Awaited<ReturnType<typeof induction>>;
  const ev = (r: Run, t: number) => r.drugs.find((d) => Math.abs(d.t - t) < 1e-6)!;
  const pump = (r: Run, t: number, id: string) => ev(r, t).tciPumps!.find((x) => x.drugId === id)!.ce;
  const patient = (r: Run, t: number, id: string) => ev(r, t).drugs.find((x) => x.id === id)!.ce;
  it('TCI induction propofol Ce 4 (Eleveld) + remifentanil Ce 3 (Minto): the pumps reach their targets in < 3 min and hold them; the patient\'s propofol sits above (E2, D3)', async () => {
    const r = await induction(false);
    expect(pump(r, 190, 'propofol')).toBeGreaterThan(3.8);
    expect(pump(r, 190, 'remifentanil')).toBeGreaterThan(2.85);
    expect(pump(r, 900, 'propofol')).toBeCloseTo(4, 1);
    expect(pump(r, 900, 'remifentanil')).toBeCloseTo(3, 1);
    expect(patient(r, 190, 'propofol')).toBeGreaterThan(3.8);
    expect(patient(r, 900, 'propofol')).toBeGreaterThan(4.1);
  }, 300_000);
  it('control: the same induction with the clearance and distribution factors pinned at 1 — the patient is on the pumps\' 4 and 3 ± 0.05', async () => {
    const r = await induction(true);
    expect(patient(r, 900, 'propofol')).toBeCloseTo(4, 1);
    expect(patient(r, 900, 'remifentanil')).toBeCloseTo(3, 1);
  }, 300_000);
  it('Schnider vs Eleveld at the same effect target: Schnider front-loads less drug in minute 1 (53 vs 140 mg at 35 y)', () => {
    const pat = { ageY: 35, weightKg: 70, heightCm: 170, sex: 'm' as const };
    expect(schniderPropofol(pat).v1).toBeLessThan(eleveldPropofol(pat).v1);
    expect(mintoRemifentanil({ ...pat, ageY: 80 }).ke0[0]).toBeLessThan(mintoRemifentanil(pat).ke0[0]!);
  });
  it('the panel shows a decrement time for a running remifentanil infusion of 2–4 min after 60 min', async () => {
    const r = await runPk({}, [[0, { kind: 'infusion', drugId: 'remifentanil', rate: 0.2, unit: 'mcg/kg/min' }]], 3600);
    const last = r.drugs.at(-1)!.drugs.find((x) => x.id === 'remifentanil')!;
    expect(last.decrement50Min).toBeGreaterThan(1.8);
    expect(last.decrement50Min).toBeLessThan(4);
  }, 600_000);
});
