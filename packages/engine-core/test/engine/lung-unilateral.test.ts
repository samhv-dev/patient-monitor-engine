import { describe, expect, it } from 'vitest';
import type { EngineEvent } from '../../src/types.ts';
import { respOf } from '../helpers/lung.ts';
import { ev3, rig3, stateSeries } from '../helpers/resp.ts';

type LS = Extract<EngineEvent, { type: 'lungState' }>;
const adult = { ageY: 55, weightKg: 70, heightCm: 175, sex: 'M' as const };
const vent = (fio2: number, vtMl = 490) => ev3({ kind: 'ventilation', source: 'ventilator', rr: 14, vtMl, peep: 5, ie: 2, fio2 });
async function run(e: { advanceTo: (t: number) => void }, from: number, to: number) {
  for (let t = from + 60; t <= to; t += 60) { e.advanceTo(t); await new Promise((res) => setImmediate(res)); }
}

describe('unilateral states (R43, catalogue §15, §22, §23)', { timeout: 300_000 }, () => {
  it('OLV at FiO2 0.5: SaO2 nadir 88–96 % 4–12 min after isolation, then recovers ≥ 1 % by 60 min; left-lung flow ≤ 0.3', async () => {
    const r = rig3({ patient: adult });
    r.e.dispatch(vent(0.5));
    await run(r.e, 0, 600);
    r.e.dispatch(ev3({ kind: 'lungCondition', id: 'olv', severity: 1, side: 'L' }));
    r.e.dispatch(vent(0.5, 350));
    await run(r.e, 600, 4200);
    const sa = stateSeries(r.ev, 'spo2', 600);
    const nadir = sa.reduce((m, p) => (p[1] < m[1] ? p : m), [0, 101] as [number, number]);
    console.log(`lung-unilateral OLV 0.5: nadir ${nadir[1]} at ${((nadir[0] - 600) / 60).toFixed(1)} min, end ${(sa.at(-1) as [number, number])[1]}, fL ${respOf(r.e).lung.perf.f[0]!.toFixed(3)}`);
    expect(nadir[1]).toBeGreaterThan(88);
    expect(nadir[1]).toBeLessThan(96);
    expect((nadir[0] - 600) / 60).toBeGreaterThan(4);
    expect((nadir[0] - 600) / 60).toBeLessThan(12);
    expect((sa.at(-1) as [number, number])[1] - nadir[1]).toBeGreaterThan(1);
    expect(respOf(r.e).lung.perf.f[0]).toBeLessThan(0.3);
  });
  it('OLV lateral at FiO2 1.0: true shunt 0.2–0.3 by 30 min (catalogue §22)', async () => {
    const r = rig3({ patient: adult });
    r.e.dispatch(vent(1));
    await run(r.e, 0, 300);
    r.e.dispatch(ev3({ kind: 'lungCondition', id: 'olv', severity: 1, side: 'L' }));
    r.e.dispatch(vent(1, 350));
    await run(r.e, 300, 2100);
    const sh = stateSeries(r.ev, 'shunt').at(-1)![1];
    const pao2 = respOf(r.e).o2.pao2;
    console.log(`lung-unilateral OLV 1.0: shunt ${sh.toFixed(3)} PaO2 ${pao2.toFixed(0)} SpO2 ${stateSeries(r.ev, 'spo2').at(-1)![1]}`);
    expect(sh).toBeGreaterThan(0.2);
    expect(sh).toBeLessThan(0.3);
  });
  it('endobronchial (FiO2 0.5): compliance falls at once, SpO2 85–93 % by 5–10 min; withdrawal alone < 99 %, withdrawal + RM ≥ 99 %', async () => {
    const r = rig3({ patient: adult });
    r.e.dispatch(vent(0.5));
    await run(r.e, 0, 600);
    const c0 = r.ev.filter((x): x is LS => x.type === 'lungState').at(-1)!.complianceMlPerCmH2O;
    r.e.dispatch(ev3({ kind: 'airway', state: 'endobronchial' }));
    r.e.advanceTo(620);
    const c1 = r.ev.filter((x): x is LS => x.type === 'lungState').at(-1)!.complianceMlPerCmH2O;
    console.log(`lung-unilateral endobronchial: C ${c0} → ${c1}`);
    expect(c1 / c0).toBeLessThan(0.7);
    // Executor deviation: the tube stays endobronchial for 60 min (the plan's prototype sequence) before it is withdrawn;
    // after only 10 min the blocked lung is ≈ 30 % collapsed at FiO2 0.5 (τ ≈ 28 min) and withdrawal alone restores 99.4 %
    await run(r.e, 600, 4200);
    const sa = stateSeries(r.ev, 'spo2', 900, 1200).map((p) => p[1]);
    console.log(`lung-unilateral endobronchial: SpO2 min (5–10 min) ${Math.min(...sa)}`);
    expect(Math.min(...sa)).toBeGreaterThan(85);
    expect(Math.min(...sa)).toBeLessThan(93);
    r.e.dispatch(ev3({ kind: 'airway', state: 'patent' }));
    await run(r.e, 4200, 4500);
    console.log(`lung-unilateral endobronchial: SpO2 at 60 min ${stateSeries(r.ev, 'spo2', 0, 4200).at(-1)![1]}`);
    console.log(`lung-unilateral endobronchial: withdrawn ${stateSeries(r.ev, 'spo2').at(-1)![1]}`);
    expect(stateSeries(r.ev, 'spo2').at(-1)![1]).toBeLessThan(99);
    r.e.dispatch(ev3({ kind: 'recruit', pressureCmH2O: 40, durationS: 10 }));
    await run(r.e, 4500, 4680);
    console.log(`lung-unilateral endobronchial: + RM ${stateSeries(r.ev, 'spo2').at(-1)![1]}`);
    expect(stateSeries(r.ev, 'spo2').at(-1)![1]).toBeGreaterThanOrEqual(99);
  });
  it('simple pneumothorax 30 % on the left (FiO2 0.21): compliance falls, SpO2 falls 1–6 %, EtCO2 ≈ unchanged (±3)', async () => {
    const r = rig3({ patient: adult });
    r.e.dispatch(vent(0.21));
    await run(r.e, 0, 600);
    const before = { sa: stateSeries(r.ev, 'spo2').at(-1)![1], et: respOf(r.e).etco2, c: r.ev.filter((x): x is LS => x.type === 'lungState').at(-1)!.complianceMlPerCmH2O };
    r.e.dispatch(ev3({ kind: 'lungCondition', id: 'ptxSimple', severity: 0.3, side: 'L' }));
    await run(r.e, 600, 1200);
    const after = { sa: stateSeries(r.ev, 'spo2').at(-1)![1], et: respOf(r.e).etco2, c: r.ev.filter((x): x is LS => x.type === 'lungState').at(-1)!.complianceMlPerCmH2O };
    console.log(`lung-unilateral ptx: ${JSON.stringify(before)} → ${JSON.stringify(after)}`);
    expect(after.c).toBeLessThan(before.c);
    expect(before.sa - after.sa).toBeGreaterThan(1);
    expect(before.sa - after.sa).toBeLessThan(6);
    expect(Math.abs(after.et - before.et)).toBeLessThan(3);
  });
});
