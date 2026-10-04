// FU-8 Tasks A12–A13 (research/19 C5, C4; review pack "the neonatal profile is broken"): one resting pressure per age
// band, and ONE continuous body size. MODELED, seed 7, 600 s spontaneous (A12) / 300 s ventilated (A13).
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/engine.ts';
import { resolveProfile } from '../../src/l2/circ/profile.ts';

type C = { beats: Array<{ map: number; sv: number }>; qFwd: number; prof: { bloodVolumeMl: number } };
const bvOf = (sex: 'M' | 'F', weightKg: number, heightCm?: number, ageY = 40) => resolveProfile({ ageY, sex, weightKg, ...(heightCm ? { heightCm } : {}), conditions: [] }).bloodVolumeMl;
async function rest(patient: Record<string, unknown>, endS: number, vent = false, coMeanFromS = endS) {
  const e = createEngine({ seed: 7, mode: 'modeled', patient: { sex: 'M', ...patient, sensors: { abp: 'connected' } } as never });
  if (vent) {
    e.advanceTo(1);
    e.dispatch({ id: 'a', issuedBy: 'test', type: 'applyEvent', event: { kind: 'airwayDevice', device: 'ett' } } as never);
    e.dispatch({ id: 'b', issuedBy: 'test', type: 'applyEvent', event: { kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, peep: 5, fio2: 0.5 } } as never);
  }
  const circ = () => (e as unknown as { st: { hemo: { circ: C } } }).st.hemo.circ;
  for (let t = 60; t <= coMeanFromS; t += 60) {
    e.advanceTo(t);
    await new Promise((r) => setImmediate(r));
  }
  // FU-9 (E-FU9-6): the CO over [coMeanFromS, endS] is the mean of 1 s samples — over the last minute it spans several
  // ventilator cycles; a single sample (the default, coMeanFromS = endS) lands on one breath phase
  let coSum = circ().qFwd * 0.06;
  let coN = 1;
  for (let t = coMeanFromS + 1; t <= endS; t++) {
    e.advanceTo(t);
    coSum += circ().qFwd * 0.06;
    coN++;
  }
  const c = circ();
  const bs = c.beats.slice(-6);
  return { map: bs.reduce((a, b) => a + b.map, 0) / bs.length, sv: bs.reduce((a, b) => a + b.sv, 0) / bs.length, co: coSum / coN, bv: c.prof.bloodVolumeMl };
}

describe('FU-8 A12 (C5): the resting pressure follows the band set point', () => {
  it.each([
    ['term neonate 3.5 kg: MAP 45–70 (before FU-8 82–89; measured 64)', { ageY: 0.01, weightKg: 3.5 }, 45, 70],
    ['infant 7 kg: MAP 50–70 (before 98–105; measured 62)', { ageY: 0.5, weightKg: 7 }, 50, 70],
    ['child 20 kg: MAP 60–85 (before 100–105; measured 79)', { ageY: 6, weightKg: 20 }, 60, 85],
  ] as const)('%s at 600 s (PALS ranges; tables §1.1 MAP_set)', async (_n, pt, lo, hi) => {
    const r = await rest({ ...pt }, 600);
    console.log(`fu8 A12 ${_n}: MAP ${r.map.toFixed(0)}, CO ${r.co.toFixed(2)} L/min`);
    expect(r.map).toBeGreaterThanOrEqual(lo);
    expect(r.map).toBeLessThanOrEqual(hi);
  }, 120_000);
  it.fails('term neonate 3.5 kg: cardiac output ≥ 150 mL/kg/min (PALS ≈ 200) — measured 0.31 L/min = 89 mL/kg/min after FU-8 (isometric §2.2 scaling: Ali, plan "Waiting on Ali")', async () => {
    expect((await rest({ ageY: 0.01, weightKg: 3.5 }, 600)).co / 3.5).toBeGreaterThanOrEqual(0.15);
  }, 120_000);
});

describe('FU-8 A13 (C4; R50 F1, ruling 1): ONE continuous body-size rule (l2/body-size.ts)', () => {
  it('anchored: the default 70 kg adult keeps 4 900 mL (M) / 4 550 mL (F), the 70 kg elderly 4 340 — no drift', () => {
    expect(bvOf('M', 70)).toBe(4900);
    expect(bvOf('F', 70)).toBe(4550);
    expect(bvOf('M', 70, undefined, 75)).toBe(4340);
    expect(resolveProfile().bloodVolumeMl).toBe(4900);
  });
  it('blood volume rises continuously with weight, 50–160 kg, both sexes, with and without a height, ≈ 20 mL per 0.5 kg and no step (origin/main: 70 mL/kg of TOTAL weight, 35 mL per 0.5 kg; the first FU-8 draft: a BMI-30 step, 6 405 → 5 526 mL)', () => {
    for (const [sex, h] of [['M', 175], ['F', 160], ['M', undefined], ['F', undefined]] as const) {
      let prev = 0;
      for (let w = 50; w <= 160; w += 0.5) {
        const bv = bvOf(sex, w, h);
        expect(bv).toBeGreaterThan(prev);
        if (prev > 0) expect(bv - prev).toBeLessThan(25); // ≈ 20 mL per 0.5 kg: no discontinuity
        prev = bv;
      }
    }
  });
  it('stroke volume does not fall across BMI 30 at a fixed height, both sexes (before FU-8: CO −8 % (M) and −26 % (F) for one kilogram more)', async () => {
    for (const [h, lo, hi] of [[175, 91.5, 92.5], [160, 76, 77.5]] as const) {
      const sex = h === 175 ? 'M' : 'F';
      const a = await rest({ ageY: 40, sex, weightKg: lo, heightCm: h }, 300, true);
      const b = await rest({ ageY: 40, sex, weightKg: hi, heightCm: h }, 300, true);
      console.log(`fu8 A13: ${sex} ${h} cm, ${lo} → ${hi} kg: BV ${a.bv.toFixed(0)} → ${b.bv.toFixed(0)} mL, SV ${a.sv.toFixed(1)} → ${b.sv.toFixed(1)} mL`);
      expect(b.bv).toBeGreaterThan(a.bv);
      expect(b.sv).toBeGreaterThanOrEqual(a.sv);
    }
  }, 240_000);
  let a13: Promise<{ lean: Awaited<ReturnType<typeof rest>>; obese: Awaited<ReturnType<typeof rest>> }> | undefined;
  const a13Runs = () => (a13 ??= (async () => ({ lean: await rest({ ageY: 40, weightKg: 70, heightCm: 175 }, 300, true, 240), obese: await rest({ ageY: 40, weightKg: 127, heightCm: 175 }, 300, true, 240) }))());
  // E-FU9-6 (FU-9 gate, orchestrator ruling): the resting CO is the 240–300 s MEAN of 1 s samples, not ONE low-passed
  // sample at 300 s, which swings 4.63–5.36 L/min with the ventilator cycle at 70 kg — FU-9 moved the breath phase of
  // that instant (× 1.44 on main → × 1.53), not the output (means 5.049 → 5.044 and 6.970 → 6.970: × 1.38 on both
  // trees). A better measurement; the band is unchanged.
  it('127 kg / 175 cm (BMI 41): blood volume by Lemmens (6.3–6.7 L) and resting CO (240–300 s mean) 1.2–1.5 × the 70 kg adult (tables §1.3 × 1.35); before FU-8: 8.89 L and × 1.85', async () => {
    const { lean, obese } = await a13Runs();
    console.log(`fu8 A13: BV ${obese.bv.toFixed(0)} mL, CO ${obese.co.toFixed(2)} vs ${lean.co.toFixed(2)} (× ${(obese.co / lean.co).toFixed(2)}, 240–300 s means)`);
    expect(obese.bv).toBeGreaterThanOrEqual(6300);
    expect(obese.bv).toBeLessThanOrEqual(6700);
    expect(obese.co / lean.co).toBeGreaterThanOrEqual(1.2);
    expect(obese.co / lean.co).toBeLessThanOrEqual(1.5);
  }, 120_000);
  it('127 kg with NO height (the band default, 175 cm): the same patient as 127 / 175 — 6.6 L (before FU-8: 8.89 L)', () => {
    expect(bvOf('M', 127)).toBe(bvOf('M', 127, 175));
  });
});
