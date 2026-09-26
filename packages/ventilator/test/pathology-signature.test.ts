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

describe('catalogue coverage', () => {
  it('has the R36 parenchymal/restrictive rows (Task 10)', () => {
    const ids = LUNG_PATHOLOGIES.map((r) => r.id);
    for (const id of ['ards-mild', 'ards-moderate', 'ards-severe-recruitable', 'ards-severe-nonrecruitable', 'fibrosis-ild', 'scleroderma', 'chest-wall-restriction', 'obesity-ohs', 'pneumonia-lobar', 'atelectasis', 'oedema-cardiogenic', 'oedema-noncardiogenic', 'aspiration', 'covid-pneumonitis']) expect(ids).toContain(id);
  });
  it('has all 39 R36 rows, unique ids, and every row cites its compliance and signature (Task 11)', () => {
    expect(LUNG_PATHOLOGIES).toHaveLength(39);
    expect(new Set(LUNG_PATHOLOGIES.map((r) => r.id)).size).toBe(39);
    for (const r of LUNG_PATHOLOGIES) {
      expect(r.sources.length).toBeGreaterThanOrEqual(2);
      for (const b of [r.complianceMl, r.rInsp, r.rExp, r.shunt, r.deadSpaceFraction, r.pvrMultiplier]) expect(b.lo <= b.value && b.value <= b.hi).toBe(true);
    }
    expect(LUNG_PATHOLOGIES.find((r) => r.id === 'bronchopleural-fistula')!.monitor).toMatch(/NOT modelled/);
  });
});
