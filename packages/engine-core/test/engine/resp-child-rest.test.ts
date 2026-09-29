// Stage V.1 (E-V1-1; orchestrator ruling on G7e question 3, Q-7e-8): the Stage 3 child rig (4 y, 16 kg, RR 24, VT 130,
// no height) rests at normal gases. The CO-ratio reference was the ADULT 5.25 L/min, so the child's own resting CO
// (≈ 1.3 L/min from 7a) read as a low-flow state (coRatio 0.24): the capnogram was compressed ×0.42, the MANUAL EtCO2
// calibration answered by adding 70 mL of dead space, and the child sat at PaCO2 94 and SaO2 0.33–0.46 on room air
// while the display read EtCO2 36. Expected for that child: PaCO2 35–42 (brief §4.4) and SaO2 ≥ 0.96 at rest.
// During CPR the reference stays the adult CO_REF_LPM: cardiacOutput() returns an ADULT-absolute compression flow
// (orchestrator ruling (V.1 review) 2; without the guard the child in CPR read coRatio 1.28, a normal-flow capnogram).
import { describe, expect, it } from 'vitest';
import { CO_REF_LPM, coRefLpm, gasPatient } from '../../src/l2/gas/params.ts';
import { respOf } from '../helpers/lung.ts';
import { ADULT, cmd, ev3, rig3, run, stateSeries } from '../helpers/resp.ts';

const CHILD = { ageY: 4, weightKg: 16, baseline: { rr: 24, vt: 130 } };

describe('E-V1-1: the CO-ratio reference is the patient\'s own resting flow', { timeout: 300_000 }, () => {
  it('70 kg adult: 5.25 L/min exactly as before (Stage 3 unchanged); 16 kg child: 1.2 L/min', () => {
    expect(coRefLpm(gasPatient(ADULT))).toBeCloseTo(CO_REF_LPM, 9);
    expect(coRefLpm(gasPatient(CHILD))).toBeCloseTo(1.2, 9);
  });
  it('the Stage 3 child at rest on room air under GA: coRatio 0.9–1.2, PaCO2 35–42, true SaO2 ≥ 96 % (mean, 60–180 s)', async () => {
    const { e, ev } = rig3({ patient: CHILD });
    e.dispatch(ev3({ kind: 'thermal', anaesthesia: 'general' }));
    for (const t of [60, 120, 180]) {
      await run(e, t);
      const rs = respOf(e);
      expect(rs.coRatio, `coRatio at ${t} s`).toBeGreaterThan(0.9);
      expect(rs.coRatio).toBeLessThan(1.2);
      expect(rs.co2.pf, `PaCO2 at ${t} s`).toBeGreaterThanOrEqual(35);
      expect(rs.co2.pf).toBeLessThanOrEqual(42);
    }
    const sa = stateSeries(ev, 'spo2', 60, 180).map(([, v]) => v);
    console.log(`CHILD SaO2 60–180 s: mean ${(sa.reduce((a, b) => a + b, 0) / sa.length).toFixed(2)}, min ${Math.min(...sa).toFixed(2)}; PaCO2 ${respOf(e).co2.pf.toFixed(1)}`);
    expect(sa.reduce((a, b) => a + b, 0) / sa.length).toBeGreaterThanOrEqual(96); // the resting value (the 1 Hz truth ripples ±1 with the breaths)
    expect(Math.min(...sa)).toBeGreaterThan(94);
  });
  it('CPR keeps the adult reference (cardiacOutput returns an adult-absolute compression flow, SV_REF 70 mL × CPR_SV_FRAC): a 16 kg child in CPR (quality 1, 110/min) keeps coRatio ≈ 0.29 as before V.1 — not 1.28', async () => {
    const cpr = async (patient: typeof CHILD | typeof ADULT) => {
      const { e } = rig3({ patient });
      await run(e, 30);
      e.dispatch(cmd({ type: 'setRhythm', rhythm: 'vfCoarse', when: 'now' }));
      e.dispatch(ev3({ kind: 'cpr', active: true, rate: 110, quality: 1 }));
      await run(e, 60);
      return respOf(e).coRatio;
    };
    const child = await cpr(CHILD);
    const adult = await cpr(ADULT);
    console.log(`CPR coRatio child ${child.toFixed(3)}, adult ${adult.toFixed(3)}`);
    expect(child).toBeGreaterThan(0.25);
    expect(child).toBeLessThan(0.33);
    expect(child).toBeCloseTo(adult, 2);
  });
});
