import { describe, expect, it } from 'vitest';
import { ventReference, VENT_ROW_MAP } from '@pme/engine-core';
import { LUNG_PATHOLOGIES, REF_SETTINGS } from '../src/pathology/catalogue.ts';

// Executor deviation from the plan's test: the engine values come from ventReference (the resolved parameters with the
// mainstem block of OLV/endobronchial applied: only the ventilated lung counts), and each row is resolved
// at its own PBW; the neonatal row keeps its authored numbers (the engine data is adult-frame until R22).
describe('Stage V catalogue numbers come from the engine lung data (Stage 7b Task 27)', () => {
  it('every row maps; mapped rows carry the engine-measured compliance and resistances', () => {
    for (const row of LUNG_PATHOLOGIES) {
      expect(Object.keys(VENT_ROW_MAP)).toContain(row.id);
      const m = VENT_ROW_MAP[row.id];
      const pbw = row.ref?.pbwKg ?? REF_SETTINGS.pbwKg;
      if (!m || pbw < 20) continue;
      const r = ventReference({ id: m.id as never, severity: m.severity, ...(m.side ? { side: m.side } : {}) }, pbw);
      expect(row.complianceMl.value).toBeCloseTo(r.crs, 0);
      expect(row.rInsp.value).toBeCloseTo(r.rInsp, 0);
      expect(row.complianceMl.lo).toBeLessThanOrEqual(row.complianceMl.value);
      expect(row.complianceMl.hi).toBeGreaterThanOrEqual(row.complianceMl.value);
    }
  });
});
