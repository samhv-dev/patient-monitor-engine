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

describe('library II', () => {
  it('Task 13 rows exist', () => {
    for (const id of ['rocuronium', 'vecuronium', 'cisatracurium', 'succinylcholine', 'sugammadex', 'neostigmine', 'glycopyrrolate', 'atropine', 'phenylephrine', 'ephedrine', 'norepinephrine', 'epinephrine', 'vasopressin', 'dobutamine', 'milrinone', 'dopamine', 'nitroglycerin', 'hydralazine', 'esmolol', 'labetalol', 'metoprolol', 'amiodarone', 'adenosine'])
      expect(DRUGS[id], id).toBeDefined();
  });
  it('catecholamines are flagged for acidosis; vasopressin and milrinone are not (T6.2)', () => {
    expect(DRUGS.norepinephrine!.pd.every((e) => e.catecholamine)).toBe(true);
    expect(DRUGS.vasopressin!.pd.some((e) => e.catecholamine)).toBe(false);
    expect(DRUGS.milrinone!.pd.some((e) => e.catecholamine || e.beta)).toBe(false);
  });
});
