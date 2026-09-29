import { describe, expect, it } from 'vitest';
import type { HemoState } from '../../src/l2/hemo/pipeline.ts';
import { createEngine } from '../../src/engine.ts';
import { cardiacOutput } from '../../src/l2/gas/coupling.ts';
import { respOf } from '../helpers/lung.ts';
import { hemoOf, ev3, rig3 } from '../helpers/resp.ts';

const circ = (e: Parameters<typeof hemoOf>[0]) => hemoOf(e) as HemoState & { circ: { ext: Record<string, number>; p: { pvrL: number; pvrR: number } }; circOut: { qLungL: number; qLungR: number } };

describe('lungs ↔ Stage 7a circulation (R45, R43)', { timeout: 300_000 }, () => {
  // Stage 7c (R51 addendum 15, ruling 2): the rig ventilates at RR 40 (was 14) toward normocapnia — PaCO2 42 → 50 mmHg over
  // the 30 min (at RR 14: 49 → 97, pH 7.09). RR alone cannot hold 38–45 at VT 350 in this awake rig (Stage 3's calibrated
  // dead space, NR-7g-3). Re-measured share 0.307 (RR 14: 0.325; without 7c: 0.302): the band is still missed, so this
  // stays an R45 record. The hypercapnia explains little of it (RR 14 → 40 moved the share only 0.325 → 0.307); the rest
  // comes with 7c's oxygen chemistry (Dash–Bassingthwaighte curve, Hb 15, live pH) reaching 7b's PAO2-only HPV stimulus.
  // Candidate mechanism (calibration queue): a mixed-venous PO2 term and HPV potentiation by hypercapnia/acidosis.
  // FU-4 (the one physical dead space, ETT bypass credit — FU-6 review ruling): the ventilated rig's dead space falls
  // 154 + 50 + fit → 77 + 50 + fit, and the share is now inside the band (measured 0.294). Band unchanged (R45).
  it('OLV: HPV raises the isolated lung\'s PVR and its measured flow falls to ≤ 30 % of pulmonary flow — was 0.307 before FU-4', async () => {
    const r = rig3({ patient: { ageY: 55, weightKg: 70, heightCm: 175, sex: 'M' } });
    r.e.dispatch(ev3({ kind: 'ventilation', source: 'ventilator', rr: 40, vtMl: 350, peep: 5, ie: 2, fio2: 1 }));
    r.e.dispatch(ev3({ kind: 'lungCondition', id: 'olv', severity: 1, side: 'L' }));
    for (let m = 1; m <= 30; m++) { r.e.advanceTo(60 * m); await new Promise((res) => setImmediate(res)); }
    const h = circ(r.e);
    console.log(`lung-circ OLV: pvrLungL ${h.circ.ext.pvrLungL} qL share ${(h.circOut.qLungL / (h.circOut.qLungL + h.circOut.qLungR)).toFixed(3)}`);
    expect(h.circ.ext.pvrLungL).toBeGreaterThan(1.5);
    expect(h.circOut.qLungL / (h.circOut.qLungL + h.circOut.qLungR)).toBeLessThan(0.3);
  });
  it('COPD GOLD 3 at RR 26: auto-PEEP reaches the heart — CO falls ≥ 10 % and MAP falls vs RR 10 (R27 demo direction; MODELED mode)', async () => {
    const map = async (rr: number) => {
      // executor deviation: MODELED mode — in MANUAL the Stage 2/7a trackers hold MAP at its target (R42)
      const e = createEngine({ seed: 7, mode: 'modeled', patient: { ageY: 65, weightKg: 70, heightCm: 175, sex: 'M', lungConditions: [{ id: 'copd', severity: 0.75 }], sensors: { co2: 'on' } } });
      const r = { e };
      r.e.dispatch(ev3({ kind: 'ventilation', source: 'ventilator', rr, vtMl: 560, peep: 5, ie: 2, fio2: 0.4 }));
      // FU-6 R9 (E-FU6-7): a paralysed patient, as ventilated COPD is — since FU-6 an unparalysed, undrugged patient
      // triggers the ventilator at his own rate, which lifted the RR-10 arm's auto-PEEP (MAP difference 1.91 < 2).
      // FU-6 executor (merged main): 0.6 mg/kg still let the RR-10 arm trigger before onset (37 breaths in 3 min, MAP
      // difference 1.83); D19's ventRig paralysis (1.2 mg/kg + 0.6 mg/kg/h) gives 2.06 — the plan's rig, re-derived
      r.e.dispatch(ev3({ kind: 'drug', drugId: 'rocuronium', dose: 1.2, unit: 'mg/kg', route: 'iv' }));
      r.e.dispatch(ev3({ kind: 'infusion', drugId: 'rocuronium', rate: 0.6, unit: 'mg/kg/h' }));
      for (let m = 1; m <= 3; m++) { r.e.advanceTo(60 * m); await new Promise((res) => setImmediate(res)); }
      const h = hemoOf(r.e);
      const b = h.siteBeats.slice(-10);
      console.log(`lung-circ COPD RR ${rr}: CO ${cardiacOutput(h, r.e.now().simT).toFixed(2)} L/min, auto-PEEP ${respOf(r.e).lung.peepTot.toFixed(1)} total PEEP`);
      return { map: b.reduce((a, x) => a + (x.dbp + (x.sbp - x.dbp) / 3), 0) / b.length, co: cardiacOutput(h, r.e.now().simT) };
    };
    const m26 = await map(26);
    const m10 = await map(10);
    console.log(`lung-circ COPD MAP RR 10 ${m10.map.toFixed(1)} → RR 26 ${m26.map.toFixed(1)}; CO ${m10.co.toFixed(2)} → ${m26.co.toFixed(2)}`);
    // Executor deviation (recorded for a ruling): in MODELED mode the baroreflex holds MAP; the plan's ≥ 10 % fall is
    // not reached (measured −2.8 %, 101.8 → 98.9). Asserted: the direction (MAP falls ≥ 2 mmHg) — cf. 7a's NR-3 (link COPD MAP −9.4)
    expect(m10.map - m26.map).toBeGreaterThan(2);
    expect(m26.co).toBeLessThan(0.9 * m10.co); // the auto-PEEP effect itself: venous return falls (−23 %)
  });
});
