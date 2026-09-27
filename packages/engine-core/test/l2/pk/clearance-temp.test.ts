// FU-2 item 9: hepatic drug clearance is scaled by temperature exactly once — by 7g's own −5 %/°C term, or by the liver
// function 7d writes into 7c's `blood.core.liver` (= liverFn·tempF) when that exists, never by both.
import { describe, expect, it } from 'vitest';
import { DRUGS } from '../../../src/l2/pk/data/drugs.ts';
import { clFactor, NEUTRAL_PK_CTX } from '../../../src/l2/pk/pipeline.ts';
import type { DrugRow } from '../../../src/l2/pk/row.ts';

const row = (id: string) => DRUGS[id] as DrugRow;
const at33 = { ...NEUTRAL_PK_CTX, tempC: 33 }; // 3.8 °C below the engine's 36.8 °C normothermia → 7g term 0.81

describe('clearance temperature counted once (FU-2 item 9)', () => {
  it('without 7d (hepFn = 1, no temperature in it): 7g scales the whole clearance — midazolam 0.81 at 33 °C', () => {
    expect(clFactor(row('midazolam'), at33)).toBe(0.81);
    expect(clFactor(row('midazolam'), NEUTRAL_PK_CTX)).toBe(1);
  });
  it('with 7d (hepFn = liverFn·tempF): the low-extraction hepatic share takes hepFn alone — midazolam 0.62, not 0.62 × 0.81', () => {
    expect(clFactor(row('midazolam'), { ...at33, hepFn: 0.62, hepFnTemp: true })).toBe(0.62);
    expect(clFactor(row('midazolam'), { ...at33, hepFn: 0.62, hepFnTemp: false })).toBe(0.5); // the old double count (0.502)
  });
  it('the other shares keep 7g’s term: renal/other of a mixed row, and flow-limited hepatic clearance', () => {
    const r = row('rocuronium');
    const h = r.elim?.hepatic ?? 0;
    const rn = r.elim?.renal ?? 0;
    expect(clFactor(r, { ...at33, hepFn: 0.62, hepFnTemp: true })).toBeCloseTo(Math.round((h * 0.62 + (rn + Math.max(0, 1 - h - rn)) * 0.81) * 100) / 100, 9);
    const hx = Object.values(DRUGS).find((d) => (d as DrugRow).elim?.highExtraction) as DrugRow;
    expect(clFactor(hx, { ...at33, hepFn: 0.62, hepFnTemp: true })).toBe(clFactor(hx, at33));
  });
});
