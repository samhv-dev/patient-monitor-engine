// Catalogue row → ventilator lung (the `vent` part of a link profile) and the reference-settings run the
// signature tests use. Expiratory resistance above inspiratory is expressed through v1.9's flow-limitation term
// with a custom factor (eflK = rInsp/rExp) and no PEEP stenting, so R_exp is exactly the row's value.
import { advanceVent, createVent } from '../vent.ts';
import type { VentConfig, VentState } from '../types.ts';
import type { RecruitParams } from '../link/recruit.ts';
import { REF_SETTINGS, type LungPathology } from './catalogue.ts';

export function mechanicsToVent(row: LungPathology): Partial<VentConfig> {
  const ri = row.rInsp.value;
  const re = row.rExp.value;
  const efl = re > ri * 1.05;
  return {
    compliance: row.complianceMl.value, resistance: ri, airwayClosure: false, uip: false, stressIdx: false,
    efl, eflSeverity: efl ? 'custom' : 'moderate', eflK: efl ? ri / re : 0.35, peepStent: efl ? 0 : 40,
  };
}

/** PEEP recruitment for the link (link/recruit.ts): shunt spans the row's band; none when not recruitable. */
export function recruitOf(row: LungPathology): RecruitParams | null {
  if (row.recruitability === 'none' || row.recruitP50 === undefined) return null;
  const k = { high: 2, moderate: 2.5, low: 4 }[row.recruitability];
  return { shuntMax: row.shunt.hi, shuntMin: row.shunt.lo, p50: row.recruitP50, k };
}

export interface Signature { plateau: number; drivingPressure: number; autoPeep: number; peakMinusPlateau: number }

/** Run the row at its reference settings for 60 s (VC, square flow, 0.3 s pause, no pressure limit). */
export function referenceRun(row: LungPathology): { vs: VentState; sig: Signature } {
  const r = { ...REF_SETTINGS, ...row.ref };
  const vs = createVent({
    ...mechanicsToVent(row), mode: 'VC', vt: r.vtMl, rate: r.rr, peep: r.peep, vcFlow: r.flowLpm, pause: r.pauseS,
    flowPattern: 'square', pmax: 120,
  });
  advanceVent(vs, 60);
  const m = vs.p.measured;
  return {
    vs,
    sig: { plateau: m.PLAT, drivingPressure: m.PLAT - r.peep - m.autoPEEP, autoPeep: m.autoPEEP, peakMinusPlateau: m.PIP - m.PLAT },
  };
}
