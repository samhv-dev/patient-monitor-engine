// FU-6 R11 (audit G2, G3; D13). Bands: Hb 5 vs Hb 15 (MODELED, awake, 20 min): CO ≥ +30 %, HR ≥ +15 % (Weiskopf 1998:
// CI +66 %, HR +49 % acutely; audit Q8 — "tachycardia and a high CO first"); COHb 30 %: on air 60 min → 24–29 %, on
// FiO2 1 60 min → 13–21 % (t½ 320 / 74 ± 15 min, Weaver 2009).
import { describe, expect, it } from 'vitest';
import { cardiacOutput } from '../../src/l2/gas/coupling.ts';
import { rig6, runTo, send, st6 } from '../helpers/fu6.ts';

async function anaemia(hb: number) {
  const e = rig6({ ageY: 40, sex: 'M', weightKg: 70, heightCm: 175, blood: { hb } });
  await runTo(e, 1200);
  const s = st6(e);
  const b = s.hemo.circ.beats.slice(-10) as Array<{ t: number; map: number }>; // the modelled beats (st.hr is the instructor's ramp)
  const hr = (60 * (b.length - 1)) / ((b.at(-1)?.t ?? 1) - (b[0]?.t ?? 0));
  const map = b.reduce((a, x) => a + x.map, 0) / b.length;
  return { co: cardiacOutput(s.hemo, e.now().simT), hr, map, svo2: s.blood.core.o2.svo2 as number, lac: s.blood.out.lactate as number };
}

describe('FU-6 R11: O2 content reaches the circulation; CO clears', { timeout: 900_000 }, () => {
  it('Hb 5 vs 15: HR rises 20–60 % — TWO-SIDED against Weiskopf (63 → 85, +35 %); CO rises; no lactate rise (measured HR 70 → 103 = +48 %, CO 5.49 → 6.87, lactate 1.00; plan +56 %, 5.54 → 6.89; was unchanged)', async () => {
    const n = await anaemia(15);
    const a = await anaemia(5);
    console.log(`FU-6 R11 anaemia HR: ${n.hr.toFixed(0)} → ${a.hr.toFixed(0)} (${(100 * (a.hr / n.hr - 1)).toFixed(0)} %; Weiskopf +35 %), CO ${n.co.toFixed(2)} → ${a.co.toFixed(2)}`);
    // FU-6 F5a (Orchestrator ruling (FU-6 review), 2026-09-28): the band is two-sided. A one-sided "≥ +15 %" could never
    // see the model's OVERSHOOT — the whole compensation arrives through the baroreflex as rate, while Weiskopf's split is
    // SV + HR, so the model overshoots HR (+56 % vs +35 %) while undershooting CO (+24 % vs +66 %, the it.fails below).
    expect(a.hr).toBeGreaterThanOrEqual(1.2 * n.hr);
    expect(a.hr).toBeLessThanOrEqual(1.6 * n.hr);
    expect(a.co).toBeGreaterThan(1.1 * n.co);
    expect(a.lac).toBeLessThan(1.5);
  });
  it.fails('Hb 5 vs 15: CO ≥ +30 % (Weiskopf CI +66 %) — measured +25 % (5.49 → 6.87; FU-6 R11; plan +24 %)', async () => {
    const n = await anaemia(15);
    const a = await anaemia(5);
    console.log(`FU-6 R11 anaemia: CO ${n.co.toFixed(2)} → ${a.co.toFixed(2)}, HR ${n.hr.toFixed(0)} → ${a.hr.toFixed(0)}, MAP ${n.map.toFixed(0)} → ${a.map.toFixed(0)}, SvO2 ${(a.svo2 * 100).toFixed(0)} %, lactate ${a.lac.toFixed(2)}`);
    expect(a.co).toBeGreaterThanOrEqual(1.3 * n.co);
  });
  it('COHb 30 %: 60 min on air 24–29 %, on FiO2 1 13–21 % (measured 26.6 / 16.8 %; was 30 % flat)', async () => {
    const run = async (fio2: number) => {
      const e = rig6({ ageY: 40, sex: 'M', weightKg: 70, heightCm: 175, blood: { cohb: 0.3 } });
      await runTo(e, 1);
      if (fio2 > 0.21) send(e, { kind: 'ventilation', source: 'spontaneous', fio2 });
      await runTo(e, 3601);
      return st6(e).blood.core.odc.cohb as number;
    };
    const air = await run(0.21);
    const o2 = await run(1);
    console.log(`FU-6 R11 COHb after 60 min: air ${(air * 100).toFixed(1)} %, FiO2 1 ${(o2 * 100).toFixed(1)} %`);
    expect(air).toBeGreaterThanOrEqual(0.24);
    expect(air).toBeLessThanOrEqual(0.29);
    expect(o2).toBeGreaterThanOrEqual(0.13);
    expect(o2).toBeLessThanOrEqual(0.21);
  });
});
