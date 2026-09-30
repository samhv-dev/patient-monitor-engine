import { describe, expect, it } from 'vitest';
import { combine, FENT_PER_REMI, PROP_HYP_C50_REF, type Active } from '../../../src/l2/pk/combine.ts';
import { DRUGS } from '../../../src/l2/pk/data/drugs.ts';
import { FENT_VENT_REMI_EQ } from '../../../src/l2/pk/pd.ts';

const CTX = { ph: 7.4, betaBlockC: 0, vasoResp: 1, ageY: 40, macBrain: 0 };
const act = (id: string, c: number, vent?: number): Active => ({ row: DRUGS[id]!, c, ...(vent !== undefined ? { vent } : {}) });

/** FU-7 (addendum 20): ONE hypnotic-potency output and ONE opioid-potency output. */
describe('potency outputs (R51 addendum 20)', () => {
  it('propofol Ce 3 µg/mL at 40 y is the unit: hypPropEq ≈ 3, dissoc 0', () => {
    const { bus } = combine([act('propofol', 3)], CTX);
    expect(bus.cns.hypPropEq).toBeCloseTo(3, 6);
    expect(bus.cns.dissoc).toBe(0);
  });
  it('thiopental 4 mg/kg (c 1) and etomidate 0.3 mg/kg (c 1) reach an induction-strength equivalent (hypC50 0.55)', () => {
    for (const id of ['thiopental', 'etomidate']) {
      const { bus } = combine([act(id, 1)], CTX);
      expect(bus.cns.hypPropEq, id).toBeGreaterThan(1.6 * PROP_HYP_C50_REF * 0.9);
    }
  });
  it('ketamine is dissociative: its whole share is flagged, and the ventilatory twin is 0.3 of it', () => {
    const { bus } = combine([act('ketamine', 1)], CTX);
    expect(bus.cns.dissoc).toBeCloseTo(1, 6);
    expect(bus.cns.hypVentPropEq / bus.cns.hypPropEq).toBeCloseTo(0.3, 6);
  });
  it('agents ADD in equivalents: propofol 1.5 + midazolam 0.5 ref = the sum of their own equivalents', () => {
    const a = combine([act('propofol', 1.5)], CTX).bus.cns.hypPropEq;
    const b = combine([act('midazolam', 0.5)], CTX).bus.cns.hypPropEq;
    const both = combine([act('propofol', 1.5), act('midazolam', 0.5)], CTX).bus.cns.hypPropEq;
    expect(both).toBeCloseTo(a + b, 9);
    expect(combine([act('propofol', 1.5), act('midazolam', 0.5)], CTX).bus.cns.dissoc).toBe(0);
  });
  it('the unit property: propofol\'s own equivalent IS its Ce at every age (its C50 carries the same age term)', () => {
    for (const age of [20, 40, 80]) expect(combine([act('propofol', 3)], { ...CTX, ageY: age }).bus.cns.hypPropEq).toBeCloseTo(3, 6);
  });
  it('age sensitivity (review F5, D19a): the elderly lose consciousness on less — midazolam by PD, thiopental by the LOC scale', () => {
    // LOC dose ratio 80 y / 35 y = (locPropofol(80)/locPropofol(35)) / (equivalent per unit c at 80 / at 35) — 7f's
    // `hypnotic` is hypPropEq / locPropofol(age). Targets: midazolam ≈ 0.5 (M10 ch. 21: 20–50 % less), thiopental and
    // etomidate 0.6–0.8 (the PK share, Homer & Stanski 1985 / Arden 1986, reaches the same LOC through the scale).
    const loc = (age: number) => Math.max(600, 2350 - 22 * (age - 25)); // 7f depth.ts locPropofol, ng/mL
    const ratio = (id: string) => {
      const e35 = combine([act(id, 1)], { ...CTX, ageY: 35 }).bus.cns.hypPropEq;
      const e80 = combine([act(id, 1)], { ...CTX, ageY: 80 }).bus.cns.hypPropEq;
      return loc(80) / loc(35) / (e80 / e35);
    };
    expect(ratio('midazolam')).toBeGreaterThan(0.4);
    expect(ratio('midazolam')).toBeLessThan(0.6);
    for (const id of ['thiopental', 'etomidate']) {
      expect(ratio(id), id).toBeGreaterThan(0.6);
      expect(ratio(id), id).toBeLessThan(0.8);
    }
  });
  it('flumazenil divides the benzodiazepine share of the equivalent AND of uHyp by the same ratio (DI-72; review F8)', () => {
    const plain = combine([act('midazolam', 1)], CTX).bus.cns;
    const antag = combine([act('midazolam', 1), act('flumazenil', 2)], CTX).bus.cns;
    expect(antag.hypPropEq).toBeLessThan(0.5 * plain.hypPropEq);
    expect(antag.uHyp / plain.uHyp).toBeCloseTo(antag.hypPropEq / plain.hypPropEq, 9);
    expect(antag.uSurface).toBeLessThan(plain.uSurface);
  });
  it('the benzodiazepine share is published for the ventilatory α (review F2)', () => {
    expect(combine([act('midazolam', 1)], CTX).bus.cns.benzoShare).toBeCloseTo(1, 9);
    expect(combine([act('propofol', 2)], CTX).bus.cns.benzoShare).toBe(0);
    const mix = combine([act('propofol', 1), act('midazolam', 1)], CTX).bus.cns;
    expect(mix.benzoShare).toBeGreaterThan(0);
    expect(mix.benzoShare).toBeLessThan(1);
  });
  it('the opioid outputs are TRUE fentanyl-equivalents at each site (D16): fentanyl X alone → X, brain and vent', () => {
    const f = combine([act('fentanyl', 2, 2)], CTX).bus.cns;
    expect(f.opioidCeFentEq).toBeCloseTo(2, 9); // = 7f's pre-FU-7 opioidFentEq(fentanyl 2): the MAC scale is unchanged
    expect(f.opioidVentFentEq).toBeCloseTo(2, 9);
    const r = combine([act('remifentanil', 4, 1)], CTX).bus.cns;
    expect(r.opioidCeFentEq).toBeCloseTo(FENT_PER_REMI * 4, 9); // 7f's REMI_MAC_POT 1.25
    expect(r.opioidVentFentEq * FENT_VENT_REMI_EQ).toBeCloseTo(1, 9); // remifentanil PINNED at 1.0 (ruling 4)
  });
  it('naloxone is applied ONCE, in 7g, at BOTH sites (the first fixer: the vent site was summed raw)', () => {
    const plain = combine([act('fentanyl', 2, 2)], CTX).bus.cns;
    const nal = combine([act('fentanyl', 2, 2), act('naloxone', 1)], CTX).bus;
    const div = nal.antagonist.opioid;
    expect(div).toBeGreaterThan(1);
    expect(nal.cns.opioidCeFentEq).toBeCloseTo(plain.opioidCeFentEq / div, 9);
    expect(nal.cns.opioidVentFentEq).toBeCloseTo(plain.opioidVentFentEq / div, 9);
  });
});
