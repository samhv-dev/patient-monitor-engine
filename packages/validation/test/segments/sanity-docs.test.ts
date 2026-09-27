import { validateScenario } from '@pme/controller/scenario';
import { describe, expect, it } from 'vitest';
import { SANITY_DOCS } from '../../suites/sanity/sanity-docs.ts';
import { runValidationDoc } from '../../src/segments/run.ts';

describe('sanity documents (brief §4.9 + tables §7)', () => {
  it('cover checks 1–4, 6–9 and 10–25 with unique ids', () => {
    const ids = SANITY_DOCS.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const k of ['s1', 's2', 's3', 's4', 's6', 's7', 's8', 's9', ...Array.from({ length: 16 }, (_, i) => `t${i + 10}`)]) expect(ids.some((i) => i.startsWith(`${k}-`) || i.startsWith(k))).toBe(true);
  });
  it('every inline scenario passes the pme-scenario/1 schema', () => {
    for (const d of SANITY_DOCS) {
      const v = validateScenario(d.scenario);
      expect(v.ok ? [] : v.errors, d.id).toEqual([]);
    }
  });
  it('every target sits inside the run and names its source', () => {
    for (const d of SANITY_DOCS) for (const s of d.segments) {
      expect(s.toS).toBeLessThanOrEqual(d.durationS);
      for (const t of s.targets) expect(t.source.length).toBeGreaterThan(5);
    }
  });
  it('a document whose patient profile pme-scenario/1 cannot carry is NOT MEASURABLE, never graded on the default patient', async () => {
    const d = SANITY_DOCS.find((x) => x.id === 't16-septic-shock-warm');
    expect(d?.profile).toBe('conditions ["sepsisWarm"]');
    const r = await runValidationDoc(d as NonNullable<typeof d>);
    expect(r.measurable).toBe(false);
    expect(r.results).toEqual([]);
    expect(r.unsupported[0]?.type).toBe('patient profile');
  });
});
