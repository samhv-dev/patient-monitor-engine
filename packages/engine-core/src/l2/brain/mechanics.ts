// Monro–Kellie craniospinal mechanics (tables §5.1): ICP = ICP0·10^(ΔV/PVI) over the change of intracranial volume
// (mass + oedema + ΔCBV − displaced CSF − osmotic brain-water loss − head-up venous drainage), and Marmarou CSF
// dynamics: production is constant, absorption rises with (ICP − Pss)/Rout, and the displaceable CSF is finite.
import { CSF_PROD_ML_MIN, CSF_RESERVE_ML } from './params.ts';

/** ICP (mmHg) for a volume change ΔV (mL) from the resting state (ICP0, PVI). */
export function icpOfVolume(dV: number, icp0: number, pvi: number): number {
  return icp0 * 10 ** (dV / pvi);
}

/** Volume change (mL) that gives this ICP — the inverse of icpOfVolume. */
export function volumeOfIcp(icp: number, icp0: number, pvi: number): number {
  return pvi * Math.log10(Math.max(1e-3, icp) / icp0);
}

/** Elastance dICP/dV (mmHg/mL) = 2.303·ICP/PVI (tables `pvi` row). */
export function elastance(icp: number, pvi: number): number {
  return (Math.LN10 * icp) / pvi;
}

/**
 * d(displaced CSF)/dt, mL/min. At rest production = absorption (Pss = ICP0 − P·Rout). Above ICP0 the extra
 * absorption (ICP − ICP0)/Rout displaces CSF, fading as the displaceable reserve is used (1 − (d/R)²); below ICP0
 * CSF re-accumulates, never faster than it is produced.
 */
export function csfDisplacementRate(icp: number, disp: number, icp0: number, rOut: number, reserve = CSF_RESERVE_ML): number {
  const extra = (icp - icp0) / rOut;
  if (extra >= 0) return extra * Math.max(0, 1 - (disp / reserve) ** 2);
  return disp > 0 ? Math.max(-CSF_PROD_ML_MIN, extra) : 0;
}
