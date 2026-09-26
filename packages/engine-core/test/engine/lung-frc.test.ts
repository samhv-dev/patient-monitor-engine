import { describe, expect, it } from 'vitest';
import { respOf as resp } from '../helpers/lung.ts';
import { ev3, rig3 } from '../helpers/resp.ts';

async function induce(fio2: number, weightKg = 70): Promise<number> {
  const r = rig3({ patient: { ageY: 40, weightKg, heightCm: 175, sex: 'M' } });
  r.e.dispatch(ev3({ kind: 'preoxygenate', fio2, durationS: 180 }));
  r.e.dispatch(ev3({ kind: 'thermal', anaesthesia: 'general' }));
  r.e.dispatch(ev3({ kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 490, peep: 0, ie: 2, fio2 }));
  for (let m = 1; m <= 15; m++) { r.e.advanceTo(60 * m); await new Promise((res) => setImmediate(res)); }
  const ls = resp(r.e).lung;
  const f = 1 - ((ls.aer[0] as number) * 0.45 + (ls.aer[1] as number) * 0.55);
  console.log(`lung-frc fio2 ${fio2} weight ${weightKg}: atelectasis ${f.toFixed(4)}`);
  return f;
}

describe('FRC states and induction atelectasis (tables §4.1, Q34, Edmark 2003)', { timeout: 300_000 }, () => {
  it('FiO2 1.0 at induction → ≈ 6 % atelectasis; FiO2 0.8 → ≤ 1 %; obesity (BMI 40) more', async () => {
    const f1 = await induce(1);
    const f08 = await induce(0.8);
    const obese = await induce(1, 122);
    expect(f1).toBeGreaterThan(0.04);
    expect(f1).toBeLessThan(0.08);
    expect(f08).toBeLessThan(0.012);
    expect(obese).toBeGreaterThan(f1 * 1.5);
  });
  it('a profile condition applies from t = 0 (pregnancy lowers FRC via its frc effect)', () => {
    const r = rig3({ patient: { ageY: 30, weightKg: 70, heightCm: 165, sex: 'F', lungConditions: [{ id: 'pregnancy', severity: 1 }] } });
    expect(resp(r.e).lung.lp.frcMult).toBeLessThan(1);
  });
});
