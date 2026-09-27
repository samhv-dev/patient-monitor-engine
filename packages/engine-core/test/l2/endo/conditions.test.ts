// System conditions (tables §5e) and thyroid (tables §5c).
import { describe, expect, it } from 'vitest';
import { conditionEffects, createConditions, NEUTRAL_CONDITIONS, stepConditions } from '../../../src/l2/endo/conditions.ts';
import { thyroidEffects } from '../../../src/l2/endo/thyroid.ts';

describe('system conditions', () => {
  it('none: neutral bundle', () => {
    expect(conditionEffects(createConditions())).toEqual(NEUTRAL_CONDITIONS);
  });

  it('sepsis warm (stage 3): SVR × 0.4–0.55, kf × 3, lactate ↑, fever; cold (stage 4): Ees × 0.4–0.6, SVR ≥ 1', () => {
    const c = createConditions();
    c.sepsis.target = 3;
    for (let s = 0; s < 3 * 3600; s++) stepConditions(c, 0, 1);
    const w = conditionEffects(c);
    expect(w.svrF).toBeGreaterThanOrEqual(0.4);
    expect(w.svrF).toBeLessThanOrEqual(0.55);
    expect(w.kfMult).toBeCloseTo(3, 2);
    expect(w.setShiftC).toBeGreaterThan(2);
    c.sepsis.target = 4;
    for (let s = 0; s < 3 * 3600; s++) stepConditions(c, 0, 1);
    const k = conditionEffects(c);
    expect(k.eesF).toBeGreaterThanOrEqual(0.4);
    expect(k.eesF).toBeLessThanOrEqual(0.6);
    expect(k.svrF).toBeGreaterThanOrEqual(0.99); // tables cold 1.0–1.2
    expect(k.vasoResp).toBeLessThan(w.vasoResp); // late sepsis: catecholamine resistance deepens (tables vasoResp 0.6 → 0.5)
  });

  it('anaphylaxis grade III (severity 0.75): SVR × 0.3–0.5 with onset τ 1–3 min; epinephrine β2 stabilises mast cells', () => {
    const c = createConditions();
    c.anaph.target = 0.75;
    let t63 = 0;
    for (let s = 1; s <= 900; s++) {
      stepConditions(c, 0, 1);
      if (!t63 && c.anaph.mediator >= 0.632 * 0.75) t63 = s;
    }
    expect(t63).toBeGreaterThanOrEqual(60);
    expect(t63).toBeLessThanOrEqual(180);
    const e = conditionEffects(c);
    expect(e.svrF).toBeGreaterThanOrEqual(0.3);
    expect(e.svrF).toBeLessThanOrEqual(0.5);
    expect(e.kfMult).toBeGreaterThan(5); // capillary leak (tables grade III kf × 8) → 7c's fluid shift and lung water
    for (let s = 0; s < 900; s++) stepConditions(c, 1, 1);
    expect(conditionEffects(c).svrF).toBeGreaterThan(0.75);
  });

  it('thyroid storm row: HR × 1.8 (≈ 135), SVR × 0.6, VO2 × 1.4 (× 1.3–1.8 with the Q10 of its fever), set point +1.8 °C; hypothyroid is the opposite direction', () => {
    const s = thyroidEffects('normal', 1);
    expect(s.hrF).toBeCloseTo(1.8, 9);
    expect(s.svrF).toBeCloseTo(0.6, 9);
    expect(s.vo2F).toBeCloseTo(1.4, 9);
    expect(s.setShiftC).toBeCloseTo(1.8, 9);
    const h = thyroidEffects('hypo', 0);
    expect(h.hrF).toBeLessThan(1);
    expect(h.vo2F).toBeLessThan(1);
    expect(thyroidEffects('hyper', 1).hrF).toBeCloseTo(1.8, 9); // the storm ceiling does not stack on hyper
  });
});
