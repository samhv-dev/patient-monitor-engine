import { describe, expect, it } from 'vitest';
import { createMech } from '../../../src/l2/lung/mechanics.ts';
import { referenceRun, type VcSettings } from '../../../src/l2/lung/measure.ts';
import { mechParams } from '../../../src/l2/lung/side.ts';
import { paramsFor } from '../../helpers/lung.ts';
import type { LungConditionSpec } from '../../../src/types-lung.ts';

const REF: VcSettings = { vtMl: 490, rr: 14, peep: 5, flowLps: 1, pauseS: 0.3 }; // Stage V REF_SETTINGS
const ie12 = (rr: number): VcSettings => ({ vtMl: 560, rr, peep: 5, flowLps: 0.56 / (60 / rr / 3), pauseS: 0 });
function measure(specs: LungConditionSpec[], s = REF) {
  const { lp, mainstem } = paramsFor(specs);
  const aer = lp.side.map((x) => 1 - x.atel - x.consol);
  return referenceRun(mechParams(lp, aer, [mainstem === 'right', mainstem === 'left']), createMech(), s);
}
const within = (x: number, target: number, tol: number) => expect(Math.abs(x - target) / target).toBeLessThanOrEqual(tol);

describe('ventilator measurements on the unit model (Arnal 2018 method)', () => {
  it('healthy: Cstat 54 and Rinsp 10 within 10 % (Pulse N-P03 healthy), no auto-PEEP', () => {
    const b = measure([]);
    within(b.cstat, 54, 0.1);
    within(b.rInsp, 10, 0.1);
    expect(b.autoPeep).toBeLessThan(0.3);
  });
  it('COPD auto-PEEP at VT 8 mL/kg, RR 14, I:E 1:2 sits in the catalogue §5 bands by GOLD grade', () => {
    const a = (sev: number) => measure([{ id: 'copd', severity: sev }], ie12(14)).autoPeep;
    expect(a(0.5)).toBeGreaterThanOrEqual(1);
    expect(a(0.5)).toBeLessThanOrEqual(3);
    expect(a(0.75)).toBeGreaterThanOrEqual(4);
    expect(a(0.75)).toBeLessThanOrEqual(8);
    expect(a(1)).toBeGreaterThanOrEqual(8);
    expect(a(1)).toBeLessThanOrEqual(12);
  });
  it('COPD auto-PEEP rises monotonically with RR (GOLD 3)', () => {
    const xs = [10, 14, 20, 26].map((rr) => measure([{ id: 'copd', severity: 0.75 }], ie12(rr)).autoPeep);
    for (let i = 1; i < xs.length; i++) expect(xs[i]).toBeGreaterThan(xs[i - 1] as number);
  });
  it('ARDS moderate: Cstat 35 within 10 % (Pulse/Maj 2023), R 12 within 10 %', () => {
    const b = measure([{ id: 'ards', severity: 0.67 }]);
    within(b.cstat, 35, 0.1);
    within(b.rInsp, 12, 0.1);
  });
  it('endobronchial: driving pressure +50–100 % for the same VT (catalogue §23)', () => {
    const h = measure([]);
    const e = measure([{ id: 'endobronchial', severity: 1 }]);
    const rise = e.drivingP / h.drivingP - 1;
    expect(rise).toBeGreaterThan(0.5);
    expect(rise).toBeLessThan(1.0);
  });
});
