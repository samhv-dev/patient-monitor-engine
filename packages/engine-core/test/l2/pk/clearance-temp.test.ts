// FU-2 item 9: hepatic drug clearance is scaled by temperature exactly once: by the drug model's own term, or by the
// liver function 7d writes into 7c's `blood.core.liver` (= liverFn·tempF) when that exists, never by both.
// research/44 L2-27: the CYTOCHROME P450 share takes the sourced slope. Tortorici 2007 (Crit Care Med 35:2196, a
// review of 21 studies): during cooling, mild to moderate hypothermia lowers the systemic clearance of CYP450-
// metabolised drugs by about 7–22 % per °C below 37 °C. Hostler 2010 (Drug Metab Dispos 38:781; midazolam, the
// CYP3A4/5 probe, in volunteers) measured −11.1 %/°C from 36.5 °C, inside that range. The other pathways
// (glucuronidation, esterases, renal, Hofmann) are outside both sources and keep the −5 %/°C placeholder.
import { describe, expect, it } from 'vitest';
import { DRUGS } from '../../../src/l2/pk/data/drugs.ts';
import { clFactor, NEUTRAL_PK_CTX } from '../../../src/l2/pk/pipeline.ts';
import type { DrugRow } from '../../../src/l2/pk/row.ts';

const row = (id: string) => DRUGS[id] as DrugRow;
const at33 = { ...NEUTRAL_PK_CTX, tempC: 33 }; // 3.8 °C below the engine's 36.8 °C normothermia → placeholder 0.81

describe('clearance temperature counted once', () => {
  it('without the organ model (hepFn = 1, no temperature in it): a non-CYP hepatic row takes the placeholder — thiopental 0.81 at 33 °C', () => {
    expect(clFactor(row('thiopental'), at33)).toBe(0.81);
    expect(clFactor(row('thiopental'), NEUTRAL_PK_CTX)).toBe(1);
  });
  it('with the organ model (hepFn = liverFn·tempF): the low-extraction hepatic share takes hepFn alone — thiopental 0.62, not 0.62 × 0.81', () => {
    expect(clFactor(row('thiopental'), { ...at33, hepFn: 0.62, hepFnTemp: true })).toBe(0.62);
    expect(clFactor(row('thiopental'), { ...at33, hepFn: 0.62, hepFnTemp: false })).toBe(0.5); // the old double count (0.502)
  });
  it('the other shares keep the drug model’s term: renal/other of a mixed row, and flow-limited hepatic clearance', () => {
    const r = row('rocuronium');
    const h = r.elim?.hepatic ?? 0;
    const rn = r.elim?.renal ?? 0;
    expect(clFactor(r, { ...at33, hepFn: 0.62, hepFnTemp: true })).toBeCloseTo(Math.round((h * 0.62 + (rn + Math.max(0, 1 - h - rn)) * 0.81) * 100) / 100, 9);
    const hx = Object.values(DRUGS).find((d) => (d as DrugRow).elim?.highExtraction && !(d as DrugRow).elim?.cyp) as DrugRow;
    expect(clFactor(hx, { ...at33, hepFn: 0.62, hepFnTemp: true })).toBe(clFactor(hx, at33));
  });
});

describe('CYP450-cleared rows: −11.1 %/°C from 36.5 °C (Hostler 2010; inside Tortorici 2007\'s 7–22 %/°C)', () => {
  const CYP = ['midazolam', 'ketamine', 'fentanyl', 'sufentanil', 'lidocaine', 'bupivacaine', 'ropivacaine'];
  it('the CYP450 rows are flagged (Miller 10e: midazolam p. 528, ketamine p. 536, fentanyl/sufentanil pp. 589–590, amides p. 741) and the non-CYP ones are not', () => {
    for (const id of CYP) expect(row(id).elim?.cyp, id).toBe(true);
    for (const id of ['propofol', 'thiopental', 'etomidate', 'dexmedetomidine', 'morphine', 'rocuronium', 'vecuronium']) expect(row(id).elim?.cyp ?? false, id).toBe(false);
  });
  it('midazolam at 33 °C: 1 − 0.111 × 3.5 = 0.61 without the organ model, and the same with it (liverFn 1: no double count)', () => {
    expect(clFactor(row('midazolam'), at33)).toBe(0.61);
    expect(clFactor(row('midazolam'), { ...at33, hepFn: 0.65, hepFnTemp: true, liverFn: 1 })).toBe(0.61);
    expect(clFactor(row('midazolam'), { ...at33, hepFn: 0.4, hepFnTemp: true, liverFn: 0.62 })).toBe(0.38); // failure × CYP term
  });
  it('a normothermic patient keeps the published clearance; 35.4 °C (Hostler\'s coldest arm) gives 0.88', () => {
    for (const id of CYP) expect(clFactor(row(id), { ...NEUTRAL_PK_CTX, tempC: 36.8 }), id).toBe(1);
    expect(clFactor(row('midazolam'), { ...NEUTRAL_PK_CTX, tempC: 35.4 })).toBe(0.88);
  });
  it('flow-limited CYP rows take hepatic flow × the CYP term (fentanyl 0.61 at 33 °C, flow 1)', () => {
    expect(clFactor(row('fentanyl'), at33)).toBe(0.61);
    expect(clFactor(row('fentanyl'), { ...at33, hepFlow: 0.8 })).toBe(0.49);
  });
});
