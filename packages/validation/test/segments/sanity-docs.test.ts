import { validateScenario } from '@pme/controller/scenario';
import { describe, expect, it } from 'vitest';
import { SANITY_DOCS } from '../../suites/sanity/sanity-docs.ts';

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
  it('profile documents carry their patient in pme-scenario/1 patient.profile (FU-3 item 9), never only in notes', () => {
    const withProfile = SANITY_DOCS.filter((d) => (d.scenario as { patient?: { profile?: unknown } }).patient?.profile).map((d) => d.id);
    expect(withProfile).toEqual(['t10-as-cad-propofol', 't11-chronic-mr-fluid', 't17b-class3-bb', 't18-htn-hypocapnia-cbf', 't19-tbi-haematoma', 't20-low-flow-oliguria', 't22-term-spinal', 't23-term-apnoea']);
    for (const d of SANITY_DOCS) expect(JSON.stringify(d), d.id).not.toMatch(/R22 profile|"profile":"/);
  });
});
