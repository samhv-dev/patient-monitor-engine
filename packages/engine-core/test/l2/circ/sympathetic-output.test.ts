// FU-4 G2 (Task 2): anaesthetic sympatholysis is a suppression of the delivered sympathetic OUTPUT (after the reflex
// saturation) plus a set-point reset — 7g computes `symp`/`setF`, 7a's stepBaro applies them. A gain scale lets the error
// grow until the output returns; an output factor lowers the ceiling, so a saturated reflex loses the most.
import { describe, expect, it } from 'vitest';
import { createBaro, stepBaro, SYMP_SAT, type BaroGains } from '../../../src/l2/circ/baroreflex.ts';
import { combine } from '../../../src/l2/pk/combine.ts';
import { DRUGS } from '../../../src/l2/pk/data/drugs.ts';
import type { DrugRow } from '../../../src/l2/pk/row.ts';

const G: BaroGains = { gVagal: 15, gSymp: 1, betaBlock: 0, weightScale: 1, pinnedSet: false };
/** Hold MAP at `map` against a set point of 95 for 120 s (the sympathetic LPF settles) and return the last output. */
function settle(map: number, g: BaroGains) {
  const b = createBaro(95);
  let o = stepBaro(b, map, g);
  for (let i = 0; i < 1200; i++) o = stepBaro(b, map, g);
  return { o, b };
}

describe('FU-4 G2: sympathetic output suppression and resetting (baroreflex)', () => {
  it('outF 1 and setF 1 are bit-identical to the absent fields', () => {
    const a = settle(70, G).o;
    const b = settle(70, { ...G, outF: 1, setF: 1 }).o;
    expect(b).toEqual(a);
  });
  it('a saturated reflex keeps its output under a gain scale but loses it under an output factor', () => {
    const full = settle(40, G).o; // error 55 mmHg: SVR arm saturated
    expect(full.svrF - 1).toBeCloseTo(SYMP_SAT, 6);
    const gain = settle(40, { ...G, gSymp: 0.72 }).o; // the pre-FU-4 anaesthetic path: gSymp × gv (0.72 at propofol's nadir)
    expect(gain.svrF - 1).toBeCloseTo(SYMP_SAT, 6); // still saturated
    const out = settle(40, { ...G, outF: 0.1 }).o;
    expect(out.svrF - 1).toBeCloseTo(0.1 * SYMP_SAT, 6);
    expect(out.dV0).toBeCloseTo(0.1 * full.dV0, 6);
  });
  it('setF lowers the pressure the error is taken against (a reset reflex fires less at the same MAP)', () => {
    const reset = settle(80, { ...G, setF: 0.85 });
    const plain = settle(80, G);
    expect(reset.b.es).toBeLessThan(0.1 * plain.b.es + 1e-9); // set 95 × 0.85 ≈ 81 vs MAP 80
  });
  it('7g: propofol Ce 3 µg/mL → output × 0.10 and set point × 0.865; sevoflurane 0.65 MAC → output × 0.675; no drug → 1', () => {
    const ctx = { ph: 7.4, betaBlockC: 0, vasoResp: 1, ageY: 40, macBrain: 0 };
    const prop = combine([{ row: DRUGS.propofol as DrugRow, c: 3 }], ctx).fx;
    expect(prop.symp).toBeCloseTo(0.1, 3);
    expect(prop.setF).toBeCloseTo(1 - 0.15 * 0.9, 3);
    const sevo = combine([{ row: DRUGS.sevoflurane as DrugRow, c: 0.65 }], { ...ctx, macBrain: 0.65 }).fx;
    expect(sevo.symp).toBeCloseTo(1 - 0.5 * 0.65, 3);
    const none = combine([], ctx).fx;
    expect([none.symp, none.setF]).toEqual([1, 1]);
  });
});
