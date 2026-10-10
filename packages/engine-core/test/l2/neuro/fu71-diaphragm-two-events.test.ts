// FU-7.1 A4 (owner ruling 2026-10-07; research/26 T1): after rocuronium 0.6 mg/kg the diaphragm's FIRST effort (≈ 16
// min, band 12–24; Moerer 2005: 15.9) moves a VT below the dead space, and EFFECTIVE ventilation comes ≈ 30 min (band
// 20–50; label clinical duration 31 min). Rig: 7g's real PK (no engine) + 7f's PD + the MODELED drive held at a
// hypercapnic PaCO2 (70 mmHg), so every second shows what the diaphragm would do if the brainstem asked for it.
import { describe, expect, it } from 'vitest';
import { readBus } from '../../../src/l2/neuro/bus.ts';
import { neuroResp } from '../../../src/l2/neuro/drive.ts';
import { siteBlock } from '../../../src/l2/neuro/nmb.ts';
import { createSpontDrive, diaphragmVtCapMl, stepSpontDrive, type SpontInputs } from '../../../src/l2/neuro/spont.ts';
import { give, rig, runTo } from '../../helpers/neuro.ts';
import { ONE } from '../../helpers/neuro-nmb.ts';

const X: SpontInputs = { t: 0, paco2: 70, pao2: 100, hco3: 24, rr0: 12, vt0: 500, co2SlopeMult: 1, pMaxMult: 1, evlwi: 7, complianceMl: 55, resistance: 3, ibwKg: 70 };
const V0 = { opioid: 0, propofol: 0, midazolam: 0, ketamine: 0 };
/** Anatomical dead space 2.2 mL/kg IBW (gas/params.ts ANAT_DEAD_SPACE_ML_PER_KG, brief §4.4). */
const VD = 2.2 * 70;

function course(drugId: string, dose: number): { min: number; rr: number; vt: number }[] {
  const r = rig();
  give(r, drugId, dose);
  const s = createSpontDrive();
  s.paco2Rest = 40;
  const out: { min: number; rr: number; vt: number }[] = [];
  runTo(r, 60, (bus, tMin) => {
    const di = siteBlock(readBus(bus).dia, 'dia', ONE);
    const n = neuroResp({ vent: V0, macVolatile: 0, diaBlock: di.b, diaNd: di.nd + di.dep > 0 ? di.nd / (di.nd + di.dep) : 0, tofr: 0, di: 40, naturalAirway: false, wasApnoeic: true, hypnotic: 1 });
    stepSpontDrive(s, { ...X, t: tMin * 60, neuro: n });
    out.push({ min: tMin, rr: s.rr, vt: s.vt });
  });
  return out;
}

describe('FU-7.1 A4: first diaphragmatic effort and effective ventilation are two events', { timeout: 120_000 }, () => {
  it('rocuronium 0.6 mg/kg: first effort at 12–24 min with a VT of 10–50 mL; effective ventilation (VT ≥ 7 mL/kg) at 20–50 min (main: 15.8 min, VT 329 mL at once)', () => {
    const c = course('rocuronium', 0.6);
    const first = c.find((p) => p.min > 5 && p.rr > 0)!;
    const effective = c.find((p) => p.min > 5 && p.vt >= 7 * 70)!;
    const belowVd = c.filter((p) => p.min >= first.min && p.min < effective.min && p.vt < VD).length / 60;
    // eslint-disable-next-line no-console -- the gate note's numbers
    console.log(`FU-7.1 A4: first effort ${first.min.toFixed(1)} min (VT ${first.vt.toFixed(0)} mL); effective ventilation ${effective?.min.toFixed(1)} min; ${belowVd.toFixed(1)} min of efforts below the dead space`);
    expect(first.min).toBeGreaterThanOrEqual(12);
    expect(first.min).toBeLessThanOrEqual(24);
    expect(first.vt).toBeGreaterThanOrEqual(10);
    expect(first.vt).toBeLessThanOrEqual(50);
    expect(effective.min).toBeGreaterThanOrEqual(20);
    expect(effective.min).toBeLessThanOrEqual(50);
    expect(belowVd).toBeGreaterThanOrEqual(5); // the efforts stay ineffective for minutes, not seconds
  });
  it('a depolarising block (no fade) is not capped: the cap is the chemical ceiling at nd 0, and 35 mL at the first effort at nd 1', () => {
    expect(diaphragmVtCapMl(0.06, 0, 70)).toBeCloseTo(35 * 70, 6);
    expect(diaphragmVtCapMl(0.05, 1, 70)).toBeCloseTo(0.5 * 70, 6);
    expect(diaphragmVtCapMl(0.8, 1, 70)).toBeCloseTo(7 * 70, 6);
    expect(diaphragmVtCapMl(1, 1, 70)).toBeCloseTo(35 * 70, 6);
  });
});
