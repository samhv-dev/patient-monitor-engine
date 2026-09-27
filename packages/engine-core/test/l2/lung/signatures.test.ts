// Per-condition ventilator signatures against the catalogue bands in data/lung-pathology.ts (Task 20).
import { describe, expect, it } from 'vitest';
import { LUNG_CONDITIONS, type Bands } from '../../../data/lung-pathology.ts';
import { createMech } from '../../../src/l2/lung/mechanics.ts';
import { referenceRun } from '../../../src/l2/lung/measure.ts';
import { capnoTerms } from '../../../src/l2/lung/lung.ts';
import { mechParams } from '../../../src/l2/lung/side.ts';
import type { LungConditionId } from '../../../src/types-lung.ts';
import { lungRig, paramsFor, rigOut, runRig } from '../../helpers/lung.ts';

const REF = { vtMl: 490, rr: 14, peep: 5, flowLps: 1, pauseS: 0.3 };
/** Measured signature of one condition at its reference severity. */
export function signature(id: LungConditionId, sev: number) {
  const specs = [{ id, severity: sev }];
  const { lp, mainstem } = paramsFor(specs);
  const blocked = [mainstem === 'right', mainstem === 'left'];
  const mp = () => mechParams(lp, lp.side.map((s) => 1 - s.atel - s.consol), blocked);
  const b = referenceRun(mp(), createMech(), REF);
  // the catalogue's auto-PEEP bands are stated at VT 8 mL/kg, I:E 1:2 (§5 row 'Auto-PEEP (test band)')
  const ap = referenceRun(mp(), createMech(), { vtMl: 560, rr: 14, peep: 5, flowLps: 0.56 / (60 / 14 / 3), pauseS: 0 }).autoPeep;
  // a blocked lung collapses over 5–40 min (§23): gas signatures of mainstem conditions are read at 30 min
  const settle = mainstem === 'both' ? 600 : 1800;
  const gas = (fio2: number) => { const r = lungRig(specs, { vt: 490, rr: 14, peep: 5, ie: 2, fio2 }); r.ls.mainstem = mainstem; runRig(r, settle); return r; };
  const g04 = gas(0.4);
  return { crs: b.cstat, rInsp: b.rInsp, autoPeep: ap, plateau: b.pplat, drivingPressure: b.drivingP, gapPaEt: rigOut(g04).gap, shunt: rigOut(g04).shunt, spo2Fio2_04: rigOut(g04).spo2, spo2Fio2_021: rigOut(gas(0.21)).spo2, spo2Fio2_10: rigOut(gas(1)).spo2, tauII: capnoTerms(g04.ls).tauII };
}
/**
 * Bands the model does not meet at the prototype constants, with the measured value (plan "Deviations"; Ali's R44
 * calibration pass decides). A NEW miss fails the test; fixing a listed one is allowed (delete its entry).
 */
const KNOWN: Record<string, string[]> = {
  asthma: ['gapPaEt'], // 6.3 vs 20–50 (§3 acute severe: hypercapnia is from hypoventilation, not V/Q, at the reference VE)
  obesity: ['gapPaEt', 'shunt'], // 3.3 vs 5–8, 0.05 vs 0.10–0.15 (induction atelectasis builds over minutes; rig starts at 0)
  pneumonia: ['spo2Fio2_04'], // 96.8 vs 88–93 (HPV halved in the lobe per Q79 not yet applied to consolidation)
  atelectasis: ['shunt'], // 0.16 vs 0.10–0.12 (plugged lobe, ATEL_PERF 1.0)
  ptxSimple: ['shunt'], // 0.12 vs 0.07
  olv: ['crs', 'shunt'], // 33.9 vs 25–30 (shared chest wall, decision 1); 0.14 vs 0.2–0.3 at FiO2 0.4 after 30 min (collapse τ ≈ 30 min at 0.4)
  endobronchial: ['crs'], // 34.0 vs 27.5–30.3 (shared chest wall)
  cf: ['spo2Fio2_021'], // 95.4 vs 88–94
  neonatalRds: ['shunt'], // 0.16 vs 0.2–0.4 (adult rig; neonatal profile arrives with R22 bands)
};
const KEYS = ['crs', 'rInsp', 'autoPeep', 'plateau', 'drivingPressure', 'gapPaEt', 'shunt', 'spo2Fio2_021', 'spo2Fio2_04', 'spo2Fio2_10'] as const;
describe('per-condition signatures within the catalogue bands', { timeout: 300_000 }, () => {
  for (const c of LUNG_CONDITIONS) {
    it(`${c.id} (severity ${c.bands.refSeverity})`, () => {
      const s = signature(c.id as LungConditionId, c.bands.refSeverity);
      const miss: string[] = [];
      for (const k of KEYS) {
        const band = (c.bands as Bands)[k] as readonly [number, number] | undefined;
        if (!band) continue;
        const v = s[k];
        const tol = k === 'shunt' ? 0.03 : k.startsWith('spo2') ? 1 : 0.1 * Math.max(1, Math.abs(band[1]));
        if (v < band[0] - tol || v > band[1] + tol) miss.push(`${k} ${v.toFixed(2)} ∉ [${band[0]}, ${band[1]}]`);
      }
      const unexpected = miss.filter((m) => !(KNOWN[c.id] ?? []).includes(m.split(' ')[0] as string));
      if (miss.length) console.log(`signature ${c.id}: ${miss.join('; ')}`); // the gate note copies these lines
      expect(unexpected).toEqual([]);
    });
  }
});
