// Stage 3 / 3.1 / 7b oxygen numbers with the Stage 7c blood in the engine (Hb 15, live pH/Bohr, Dash–Bassingthwaighte
// through 7b's mixing point — exception E-7c-1).
import { describe, expect, it } from 'vitest';
import { respOf } from '../helpers/lung.ts';
import { ADULT, desatTime, ev3, rig3, stateSeries } from '../helpers/resp.ts';

describe('Stage 3 acceptance re-check with the blood', { timeout: 300_000 }, () => {
  it('desaturation: preoxygenated 8 ± 1.5 min; room air 35–60 s (R39-1); child 160 ± 30 s; obese ≈ 2.7 min', async () => {
    const pre = await desatTime(ADULT, true);
    const room = await desatTime(ADULT, false);
    const child = await desatTime({ ageY: 4, weightKg: 16, baseline: { rr: 24, vt: 130 } }, true);
    const obese = await desatTime({ ageY: 40, weightKg: 127, heightCm: 175, sex: 'M' }, true);
    console.log(`RECHECK preox ${pre.toFixed(0)} s, room ${room.toFixed(1)} s, child ${child.toFixed(1)} s, obese ${obese.toFixed(0)} s`);
    expect(pre / 60).toBeGreaterThanOrEqual(6.5);
    expect(pre / 60).toBeLessThanOrEqual(9.5);
    expect(room).toBeGreaterThanOrEqual(35);
    expect(room).toBeLessThanOrEqual(60);
    expect(child).toBeGreaterThanOrEqual(130);
    expect(child).toBeLessThanOrEqual(190);
    expect(obese / 60).toBeGreaterThanOrEqual(1.7);
    expect(obese / 60).toBeLessThanOrEqual(3.7);
  });
  it('7b OLV at FiO2 0.5, hypercapnic RR 14 rig (the assertions that hold with the Bohr shift; the nadir TIME moves — the normocapnic rig of lung-unilateral, R51 addendum 15, holds all of them)', async () => {
    const r = rig3({ patient: { ageY: 55, weightKg: 70, heightCm: 175, sex: 'M' } });
    const vent = (vtMl: number) => ev3({ kind: 'ventilation', source: 'ventilator', rr: 14, vtMl, peep: 5, ie: 2, fio2: 0.5 });
    r.e.dispatch(vent(490));
    for (let t = 60; t <= 600; t += 60) { r.e.advanceTo(t); await new Promise((res) => setImmediate(res)); }
    r.e.dispatch(ev3({ kind: 'lungCondition', id: 'olv', severity: 1, side: 'L' }));
    r.e.dispatch(vent(350));
    for (let t = 660; t <= 4200; t += 60) { r.e.advanceTo(t); await new Promise((res) => setImmediate(res)); }
    const sa = stateSeries(r.ev, 'spo2', 600);
    const nadir = sa.reduce((m, p) => (p[1] < m[1] ? p : m), [0, 101] as [number, number]);
    const ph = (r.e as unknown as { st: { blood: { core: { ab: { ph: number } } } } }).st.blood.core.ab.ph;
    console.log(`RECHECK OLV: nadir ${nadir[1].toFixed(1)} % at ${((nadir[0] - 600) / 60).toFixed(1)} min, fL ${respOf(r.e).lung.perf.f[0]!.toFixed(3)}, pH ${ph.toFixed(2)}`);
    expect(nadir[1]).toBeGreaterThan(88);
    expect(nadir[1]).toBeLessThan(96);
    expect(respOf(r.e).lung.perf.f[0]).toBeLessThan(0.3);
  });
});
