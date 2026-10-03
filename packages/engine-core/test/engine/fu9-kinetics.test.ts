// FU-9 Task A1 (F1, H1): the kidney excretes an expanded circulation, context-sensitively (research/22 BF-02a/b, BF-04),
// and reads the anaesthetised output against the lowered demand (research/13 RH-01a, RH-03a).
// Rigs = the BF runner's: MODELED 40 y 70 kg man; "GA" = ETT + VCV 12 × 600, PEEP 5, FiO2 0.5 + the GA flag; Ringer's
// lactate 1 L over 30 min from 300 s; retention = Δ blood volume against the same timeline without the fluid, ÷ 1000 mL,
// 30 min after the end (3900 s). Class III: 1500 mL over 10 min from 60 s, the fluid at 960 s.
import { describe, expect, it } from 'vitest';
import { arm, bvMl, ev, GA_VENT, MAN, once, st, urineMl, type Step } from '../helpers/fu9.ts';

const RL: Step = [300, ev({ kind: 'fluid', fluid: 'rl', volumeMl: 1000, overS: 1800 })];
const retention = async (base: Step[], fluid: Step, tRead: number): Promise<number> => {
  const [i] = await arm([...base, fluid], [tRead], bvMl);
  const [c] = await arm(base, [tRead], bvMl);
  return ((i as number) - (c as number)) / 1000;
};
// the GA control (no fluid) is read once for the retention (3900 s) and for hour 2's urine (H1) — R50 F10
const gaCtl = once(() => arm(GA_VENT, [3600, 3900, 7200], (e) => ({ bv: bvMl(e), urine: urineMl(e) })));
const gaRetention = once(async () => {
  const [i] = await arm([...GA_VENT, RL], [3900], bvMl);
  const c = (await gaCtl())[1] as { bv: number };
  return ((i as number) - c.bv) / 1000;
});
const kg = MAN.weightKg as number;

describe('FU-9 F1: crystalloid kinetics are context-sensitive (Hahn 2010; Norberg 2007; Drobin & Hahn 1999)', { timeout: 900_000 }, () => {
  it('RL 1 L / 30 min, awake: 20–30 % intravascular 30 min after the end (was 0.52); GA retains ≥ 0.05 more (was +0.01)', async () => {
    const awake = await retention([], RL, 3900);
    const ga = await gaRetention();
    console.log(`FU-9 F1 retention 30 min after the end: awake ${awake.toFixed(2)}, GA ${ga.toFixed(2)}`);
    expect(awake).toBeGreaterThanOrEqual(0.2);
    expect(awake).toBeLessThanOrEqual(0.3);
    expect(ga - awake).toBeGreaterThanOrEqual(0.05);
  });
  it('after class III (1500 mL), the same litre is retained ≥ 0.05 more than in normovolaemic GA (was 0.00)', async () => {
    const bleed: Step = [60, ev({ kind: 'bleed', volumeMl: 1500, overS: 600 })];
    const hypo = await retention([...GA_VENT, bleed], [960, RL[1]], 960 + 3600);
    const ga = await gaRetention();
    console.log(`FU-9 F1 class III ${hypo.toFixed(2)} vs GA ${ga.toFixed(2)}`);
    expect(hypo - ga).toBeGreaterThanOrEqual(0.05);
  });
  // Wiesen 1994 / AABB: +1 g/dL per unit (band 0.7–1.3). Main +0.55: the unit's plasma is excreted as a crystalloid would
  // be. With F1 alone +0.66 (an `it.fails` in the first draft); with H1 (the GA kidney reads demand) +0.75.
  it('1 u RBC over 30 min under GA: Hb +0.7–1.3 g/dL at 1 h after the end (main +0.55)', async () => {
    const at = [300 + 1800 + 3600];
    const hb = (e: Parameters<typeof bvMl>[0]) => st(e).blood.out.hb;
    const [i] = await arm([...GA_VENT, [300, ev({ kind: 'transfusion', product: 'rbc', units: 1, overS: 1800, warmed: true })]], at, hb);
    const [c] = await arm(GA_VENT, at, hb);
    const d = (i as number) - (c as number);
    console.log(`FU-9 F1 1 u RBC: Hb +${d.toFixed(2)} at 1 h`);
    expect(d).toBeGreaterThanOrEqual(0.7);
    expect(d).toBeLessThanOrEqual(1.3);
  });
});

describe('FU-9 H1: an anaesthetised kidney is not oliguric at a normal MAP (research/13 H1)', { timeout: 900_000 }, () => {
  it('GA, normovolaemic, MAP ≈ 93: hour-2 urine 0.5–1 mL/kg/h (tables §5.2 S; main 0.35, RH-01a)', async () => {
    const [h1, , h2] = (await gaCtl()) as { urine: number }[];
    const uo = ((h2 as { urine: number }).urine - (h1 as { urine: number }).urine) / kg;
    console.log(`FU-9 H1 GA hour-2 urine ${uo.toFixed(2)} mL/kg/h`);
    expect(uo).toBeGreaterThanOrEqual(0.5);
    expect(uo).toBeLessThanOrEqual(1);
  });
  // class III (1500 mL / 10 min) then Ringer's 2 L over 30 min from 960 s: urine in 10-min bins after the end (2760 s)
  const T_END = 960 + 1800;
  const recovery = once(() => arm([...GA_VENT, [60, ev({ kind: 'bleed', volumeMl: 1500, overS: 600 })], [960, ev({ kind: 'fluid', fluid: 'rl', volumeMl: 2000, overS: 1800 })]],
    [0, 1, 2, 3, 4, 5, 6].map((k) => T_END + 600 * k), urineMl));
  const bin = (u: number[], k: number) => (((u[k + 1] as number) - (u[k] as number)) / kg) * 6; // mL/kg/h
  it('class III, then RL 2 L restores MAP/CO: a 10-min urine bin reaches 0.5 mL/kg/h within 60 min of the end (ATLS; main: none in 2 h)', async () => {
    const u = await recovery();
    const bins = [0, 1, 2, 3, 4, 5].map((k) => bin(u, k));
    console.log(`FU-9 H1 recovery bins ${bins.map((b) => b.toFixed(2)).join(' ')}`);
    expect(Math.max(...bins)).toBeGreaterThanOrEqual(0.5);
  });
  // R45 (research/13 RH-03a): ATLS's end point read as the 30–60 min mean. The joint calibration (D1) caps it: the GA
  // ceiling is S_GA × V(bvRel 0.97) ≈ 0.57 × 0.9, and vNh washes out with 7d's τ 45 min (tables check 20's own fit;
  // τ 10–20 min gives 0.45–0.46 and breaks check 20). Measured 0.33 on the merged tree (plan's prototype 0.37; main 0.23) — Ali's question (OQ11).
  it.fails('class III, then RL 2 L: urine 30–60 min after the end ≥ 0.5 mL/kg/h — measured 0.33 (main 0.23)', async () => {
    const u = await recovery();
    expect((((u[6] as number) - (u[3] as number)) / kg) * 2).toBeGreaterThanOrEqual(0.5);
  });
});
