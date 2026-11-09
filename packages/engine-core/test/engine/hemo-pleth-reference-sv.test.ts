// Brief 79 (research/45, brief 76): the pleth's PI × SVᵢ/SV₀ reference SV₀ is the patient's OWN settled resting stroke
// volume as the running engine reaches it (engine.ts REST_AVG_S), not the stand-alone stabiliser's `circ.ref.sv`.
// Before: SV₀ = 79.1 mL while the same MANUAL adult settles at ≈ 89 mL unventilated, so the sinus-75 pulse on IPPV
// PEEP 5 (SV ≈ 85.5 mL) was drawn at ≈ 1.08× the set PI; ventilation lowers stroke volume (Michard F, Anesthesiology
// 2005;103:419–428), so it must sit below 1×. Rig: the regression suite's sinus-75 patient, seed 42.
import { describe, expect, it } from 'vitest';
import { createEngine, type Command, type PatientProfile } from '../../src/index.ts';
import { restingPatient } from '../../src/engine.ts';

let n = 0;
const cmd = (c: Record<string, unknown>) => ({ id: `sv0${++n}`, issuedBy: 'test', ...c }) as unknown as Command;
type B = { t: number; lvedv: number; lvesv: number };
type Circ = { beats: B[]; svRest?: number; ref: { sv: number } };
const circOf = (e: unknown) => (e as { st: { hemo: { circ: Circ } } }).st.hemo.circ;
const SINUS_75: PatientProfile = { baseline: { hr: 75 }, sensors: { abp: 'connected', spo2: 'on', co2: 'on' } };

/** Mean of the pleth's per-beat stroke-volume estimate (EDV − the previous beat's ESV) over [from, to] s. */
async function meanSv(vent: boolean, from: number, to: number): Promise<{ sv: number; sv0: number; refSv: number }> {
  const e = createEngine({ seed: 42, patient: SINUS_75 });
  if (vent) e.dispatch(cmd({ type: 'applyEvent', event: { kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, fio2: 0.5, peep: 5 } }));
  const seen = new Map<number, B>();
  for (let t = 1; t <= to; t++) {
    e.advanceTo(t);
    if (t > from) for (const b of circOf(e).beats) if (b.t > from) seen.set(b.t, b);
  }
  const bs = [...seen.values()].sort((a, b) => a.t - b.t);
  let s = 0;
  for (let i = 1; i < bs.length; i++) s += (bs[i] as B).lvedv - (bs[i - 1] as B).lvesv;
  const c = circOf(e);
  return { sv: s / (bs.length - 1), sv0: c.svRest as number, refSv: c.ref.sv };
}

describe('SV₀ is the patient’s own settled resting stroke volume', { timeout: 120_000 }, () => {
  it('the resting patient drops a scripted arrhythmia and its rate, and the monitor’s sensors; it keeps everything else', () => {
    expect(restingPatient(SINUS_75)).toEqual({ baseline: { hr: 75 } });
    expect(restingPatient({ baseline: { hr: 110, cvp: 8 }, rhythm: { id: 'afib' }, ageY: 60, sensors: { spo2: 'on' } })).toEqual({ baseline: { cvp: 8 }, ageY: 60 });
    expect(restingPatient({ baseline: { hr: 60 }, rhythm: { id: 'sinus' } })).toEqual({ baseline: { hr: 60 }, rhythm: { id: 'sinus' } });
    expect(restingPatient(undefined)).toBeUndefined();
  });

  it('MANUAL at rest: the pulse equals the set PI (mean SVᵢ/SV₀ within 2 % of 1); the stand-alone value sits ≈ 11 % below', async () => {
    const r = await meanSv(false, 60, 90);
    console.log(`SV0 rest MANUAL: svRest ${r.sv0.toFixed(2)} mL, settled 60–90 s ${r.sv.toFixed(2)} mL, stand-alone ref.sv ${r.refSv.toFixed(2)} mL`);
    expect(Math.abs(r.sv / r.sv0 - 1)).toBeLessThanOrEqual(0.02);
    expect(r.refSv / r.sv0).toBeLessThan(0.92); // the defect this replaces (79.1 / 89.0)
  });

  it('MANUAL on IPPV 12 × 500, PEEP 5: the pulse sits BELOW the set PI, as the stroke volume does (was ≈ 1.08×)', async () => {
    const r = await meanSv(true, 40, 70);
    console.log(`SV0 IPPV PEEP 5 MANUAL: SV ${r.sv.toFixed(2)} mL / SV0 ${r.sv0.toFixed(2)} = ${(r.sv / r.sv0).toFixed(3)} (stand-alone ${(r.sv / r.refSv).toFixed(3)})`);
    expect(r.sv / r.sv0).toBeLessThan(0.99);
    expect(r.sv / r.sv0).toBeGreaterThan(0.9);
  });

  it('an AF patient’s SV₀ is its sinus rest: the same as the default sinus patient’s; it is set at creation, for any seed, and a restored snapshot carries it', () => {
    const svOf = (patient: PatientProfile, seed: number) => {
      const e = createEngine({ seed, patient });
      return { e, sv: circOf(e).svRest as number };
    };
    const af = svOf({ baseline: { hr: 110 }, rhythm: { id: 'afib' }, sensors: { abp: 'connected', spo2: 'on' } }, 42);
    const sinus = svOf({ sensors: { abp: 'connected', spo2: 'on' } }, 7); // another seed: a patient property, not the random stream
    expect(af.sv).toBeGreaterThan(50);
    expect(Math.abs(af.sv / sinus.sv - 1)).toBeLessThanOrEqual(0.005);
    const viewer = createEngine({ seed: 3, patient: { ageY: 80 } });
    viewer.restore(af.e.snapshot());
    expect(circOf(viewer).svRest).toBe(af.sv);
  });

  it('MODELED at rest: the pulse equals the set PI × tone (mean SVᵢ/SV₀ within 2 % of 1)', async () => {
    const e = createEngine({ seed: 42, mode: 'modeled', patient: SINUS_75 });
    const seen = new Map<number, B>();
    for (let t = 1; t <= 90; t++) {
      e.advanceTo(t);
      if (t > 60) for (const b of circOf(e).beats) if (b.t > 60) seen.set(b.t, b);
    }
    const bs = [...seen.values()].sort((a, b) => a.t - b.t);
    let s = 0;
    for (let i = 1; i < bs.length; i++) s += (bs[i] as B).lvedv - (bs[i - 1] as B).lvesv;
    const sv0 = circOf(e).svRest as number;
    console.log(`SV0 rest MODELED: svRest ${sv0.toFixed(2)} mL, settled 60–90 s ${(s / (bs.length - 1)).toFixed(2)} mL`);
    expect(Math.abs(s / (bs.length - 1) / sv0 - 1)).toBeLessThanOrEqual(0.02);
  });
});
