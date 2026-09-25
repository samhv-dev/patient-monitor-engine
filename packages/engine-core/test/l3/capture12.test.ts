// Stage 4b acceptance: 12-lead capture returns 12 × 10 s arrays, diagnostic-filtered, with the limb identities holding.
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/engine.ts';
import { capture12, LAYOUT_3X4 } from '../../src/l3/capture12/capture.ts';
import { LEAD_IDS } from '../../src/types.ts';

describe('capture12', () => {
  it('12 leads × 5000 samples, identities III = II − I, aVR = −(I+II)/2, aVL = I − II/2, aVF = II − I/2', () => {
    const e = createEngine({ seed: 4 });
    e.advanceTo(30);
    const c = capture12(e);
    expect(c.t0).toBeCloseTo(20, 6);
    expect(Object.keys(c.leads)).toEqual([...LEAD_IDS]);
    for (const l of LEAD_IDS) expect(c.leads[l]).toHaveLength(5000);
    const { ecgI: I, ecgII: II, ecgIII: III, aVR, aVL, aVF } = c.leads;
    for (let i = 0; i < 5000; i += 7) {
      expect(III[i]! - (II[i]! - I[i]!)).toBeCloseTo(0, 5);
      expect(aVR[i]! + (I[i]! + II[i]!) / 2).toBeCloseTo(0, 5);
      expect(aVL[i]! - (I[i]! - II[i]! / 2)).toBeCloseTo(0, 5);
      expect(aVF[i]! - (II[i]! - I[i]! / 2)).toBeCloseTo(0, 5);
    }
    expect(c.filter).toEqual([0.05, 150]);
    expect(c.layout.rows).toBe(LAYOUT_3X4);
    expect(c.measurements.hr).toBeGreaterThan(65);
    expect(c.measurements.hr).toBeLessThan(85);
    expect(c.measurements.axisDeg).toBeGreaterThan(0);
    expect(c.measurements.axisDeg).toBeLessThan(90); // normal axis
  });

  it('the diagnostic filter is applied whatever the monitor filter (a band-limited monitor lane differs from the capture)', () => {
    const e = createEngine({ seed: 4 });
    e.dispatch({ id: 'f', issuedBy: 't', type: 'device', action: { device: 'ecg', action: 'filter', value: 'band:0.5-24' } });
    e.advanceTo(30);
    const a = capture12(e).leads.ecgII;
    const e2 = createEngine({ seed: 4 });
    e2.advanceTo(30);
    const b = capture12(e2).leads.ecgII;
    for (let i = 0; i < 5000; i += 11) expect(a[i]).toBeCloseTo(b[i]!, 6);
  });

  it('needs 10 s of ECG', () => {
    const e = createEngine();
    e.advanceTo(5);
    expect(() => capture12(e)).toThrow(/10 s/);
  });
});
