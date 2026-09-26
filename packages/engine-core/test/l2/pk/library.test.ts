import { describe, expect, it } from 'vitest';
import { DRUGS, DRUG_IDS } from '../../../src/l2/pk/data/drugs.ts';

describe('drug library', () => {
  it('every row is complete: source, tag, Iranian-availability question, doses, onset, a PK spec', () => {
    for (const id of DRUG_IDS) {
      const r = DRUGS[id]!;
      expect(r.id).toBe(id);
      expect(r.src.length).toBeGreaterThan(3);
      expect(['P', 'TXT', 'ENG', 'VERIFY']).toContain(r.tag);
      expect(r.ir).toBe('?');
      expect(r.doses.length).toBeGreaterThan(0);
      expect(r.onset.length).toBeGreaterThan(0);
      for (const e of r.pd) {
        expect(Number.isFinite(e.emax)).toBe(true);
        expect(e.ec50).toBeGreaterThan(0);
      }
    }
  });
  it('Task 12 rows exist', () => {
    for (const id of ['propofol', 'ketamine', 'etomidate', 'thiopental', 'midazolam', 'dexmedetomidine', 'fentanyl', 'remifentanil', 'sufentanil', 'morphine', 'sevoflurane', 'isoflurane', 'desflurane', 'n2o'])
      expect(DRUGS[id], id).toBeDefined();
  });
});
