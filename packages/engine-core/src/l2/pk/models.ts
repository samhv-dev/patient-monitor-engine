// Published PK(+ke0) models, as functions of the patient (tables §6.1). Units: volumes L, clearances L/min, ke0 /min;
// amounts in the drug's amount unit (propofol mg → µg/mL; remifentanil/fentanyl µg → ng/mL). Since pump-rack T2 the
// registered sets live in tci-sets/ with their papers; this module keeps the time-to-peak-effect tools and
// the old names as re-exports.
import { pkStep, pkSystem, zeroState, type PkParams } from './compartment.ts';
import type { TciSetOpts } from './tci-sets/types.ts';

export { eleveldPropofol } from './tci-sets/eleveld.ts';
export { schniderPropofol } from './tci-sets/schnider.ts';
export { mintoRemifentanil } from './tci-sets/minto.ts';
export { FENTANYL_KE0, shaferFentanyl } from './tci-sets/shafer.ts';
export { SUFENTANIL_KE0, geptsSufentanil } from './tci-sets/gepts.ts';
export { marshPropofol } from './tci-sets/marsh.ts';

export type ModelOpts = TciSetOpts;

/** Time to peak effect-site concentration after a bolus (min), 0.1 s resolution, 20 min horizon. */
export function ttpeMin(p: PkParams, site = 0): number {
  const s = pkSystem(p, 0.1);
  let x = zeroState(p);
  x[0] = 1;
  let best = 0;
  let t = 0;
  for (let k = 1; k <= 12000; k++) {
    x = pkStep(s, x, 0);
    const c = x[3 + site] as number;
    if (c > best) {
      best = c;
      t = k / 600;
    }
  }
  return t;
}

/**
 * ke0 fitted by the time-to-peak-effect method (Minto 2003; Shafer & Varvel 1991): the ke0 for which ttpeMin(p)
 * equals the published TTPE with THIS PK (a ke0 belongs to its PK model). Geometric bisection, 40 iterations.
 */
export function ke0ForTtpe(p: PkParams, ttpe: number): number {
  let lo = 0.01;
  let hi = 5;
  for (let i = 0; i < 40; i++) {
    const m = Math.sqrt(lo * hi);
    if (ttpeMin({ ...p, ke0: [m] }) > ttpe) lo = m;
    else hi = m;
  }
  return Math.sqrt(lo * hi);
}
