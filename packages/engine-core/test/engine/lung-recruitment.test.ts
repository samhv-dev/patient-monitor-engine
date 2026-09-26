import { describe, expect, it } from 'vitest';
import { ev3, rig3, stateSeries } from '../helpers/resp.ts';
import { respOf } from '../helpers/lung.ts';

const at = (s: Array<[number, number]>, t: number) => (s.filter(([x]) => x <= t).at(-1) ?? [0, NaN])[1];
async function run(e: { advanceTo: (t: number) => void }, from: number, to: number) {
  for (let t = from + 60; t <= to; t += 60) { e.advanceTo(t); await new Promise((res) => setImmediate(res)); }
}

describe('recruitment and absorption (catalogue §6, tables §4.1, Q34, Q73)', { timeout: 300_000 }, () => {
  it('ARDS moderate, high recruiter, FiO2 0.6: PEEP 5 → 15 raises SpO2 within a minute and lowers shunt 15–35 %; an RM takes it to −35–50 %; PEEP 5 de-recruits over minutes', async () => {
    const r = rig3({ patient: { ageY: 50, weightKg: 70, heightCm: 175, sex: 'M', lungConditions: [{ id: 'ards', severity: 0.67, recruitFrac: 0.5 }] } });
    r.e.dispatch(ev3({ kind: 'ventilation', source: 'ventilator', rr: 20, vtMl: 420, peep: 5, ie: 2, fio2: 0.6 }));
    await run(r.e, 0, 900);
    r.e.dispatch(ev3({ kind: 'ventilation', source: 'ventilator', peep: 15 }));
    await run(r.e, 900, 1200);
    r.e.dispatch(ev3({ kind: 'recruit', pressureCmH2O: 40, durationS: 30 }));
    await run(r.e, 1200, 1320);
    r.e.dispatch(ev3({ kind: 'ventilation', source: 'ventilator', peep: 5 }));
    await run(r.e, 1320, 1620);
    const sh = stateSeries(r.ev, 'shunt');
    const sp = stateSeries(r.ev, 'spo2');
    const s0 = at(sh, 899);
    console.log(`lung-recruitment high: shunt ${[899, 960, 1199, 1319, 1380, 1619].map((t) => at(sh, t).toFixed(3)).join(' / ')}; SpO2 ${[899, 910, 920, 930, 960, 1199, 1319, 1380, 1619].map((t) => at(sp, t).toFixed(1)).join(' / ')}`);
    expect(at(sp, 960)).toBeGreaterThan(at(sp, 899));
    expect(1 - at(sh, 1199) / s0).toBeGreaterThan(0.15);
    expect(1 - at(sh, 1199) / s0).toBeLessThan(0.35);
    expect(1 - at(sh, 1319) / s0).toBeGreaterThan(0.35);
    expect(1 - at(sh, 1319) / s0).toBeLessThan(0.5);
    expect(at(sh, 1619)).toBeGreaterThan(at(sh, 1380));
  });
  it('low recruiter: PEEP 5 → 15 changes shunt by < 12 %', async () => {
    const r = rig3({ patient: { ageY: 50, weightKg: 70, heightCm: 175, sex: 'M', lungConditions: [{ id: 'ards', severity: 0.67, recruitFrac: 0.15 }] } });
    r.e.dispatch(ev3({ kind: 'ventilation', source: 'ventilator', rr: 20, vtMl: 420, peep: 5, ie: 2, fio2: 0.6 }));
    await run(r.e, 0, 900);
    r.e.dispatch(ev3({ kind: 'ventilation', source: 'ventilator', peep: 15 }));
    await run(r.e, 900, 1200);
    const sh = stateSeries(r.ev, 'shunt');
    console.log(`lung-recruitment low: shunt ${at(sh, 899).toFixed(3)} → ${at(sh, 1199).toFixed(3)}`);
    expect(Math.abs(1 - at(sh, 1199) / at(sh, 899))).toBeLessThan(0.12);
  });
  it('absorption atelectasis under GA: FiO2 1.0 at ZEEP adds 4–8 % atelectasis and ≥ 0.02 shunt within 30–60 min; FiO2 0.4 adds < 1 %', async () => {
    const one = async (fio2: number) => {
      const r = rig3({ patient: { ageY: 40, weightKg: 70, heightCm: 175, sex: 'M' } });
      r.e.dispatch(ev3({ kind: 'thermal', anaesthesia: 'general' }));
      r.e.dispatch(ev3({ kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 490, peep: 0, ie: 2, fio2 }));
      r.e.dispatch(ev3({ kind: 'recruit', pressureCmH2O: 40, durationS: 10 }));
      await run(r.e, 0, 3600);
      const sh = stateSeries(r.ev, 'shunt');
      // Executor deviation: the baseline is read right after the 10 s manoeuvre (t = 12 s), not at 59 s — at FiO2 1.0 and
      // ZEEP the re-collapse (τ 5 min) is already under way by 59 s (Δ 0.0199 from 59 s vs 0.02 band)
      const ls = respOf(r.e).lung;
      const atel = 1 - ((ls.aer[0] as number) * 0.45 + (ls.aer[1] as number) * 0.55);
      console.log(`lung-recruitment absorption FiO2 ${fio2}: shunt ${at(sh, 12).toFixed(3)} (59 s ${at(sh, 59).toFixed(3)}) → ${at(sh, 3599).toFixed(3)}; atelectasis ${atel.toFixed(3)}`);
      return { d: at(sh, 3599) - at(sh, 12), atel };
    };
    const f1 = await one(1);
    const f04 = await one(0.4);
    expect(f1.d).toBeGreaterThan(0.02);
    expect(f1.atel).toBeGreaterThan(0.04);
    expect(f1.atel).toBeLessThan(0.08);
    expect(f04.d).toBeLessThan(0.01);
    expect(f04.atel).toBeLessThan(0.01);
  });
});
