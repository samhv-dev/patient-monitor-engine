// FU-9 Task A4 (F4): septic capillary leak reaches the lung water (research/22 BF-20a). Rig = the BF runner's GA vent;
// 7e warm septic shock (`condition sepsis 1 warm`) at 60 s; 0.9 % saline 30 mL/kg (2100 mL) over 30 min at 1260 s; read
// 60 min after the end (4860 s) against the same sepsis without the fluid.
import { describe, expect, it } from 'vitest';
import { arm, ev, GA_VENT, once, st, type Step } from '../helpers/fu9.ts';

const SEPSIS: Step = [60, ev({ kind: 'condition', id: 'sepsis', severity: 1, phase: 'warm' })];
const LOAD: Step = [1260, ev({ kind: 'fluid', fluid: 'saline', volumeMl: 2100, overS: 1800 })];
const read = (e: Parameters<typeof st>[0]) => ({ evlwi: st(e).blood.lung.evlwi, pao2: st(e).resp.o2.pao2, sigma: st(e).blood.core.fl.sigma, kf: st(e).blood.core.fl.kfMult });
const septic = once(async () => ({ i: (await arm([...GA_VENT, SEPSIS, LOAD], [4860], read))[0], c: (await arm([...GA_VENT, SEPSIS], [4860], read))[0] })); // R50 F10

describe('FU-9 F4: a septic leak makes lung water at a normal PAWP (Sakka 2002; two-pore theory)', { timeout: 600_000 }, () => {
  it('warm septic shock: σ falls with the leak (σ < 0.8) and 30 mL/kg raises extra EVLWI > 0.25 mL/kg (was 0.0)', async () => {
    const { i, c } = await septic();
    if (!i || !c) throw new Error('no sample');
    console.log(`FU-9 F4: kfMult ${c.kf.toFixed(2)}, σ ${c.sigma.toFixed(2)}, ΔEVLWI ${(i.evlwi - c.evlwi).toFixed(2)} mL/kg, ΔPaO2 ${(i.pao2 - c.pao2).toFixed(0)}`);
    expect(c.sigma).toBeLessThan(0.8);
    expect(i.evlwi - c.evlwi).toBeGreaterThan(0.25);
  });
  // R45 (research/22 §5 acceptance for 7e → 7c: "EVLWI ↑ and PaO2 ↓ more than healthy"): the septic lung makes water now,
  // but less than the healthy lung under the same load (0.90 vs 1.68 mL/kg: the vasodilated septic patient's PAWP stays
  // lower, and σ 0.70 still leaves a threshold of ≈ 15 mmHg), and PaO2 still RISES +10 (7b's lung-water → shunt coupling,
  // F13a, is weak and the load raises CO/SvO2). Kept visible for Ali (Open question 3: the septic σ).
  it.fails('warm septic shock + 30 mL/kg: extra EVLWI more than healthy and PaO2 falls — measured +0.90 vs +1.68 mL/kg, PaO2 +10 (FU-9 F4)', async () => {
    const { i, c } = await septic();
    const [hi] = await arm([...GA_VENT, LOAD], [4860], read);
    const [hc] = await arm(GA_VENT, [4860], read);
    if (!i || !c || !hi || !hc) throw new Error('no sample');
    console.log(`FU-9 F4 vs healthy: ΔEVLWI ${(i.evlwi - c.evlwi).toFixed(2)} vs ${(hi.evlwi - hc.evlwi).toFixed(2)} mL/kg, ΔPaO2 ${(i.pao2 - c.pao2).toFixed(0)} vs ${(hi.pao2 - hc.pao2).toFixed(0)}`);
    expect(i.evlwi - c.evlwi).toBeGreaterThan(hi.evlwi - hc.evlwi);
    expect(i.pao2 - c.pao2).toBeLessThan(-5);
  });
});
