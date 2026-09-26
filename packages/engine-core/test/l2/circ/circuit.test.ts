import { describe, expect, it } from 'vitest';
import { createOut, evaluate, S, stepCirc, totalVolume, type CircDrive } from '../../../src/l2/circ/circuit.ts';
import { resolveProfile } from '../../../src/l2/circ/profile.ts';
import { initialState } from '../../../src/l2/circ/stabilise.ts';
import { activationPeriodS } from '../../../src/l2/circ/activation.ts';
import { H_S, P_PL0 } from '../../../src/l2/circ/params.ts';

const zero = () => 0;
function drive(): CircDrive {
  return { vent: [], atria: [], kLv: 1, kRv: 1, pIt: () => P_PL0, cprCardiac: zero, cprThoracic: zero, qIn: 0, qVad: () => 0, qAortaSrc: zero };
}

describe('circuit ODE', () => {
  it('conserves blood volume to < 0.01 mL over 60 s of beating (no leaks between compartments)', () => {
    const r = resolveProfile();
    const p = structuredClone(r.params);
    p.v0Peri = 1e4;
    const s = initialState(p, r.bloodVolumeMl, r.stressedFrac);
    const d = drive();
    const v0 = totalVolume(s, p);
    expect(v0).toBeCloseTo(r.bloodVolumeMl, 6);
    let t = 0;
    const vent = d.vent as { t0: number; T: number; amp: number }[];
    for (let b = 0; b < 75; b++) vent.push({ t0: 0.2 + b * 0.8, T: activationPeriodS(75), amp: 1 });
    while (t < 60) {
      stepCirc(s, t, H_S, p, d);
      t += H_S;
    }
    expect(Math.abs(totalVolume(s, p) - v0)).toBeLessThan(0.01);
    for (const x of s) expect(Number.isFinite(x)).toBe(true);
  });
  it('a bleed of 10 mL/s for 10 s removes exactly 100 mL', () => {
    const r = resolveProfile();
    const p = structuredClone(r.params);
    p.v0Peri = 1e4;
    const s = initialState(p, r.bloodVolumeMl, r.stressedFrac);
    const d = { ...drive(), qIn: -10 };
    const v0 = totalVolume(s, p);
    for (let t = 0; t < 10 - 1e-9; t += H_S) stepCirc(s, t, H_S, p, d);
    expect(totalVolume(s, p) - v0).toBeCloseTo(-100, 3);
  });
  it('pleural pressure reaches every intrathoracic compartment one-for-one', () => {
    const r = resolveProfile();
    const p = structuredClone(r.params);
    p.v0Peri = 1e4;
    const s = initialState(p, r.bloodVolumeMl, r.stressedFrac);
    const a = createOut();
    const b = createOut();
    evaluate(s, 0, p, drive(), a);
    evaluate(s, 0, p, { ...drive(), pIt: () => P_PL0 + 5 }, b);
    for (const k of ['pRa', 'pRv', 'pPa', 'pPv', 'pLa', 'pLv'] as const) expect(b[k] - a[k]).toBeCloseTo(5, 9);
    expect(b.pSv).toBe(a.pSv); // extrathoracic
    expect(s[S.VSV]).toBeGreaterThan(0);
  });
});
