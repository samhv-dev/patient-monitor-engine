// Stress hormones and their effects (tables §5c; annex B3 Pulse basal concentrations/clearance).
import { describe, expect, it } from 'vitest';
import { stressEffects } from '../../../src/l2/endo/effects.ts';
import { HUM_DEADBAND_MMHG, HUM_EC50_MMHG, HUM_OFF_TAU_S, HUM_ON_TAU_S, HUM_SVR, HUM_V0 } from '../../../src/l2/endo/params.ts';
import { NEUTRAL_ENDO_INPUTS } from '../../../src/l2/endo/core.ts';
import { createHormones, stepHormones, type HormoneInputs } from '../../../src/l2/endo/hormones.ts';

const REST: HormoneInputs = { noxious: 0, antinoc: 0, extraSymp: 0, glucoseMgDl: 100, mapSetMmHg: 85, mapMmHg: 85, sao2: 0.97, paco2: 40, cortResponse: 1, epiExoPgMl: 0 };
const NO_BB = { hr: 0, c: 0 };

function stimulus(antinoc: number): number[] {
  const h = createHormones();
  const hr: number[] = [];
  for (let s = 1; s <= 900; s++) {
    stepHormones(h, { ...REST, noxious: s > 60 && s <= 360 ? 1 : 0, antinoc }, 1);
    hr.push(stressEffects(h, NO_BB, 1).hrF);
  }
  return hr;
}

describe('stress hormones', () => {
  it('at rest: basal epinephrine 34 and norepinephrine 275 pg/mL, cortisol 400 nmol/L, every effect exactly 1', () => {
    const h = createHormones();
    for (let s = 0; s < 3600; s++) stepHormones(h, REST, 1);
    expect(h.epi).toBeCloseTo(34, 9);
    expect(h.ne).toBeCloseTo(275, 9);
    expect(h.cort).toBeCloseTo(400, 9);
    const e = stressEffects(h, NO_BB, 1);
    expect([e.hrF, e.svrF, e.eesF, e.egpF, e.siF, e.secF, e.vasoResp]).toEqual([1, 1, 1, 1, 1, 1, 1]);
    expect(e.kShift).toBeCloseTo(0, 12);
  });

  it('stimulus 1.0 without antinociception: HR +15–25 % (tables §5c), onset τ 20–40 s, offset τ 2–4 min', () => {
    const hr = stimulus(0);
    const top = hr[359]! - 1;
    expect(top).toBeGreaterThanOrEqual(0.15);
    expect(top).toBeLessThanOrEqual(0.25);
    const on = hr.findIndex((v) => v - 1 >= 0.632 * top) + 1 - 60;
    expect(on).toBeGreaterThanOrEqual(20);
    expect(on).toBeLessThanOrEqual(40);
    const off = hr.slice(360).findIndex((v) => v - 1 <= 0.368 * top) + 1;
    expect(off).toBeGreaterThanOrEqual(120);
    expect(off).toBeLessThanOrEqual(240);
  });

  it('general anaesthesia (fallback antinociception 0.6) blunts the response to ≤ half', () => {
    expect(stimulus(0.6)[359]! - 1).toBeLessThanOrEqual(0.5 * (stimulus(0)[359]! - 1));
  });

  it('surgery raises cortisol 400 → > 1500 nmol/L at 4–6 h (tables §5c: > 1500, peak 4–6 h)', () => {
    const h = createHormones();
    const at: number[] = [];
    for (let s = 1; s <= 6 * 3600; s++) {
      stepHormones(h, { ...REST, noxious: 1, antinoc: 0.6 }, 1);
      if (s % 3600 === 0) at.push(h.cort);
    }
    expect(at[3]!).toBeGreaterThan(1500);
    expect(at[5]!).toBeGreaterThan(1500);
  });

  it('endogenous epinephrine clears with t½ ≈ 2 min (Pulse clearance, Vd 0.2 L/kg)', () => {
    const h = createHormones();
    for (let s = 0; s < 1800; s++) stepHormones(h, { ...REST, glucoseMgDl: 50 }, 1);
    const ex0 = h.epi - 34;
    for (let s = 0; s < 120; s++) stepHormones(h, REST, 1);
    expect((h.epi - 34) / ex0).toBeGreaterThan(0.4);
    expect((h.epi - 34) / ex0).toBeLessThan(0.6);
  });

  it('exogenous epinephrine (7g, 728 pg/mL ≈ 0.05 µg/kg/min) adds β2 and metabolic effects but no HR/SVR/Ees/K (7g owns those)', () => {
    const h = createHormones();
    stepHormones(h, { ...REST, epiExoPgMl: 728 }, 1);
    const e = stressEffects(h, NO_BB, 1);
    expect([e.hrF, e.svrF, e.eesF]).toEqual([1, 1, 1]);
    expect(e.kShift).toBeCloseTo(0, 12);
    expect(e.bronchoDil).toBeGreaterThan(0.6);
    expect(e.egpF).toBeGreaterThan(1.3);
  });

  it('hypoglycaemia 50 mg/dL drives epinephrine 10–20× basal; 7a profile β-blockade removes the HR part, keeps the K shift', () => {
    const h = createHormones();
    for (let s = 0; s < 1800; s++) stepHormones(h, { ...REST, glucoseMgDl: 50 }, 1);
    expect(h.epi / 34).toBeGreaterThanOrEqual(10);
    expect(h.epi / 34).toBeLessThanOrEqual(20);
    const free = stressEffects(h, NO_BB, 1);
    const blocked = stressEffects(h, { hr: 1, c: 0.5 }, 1);
    expect(free.hrF).toBeGreaterThan(1.1);
    expect(blocked.hrF).toBe(1);
    expect(blocked.eesF).toBeLessThan(free.eesF);
    expect(blocked.kShift).toBeCloseTo(free.kShift, 12);
    expect(free.kShift).toBeLessThan(-0.3);
  });
});

describe('FU-4 F2(a): the humoral arm of haemorrhage compensation', () => {
  it('at rest h.hum stays 0 and the humoral outputs are neutral', () => {
    const h = createHormones();
    for (let s = 0; s < 600; s++) stepHormones(h, REST, 1);
    expect(h.hum).toBe(0);
    const fx = stressEffects(h, NO_BB, 1);
    expect(fx.humSvrF).toBe(1);
    expect(fx.humDV0Frac).toBeCloseTo(0, 12);
  });
  it('a 25 mmHg unloading (beyond the 3 mmHg deadband) drives it toward 25/(25 + EC50) with τ on, and it decays with τ off', () => {
    const h = createHormones();
    const x = { ...REST, mapMmHg: REST.mapSetMmHg - 25 - HUM_DEADBAND_MMHG };
    const tgt = 25 / (25 + HUM_EC50_MMHG);
    for (let s = 0; s < HUM_ON_TAU_S; s++) stepHormones(h, x, 1);
    expect(h.hum).toBeCloseTo(tgt * (1 - Math.exp(-1)), 2);
    for (let s = 0; s < 10 * HUM_ON_TAU_S; s++) stepHormones(h, x, 1);
    expect(h.hum).toBeCloseTo(tgt, 3);
    const on = h.hum;
    for (let s = 0; s < HUM_OFF_TAU_S; s++) stepHormones(h, REST, 1);
    expect(h.hum).toBeCloseTo(on * Math.exp(-1), 2);
  });
  it('stressEffects publishes humSvrF = 1 + HUM_SVR·hum and humDV0Frac = −HUM_V0·hum, unchanged when vasoResp falls (vasoplegia)', () => {
    const h = createHormones();
    h.hum = 0.5;
    const normal = stressEffects(h, NO_BB, 1);
    const insufficient = stressEffects(h, NO_BB, 0.3); // cortisol-poor: catecholamine responsiveness down
    expect(normal.humSvrF).toBeCloseTo(1 + HUM_SVR * 0.5, 12);
    expect(normal.humDV0Frac).toBeCloseTo(-HUM_V0 * 0.5, 12);
    expect(insufficient.vasoResp).toBeLessThan(normal.vasoResp);
    expect(insufficient.humSvrF).toBe(normal.humSvrF);
    expect(insufficient.humDV0Frac).toBe(normal.humDV0Frac);
  });
  it('NEUTRAL_ENDO_INPUTS carries the set point equal to its MAP (no unloading, so no existing number moves)', () => {
    expect(NEUTRAL_ENDO_INPUTS.mapSetMmHg).toBe(NEUTRAL_ENDO_INPUTS.mapMmHg);
  });
});
