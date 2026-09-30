// FU-6 R3(b, c) (audit C4, E2b; suite RS3/RS8; D6–D8): obstructed efforts raise effort, not rate; the neural VT has a
// ceiling; release does not overshoot into hypocapnia. Bands: RS3 (RR never > 30 during obstruction; VT < 100 mL within
// 60 s of propofol; SaO2 < 90 within 2 min on air); D6 (during a complete obstruction the rate rises by ≤ 5/min — the
// depressed rate returns to its unloaded value, the chemical rise goes into effort); D8 (PaCO2 ≥ 38 in the 2 min after
// release: no hypocapnic overshoot); Hey 1966 (VT ceiling 35 mL/kg IBW). The post-release rate is logged, not banded
// (hyperpnoea after 3 min of asphyxia is expected; the audit's defect was the unbounded VT demand).
import { describe, expect, it } from 'vitest';
import { VT_MAX_ML_KG } from '../../src/l2/neuro/spont.ts';
import { rig6, runTo, send, st6 } from '../helpers/fu6.ts';

describe('FU-6 R3(b, c): obstruction is a load (was RR 41 at VT 200; RR 45 × 1.57 L in laryngospasm)', { timeout: 600_000 }, () => {
  it('propofol 2 mg/kg, natural airway, room air: RR ≤ 30, VT < 100 mL within 60 s, SaO2 < 90 within 2 min (measured 24.0 / 44 s / 59 s; plan 18.1 / 50 s / 55 s R1-emulated)', async () => {
    const e = rig6();
    await runTo(e, 300);
    send(e, { kind: 'drug', drugId: 'propofol', dose: 2, unit: 'mg/kg', route: 'iv' });
    let maxRr = 0;
    let tVt: number | undefined;
    let tSa: number | undefined;
    await runTo(e, 900, (t) => {
      const rs = st6(e).resp;
      const sp = rs.spont;
      maxRr = Math.max(maxRr, sp?.rr ?? 0);
      if (tVt === undefined && sp && sp.rr >= 0 && sp.vt < 100) tVt = t;
      if (tSa === undefined && rs.o2.sa < 0.9) tSa = t;
    }, 1);
    console.log(`FU-6 R3(b) C4: max RR ${maxRr.toFixed(1)}, VT < 100 at +${((tVt ?? NaN) - 300).toFixed(0)} s, SaO2 < 90 at +${((tSa ?? NaN) - 300).toFixed(0)} s`);
    expect(maxRr).toBeLessThanOrEqual(30);
    expect((tVt ?? Infinity) - 300).toBeLessThanOrEqual(60);
    expect((tSa ?? Infinity) - 300).toBeLessThanOrEqual(120);
  });
  it('3 min of complete obstruction after propofol 1 mg/kg: RR rises ≤ 5/min, effort ≥ 2, neural VT ≤ ceiling; release: PaCO2 ≥ 38 (measured 14.7 → 19.5 / 4.54 / 40.0; plan 12.6 → 16.3 / 2.25 / ≥ 41 R1-emulated)', async () => {
    const e = rig6();
    await runTo(e, 480);
    send(e, { kind: 'drug', drugId: 'propofol', dose: 1, unit: 'mg/kg', route: 'iv' });
    await runTo(e, 598);
    const rr0 = st6(e).resp.spont.rr as number;
    send(e, { kind: 'airway', state: 'obstructed' });
    let maxRr = 0;
    let maxVtNeural = 0;
    await runTo(e, 780, () => {
      const sp = st6(e).resp.spont;
      maxRr = Math.max(maxRr, sp.rr);
      maxVtNeural = Math.max(maxVtNeural, (sp.effort ?? 0) * 500);
    }, 1);
    const effort = st6(e).resp.spont.effort as number;
    send(e, { kind: 'airway', state: 'patent' });
    let minPa = Infinity;
    let maxRrAfter = 0;
    await runTo(e, 900, () => {
      minPa = Math.min(minPa, st6(e).resp.co2.pf);
      maxRrAfter = Math.max(maxRrAfter, st6(e).resp.spont.rr);
    }, 1);
    console.log(`FU-6 R3(b) E2b: RR ${rr0.toFixed(1)} → max ${maxRr.toFixed(1)}; effort ${effort.toFixed(2)}; neural VT max ${maxVtNeural.toFixed(0)}; release min PaCO2 ${minPa.toFixed(1)}, max RR ${maxRrAfter.toFixed(1)}`);
    expect(maxRr).toBeLessThanOrEqual(rr0 + 5);
    expect(effort).toBeGreaterThanOrEqual(2);
    expect(maxVtNeural).toBeLessThanOrEqual(VT_MAX_ML_KG * 70 + 1);
    expect(minPa).toBeGreaterThanOrEqual(38);
  });
});
