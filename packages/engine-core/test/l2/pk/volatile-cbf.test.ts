// FU-2 item 8 (G7d R-7D-3, tables §5.1): the volatile's cerebral effect on 7g's bus — CMRO2 falls per MAC, and `cbfVaso`
// carries the DIRECT vasodilation beyond flow–metabolism coupling (Matta 1999, MCA velocity under an isoelectric EEG):
// sevoflurane +4 % / +17 %, isoflurane +19 % / +72 % at 0.5 / 1.5 MAC (was a linear 1.10 / 1.30 and 1.20 / 1.60).
// NET CBF is 7d's product of this direct factor × its CMRO2 coupling.
import { describe, expect, it } from 'vitest';
import { combine, volatileCbfDirect, type PdContext } from '../../../src/l2/pk/combine.ts';
import { DRUGS } from '../../../src/l2/pk/data/drugs.ts';
import type { DrugRow } from '../../../src/l2/pk/row.ts';

const CTX: PdContext = { ph: 7.4, betaBlockC: 0, vasoResp: 1, ageY: 40, macBrain: 0 };
const cns = (id: string, mac: number) => combine([{ row: DRUGS[id] as DrugRow, c: mac }], { ...CTX, macBrain: mac }).bus.cns;

describe('volatile CBF on the drug bus (FU-2 item 8)', () => {
  it('direct CBF (cbfVaso) at 0.5 / 1.5 MAC: sevoflurane 1.04 / 1.17, isoflurane 1.19 / 1.72 — no division by the CMRO2 share', () => {
    expect(cns('sevoflurane', 0.5).cbfVaso).toBeCloseTo(1.04, 9);
    expect(cns('sevoflurane', 1.5).cbfVaso).toBeCloseTo(1.17, 9);
    expect(cns('isoflurane', 0.5).cbfVaso).toBeCloseTo(1.19, 9);
    expect(cns('isoflurane', 1.5).cbfVaso).toBeCloseTo(1.72, 9);
  });
  it('CMRO2 per tables §5.1: sevoflurane ×(1 − 0.25·MAC), isoflurane ×(1 − 0.3·MAC), floor 0.5', () => {
    expect(cns('sevoflurane', 1.5).cmro2Mult).toBeCloseTo(0.625, 9);
    expect(cns('isoflurane', 1.5).cmro2Mult).toBeCloseTo(0.55, 9);
    expect(cns('isoflurane', 2.5).cmro2Mult).toBeCloseTo(0.5, 9);
  });
  it('no volatile → neutral; the direct curve is continuous at 0.5 MAC', () => {
    expect(combine([], CTX).bus.cns.cbfVaso).toBe(1);
    expect(volatileCbfDirect(0.5, [0.04, 0.17])).toBeCloseTo(1.04, 12);
    expect(volatileCbfDirect(0.5 + 1e-9, [0.04, 0.17])).toBeCloseTo(1.04, 6);
    expect(volatileCbfDirect(0, [0.04, 0.17])).toBe(1);
  });
});
