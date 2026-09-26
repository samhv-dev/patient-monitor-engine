import { describe, expect, it } from 'vitest';
import { HEALTHY, LUNG_CONDITIONS, VENT_ROW_MAP, type EffectKey } from '../../../data/lung-pathology.ts';
import { LUNG_CONDITION_IDS } from '../../../src/types-lung.ts';

describe('lung-pathology data (R36, catalogue §1–§33)', () => {
  it('32 conditions in catalogue order, ids = LUNG_CONDITION_IDS', () => {
    expect(LUNG_CONDITIONS.map((c) => c.id)).toEqual([...LUNG_CONDITION_IDS]);
    expect(LUNG_CONDITIONS.map((c) => c.section)).toEqual(Array.from({ length: 32 }, (_, i) => i + 1));
  });
  it('every effect has a known key, provenance and a tag; knots start at severity 0 and increase', () => {
    for (const c of LUNG_CONDITIONS) {
      for (const e of c.effects) {
        expect(Object.keys(HEALTHY)).toContain(e.key as EffectKey);
        expect(e.src.length).toBeGreaterThan(10);
        expect(['P', 'TXT', 'ENG', 'VERIFY']).toContain(e.tag);
        if (typeof e.v !== 'number') {
          expect(e.v[0]?.[0]).toBe(0);
          for (let i = 1; i < e.v.length; i++) expect(e.v[i]![0]).toBeGreaterThan(e.v[i - 1]![0]);
        }
      }
      expect(c.bands.src.length).toBeGreaterThan(10);
      expect(c.bands.refSeverity).toBeGreaterThan(0);
    }
  });
  it('sided conditions: OLV and endobronchial block a main bronchus', () => {
    const byId = (id: string) => LUNG_CONDITIONS.find((c) => c.id === id)!;
    expect(byId('olv').mainstem).toBe('blockAffected');
    expect(byId('endobronchial').mainstem).toBe('blockAffected');
    expect(byId('ptxSimple').sided).toBe(true);
    expect(byId('copd').sided).toBe(false);
  });
  it("Stage V's 39 rows map onto real conditions", () => {
    expect(Object.keys(VENT_ROW_MAP).length).toBe(39);
    for (const m of Object.values(VENT_ROW_MAP)) if (m) expect(LUNG_CONDITION_IDS as readonly string[]).toContain(m.id);
  });
});
