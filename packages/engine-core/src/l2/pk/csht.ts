// Context-sensitive half-time (Hughes, Glass & Jacobs 1992): after an infusion that held the PLASMA concentration
// constant for `durationMin`, the time for Cp to fall by 50 %. The decrement time generalises it (any fraction, plasma
// or effect site). `decrementFromNowMin` is the panel's version (decision 13): from the CURRENT state.
import { cp, pkStep, pkSystem, zeroState, type PkParams } from './compartment.ts';
import { tciRate } from './tci.ts';

export function decrementFromNowMin(p: PkParams, x0: readonly number[], fraction = 0.5, site: 'plasma' | 'effect' = 'plasma', maxMin = 600): number {
  const read = (x: readonly number[]) => (site === 'plasma' ? cp(p, x) : (x[3] as number));
  const c0 = read(x0);
  if (!(c0 > 0)) return 0;
  const coarse = pkSystem(p, 10);
  const fine = pkSystem(p, 1);
  let x = x0.slice();
  for (let s = 10; s <= maxMin * 60; s += 10) {
    const next = pkStep(coarse, x, 0);
    if (read(next) <= c0 * (1 - fraction)) {
      // refine the last 10 s at 1 s
      for (let k = 1; k <= 10; k++) {
        x = pkStep(fine, x, 0);
        if (read(x) <= c0 * (1 - fraction)) return (s - 10 + k) / 60;
      }
      return s / 60;
    }
    x = next;
  }
  return Number.POSITIVE_INFINITY;
}

export function decrementTimeMin(p: PkParams, durationMin: number, fraction = 0.5, site: 'plasma' | 'effect' = 'plasma', maxMin = 600): number {
  const sys = pkSystem(p, 10);
  let x = zeroState(p);
  for (let t = 0; t < durationMin * 60; t += 10) x = pkStep(sys, x, tciRate(p, x, 'plasma', 1, Number.POSITIVE_INFINITY));
  return decrementFromNowMin(p, x, fraction, site, maxMin);
}
