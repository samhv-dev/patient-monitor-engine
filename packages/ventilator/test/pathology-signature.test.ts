// R36 catalogue: every row, run at its reference settings, shows the ventilator numbers its sources report.
import { describe, expect, it } from 'vitest';
import { LUNG_PATHOLOGIES, referenceRun } from '../src/index.ts';

const inBand = (x: number, b: { lo: number; hi: number }) => x >= b.lo - 0.05 && x <= b.hi + 0.05;

describe('lung pathology catalogue — ventilator signatures at the reference settings', () => {
  it.each(LUNG_PATHOLOGIES.map((r) => [r.id, r] as const))('%s', (_id, row) => {
    const { sig } = referenceRun(row);
    for (const k of ['plateau', 'drivingPressure', 'autoPeep', 'peakMinusPlateau'] as const) {
      expect(inBand(sig[k], row.signature[k]), `${k} ${sig[k].toFixed(1)} outside ${row.signature[k].lo}–${row.signature[k].hi}`).toBe(true);
    }
  });
});
