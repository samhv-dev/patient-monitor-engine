// FU-3 item 4 (G7d follow-through 2): in MANUAL the tracker's LV Emax is held against the ischaemia present while it
// tracked (man.kIschRef). New ischaemia below that level still acts on top of the held picture; recovery above it does
// not raise the delivered contractility (the check-18 rig: kIsch 0.2 → 0.8 under a held Emax ×2.5 ran MAP 81 → 125).
import { describe, expect, it } from 'vitest';
import { createCircModel, CTL_DT, RESTING_ENV, stepCircModel } from '../../../src/l2/circ/model.ts';
import { createOut } from '../../../src/l2/circ/circuit.ts';

const MANUAL_ENV = { ...RESTING_ENV, modeled: false };

function kLv(eesF: number, kIschRef: number, kIsch: number, env = MANUAL_ENV): number {
  const m = createCircModel();
  m.man = { ...m.man, eesF, kIschRef };
  m.ext.kIsch = kIsch;
  stepCircModel(m, CTL_DT / 2, env, createOut()); // one control step
  return m.kLv;
}

describe('MANUAL held LV Emax against coronary ischaemia (FU-3 item 4)', () => {
  it('recovery above the tracked kIsch does not raise the delivered Emax: ×2.5 set at kIsch 0.2, kIsch back to 1 → 0.5', () => {
    expect(kLv(2.5, 0.2, 1)).toBeCloseTo(0.5, 9);
    expect(kLv(2.5, 0.2, 0.6)).toBeCloseTo(0.5, 9);
  });
  it('ischaemia below the tracked level still acts on top of the held picture', () => {
    expect(kLv(1, 0.8, 0.4)).toBeCloseTo(0.4, 9);
    expect(kLv(1.5, 1, 0.5)).toBeCloseTo(0.75, 9);
  });
  it('the default reference (1) leaves 7a unchanged in both modes', () => {
    expect(kLv(1.2, 1, 0.7)).toBeCloseTo(0.84, 9);
    const m = createCircModel();
    stepCircModel(m, CTL_DT / 2, RESTING_ENV, createOut());
    const n = createCircModel();
    n.man = { ...n.man, kIschRef: 0.2 }; // MODELED ignores the MANUAL tracker's outputs
    n.ext.kIsch = 1;
    stepCircModel(n, CTL_DT / 2, RESTING_ENV, createOut());
    expect(n.kLv).toBe(m.kLv);
  });
});
