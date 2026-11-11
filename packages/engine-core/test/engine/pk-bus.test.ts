import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/engine.ts';
import type { DrugBus } from '../../src/types-pk.ts';
import { cmd } from '../helpers/hemo.ts';

const stOf = (e: ReturnType<typeof createEngine>) => (e.snapshot().state as { st: { pk: { bus: DrugBus }; resp: { vaLpm?: number } } }).st;

describe('drug bus', () => {
  it('the lungs publish the alveolar ventilation; the vaporiser raises the MAC fraction with it (per agent, N2O included)', () => {
    const e = createEngine({ seed: 3, mode: 'modeled', patient: { ageY: 40 } });
    e.dispatch(cmd({ type: 'applyEvent', event: { kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, peep: 5 } }));
    e.dispatch(cmd({ type: 'applyEvent', event: { kind: 'vaporiser', agent: 'sevoflurane', dialPct: 2.5, fgfLpm: 4, n2oFrac: 0.5 } }));
    e.advanceTo(900);
    const st = stOf(e);
    expect(st.resp.vaLpm).toBeGreaterThan(0); // the band (> 3) is the it.fails below
    expect(st.pk.bus.volatiles.sevoflurane!.macFrac).toBeGreaterThan(0.8);
    expect(st.pk.bus.volatiles.n2o!.macFrac).toBeGreaterThan(0.3);
    expect(st.pk.bus.cns.macBrain).toBeGreaterThan(1.1);
  }, 300_000);
  // Was it.fails at 2.818 L/min: Stage 3's VT 500 − anatomical 154 − apparatus − the MANUAL EtCO2 fit vdExtraMl 61 at RR 12
  // (VD/VT 0.53). FU-4 G11: MODELED mechanical ventilation drops the MANUAL fit — measured 3.55. Band unchanged (R45).
  it('alveolar ventilation at VT 500 × 12 exceeds 3 L/min', () => {
    const e = createEngine({ seed: 3, mode: 'modeled', patient: { ageY: 40 } });
    e.dispatch(cmd({ type: 'applyEvent', event: { kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, peep: 5 } }));
    // FU-6 R9 (E-FU6-7): paralysed — an unparalysed patient triggers extra breaths since FU-6, which would "pass" this
    // dead-space check for the wrong reason (FU-4's R1 is what flips it). 1.2 mg/kg: the diaphragm is below the 5 %
    // trigger strength by 40 s (measured: 0.6 mg/kg still triggers at 60 s, strength 0.12 → VA 3.86)
    e.dispatch(cmd({ type: 'applyEvent', event: { kind: 'drug', drugId: 'rocuronium', dose: 1.2, unit: 'mg/kg', route: 'iv' } }));
    e.advanceTo(60);
    expect(stOf(e).resp.vaLpm).toBeGreaterThan(3);
  }, 300_000);
  // Pump-rack E2 (decision D3, PQ5 = A): this row asserted the PATIENT's propofol brain Ce at 2 ± 0.05 under the oracle
  // TCI. The pumps now predict with their own models, blind to the patient: in this unventilated rig the patient's
  // propofol clearance factor is 0.56 and its cardiac-output ratio 0.35 at 10 min (measured), so its brain Ce is 2.61
  // while the pump shows 2.00; remifentanil (factor 0.97) stays at 2.03. The control beside it: the same rig with both
  // factors pinned at 1 (the TEST-ONLY seams) puts the patient back on the pumps' 2. The propofol pump is typed "with
  // opioids" (Eleveld), as the rig co-administers remifentanil from t = 0.
  const busRig = (pin: boolean) => {
    const e = createEngine({ seed: 3, mode: 'modeled' });
    if (pin) Object.assign((e as unknown as { st: { pk: object } }).st.pk, { pinClFactor: 1, pinDistQ: 1 });
    e.dispatch(cmd({ type: 'applyEvent', event: { kind: 'tci', drugId: 'propofol', mode: 'effect', target: 2, opioids: true } }));
    e.dispatch(cmd({ type: 'applyEvent', event: { kind: 'tci', drugId: 'remifentanil', mode: 'effect', target: 2 } }));
    e.advanceTo(600);
    const st = (e.snapshot().state as { st: { pk: { bus: DrugBus; drugs: Record<string, { pred?: { x: number[] } }> } } }).st.pk;
    return { b: st.bus, pump: (id: string) => st.drugs[id]!.pred!.x[3] as number };
  };
  it('TCI propofol + remifentanil: the pumps\' own Ce on target; the bus carries the PATIENT\'s per-agent brain Ce, a separate remifentanil vent site, the surface exceeds the sum (no drive values: the neuro model)', () => {
    const { b, pump } = busRig(false);
    expect(pump('propofol')).toBeCloseTo(2, 1);
    expect(pump('remifentanil')).toBeCloseTo(2, 1);
    expect(b.agents.propofol!.brain).toBeGreaterThan(2.3); // the patient's lower clearance and output, which the pump does not see
    expect(b.agents.remifentanil!.brain).toBeCloseTo(2, 1);
    expect(b.agents.remifentanil!.vent).toBeCloseTo(2, 1); // at steady state both sites equal the plasma
    expect(b.cns.opioidCeRemiEq).toBeCloseTo(b.agents.remifentanil!.brain, 9);
    expect(b.cns.uSurface).toBeGreaterThan(2 / 3.08 + 2 / 1.2);
    expect('resp' in b).toBe(false); // R51 §2
  }, 300_000);
  it('control: the same rig with the clearance and distribution factors pinned at 1 — the patient is back on the pumps\' 2 ± 0.05', () => {
    const { b, pump } = busRig(true);
    expect(b.agents.propofol!.brain).toBeCloseTo(2, 1);
    expect(b.agents.remifentanil!.brain).toBeCloseTo(2, 1);
    expect(Math.abs(b.agents.propofol!.brain - pump('propofol'))).toBeLessThan(0.05);
  }, 300_000);
});
