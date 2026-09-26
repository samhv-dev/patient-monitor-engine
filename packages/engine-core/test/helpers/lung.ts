// Stage 7b test helpers: a stand-alone lung rig (built-in volume-controlled ventilator → lung module at 62.5 Hz,
// gas step at 10 Hz with Stage 3's CO2 store), the plan's prototype harness. Engine-level tests use test/helpers/resp.ts.
import { createCo2State, stepCo2, type Co2State } from '../../src/l2/gas/co2.ts';
import { CI_LPM_PER_KG, GA_METABOLIC, gasPatient } from '../../src/l2/gas/params.ts';
import { resolveLung } from '../../src/l2/lung/conditions.ts';
import { createLung, lungGasStep, lungMechStep, shuntFraction, type LungState, type Mainstem } from '../../src/l2/lung/lung.ts';
import type { LungParams } from '../../src/l2/lung/side.ts';
import type { LungConditionSpec } from '../../src/types-lung.ts';

export const PAT = gasPatient({ ageY: 40, weightKg: 70, heightCm: 175, sex: 'M' });
const VD_ML = PAT.deadSpaceMl + 50; // anatomic + apparatus (Stage 3)
export interface RigVent { vt: number; rr: number; peep: number; ie: number; fio2: number }
export interface LungRig { ls: LungState; co2: Co2State; t: number; vent: RigVent; baseShunt: number }

export function paramsFor(specs: LungConditionSpec[]): { lp: LungParams; mainstem: Mainstem } {
  const r = resolveLung(specs, PAT.ibwKg);
  return { lp: r.lp, mainstem: r.blocked.includes('L') ? 'right' : r.blocked.includes('R') ? 'left' : 'both' };
}

export function lungRig(specs: LungConditionSpec[], vent: RigVent, baseShunt = 0.02): LungRig {
  const { lp } = paramsFor(specs);
  return { ls: createLung(lp, PAT.frcGaMl, 0.5, 150), co2: createCo2State(40), t: 0, vent, baseShunt };
}

/** Advance `seconds` (volume control, square flow, I:E from `ie`, passive expiration to PEEP). */
export function runRig(r: LungRig, seconds: number, onGas?: (r: LungRig) => void): void {
  const DT = 1 / 62.5;
  const end = r.t + seconds;
  let nextGas = Math.ceil(r.t * 10 - 1e-9) / 10;
  while (r.t < end - 1e-9) {
    const v = r.vent;
    const period = 60 / v.rr;
    const ti = period / (1 + v.ie);
    const ph = r.t % period;
    if (ph < ti) lungMechStep(r.ls, 'flow', v.vt / ti, DT);
    else lungMechStep(r.ls, 'pressure', v.peep, DT);
    r.t += DT;
    while (nextGas <= r.t + 1e-9) {
      const vco2 = PAT.vco2 * GA_METABOLIC;
      const va = (Math.max(0, v.vt - VD_ML) * v.rr) / 1000;
      lungGasStep(r.ls, {
        va, q: CI_LPM_PER_KG * PAT.effKg, baseShunt: r.baseShunt, fio2: v.fio2, massFlowFio2: null, vo2: PAT.vo2 * GA_METABOLIC,
        vco2, paco2: r.co2.pf, tempC: 37, bloodL: PAT.bloodL, coRatio: 1, ga: true, indFactor: 1, volatileMac: 0, sideFlow: null,
      }, 0.1);
      stepCo2(r.co2, { vaLpm: va * r.ls.co2.e, vco2, coRatio: 1, cf: PAT.cf, cs: PAT.cs, kfs: PAT.kfs, extraGradient: 0 }, 0.1);
      nextGas += 0.1;
      onGas?.(r);
    }
  }
}

export const rigOut = (r: LungRig) => ({
  spo2: r.ls.o2.sa * 100, pao2: r.ls.o2.pao2, paco2: r.co2.pf, etco2: r.co2.pf * r.ls.co2.g, gap: r.co2.pf * (1 - r.ls.co2.g),
  shunt: shuntFraction(r.ls, r.baseShunt), fL: r.ls.perf.f[0] as number, aer: r.ls.aer.slice(), pInsp: r.ls.pInsp, peepTot: r.ls.peepTot,
});
