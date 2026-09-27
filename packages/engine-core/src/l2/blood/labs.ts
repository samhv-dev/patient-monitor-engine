// The lab panel (plan decision 13): a 1 Hz `labs` truth event and the instructor's "send ABG/VBG" with a turnaround.
import type { LabPanel } from '../../types-blood.ts';
import { solvePh } from './acid-base.ts';
import type { BloodCore } from './core.ts';
import { albGL } from './fluids.ts';
import { satDB } from './odc.ts';
import { NORMAL } from './params.ts';

export const LAB_TURNAROUND_S = 120; // point-of-care analyser ≈ 60–90 s + the walk [ENG]
const r = (x: number, d: number) => Math.round(x * 10 ** d) / 10 ** d;

export interface LabInputs {
  paco2: number;
  pao2: number;
  tempC: number;
  vco2: number; // mL/min
  coLpm: number;
}

export function labPanel(bc: BloodCore, x: LabInputs, panel: 'abg' | 'vbg'): LabPanel {
  const o = bc.out;
  let ph = bc.ab.ph;
  let hco3 = bc.ab.hco3;
  let be = bc.ab.be;
  let pco2 = x.paco2;
  let po2 = x.pao2;
  let sFunc = satDB(x.pao2, x.paco2, x.tempC, bc.odc);
  if (panel === 'vbg') {
    // PvCO2 − PaCO2 = VCO2/(Q·S), S 4.5 mL/L/mmHg [ENG]; venous PO2 from SvO2 by inverting the curve (bisection)
    pco2 = x.paco2 + x.vco2 / (Math.max(0.3, x.coLpm) * 4.5);
    const a = solvePh(pco2, { sid: bc.ab.hco3 + bc.ab.atot, albGL: albGL(bc.fl), piMmolL: NORMAL.piMmolL, hb: bc.odc.hb });
    ph = a.ph;
    hco3 = a.hco3;
    be = a.be;
    let lo = 1;
    let hi = x.pao2;
    for (let i = 0; i < 30; i++) {
      const mid = 0.5 * (lo + hi);
      if (satDB(mid, pco2, x.tempC, bc.odc) < bc.o2.svo2) lo = mid;
      else hi = mid;
    }
    po2 = 0.5 * (lo + hi);
    sFunc = bc.o2.svo2;
  }
  const dys = bc.odc.cohb + bc.odc.methb;
  return {
    ph: r(ph, 2), pco2: r(pco2, 0), po2: r(po2, 0), hco3: r(hco3, 1), be: r(be, 1),
    so2: r(100 * sFunc * (1 - dys), 1), cohb: r(100 * bc.odc.cohb, 1), methb: r(100 * bc.odc.methb, 1),
    lactate: r(o.lactate, 1), na: r(o.na, 0), k: r(o.k, 1), cl: r(o.cl, 0), iCa: r(o.iCa, 2), mg: r(o.mg, 2),
    hb: r(o.hb, 1), glucose: r((bc as { endoGlucoseMgDl?: number }).endoGlucoseMgDl ?? NORMAL.glucoseMgDl, 0), ag: r(o.ag, 0), osm: r(o.osm, 0),
  };
}

export interface PendingLab {
  drawnAt: number;
  due: number;
  panel: 'abg' | 'vbg';
  values: LabPanel;
}
