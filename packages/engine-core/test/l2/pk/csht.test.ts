import { describe, expect, it } from 'vitest';
import { decrementFromNowMin, decrementTimeMin } from '../../../src/l2/pk/csht.ts';
import { eleveldPropofol, marshPropofol, mintoRemifentanil, schniderPropofol, shaferFentanyl, geptsSufentanil } from '../../../src/l2/pk/models.ts';
import { zeroState } from '../../../src/l2/pk/compartment.ts';

const REF = { ageY: 35, weightKg: 70, heightCm: 170, sex: 'm' as const };
const within = (v: number, ref: number, tol = 0.1) => expect(Math.abs(v - ref) / ref).toBeLessThan(tol);

describe('context-sensitive half-time (decision 3)', () => {
  it('propofol: each model within ±10 % of its own computed value; all < 40 min up to 8 h (Hughes 1992 / Miller)', () => {
    within(decrementTimeMin(eleveldPropofol(REF), 180), 4.5);
    within(decrementTimeMin(schniderPropofol(REF), 180), 3.5);
    within(decrementTimeMin(marshPropofol(REF), 180), 8.6);
    for (const p of [eleveldPropofol(REF), schniderPropofol(REF), marshPropofol(REF)]) expect(decrementTimeMin(p, 480)).toBeLessThan(40);
  });
  it('remifentanil 2–4 min and context-INsensitive (8 h within 5 % of 1 h) (Kapila 1995 3.2; Miller ch. 22 p. 588)', () => {
    const p = mintoRemifentanil({ ageY: 40, weightKg: 70, heightCm: 170, sex: 'm' });
    const h1 = decrementTimeMin(p, 60);
    const h8 = decrementTimeMin(p, 480);
    expect(h1).toBeGreaterThan(2);
    expect(h1).toBeLessThan(4);
    expect(Math.abs(h8 - h1) / h1).toBeLessThan(0.05);
  });
  it('fentanyl rises steeply: 3 h > 3× the 1 h value; sufentanil 3 h 20–30 min (Hughes 1992)', () => {
    const f1 = decrementTimeMin(shaferFentanyl(), 60);
    const f3 = decrementTimeMin(shaferFentanyl(), 180);
    expect(f3).toBeGreaterThan(3 * f1); // prototype 17.8 → 70.0
    const s3 = decrementTimeMin(geptsSufentanil(), 180);
    expect(s3).toBeGreaterThan(20);
    expect(s3).toBeLessThan(30); // prototype 25.6
  });
  it('decrement from now: zero state → 0; after a bolus Cp halves in finite time', () => {
    const p = eleveldPropofol(REF);
    expect(decrementFromNowMin(p, zeroState(p))).toBe(0);
    const x = zeroState(p);
    x[0] = 140;
    const t = decrementFromNowMin(p, x);
    expect(t).toBeGreaterThan(0);
    expect(t).toBeLessThan(5);
  });
});
