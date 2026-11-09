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
const KEYS = ['crs', 'rInsp', 'autoPeep', 'plateau', 'drivingPressure', 'gapPaEt', 'shunt', 'spo2Fio2_021', 'spo2Fio2_04', 'spo2Fio2_10'] as const;
type Key = (typeof KEYS)[number];
const sigMemo = new Map<string, ReturnType<typeof signature>>();
/** One signature per condition, measured once and shared by its band test and its expected failures. */
function sig(id: string): ReturnType<typeof signature> {
  let s = sigMemo.get(id);
  if (!s) {
    const c = LUNG_CONDITIONS.find((x) => x.id === id);
    if (!c) throw new Error(`no catalogue condition ${id}`);
    s = signature(id as LungConditionId, c.bands.refSeverity);
    sigMemo.set(id, s);
  }
  return s;
}
/** The miss text when the condition's value of `k` is outside its catalogue band, else undefined. */
function outside(id: string, k: Key): string | undefined {
  const c = LUNG_CONDITIONS.find((x) => x.id === id);
  const band = (c?.bands as Bands | undefined)?.[k] as readonly [number, number] | undefined;
  if (!band) throw new Error(`${id} has no catalogue band for ${k}`);
  const v = sig(id)[k];
  // The band as the catalogue publishes it (audit 44 row T-26: until brief 87 an unsourced tolerance sat on every band:
  // shunt ± 0.03, SpO2 ± 1, all others ± 10 % of the band's upper value, so a shunt band 0.10–0.12 accepted 0.07–0.15).
  return v < band[0] || v > band[1] ? `${k} ${v.toFixed(3)} ∉ [${band[0]}, ${band[1]}]` : undefined;
}
/** Condition id → the keys that have their own `it.fails` below; filled by `miss` while the tests are collected. */
const EXPECTED = new Map<string, Set<Key>>();
/** Registers one band as an expected failure and returns its body: the band, as published, is not met yet. */
function miss(id: string, k: Key): () => void {
  EXPECTED.set(id, (EXPECTED.get(id) ?? new Set<Key>()).add(k));
  return () => expect(outside(id, k)).toBeUndefined();
}
describe('per-condition signatures within the catalogue bands', { timeout: 300_000 }, () => {
  for (const c of LUNG_CONDITIONS) {
    it(`${c.id} (severity ${c.bands.refSeverity})`, () => {
      const out: string[] = [];
      for (const k of KEYS) {
        if (!(c.bands as Bands)[k] || EXPECTED.get(c.id)?.has(k)) continue;
        const m = outside(c.id, k);
        if (m) out.push(m);
      }
      if (out.length) console.log(`signature ${c.id}: ${out.join('; ')}`); // the gate note copies these lines
      expect(out).toEqual([]);
    });
  }
  // The bands the model does not meet (audit 44 row T-27: until brief 87 an allow-list, `KNOWN`, that no lister counted).
  // Each title carries the measured value and the mechanism the miss waits for; the calibration pass (R44) decides.
  it.fails('asthma: PaCO2 − EtCO2 gap 20–50 mmHg (catalogue §3, acute severe) — measured 6.3; mechanism: the V/Q and dead-space heterogeneity of severe bronchospasm (the hypercapnia in the engine comes from hypoventilation at the reference VE)', miss('asthma', 'gapPaEt'));
  it.fails('obesity: PaCO2 − EtCO2 gap 5–8 mmHg (catalogue §10) — measured 3.2; mechanism: induction atelectasis building over minutes (the rig starts with none)', miss('obesity', 'gapPaEt'));
  it.fails('obesity: shunt 0.10–0.15 (catalogue §10) — measured 0.045; mechanism: induction atelectasis building over minutes (the rig starts with none)', miss('obesity', 'shunt'));
  it.fails('pneumonia: SpO2 88–93 % at FiO2 0.4 (catalogue §11) — measured 96.7; mechanism: HPV in the consolidated lobe (halved per Q79, not yet applied to consolidation)', miss('pneumonia', 'spo2Fio2_04'));
  it.fails('atelectasis: shunt 0.10–0.12 (catalogue §12) — measured 0.155; mechanism: the plugged lobe keeps its full perfusion (ATEL_PERF 1.0: no HPV diversion from the collapsed lobe)', miss('atelectasis', 'shunt'));
  it.fails('ptxSimple: shunt 0.07 (catalogue §15) — measured 0.119; mechanism: not yet identified', miss('ptxSimple', 'shunt'));
  it.fails('olv: Crs 25–30 mL/cmH2O (catalogue §22) — measured 33.9; mechanism: a separate hemithorax chest wall (both lungs share one chest wall, decision 1)', miss('olv', 'crs'));
  it.fails('olv: shunt 0.2–0.3 at FiO2 0.4 after 30 min (catalogue §22) — measured 0.140; mechanism: the non-ventilated lung collapses with τ ≈ 30 min at FiO2 0.4 and its HPV', miss('olv', 'shunt'));
  it.fails('endobronchial: Crs 27.5–30.25 mL/cmH2O (catalogue §23) — measured 34.0; mechanism: a separate hemithorax chest wall (both lungs share one chest wall, decision 1)', miss('endobronchial', 'crs'));
  it.fails('neonatalRds: shunt 0.2–0.4 (catalogue §30) — measured 0.158; mechanism: a neonatal rig (the reference rig is an adult; the neonatal profile arrives with the R22 bands)', miss('neonatalRds', 'shunt'));
  // Misses the tolerance had hidden (row T-26). Twelve are against a single catalogue value, which a continuous output meets
  // only by chance; whether the catalogue should state those as ranges from their own sources is the calibration pass's.
  it.fails('bronchospasm: inspiratory resistance 46 cmH2O·s/L (catalogue §2) — measured 46.005; the catalogue states one value; no mechanism identified (inside the removed tolerance)', miss('bronchospasm', 'rInsp'));
  it.fails('bronchospasm: auto-PEEP 6–10 cmH2O (catalogue §2) — measured 10.6; no mechanism identified yet (inside the removed tolerance)', miss('bronchospasm', 'autoPeep'));
  it('ards: Crs 32–50 mL/cmH2O (Arnal 2018: passive ARDS 39 [32–50], median [IQR], n 181) — measured 34.6', () => expect(outside('ards', 'crs')).toBeUndefined());
  it.fails('ards: plateau 19 cmH2O (catalogue §6) — measured 19.2; the catalogue states one value; no mechanism identified (inside the removed tolerance)', miss('ards', 'plateau'));
  it.fails('ards: driving pressure 14 cmH2O (catalogue §6) — measured 14.2; the catalogue states one value; no mechanism identified (inside the removed tolerance)', miss('ards', 'drivingPressure'));
  it.fails('ards: shunt 0.30 (catalogue §6) — measured 0.285; the catalogue states one value; no mechanism identified (inside the removed tolerance)', miss('ards', 'shunt'));
  it.fails('ild: Crs 32 mL/cmH2O (catalogue §7) — measured 31.8; the catalogue states one value; no mechanism identified (inside the removed tolerance)', miss('ild', 'crs'));
  it.fails('ild: inspiratory resistance 13 cmH2O·s/L (catalogue §7) — measured 12.9; the catalogue states one value; no mechanism identified (inside the removed tolerance)', miss('ild', 'rInsp'));
  it.fails('chestWall: Crs 32 mL/cmH2O (catalogue §9) — measured 33.5; the catalogue states one value; no mechanism identified (inside the removed tolerance)', miss('chestWall', 'crs'));
  it.fails('chestWall: inspiratory resistance 10 cmH2O·s/L (catalogue §9) — measured 9.88; the catalogue states one value; no mechanism identified (inside the removed tolerance)', miss('chestWall', 'rInsp'));
  it.fails('pe: PaCO2 − EtCO2 gap 15–25 mmHg (catalogue §18) — measured 25.9; no mechanism identified yet (inside the removed tolerance)', miss('pe', 'gapPaEt'));
  it.fails('cf: inspiratory resistance 20 cmH2O·s/L (catalogue §26) — measured 20.3; the catalogue states one value; no mechanism identified (inside the removed tolerance)', miss('cf', 'rInsp'));
  it('cf: SpO2 94.1–97.5 % at FiO2 0.21 (Welsner 2022: moderate CF adults 95.8 ± 1.7) — measured 94.9', () => expect(outside('cf', 'spo2Fio2_021')).toBeUndefined());
  it('covidPneumonitis: Crs 33–52 mL/cmH2O (Grasselli 2020: COVID-19 ARDS 41 [33–52], median [IQR], n 301) — measured 49.8', () => expect(outside('covidPneumonitis', 'crs')).toBeUndefined());
  it.fails('covidPneumonitis: shunt 0.30 (catalogue §31) — measured 0.320; the catalogue states one value; no mechanism identified (inside the removed tolerance)', miss('covidPneumonitis', 'shunt'));
});
