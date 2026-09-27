// FU-2 item 1 (NR-7g-5): who owns the ventricular rate in MODELED mode (l2/circ/rate-rule.ts).
import { describe, expect, it } from 'vitest';
import { constantRamp } from '../../../src/l1/ramp.ts';
import { createCircModel } from '../../../src/l2/circ/model.ts';
import { AV_GAIN, AV_MOD_MAX, heldRate, modeledHrRequest, PACER_SENSING, SINUS_FAMILY } from '../../../src/l2/circ/rate-rule.ts';

describe('MODELED rate rule (NR-7g-5)', () => {
  it('the sinus family is derived from the rhythm library (sinus atria, rate driven as sinus): 11 rhythms, complete block excluded', () => {
    expect([...SINUS_FAMILY].sort()).toEqual(['avb1', 'avb2Mobitz1', 'avb2Mobitz2', 'avb2to1', 'avbHighGrade', 'sinus', 'sinusArrhythmia', 'sinusBrady', 'sinusPause', 'sinusTachy', 'wpwSinus']);
    for (const id of ['avb3Narrow', 'avb3Wide', 'atrialTach', 'pacedAAI', 'pacedDDD', 'pacedVVI']) expect(SINUS_FAMILY.has(id)).toBe(false);
    expect([...PACER_SENSING].sort()).toEqual(['pacedAAI', 'pacedDDD']);
  });
  it('heldRate: a sinus rhythm without an explicit rate goes to the reflex (null); an explicit rate or any other rhythm is held', () => {
    const r = constantRamp(40);
    expect(heldRate('sinus', false, r)).toBeNull();
    expect(heldRate('sinusBrady', true, r)).toEqual(r);
    expect(heldRate('svtAvnrt', false, constantRamp(180))).toEqual(constantRamp(180));
    expect(heldRate('pacedAAI', false, constantRamp(70))).toEqual(constantRamp(70)); // a pacer's lower rate is always held
    expect(heldRate('sinusBrady', true, r)).not.toBe(r); // a copy: later writes to ps.hr never alias it
  });
  it('sinus family: the reflex rate unless the instructor holds one', () => {
    const m = createCircModel();
    m.hrModel = 83;
    expect(modeledHrRequest(m, 'sinusTachy', 10)).toBe(83);
    m.hrSet = constantRamp(40);
    expect(modeledHrRequest(m, 'sinusBrady', 10)).toBeNull();
  });
  it('sinus pause, 2:1 block and WPW in sinus: set without a rate they follow the reflex; set with one they hold it', () => {
    const m = createCircModel();
    m.hrModel = 91;
    for (const id of ['sinusPause', 'avb2to1', 'wpwSinus']) {
      m.hrSet = heldRate(id, false, constantRamp(80));
      expect(m.hrSet, id).toBeNull();
      expect(modeledHrRequest(m, id, 10), id).toBe(91);
      m.hrSet = heldRate(id, true, constantRamp(80));
      expect(m.hrSet, id).toEqual(constantRamp(80));
      expect(modeledHrRequest(m, id, 10), id).toBeNull();
    }
  });
  it('rhythm-intrinsic rates are never requested (SVT, atrial tachycardia, flutter, junctional, VT, AIVR, escape, VVI)', () => {
    const m = createCircModel();
    m.hrModel = 90;
    m.hrSet = constantRamp(180);
    for (const id of ['svtAvnrt', 'atrialTach', 'mat', 'aflutter', 'junctionalEscape', 'vtMono', 'aivr', 'avb3Narrow', 'avb3Wide', 'pacedVVI']) expect(modeledHrRequest(m, id, 10), id).toBeNull();
  });
  it('AAI / DDD: max(programmed lower rate, the reflex rate) — the reflex never pulls the rate below the lower rate', () => {
    const m = createCircModel();
    m.hrSet = constantRamp(70);
    for (const id of ['pacedAAI', 'pacedDDD']) {
      m.hrModel = 58; // phenylephrine's reflex bradycardia
      expect(modeledHrRequest(m, id, 10), id).toBe(70);
      m.hrModel = 96; // reflex tachycardia: the intrinsic sinus overtakes the pacer
      expect(modeledHrRequest(m, id, 10), id).toBe(96);
    }
    m.hrSet = null;
    expect(modeledHrRequest(m, 'pacedAAI', 10)).toBeNull();
  });
  it('AF: the set ventricular response × (1 + AV_GAIN·(reflex drive − 1)), bounded ±AV_MOD_MAX', () => {
    const m = createCircModel();
    m.hrSet = constantRamp(100);
    m.hrModel = m.prof.hrRest; // reflex at rest → the set response
    expect(modeledHrRequest(m, 'afib', 10)).toBeCloseTo(100, 9);
    m.hrModel = m.prof.hrRest * 1.2;
    expect(modeledHrRequest(m, 'afib', 10)).toBeCloseTo(100 * (1 + AV_GAIN * 0.2), 9);
    m.hrModel = m.prof.hrRest * 3;
    expect(modeledHrRequest(m, 'afib', 10)).toBeCloseTo(100 * (1 + AV_MOD_MAX), 9);
    m.hrModel = m.prof.hrRest * 0.2;
    expect(modeledHrRequest(m, 'afib', 10)).toBeCloseTo(100 * (1 - AV_MOD_MAX), 9);
    m.hrSet = null; // AF entered by a mode switch with no rate on record: its own rate stands
    expect(modeledHrRequest(m, 'afib', 10)).toBeNull();
  });
});
