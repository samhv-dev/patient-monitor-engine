// @vitest-environment happy-dom
// Finding N125 (plan pump-rack-tci.md §5, D12): the pump page was given no device profiles (`profiles: null`), so every
// face said "device profile not loaded" and could show no limit or gap in words. The app now loads S1's shipped
// profiles through the source rules (loadPumpDevices) for the host and the tablet alike, and the face reads them.
import { describe, expect, it } from 'vitest';
import { faceProfilesOf, shippedPumpDevices } from './devices.ts';
import { faceModel } from './face.ts';

describe('the shipped pump device profiles in the app (N125)', () => {
  it('load under the source rules: the SP-500, the OT-701 and the SP5 TCI', () => {
    const d = shippedPumpDevices();
    expect(d).not.toBeNull();
    expect(d!['sp-500'].syringes.map((s) => s.ml)).toEqual([10, 20, 30, 50]);
    expect(d!['ot-701'].sets.map((s) => s.dropsPerMl)).toEqual([15, 20, 60]);
    expect(d!['sp5-tci'].model).toBe('BeneFusion SP5 TCI');
  });
  it("the face shows a profile's gap in its own words, not 'device profile not loaded'", () => {
    const p = faceProfilesOf(shippedPumpDevices());
    const syringe = faceModel(null, 'syringe', p).fields.find((f) => f.key === 'almostEmpty');
    const drip = faceModel(null, 'drip', p).fields.find((f) => f.key === 'kvo');
    expect(syringe?.value).toBe('near-end time not set');
    expect(drip?.value).toBe('KVO not set from the manual');
  });
});
