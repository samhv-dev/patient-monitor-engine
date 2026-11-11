// The lab panel (plan decision 13): a 1 Hz `labs` truth event, and a drawn sample (`labSample`) that analysers.ts turns
// into a panel and returns after its row's sourced turnaround (plan learner-action-remote.md L10a).
import type { LabPanel, LabPanelId, LabValues } from '../../types-blood.ts';
import { solvePh } from './acid-base.ts';
import type { BloodCore } from './core.ts';
import { albGL } from './fluids.ts';
import { satDB } from './odc.ts';
import { NORMAL } from './params.ts';

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
    // PvCO2 − PaCO2 = VCO2/(Q·S), S 4.5 mL/L/mmHg [FIT: fixed CO2-content slope for venous PCO2; brief research/44 L2-41]; venous PO2 from SvO2 by inverting the curve (bisection)
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

/** What the sample carries from the other modules: the liver model's INR (absent without the organ model). */
export interface LabContext {
  inr?: number;
}

/**
 * Every analyte the engine computes for a sample drawn now, at the site (`abg` arterial, `vbg` venous; the chemistry and
 * coagulation analytes do not differ by site in the engine). A piece that computes a new analyte adds its key here.
 */
export function labSample(bc: BloodCore, x: LabInputs, site: 'abg' | 'vbg', ctx: LabContext = {}): LabValues {
  const v: LabValues = { ...labPanel(bc, x, site) };
  if (ctx.inr !== undefined) v.inr = r(ctx.inr, 1);
  return v;
}

/** A drawn sample: its values and due time frozen at the draw, the row it ran on (snapshotted with the blood state). */
export interface PendingLab {
  drawnAt: number;
  due: number;
  panel: LabPanelId;
  analyser: string;
  values: LabValues;
}
